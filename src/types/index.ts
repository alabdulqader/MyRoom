export type SpaceId = 'work' | 'commercial' | 'personal' | string;

export interface Space {
  id: SpaceId;
  name: string;
  color: string;
  icon: string;
  isPrivate: boolean;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export type EntityTone = 'formal' | 'practical' | 'innovative' | 'concise';

export interface Entity {
  id: string;
  spaceId: SpaceId;
  name: string;
  code: string;
  color: string;
  badge: string;
  description: string;
  tone: EntityTone;
  branches: Branch[];
  isArchived: boolean;
  calendarId?: string; // Dedicated Google Calendar ID for this entity
  calendarName?: string;
  createdAt: string;
}

export type ProjectStatus = 'on_track' | 'at_risk' | 'off_track' | 'on_hold' | 'completed' | 'needs_update';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface ProjectCharter {
  purpose: string;
  sponsor: string;
  manager: string;
  objectives: string[];
  outOfScope: string[];
}

export interface RACIRow {
  role: string;
  r: string; // Responsible
  a: string; // Accountable
  c: string; // Consulted
  i: string; // Informed
}

export interface ProjectRisk {
  id: string;
  title: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  owner: string;
  responsePlan: string;
  status: 'open' | 'mitigated' | 'closed';
}

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate: string;
  status: 'pending' | 'reached' | 'delayed';
  weight: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  suggestedStages: string[];
  suggestedMilestones: string[];
  suggestedRisks: string[];
}

export interface Project {
  id: string;
  entityId: string;
  branchIds: string[];
  name: string;
  code: string;
  status: ProjectStatus;
  aiSuggestedStatus?: ProjectStatus;
  statusReason: string;
  currentStage: string;
  nextMilestone: string;
  owner: string;
  urgency: UrgencyLevel;
  budget?: {
    allocated: number;
    committed: number;
    spent: number;
    currency: string;
  };
  charter?: ProjectCharter;
  raci?: RACIRow[];
  risks?: ProjectRisk[];
  milestones?: ProjectMilestone[];
  isArchived: boolean;
  lastUpdated: string;
  createdAt: string;
}

export type ItemType = 'task' | 'meeting' | 'followup' | 'idea' | 'decision' | 'commitment' | 'reference';
export type ItemStatus = 'not_started' | 'in_progress' | 'paused' | 'waiting' | 'needs_review' | 'completed' | 'canceled';
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type ItemSize = 'small' | 'big';
export type FocusLevel = 'deep' | 'medium' | 'light';
export type ExecutionContext = 'call' | 'computer' | 'visit' | 'review' | 'general';
export type BlockerReason = 'missing_info' | 'waiting_person' | 'decision' | 'too_big' | 'priority_change' | 'none';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  pros: string;
  cons: string;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  spaceId: SpaceId;
  entityId: string;
  projectId?: string;
  branchId?: string;
  assignee?: string;
  assigneeType: 'internal' | 'external';
  status: ItemStatus;
  priority: PriorityLevel;
  impact: ImpactLevel;
  size: ItemSize;
  focusLevel: FocusLevel;
  context: ExecutionContext;
  plannedDate?: string; // YYYY-MM-DD
  dueDate?: string; // Deadline YYYY-MM-DD
  followUpDate?: string;
  timeEstimateMinutes?: number;
  timeActualMinutes: number;
  checklist: ChecklistItem[];
  definitionOfDone?: string;
  dependencies: string[]; // item IDs
  isBlockingMe: boolean; // waiting on current user's decision/action
  blockerReason?: BlockerReason;
  blockerNotes?: string;
  recurrence?: {
    freq: 'daily' | 'weekly' | 'monthly';
    rule: 'fixed_date' | 'after_completion';
  };
  meetingDetails?: {
    startTime: string; // HH:mm or ISO
    durationMinutes: number;
    location: string;
    link?: string;
    attendees: string[];
    agenda: string[];
    prepChecklist: string[];
    calendarSyncStatus: 'synced' | 'not_added' | 'syncing' | 'failed' | 'conflict';
    googleEventId?: string;
    calendarId?: string;
    minutesSummary?: string;
  };
  decisionDetails?: {
    question: string;
    options: DecisionOption[];
    rationale?: string;
    missingInfo?: string;
    approvedOption?: string;
    decidedAt?: string;
    decidedBy?: string;
  };
  followupDetails?: {
    partyName: string;
    partyContact?: string;
    condition?: string; // e.g. "إذا لم يصل العرض الخميس، ذكّرني"
    lastContactAt?: string;
    nextReminderAt?: string;
    draftMessage?: string;
  };
  source: 'voice' | 'text' | 'share' | 'file' | 'email' | 'system';
  rawInput?: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  activityLog: ActivityLogEntry[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isDeleted: boolean; // in trash
}

