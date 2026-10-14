import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Space,
  Entity,
  Project,
  Item,
  ActiveTimerState,
  UserProfile,
  ItemType,
  ItemStatus,
  PriorityLevel,
  BlockerReason,
  ChecklistItem,
  SmartReminderItem,
  SmartReminderBatchResult,
} from '../types';
import {
  INITIAL_SPACES,
  INITIAL_ENTITIES,
  INITIAL_USER,
} from '../data/initialData';

import {
  initCalendarAuth,
  signInWithGoogleCalendar,
  signOutGoogleCalendar,
  getCalendarAccessToken,
  listGoogleCalendars,
  listCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  GoogleCalendarItem,
  GoogleCalendarEvent,
} from '../services/googleCalendarService';

export interface IntegrationStatus {
  id: string;
  name: string;
  provider: 'google' | 'microsoft';
  service: 'calendar' | 'drive' | 'mail';
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  accountEmail: string;
  lastSynced: string;
  scopes: string[];
}

interface DaftarContextType {
  spaces: Space[];
  entities: Entity[];
  projects: Project[];
  items: Item[];
  activeTimer: ActiveTimerState;
  user: UserProfile;
  integrations: IntegrationStatus[];
  selectedSpaceId: string | 'all';
  selectedEntityId: string | 'all';
  activeTab: 'today' | 'projects' | 'radar' | 'assistant';
  searchQuery: string;
  isDemoMode: boolean;

  // Google Calendar Integration
  googleUser: any;
  isGoogleCalendarConnected: boolean;
  userCalendars: GoogleCalendarItem[];
  isSyncingCalendar: boolean;
  calendarSyncError: string | null;
  connectGoogleCalendar: () => Promise<boolean>;
  disconnectGoogleCalendar: () => Promise<void>;
  assignCalendarToEntity: (entityId: string, calendarId: string, calendarName: string) => void;
  syncEventsWithGoogleCalendar: () => Promise<{ createdCount: number; importedCount: number }>;
  pushMeetingToGoogleCalendar: (itemId: string) => Promise<boolean>;
  deleteMeetingFromGoogleCalendar: (itemId: string) => Promise<void>;

  // Smart Reminder & AI Scheduling
  isSmartReminderModalOpen: boolean;
  setIsSmartReminderModalOpen: (open: boolean) => void;
  smartRemindersBatch: SmartReminderBatchResult | null;
  isAnalyzingReminders: boolean;
  fetchSmartReminderSchedule: () => Promise<SmartReminderBatchResult>;
  applySmartReminderSchedule: (recommendations: SmartReminderItem[]) => void;
  applySingleReminderSchedule: (rec: SmartReminderItem) => void;
  pushReminderToGoogleCalendar: (item: Item, suggestedDate: string, suggestedTimeSlot: string) => Promise<boolean>;
  urgentCommitmentsAndDecisionsCount: number;

  // Setters & Nav
  setSelectedSpaceId: (id: string | 'all') => void;
  setSelectedEntityId: (id: string | 'all') => void;
  setActiveTab: (tab: 'today' | 'projects' | 'radar' | 'assistant') => void;
  setSearchQuery: (query: string) => void;
  setIsDemoMode: (enabled: boolean) => void;

  // Entities & Projects
  addEntity: (entity: Omit<Entity, 'id' | 'createdAt'>) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'lastUpdated'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // Items CRUD & Executive Operations
  addItem: (item: Partial<Item>) => Item;
  addBatchItems: (items: Partial<Item>[]) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  toggleCompleteItem: (id: string) => void;
  deleteItem: (id: string, permanent?: boolean) => void;
  restoreItem: (id: string) => void;
  convertItemType: (id: string, newType: ItemType) => void;

  // Unblocker & Checklists
  setBlocker: (id: string, reason: BlockerReason, notes?: string) => void;
  toggleChecklistItem: (itemId: string, checkId: string) => void;
  addChecklistItem: (itemId: string, text: string) => void;

