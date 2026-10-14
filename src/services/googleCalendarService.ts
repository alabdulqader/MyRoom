import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Provider with required Google Calendar Workspace scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly');

// In-memory token caching ONLY (never in localStorage/sessionStorage as required by Workspace guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string; // ISO
    date?: string; // YYYY-MM-DD
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
  conferenceData?: any;
}

// Listen to auth state
export const initCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Sign in with Google (OAuth 2.0 Popup)
export const signInWithGoogleCalendar = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('لم يتم استلام رمز وصول صالح من Google OAuth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign out and clear in-memory token
export const signOutGoogleCalendar = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Get current active token
export const getCalendarAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// 1. Fetch user's accessible Google Calendars (Primary + Secondary / Departmental)
export const listGoogleCalendars = async (token?: string): Promise<GoogleCalendarItem[]> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    throw new Error('غير مصرح — يرجى تسجيل الدخول بحساب Google أولاً');
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${activeToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `خطأ استرجاع التقاويم (${res.status})`);
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary,
    description: item.description,
    primary: item.primary || false,
    backgroundColor: item.backgroundColor,
    foregroundColor: item.foregroundColor,
    accessRole: item.accessRole,
  }));
};

// 2. Fetch events from a specific calendar
export const listCalendarEvents = async (
  calendarId: string = 'primary',
  timeMin?: string,
  token?: string
): Promise<any[]> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('غير مصرح — رمز الوصول غير متوفر');

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('maxResults', '50');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  if (timeMin) {
    url.searchParams.set('timeMin', timeMin);
  } else {
    // Default from today onwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    url.searchParams.set('timeMin', today.toISOString());
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل جلب مواعيد التقويم');
  }

  const data = await res.json();
  return data.items || [];
};

// 3. Create Event in Google Calendar
export const createGoogleCalendarEvent = async (
  calendarId: string = 'primary',
  event: GoogleCalendarEvent,
  token?: string
): Promise<any> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('غير مصرح — رمز الوصول غير متوفر');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل إنشاء الحدث في Google Calendar');
  }

  return await res.json();
};

// 4. Update Event in Google Calendar
export const updateGoogleCalendarEvent = async (
  calendarId: string = 'primary',
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  token?: string
): Promise<any> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('غير مصرح');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل تحديث الحدث في التقويم');
  }

  return await res.json();
};

// 5. Delete Event from Google Calendar (Requires confirmation per guidelines)
export const deleteGoogleCalendarEvent = async (
  calendarId: string = 'primary',
  eventId: string,
  token?: string
): Promise<void> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('غير مصرح');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${activeToken}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل حذف الحدث من Google Calendar');
  }
};