export interface ActiveTimerState {
  itemId: string | null;
  startedAt: number | null; // epoch ms
  elapsedSeconds: number;
  isRunning: boolean;
}

export interface UserProfile {
  name: string;
  title: string;
  email: string;
  role: 'owner' | 'manager' | 'member' | 'viewer';
  timezone: string;
  workDays: number[]; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu
  quietHours: { start: string; end: string };
  audioRetentionPolicy: 'delete_after_parse' | 'keep';
  notificationBriefTime: string; // '08:30'
}

export interface ParsedVoiceItemDraft {
  id: string;
  title: string;
  type: ItemType;
  entityId: string;
  projectId?: string;
  branchId?: string;
  assignee?: string;
  plannedDate?: string;
  dueDate?: string;
  timeEstimateMinutes?: number;
  priority: PriorityLevel;
  missingData?: string[];
  suggestedData?: string[];
  originalPhrase?: string;
}

export type AIProviderId = 'gemini' | 'claude' | 'openai' | 'local';

export interface AIProviderInfo {
  id: AIProviderId;
  name: string;
  badge: string;
  model: string;
  status: 'ready' | 'needs_key' | 'offline';
  costModel: string;
  description: string;
  isDefault: boolean;
  notes?: string;
}

export interface ExecutionPlanStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  actionType: 'task' | 'meeting' | 'calendar_sync' | 'draft' | 'report' | 'decision' | 'review';
  isSensitive: boolean; // Requires executive user approval before execution (sending, financial, vital change)
  isApproved?: boolean;
  status: 'pending' | 'executing' | 'completed' | 'skipped' | 'waiting_approval';
  resultSummary?: string;
  createdItemId?: string;
  draftContent?: string;
}

export interface ExecutiveCommandResult {
  query: string;
  context: {
    scope: 'all' | 'entity' | 'project';
    entityId?: string;
    projectId?: string;
    inferredEntityName?: string;
  };
  provider: AIProviderId;
  modelName: string;
  latencyMs: number;
  costExplanation: string;
  executiveSummary: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  suggestedAnswers?: string[];
  plan: ExecutionPlanStep[];
  extractedItems: ParsedVoiceItemDraft[];
  draftPreview?: {
    title: string;
    type: 'email' | 'whatsapp' | 'letter' | 'memo';
    recipient: string;
    tone: string;
    subject?: string;
    body: string;
  };
}

// Smart Reminder & AI Scheduling Types
export type UrgencyGrade = 'critical' | 'urgent' | 'upcoming' | 'proactive';
export type DeadlineStatus = 'overdue' | 'due_today' | 'due_soon' | 'healthy';

export interface SmartReminderItem {
  itemId: string;
  title: string;
  type: ItemType;
  entityId: string;
  entityName?: string;
  entityColor?: string;
  projectName?: string;
  priority: PriorityLevel;
  impact: ImpactLevel;
  isBlockingMe: boolean;
  currentPlannedDate?: string;
  currentDueDate?: string;
  suggestedSchedule: {
    suggestedDate: string; // YYYY-MM-DD
    suggestedTimeSlot: string; // e.g. "09:30 ص"
    timeSlotWindow: 'morning' | 'afternoon' | 'evening';
    urgencyScore: number; // 0 - 100
    urgencyGrade: UrgencyGrade;
    deadlineStatus: DeadlineStatus;
    reasoning: string;
    recommendedAction: string;
    estimatedMinutes: number;
  };
  calendarSyncRecommended: boolean;
}

export interface SmartReminderBatchResult {
  summary: string;
  insights: string[];
  recommendations: SmartReminderItem[];
  criticalCount: number;
  urgentCount: number;
  pendingDecisionsCount: number;
  analyzedAt: string;
}