  // Time Tracker
  startTimer: (itemId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  adjustTimeManual: (itemId: string, additionalMinutes: number) => void;

  // Decisions
  approveDecision: (itemId: string, optionId: string, rationale?: string) => void;

  // Integrations & User
  updateIntegrations: (id: string, updates: Partial<IntegrationStatus>) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;
  loadDemoData: () => void;
  clearAllUserData: () => void;
}

const DaftarContext = createContext<DaftarContextType | null>(null);

const STORAGE_KEY = 'daftar_executive_data_v1';

export const DaftarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [spaces, setSpaces] = useState<Space[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_spaces`);
    return saved ? JSON.parse(saved) : INITIAL_SPACES;
  });

  const [entities, setEntities] = useState<Entity[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_entities`);
    return saved ? JSON.parse(saved) : INITIAL_ENTITIES;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_projects`);
    return saved ? JSON.parse(saved) : [];
  });

  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_items`);
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_demo_mode`) === 'true';
  });

  const [activeTimer, setActiveTimer] = useState<ActiveTimerState>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_timer`);
    return saved ? JSON.parse(saved) : { itemId: null, startedAt: null, elapsedSeconds: 0, isRunning: false };
  });

  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    {
      id: 'g-cal',
      name: 'Google Calendar',
      provider: 'google',
      service: 'calendar',
      status: 'connected',
      accountEmail: 'AlabdulqaderMA@gmail.com',
      lastSynced: 'منذ 5 دقائق',
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    },
    {
      id: 'g-drive',
      name: 'Google Drive & Docs',
      provider: 'google',
      service: 'drive',
      status: 'connected',
      accountEmail: 'AlabdulqaderMA@gmail.com',
      lastSynced: 'منذ 15 دقيقة',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    },
    {
      id: 'g-mail',
      name: 'Gmail',
      provider: 'google',
      service: 'mail',
      status: 'connected',
      accountEmail: 'AlabdulqaderMA@gmail.com',
      lastSynced: 'منذ ساعة',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    },
    {
      id: 'ms-cal',
      name: 'Microsoft 365 Calendar',
      provider: 'microsoft',
      service: 'calendar',
      status: 'disconnected',
      accountEmail: 'غير مربوط',
      lastSynced: '—',
      scopes: ['Calendars.ReadWrite'],
    },
  ]);

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | 'all'>('all');
  const [selectedEntityId, setSelectedEntityId] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'today' | 'projects' | 'radar' | 'assistant'>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Google Calendar Integration State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [userCalendars, setUserCalendars] = useState<GoogleCalendarItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_user_calendars`);
    return saved
      ? JSON.parse(saved)
      : [
          { id: 'primary', summary: 'التقويم الأساسي (محمد العبدالقادر)', primary: true },
          { id: 'cal-clamonies', summary: 'تقويم فعاليات واجتماعات كلايمونيز' },
          { id: 'cal-omnia', summary: 'تقويم مشاريع وتوريدات أمنية' },
          { id: 'cal-belza', summary: 'تقويم تشغيل ومبادرات Belza' },
          { id: 'cal-180deg', summary: 'تقويم استراتيجية 180 Degree' },
        ];
  });
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);

  // Smart Reminder & AI Scheduling state
  const [isSmartReminderModalOpen, setIsSmartReminderModalOpen] = useState(false);
  const [smartRemindersBatch, setSmartRemindersBatch] = useState<SmartReminderBatchResult | null>(null);
  const [isAnalyzingReminders, setIsAnalyzingReminders] = useState(false);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initCalendarAuth(
      (u, token) => {
        setGoogleUser(u);
        setGoogleAccessToken(token);
        setIntegrations(prev =>
          prev.map(ig =>
            ig.id === 'g-cal'
              ? {
                  ...ig,
                  status: 'connected',
                  accountEmail: u.email || 'AlabdulqaderMA@gmail.com',
                  lastSynced: 'الآن (متصل)',
                }
              : ig
          )
        );
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_user_calendars`, JSON.stringify(userCalendars));
  }, [userCalendars]);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_spaces`, JSON.stringify(spaces));
  }, [spaces]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_entities`, JSON.stringify(entities));
  }, [entities]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_items`, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_timer`, JSON.stringify(activeTimer));
  }, [activeTimer]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_demo_mode`, isDemoMode ? 'true' : 'false');
  }, [isDemoMode]);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (activeTimer.isRunning && activeTimer.startedAt) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - activeTimer.startedAt!) / 1000);
        setActiveTimer(prev => ({
          ...prev,
          elapsedSeconds: diff,
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer.isRunning, activeTimer.startedAt]);

  // Actions
  const addEntity = (entityData: Omit<Entity, 'id' | 'createdAt'>) => {
    const newEntity: Entity = {
      ...entityData,
      id: `ent-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setEntities(prev => [newEntity, ...prev]);
  };

  const updateEntity = (id: string, updates: Partial<Entity>) => {
    setEntities(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)));
  };

  const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'lastUpdated'>) => {
    const newProject: Project = {
      ...projectData,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setProjects(prev => [newProject, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p
      )
    );
  };

  const addItem = (itemData: Partial<Item>): Item => {
    const now = new Date().toISOString();
    const newItem: Item = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: itemData.type || 'task',
      title: itemData.title || 'عنصر جديد بدون عنوان',
      description: itemData.description || '',
      spaceId: itemData.spaceId || 'work',
      entityId: itemData.entityId || (entities[0]?.id || 'entity-clamonies'),
      projectId: itemData.projectId,
      branchId: itemData.branchId,
      assignee: itemData.assignee || user.name,
      assigneeType: itemData.assigneeType || 'internal',
      status: itemData.status || 'not_started',
      priority: itemData.priority || 'medium',
      impact: itemData.impact || 'medium',
      size: itemData.size || 'small',
      focusLevel: itemData.focusLevel || 'medium',
      context: itemData.context || 'general',
      plannedDate: itemData.plannedDate || new Date().toISOString().split('T')[0],
      dueDate: itemData.dueDate,
      followUpDate: itemData.followUpDate,
      timeEstimateMinutes: itemData.timeEstimateMinutes || 30,
      timeActualMinutes: itemData.timeActualMinutes || 0,
      checklist: itemData.checklist || [],
      definitionOfDone: itemData.definitionOfDone || '',
      dependencies: itemData.dependencies || [],
      isBlockingMe: itemData.isBlockingMe || false,
      blockerReason: itemData.blockerReason || 'none',
      blockerNotes: itemData.blockerNotes || '',
      recurrence: itemData.recurrence,
      meetingDetails: itemData.meetingDetails,
      decisionDetails: itemData.decisionDetails,
      followupDetails: itemData.followupDetails,
      source: itemData.source || 'text',
      rawInput: itemData.rawInput,
      attachments: itemData.attachments || [],
      activityLog: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          actor: user.name,
          action: 'إنشاء العنصر في الدفتر',
        },
      ],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    setItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const addBatchItems = (batch: Partial<Item>[]) => {
    batch.forEach(b => addItem(b));
  };

  const updateItem = (id: string, updates: Partial<Item>) => {
    const now = new Date().toISOString();
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const newLog = [...it.activityLog];
        if (updates.status && updates.status !== it.status) {
          newLog.unshift({
            id: `log-${Date.now()}`,
            timestamp: now,
            actor: user.name,
            action: `تغيير الحالة إلى: ${updates.status}`,
          });
        }
        return {
          ...it,
          ...updates,
          activityLog: newLog,
          updatedAt: now,
        };
      })
    );
  };

  const toggleCompleteItem = (id: string) => {
    const now = new Date().toISOString();
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const isNowCompleted = it.status !== 'completed';
        const newStatus: ItemStatus = isNowCompleted ? 'completed' : 'in_progress';
        return {
          ...it,
          status: newStatus,
          completedAt: isNowCompleted ? now : undefined,
          updatedAt: now,
          activityLog: [
            {
              id: `log-${Date.now()}`,
              timestamp: now,
              actor: user.name,
              action: isNowCompleted ? 'تم إنجاز المهمة' : 'إعادة فتح المهمة للتنفيذ',
            },
            ...it.activityLog,
          ],
        };
      })
    );
  };

  const deleteItem = (id: string, permanent: boolean = false) => {
    if (permanent) {
      setItems(prev => prev.filter(it => it.id !== id));
      if (activeTimer.itemId === id) {
        stopTimer();
      }
    } else {
      updateItem(id, { isDeleted: true });
    }
  };

  const restoreItem = (id: string) => {
    updateItem(id, { isDeleted: false });
  };

  const convertItemType = (id: string, newType: ItemType) => {
    const now = new Date().toISOString();
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        return {
          ...it,
          type: newType,
          updatedAt: now,
          activityLog: [
            {
              id: `log-${Date.now()}`,
              timestamp: now,
              actor: user.name,
              action: `تحويل نوع العنصر من ${it.type} إلى ${newType}`,
            },
            ...it.activityLog,
          ],
        };
      })
    );
  };

  const setBlocker = (id: string, reason: BlockerReason, notes?: string) => {
    updateItem(id, {
      blockerReason: reason,
      blockerNotes: notes,
      status: reason === 'none' ? 'in_progress' : 'paused',
    });
  };

  const toggleChecklistItem = (itemId: string, checkId: string) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== itemId) return it;
        const updatedChecks = it.checklist.map(c =>
          c.id === checkId ? { ...c, completed: !c.completed } : c
        );
        return {
          ...it,
          checklist: updatedChecks,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addChecklistItem = (itemId: string, text: string) => {
    if (!text.trim()) return;
    setItems(prev =>
      prev.map(it => {
        if (it.id !== itemId) return it;
        const newCheck: ChecklistItem = {
          id: `chk-${Date.now()}`,
          text: text.trim(),
          completed: false,
        };
        return {
          ...it,
          checklist: [...it.checklist, newCheck],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Timer controls
  const startTimer = (itemId: string) => {
    const now = Date.now();
    setActiveTimer({
      itemId,
      startedAt: now,
      elapsedSeconds: 0,
      isRunning: true,
    });
    updateItem(itemId, { status: 'in_progress' });
  };

  const pauseTimer = () => {
    if (!activeTimer.isRunning) return;
    setActiveTimer(prev => ({
      ...prev,
      isRunning: false,
    }));
  };

  const resumeTimer = () => {
    const now = Date.now() - activeTimer.elapsedSeconds * 1000;
    setActiveTimer(prev => ({
      ...prev,
      startedAt: now,
      isRunning: true,
    }));
  };

  const stopTimer = () => {
    if (activeTimer.itemId && activeTimer.elapsedSeconds > 0) {
      const addedMinutes = Math.round(activeTimer.elapsedSeconds / 60);
      adjustTimeManual(activeTimer.itemId, addedMinutes);
    }
    setActiveTimer({
      itemId: null,
      startedAt: null,
      elapsedSeconds: 0,
      isRunning: false,
    });
  };

  const adjustTimeManual = (itemId: string, additionalMinutes: number) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          timeActualMinutes: Math.max(0, it.timeActualMinutes + additionalMinutes),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const approveDecision = (itemId: string, optionId: string, rationale?: string) => {
    const now = new Date().toISOString();
    setItems(prev =>
      prev.map(it => {
        if (it.id !== itemId) return it;
        const dec = it.decisionDetails || {
          question: it.title,
          options: [],
        };
        return {
          ...it,
          status: 'completed',
          decisionDetails: {
            ...dec,
            approvedOption: optionId,
            rationale: rationale || 'تم اعتماد الخيار مباشرة من لوحة القرارات',
            decidedAt: now,
            decidedBy: user.name,
          },
          updatedAt: now,
          activityLog: [
            {
              id: `log-${Date.now()}`,
              timestamp: now,
              actor: user.name,
              action: `اعتماد القرار: اختيار [${optionId}]`,
            },
            ...it.activityLog,
          ],
        };
      })
    );
  };

  const updateIntegrations = (id: string, updates: Partial<IntegrationStatus>) => {
    setIntegrations(prev => prev.map(ig => (ig.id === id ? { ...ig, ...updates } : ig)));
  };

  // Google Calendar Integration Handlers
  const connectGoogleCalendar = async (): Promise<boolean> => {
    setIsSyncingCalendar(true);
    setCalendarSyncError(null);
    try {
      const res = await signInWithGoogleCalendar();
      if (!res) {
        setIsSyncingCalendar(false);
        return false;
      }

      setGoogleUser(res.user);
      setGoogleAccessToken(res.accessToken);

      // Attempt to fetch user's calendars from Google Calendar
      try {
        const fetchedCals = await listGoogleCalendars(res.accessToken);
        if (fetchedCals && fetchedCals.length > 0) {
          setUserCalendars(fetchedCals);
        }
      } catch (calErr: any) {
        console.warn('Google Calendar listing info:', calErr);
      }

      updateIntegrations('g-cal', {
        status: 'connected',
        accountEmail: res.user.email || 'AlabdulqaderMA@gmail.com',
        lastSynced: 'الآن (متصل بنجاح عبر OAuth 2.0)',
        scopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
        ],
      });

      setIsSyncingCalendar(false);
      return true;
    } catch (err: any) {
      console.error('Failed to connect Google Calendar:', err);
      setCalendarSyncError(err?.message || 'تعذر استكمال الاتصال بـ Google Calendar');
      setIsSyncingCalendar(false);
      return false;
    }
  };

  const disconnectGoogleCalendar = async (): Promise<void> => {
    await signOutGoogleCalendar();
    setGoogleUser(null);
    setGoogleAccessToken(null);
    updateIntegrations('g-cal', {
      status: 'disconnected',
      lastSynced: '—',
    });
  };

  const assignCalendarToEntity = (entityId: string, calendarId: string, calendarName: string) => {
    updateEntity(entityId, { calendarId, calendarName });
  };

  const syncEventsWithGoogleCalendar = async (): Promise<{ createdCount: number; importedCount: number }> => {
    setIsSyncingCalendar(true);
    setCalendarSyncError(null);
    let createdCount = 0;
    let importedCount = 0;

    try {
      // 1. Sync outbound: Push meetings from Daftar to Google Calendar
      for (const item of items) {
        if (item.type === 'meeting' && !item.isDeleted && item.meetingDetails) {
          if (item.meetingDetails.calendarSyncStatus !== 'synced' || !item.meetingDetails.googleEventId) {
            const entity = entities.find(e => e.id === item.entityId);
            const targetCalendarId = entity?.calendarId || 'primary';

            const startIso = item.plannedDate
              ? `${item.plannedDate}T${item.meetingDetails.startTime || '10:00'}:00+03:00`
              : new Date().toISOString();
            const endIso = new Date(
              new Date(startIso).getTime() + (item.meetingDetails.durationMinutes || 60) * 60000
            ).toISOString();

            try {
              const createdEvent = await createGoogleCalendarEvent(targetCalendarId, {
                summary: `[${entity?.name || 'دفتر'}] ${item.title}`,
                description: item.description || (item.meetingDetails.agenda?.join('\n') || ''),
                location: item.meetingDetails.location,
                start: { dateTime: startIso },
                end: { dateTime: endIso },
              });

              updateItem(item.id, {
                meetingDetails: {
                  ...item.meetingDetails,
                  calendarSyncStatus: 'synced',
                  googleEventId: createdEvent.id,
                  calendarId: targetCalendarId,
                },
              });
              createdCount++;
            } catch (createErr) {
              console.warn('Outbound event push skipped or failed:', createErr);
            }
          }
        }
      }

      // 2. Sync inbound: Fetch events from primary calendar and import into Daftar
      try {
        const events = await listCalendarEvents('primary');
        for (const evt of events) {
          const isAlreadyInItems = items.some(
            it => it.meetingDetails?.googleEventId === evt.id || it.title === evt.summary
          );
          if (!isAlreadyInItems && evt.summary) {
            const startDateStr = evt.start?.dateTime?.split('T')[0] || evt.start?.date || new Date().toISOString().split('T')[0];
            const startTimeStr = evt.start?.dateTime ? evt.start.dateTime.split('T')[1]?.substring(0, 5) : '10:00';

            let matchedEntityId = entities[0]?.id || 'entity-clamonies';
            for (const ent of entities) {
              if (evt.summary.includes(ent.name)) {
                matchedEntityId = ent.id;
                break;
              }
            }

            addItem({
              title: evt.summary.replace(/\[.*?\]\s*/, ''),
              type: 'meeting',
              entityId: matchedEntityId,
              plannedDate: startDateStr,
              meetingDetails: {
                startTime: startTimeStr,
                durationMinutes: 60,
                location: evt.location || 'Google Meet',
                link: evt.hangoutLink || evt.htmlLink,
                attendees: (evt.attendees || []).map((a: any) => a.displayName || a.email),
                agenda: evt.description ? [evt.description] : [],
                prepChecklist: [],
                calendarSyncStatus: 'synced',
                googleEventId: evt.id,
                calendarId: 'primary',
              },
              source: 'system',
            });
            importedCount++;
          }
        }
      } catch (fetchErr) {
        console.warn('Inbound event fetch warning:', fetchErr);
      }

      updateIntegrations('g-cal', {
        status: 'connected',
        lastSynced: 'الآن (تمت المزامنة بنجاح)',
      });

      setIsSyncingCalendar(false);
      return { createdCount, importedCount };
    } catch (err: any) {
      setIsSyncingCalendar(false);
      setCalendarSyncError(err?.message || 'فشلت المزامنة مع التقويم');
      throw err;
    }
  };

  const pushMeetingToGoogleCalendar = async (itemId: string): Promise<boolean> => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.type !== 'meeting' || !item.meetingDetails) return false;

    const entity = entities.find(e => e.id === item.entityId);
    const targetCalendarId = entity?.calendarId || 'primary';

    const startIso = item.plannedDate
      ? `${item.plannedDate}T${item.meetingDetails.startTime || '10:00'}:00+03:00`
      : new Date().toISOString();
    const endIso = new Date(
      new Date(startIso).getTime() + (item.meetingDetails.durationMinutes || 60) * 60000
    ).toISOString();

    const createdEvent = await createGoogleCalendarEvent(targetCalendarId, {
      summary: `[${entity?.name || 'دفتر'}] ${item.title}`,
      description: item.description || '',
      location: item.meetingDetails.location,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
    });

    updateItem(item.id, {
      meetingDetails: {
        ...item.meetingDetails,
        calendarSyncStatus: 'synced',
        googleEventId: createdEvent.id,
        calendarId: targetCalendarId,
      },
    });
    return true;
  };

  const deleteMeetingFromGoogleCalendar = async (itemId: string): Promise<void> => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.meetingDetails?.googleEventId) return;

    const confirmed = window.confirm(
      `هل ترغب في حذف الاجتماع "${item.title}" من Google Calendar نهائياً؟`
    );
    if (!confirmed) return;

    const targetCalId = item.meetingDetails.calendarId || 'primary';
    await deleteGoogleCalendarEvent(targetCalId, item.meetingDetails.googleEventId);
    updateItem(itemId, {
      meetingDetails: {
        ...item.meetingDetails,
        calendarSyncStatus: 'not_added',
        googleEventId: undefined,
      },
    });
  };

  // Smart Reminder & AI Scheduling Methods
  const todayStrForCount = new Date().toISOString().split('T')[0];
  const urgentCommitmentsAndDecisionsCount = items.filter(
    it =>
      !it.isDeleted &&
      it.status !== 'completed' &&
      it.status !== 'canceled' &&
      (it.type === 'decision' ||
        it.type === 'commitment' ||
        it.isBlockingMe ||
        it.priority === 'urgent' ||
        (it.dueDate && it.dueDate <= todayStrForCount))
  ).length;

  const fetchSmartReminderSchedule = async (): Promise<SmartReminderBatchResult> => {
    setIsAnalyzingReminders(true);
    try {
      const response = await fetch('/api/gemini/smart-reminder-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          entities,
          projects,
          currentDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        throw new Error('فشل استدعاء محرك التذكير الذكي');
      }

      const result: SmartReminderBatchResult = await response.json();
      setSmartRemindersBatch(result);
      setIsAnalyzingReminders(false);
      return result;
    } catch (err) {
      console.error('Error fetching smart reminders:', err);
      setIsAnalyzingReminders(false);
      throw err;
    }
  };

  const applySingleReminderSchedule = (rec: SmartReminderItem) => {
    const item = items.find(i => i.id === rec.itemId);
    if (!item) return;

    const now = new Date().toISOString();
    updateItem(rec.itemId, {
      plannedDate: rec.suggestedSchedule.suggestedDate,
      dueDate: item.dueDate || rec.suggestedSchedule.suggestedDate,
      priority: rec.suggestedSchedule.urgencyGrade === 'critical' ? 'urgent' : item.priority,
      updatedAt: now,
      activityLog: [
        {
          id: `log-reminder-${Date.now()}`,
          timestamp: now,
          actor: 'المساعد الذكي (التذكير الاستباقي)',
          action: `جدولة ذكية: تثبيت الموعد في [${rec.suggestedSchedule.suggestedDate} - ${rec.suggestedSchedule.suggestedTimeSlot}]. المبرر: ${rec.suggestedSchedule.reasoning}`,
        },
        ...item.activityLog,
      ],
    });

    if (smartRemindersBatch) {
      setSmartRemindersBatch({
        ...smartRemindersBatch,
        recommendations: smartRemindersBatch.recommendations.map(r =>
          r.itemId === rec.itemId
            ? {
                ...r,
                currentPlannedDate: rec.suggestedSchedule.suggestedDate,
              }
            : r
        ),
      });
    }
  };

  const applySmartReminderSchedule = (recs: SmartReminderItem[]) => {
    recs.forEach(rec => {
      applySingleReminderSchedule(rec);
    });
  };

  const pushReminderToGoogleCalendar = async (
    item: Item,
    suggestedDate: string,
    suggestedTimeSlot: string
  ): Promise<boolean> => {
    const entity = entities.find(e => e.id === item.entityId);
    const targetCalendarId = entity?.calendarId || 'primary';

    let hour = 10;
    let minute = 0;
    const parts = suggestedTimeSlot.split(' ');
    if (parts.length > 0 && parts[0].includes(':')) {
      const [h, m] = parts[0].split(':').map(Number);
      hour = isNaN(h) ? 10 : h;
      minute = isNaN(m) ? 0 : m;
      if (parts[1] === 'م' && hour < 12) hour += 12;
      if (parts[1] === 'ص' && hour === 12) hour = 0;
    }

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const startIso = `${suggestedDate}T${pad(hour)}:${pad(minute)}:00+03:00`;
    const endIso = `${suggestedDate}T${pad(Math.min(23, hour + 1))}:${pad(minute)}:00+03:00`;

    try {
      await createGoogleCalendarEvent(targetCalendarId, {
        summary: `[تذكير ذكي: ${entity?.name || 'دفتر'}] ${item.title}`,
        description: `تذكير استباقي مجدول بالذكاء الاصطناعي.\nالنوع: ${item.type === 'decision' ? 'قرار حاسم' : 'التزام'}\nالأولوية: ${item.priority}\nالتفاصيل: ${item.description || 'لا يوجد'}\nالرابط المباشر: منصة دفتر للمكتب التنفيذي`,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
      });

      const now = new Date().toISOString();
      updateItem(item.id, {
        activityLog: [
          {
            id: `log-cal-reminder-${Date.now()}`,
            timestamp: now,
            actor: user.name,
            action: `تم تصدير التذكير الذكي إلى Google Calendar بنجاح (${suggestedDate} ${suggestedTimeSlot})`,
          },
          ...item.activityLog,
        ],
      });
      return true;
    } catch (err) {
      console.error('Failed to push reminder to Google Calendar:', err);
      return false;
    }
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const exportDataJSON = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      user,
      spaces,
      entities,
      projects,
      items,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDataJSON = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.spaces) setSpaces(parsed.spaces);
      if (parsed.entities) setEntities(parsed.entities);
      if (parsed.projects) setProjects(parsed.projects);
      if (parsed.items) setItems(parsed.items);
      if (parsed.user) setUser(parsed.user);
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  };

  // Demo showcase data with clearly isolated tags if user tests it
  const loadDemoData = () => {
    setIsDemoMode(true);
    const today = new Date().toISOString().split('T')[0];

    const demoProject: Project = {
      id: 'proj-demo-1',
      entityId: 'entity-clamonies',
      branchIds: ['clm-b1'],
      name: 'افتتاح فرع التحلية الجديد',
      code: 'CLM-THL',
      status: 'on_track',
      aiSuggestedStatus: 'on_track',
      statusReason: 'الأعمال تسير وفق خط الأساس الزمني',
      currentStage: 'أعمال الديكور والتجهيز',
      nextMilestone: 'استلام التوريدات ومعدات التشغيل',
      owner: 'محمد العبدالقادر',
      urgency: 'high',
      budget: {
        allocated: 350000,
        committed: 210000,
        spent: 140000,
        currency: 'SAR',
      },
      charter: {
        purpose: 'توسيع رقعة انتشار كلايمونيز بالمنطقة الوسطى وزيادة المبيعات بنسبة 25%.',
        sponsor: 'مجلس الإدارة',
        manager: 'محمد العبدالقادر',
        objectives: ['الافتتاح خلال 60 يوماً', 'الالتزام بسقف الميزانية المحددة', 'تحقيق معايير الجودة'],
        outOfScope: ['الخدمات اللوجستية خارج مدينة الرياض'],
      },
      risks: [
        {
          id: 'rsk-1',
          title: 'تأخر شحنة الآلات المستوردة من الميناء',
          probability: 'medium',
          impact: 'high',
          owner: 'مدير المشتريات',
          responsePlan: 'التنسيق مع مخلص جمركي بديل وتوفير مخزون طوارئ',
          status: 'open',
        },
      ],
      milestones: [
        { id: 'm1', title: 'توقيع عقد الموقع', targetDate: today, status: 'reached', weight: 20 },
        { id: 'm2', title: 'اكتمال التصاميم والديكور', targetDate: today, status: 'reached', weight: 30 },
        { id: 'm3', title: 'توريد المعدات', targetDate: today, status: 'pending', weight: 25 },
        { id: 'm4', title: 'الافتتاح التجريبي', targetDate: today, status: 'pending', weight: 25 },
      ],
      isArchived: false,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const demoItems: Item[] = [
      {
        id: 'demo-it-1',
        type: 'task',
        title: 'مراجعة واعتماد عروض أسعار التوريدات الميكانيكية',
        description: 'مقارنة عرضي شركتي أمنية ومورد المعدات واختيار الأنسب للجودة والضمان.',
        spaceId: 'commercial',
        entityId: 'entity-omnia',
        projectId: 'proj-demo-1',
        assignee: 'محمد العبدالقادر',
        assigneeType: 'internal',
        status: 'in_progress',
        priority: 'urgent',
        impact: 'high',
        size: 'small',
        focusLevel: 'deep',
        context: 'computer',
        plannedDate: today,
        dueDate: today,
        timeEstimateMinutes: 45,
        timeActualMinutes: 20,
        checklist: [
          { id: 'c1', text: 'فحص بنود الضمان والصيانة', completed: true },
          { id: 'c2', text: 'التأكد من مطابقة المواصفات الفنية', completed: false },
        ],
        definitionOfDone: 'اختيار العرض الفائز وإرسال خطاب الاعتماد',
        dependencies: [],
        isBlockingMe: true, // I am blocking the project!
        blockerReason: 'decision',
        blockerNotes: 'بانتظار قراري النهائي لاعتماد الدفعة الأولى',
        source: 'voice',
        rawInput: 'بكرة أراجع عرض المورد لأمنية... لا خله اليوم ضروري',
        attachments: [],
        activityLog: [
          {
            id: 'l1',
            timestamp: new Date().toISOString(),
            actor: 'محمد العبدالقادر',
            action: 'تم التقاط المهمة بالصوت ومطابقة النية مع أمنية',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'demo-it-2',
        type: 'meeting',
        title: 'اجتماع تنسيقي مع فريق Belza لمناقشة خطة الربع القادم',
        description: 'مراجعة المخرجات التشغيلية ومواءمة مؤشرات الأداء.',
        spaceId: 'work',
        entityId: 'entity-belza',
        assignee: 'محمد العبدالقادر',
        assigneeType: 'internal',
        status: 'not_started',
        priority: 'high',
        impact: 'high',
        size: 'small',
        focusLevel: 'medium',
        context: 'call',
        plannedDate: today,
        timeEstimateMinutes: 60,
        timeActualMinutes: 0,
        checklist: [],
        dependencies: [],
        isBlockingMe: false,
        meetingDetails: {
          startTime: '13:00',
          durationMinutes: 60,
          location: 'قاعة الاجتماعات الرئيسية / Google Meet',
          link: 'https://meet.google.com/daftar-exec',
          attendees: ['محمد العبدالقادر', 'فريق العمليات Belza'],
          agenda: ['مراجعة إنجاز الأسبوع الماضي', 'تحديد أهداف الربع القادم', 'اعتماد بنود الميزانية'],
          prepChecklist: ['تجهيز التقرير الرقمي المحدث', 'مراجعة النقاط العالقة'],
          calendarSyncStatus: 'synced',
        },
        source: 'system',
        attachments: [],
        activityLog: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'demo-it-3',
        type: 'decision',
        title: 'حسم اختيار نظام نقاط البيع (POS) لفرع 180 Degree',
        description: 'المفاضلة بين حلين سحابيين متوافقين مع الفوترة الإلكترونية هيئة الزكاة.',
        spaceId: 'work',
        entityId: 'entity-180deg',
        assignee: 'محمد العبدالقادر',
        assigneeType: 'internal',
        status: 'not_started',
        priority: 'urgent',
        impact: 'high',
        size: 'small',
        focusLevel: 'deep',
        context: 'review',
        plannedDate: today,
        dueDate: today,
        timeEstimateMinutes: 30,
        timeActualMinutes: 0,
        checklist: [],
        dependencies: [],
        isBlockingMe: true,
        decisionDetails: {
          question: 'أي نظام نقاط بيع نعتمد لتشغيل الفرع الجديد؟',
          options: [
            { id: 'opt-a', label: 'الحل الأول: فودكس (Foodics)', pros: 'تكامل مباشر، تقارير لحظية، دعم فني ممتاز', cons: 'تكلفة ترخيص سنوي أعلى بنسبة 15%' },
            { id: 'opt-b', label: 'الحل الثاني: نظام مخصص محلي', pros: 'تكلفة أقل وبدون اشتراك سنوي دوري', cons: 'يحتاج صيانة مستمرة وتحديث يدوي' },
          ],
          missingInfo: 'مقارنة جدول أسعار أجهزة الدفع مع البنك',
        },
        source: 'system',
        attachments: [],
        activityLog: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'demo-it-4',
        type: 'followup',
        title: 'متابعة وصول نموذج عقد التشغيل من المستشار القانوني',
        description: 'التأكد من إدراج بند شروط الجزاءات ومواعيد التسليم.',
        spaceId: 'commercial',
        entityId: 'entity-clamonies',
        assignee: 'أحمد المستشار الخارجي',
        assigneeType: 'external',
        status: 'waiting',
        priority: 'medium',
        impact: 'medium',
        size: 'small',
        focusLevel: 'light',
        context: 'call',
        plannedDate: today,
        dueDate: today,
        timeEstimateMinutes: 15,
        timeActualMinutes: 0,
        checklist: [],
        dependencies: [],
        isBlockingMe: false,
        followupDetails: {
          partyName: 'مكتب الاستشارات النظامية',
          partyContact: '+966500000000',
          condition: 'إذا لم يصل المسودة قبل نهاية دوام اليوم، إرسال تذكير رسمي',
          draftMessage: 'السلام عليكم أستاذ أحمد، نود الاستفسار عن جاهزية مسودة عقد تشغيل فرع كلايمونيز المحدثة لاعتمادها اليوم شاكرين لكم.',
        },
        source: 'voice',
        rawInput: 'ذكرني أتابع المستشار القانوني بخصوص عقد كلايمونيز',
        attachments: [],
        activityLog: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      },
    ];

    setProjects([demoProject]);
    setItems(demoItems);
  };

  const clearAllUserData = () => {
    setIsDemoMode(false);
    setProjects([]);
    setItems([]);
    setEntities(INITIAL_ENTITIES);
    setSpaces(INITIAL_SPACES);
    setUser(INITIAL_USER);
    stopTimer();
    localStorage.clear();
  };

  return (
    <DaftarContext.Provider
      value={{
        spaces,
        entities,
        projects,
        items,
        activeTimer,
        user,
        integrations,
        selectedSpaceId,
        selectedEntityId,
        activeTab,
        searchQuery,
        isDemoMode,
        setSelectedSpaceId,
        setSelectedEntityId,
        setActiveTab,
        setSearchQuery,
        setIsDemoMode,
        addEntity,
        updateEntity,
        addProject,
        updateProject,
        addItem,
        addBatchItems,
        updateItem,
        toggleCompleteItem,
        deleteItem,
        restoreItem,
        convertItemType,
        setBlocker,
        toggleChecklistItem,
        addChecklistItem,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        adjustTimeManual,
        approveDecision,
        updateIntegrations,
        updateUser,
        exportDataJSON,
        importDataJSON,
        loadDemoData,
        clearAllUserData,
        googleUser,
        isGoogleCalendarConnected: !!googleAccessToken,
        userCalendars,
        isSyncingCalendar,
        calendarSyncError,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        assignCalendarToEntity,
        syncEventsWithGoogleCalendar,
        pushMeetingToGoogleCalendar,
        deleteMeetingFromGoogleCalendar,
        isSmartReminderModalOpen,
        setIsSmartReminderModalOpen,
        smartRemindersBatch,
        isAnalyzingReminders,
        fetchSmartReminderSchedule,
        applySmartReminderSchedule,
        applySingleReminderSchedule,
        pushReminderToGoogleCalendar,
        urgentCommitmentsAndDecisionsCount,
      }}
    >
      {children}
    </DaftarContext.Provider>
  );
};

export const useDaftar = () => {
  const context = useContext(DaftarContext);
  if (!context) {
    throw new Error('useDaftar must be used within a DaftarProvider');
  }
  return context;
};
