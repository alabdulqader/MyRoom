import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import { ExecutiveCommandBox } from './ExecutiveCommandBox';
import { SmartInputBar } from './SmartInputBar';
import { ActiveTaskBar } from './ActiveTaskBar';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Filter,
  Plus,
  MoreVertical,
  HelpCircle,
  Video,
  ExternalLink,
  Layers,
  Building,
  Flag,
  User,
  ListTodo,
  CheckSquare,
  Zap,
  TrendingDown,
  Briefcase,
  BellRing
} from 'lucide-react';
import { Item, BlockerReason, ItemStatus } from '../types';

export const TodayView: React.FC<{
  onOpenMeetingDebrief: (meeting: Item) => void;
  onOpenItemModal: (item: Item) => void;
}> = ({ onOpenMeetingDebrief, onOpenItemModal }) => {
  const {
    items,
    entities,
    spaces,
    user,
    selectedEntityId,
    selectedSpaceId,
    setSelectedEntityId,
    searchQuery,
    startTimer,
    toggleCompleteItem,
    setBlocker,
    addItem,
    pushMeetingToGoogleCalendar,
    setIsSmartReminderModalOpen,
    urgentCommitmentsAndDecisionsCount,
  } = useDaftar();

  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(false);
  const [activeSizeFilter, setActiveSizeFilter] = useState<'all' | 'big' | 'small'>('all');
  const [unblockingItem, setUnblockingItem] = useState<Item | null>(null);
  const [unblockReason, setUnblockReason] = useState<BlockerReason>('waiting_person');
  const [unblockNotes, setUnblockNotes] = useState('');
  const [aiUnblockAdvice, setAiUnblockAdvice] = useState<string | null>(null);
  const [isUnblockingLoading, setIsUnblockingLoading] = useState(false);

  // Daily planning states
  const [isDayPlanningLoading, setIsDayPlanningLoading] = useState(false);
  const [dayPlanAdvice, setDayPlanAdvice] = useState<string | null>(null);
  const [isDayCompressed, setIsDayCompressed] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter items
  const nonDeletedItems = items.filter(i => !i.isDeleted);

  const filteredItems = nonDeletedItems.filter(item => {
    // Entity filter
    if (selectedEntityId !== 'all' && item.entityId !== selectedEntityId) return false;
    // Space filter
    if (selectedSpaceId !== 'all' && item.spaceId !== selectedSpaceId) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  // Category counts
  const overdueItems = filteredItems.filter(
    i => i.status !== 'completed' && i.status !== 'canceled' && i.dueDate && i.dueDate < todayStr
  );

  const todayTasks = filteredItems.filter(
    i =>
      i.type === 'task' &&
      i.status !== 'completed' &&
      i.status !== 'canceled' &&
      (i.plannedDate === todayStr || (!i.plannedDate && !i.dueDate))
  );

  const todayMeetings = filteredItems.filter(
    i => i.type === 'meeting' && i.status !== 'completed' && (i.plannedDate === todayStr || !i.plannedDate)
  );

  const completedToday = filteredItems.filter(
    i => i.status === 'completed' && (!i.completedAt || i.completedAt.startsWith(todayStr))
  );

  const totalTimeLoggedToday = filteredItems.reduce((acc, curr) => acc + (curr.timeActualMinutes || 0), 0);

  // Big vs Small tasks
  const bigTasks = todayTasks.filter(t => t.size === 'big');
  const smallTasks = todayTasks.filter(t => t.size === 'small');

  // Handle "وش معطلني؟"
  const handleResolveUnblock = async () => {
    if (!unblockingItem) return;
    setIsUnblockingLoading(true);

    try {
      const res = await fetch('/api/gemini/unblock-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: unblockingItem.title,
          blockerReason: unblockReason,
          notes: unblockNotes,
        }),
      });
      const data = await res.json();
      setAiUnblockAdvice(data.suggestion || 'قم بتفويض الجزئية أو تحديد موعد حاسم للمتابعة.');
      setBlocker(unblockingItem.id, unblockReason, unblockNotes);
    } catch (e) {
      setBlocker(unblockingItem.id, unblockReason, unblockNotes);
      setAiUnblockAdvice('تم تسجيل العائق وتحديث حالة المهمة.');
    } finally {
      setIsUnblockingLoading(false);
    }
  };

  // Handle "خطط يومي" / "اليوم انضغط"
  const handlePlanDay = async (compressed: boolean = false) => {
    setIsDayPlanningLoading(true);
    setIsDayCompressed(compressed);

    const taskTitles = todayTasks.map(t => `${t.title} (${t.priority})`).join('، ');
    const meetingTitles = todayMeetings.map(m => m.title).join('، ');

    const prompt = compressed
      ? `اليوم انضغط! عندي هذه المهام: [${taskTitles}] وهذه الاجتماعات: [${meetingTitles}]. اقترح خطة طوارئ مختصرة تركز على 2 إلى 3 نتائج حاسمة فقط وتؤجل الباقي مع بيان السبب.`
      : `خطط يومي التنفيذي: عندي هذه المهام: [${taskTitles}] والاجتماعات: [${meetingTitles}]. رتب أولوياتي بسياق التركيز العالي في الصباح والأعمال الخفيفة بعد الظهر.`;

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          contextData: { todayTasks, todayMeetings, userRole: user.role },
        }),
      });
      const data = await res.json();
      setDayPlanAdvice(data.reply);
    } catch (e) {
      setDayPlanAdvice('التركيز اليوم على المهمة الأكثر إلحاحاً وإنهاء الاجتماعات في وقتها.');
    } finally {
      setIsDayPlanningLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Greeting & Riyadh Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-50 tracking-tight">
            مرحباً، {user.name} 👋
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            اليوم جاهز للتنفيذ — الالتزامات واضحة، ولا شيء يسقط أو يُنسى.
          </p>
        </div>

        {/* Quick Day Plan & Smart Reminder Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsSmartReminderModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition shadow-sm"
            title="التذكير والجدولة الذكية للالتزامات والقرارات بالذكاء الاصطناعي"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
            <span>التذكير الذكي</span>
            {urgentCommitmentsAndDecisionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {urgentCommitmentsAndDecisionsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handlePlanDay(false)}
            disabled={isDayPlanningLoading}
            className="px-3.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>خطط يومي</span>
          </button>
          <button
            onClick={() => handlePlanDay(true)}
            disabled={isDayPlanningLoading}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>اليوم انضغط!</span>
          </button>
        </div>
      </div>

      {/* 2. Key Executive Summary Metric Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">المتأخرات</span>
            <div className="text-xl sm:text-2xl font-heading font-bold text-rose-400 mt-0.5">
              {overdueItems.length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">مهام اليوم</span>
            <div className="text-xl sm:text-2xl font-heading font-bold text-amber-400 mt-0.5">
              {todayTasks.length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ListTodo className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">اجتماعات اليوم</span>
            <div className="text-xl sm:text-2xl font-heading font-bold text-cyan-400 mt-0.5">
              {todayMeetings.length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">وقت العمل المسجل</span>
            <div className="text-xl sm:text-2xl font-heading font-bold text-emerald-400 mt-0.5">
              {Math.floor(totalTimeLoggedToday / 60)} س {totalTimeLoggedToday % 60} د
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Smart Reminder & Proactive Scheduling Executive Banner */}
      {urgentCommitmentsAndDecisionsCount > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-xs sm:text-sm text-slate-100">
                  التذكير الذكي: رصد {urgentCommitmentsAndDecisionsCount} التزاماً وقراراً مصيرياً بحاجة للجدولة أو الحسم
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  أولوية عاجلة
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                توزيع استباقي للمواعيد النهائية وحسم الخيارات بالذكاء الاصطناعي لمنع تعطل المشاريع.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setIsSmartReminderModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>فتح الجدولة والتذكير الذكي</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. The Unified Executive Command Box («وش تبي ننجز؟») */}
      <ExecutiveCommandBox />

      {/* 4. Active Running Task Bar (if running) */}
      <ActiveTaskBar />

      {/* Day Plan AI Guidance Accordion (if requested) */}
      {dayPlanAdvice && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {isDayCompressed ? 'خطة الطوارئ لإعادة الجدولة وتخفيف الضغط' : 'اقتراح المستشار التنفيذي لليوم'}
            </span>
            <button
              onClick={() => setDayPlanAdvice(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              إغلاق
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-sans">
            {dayPlanAdvice}
          </p>
        </div>
      )}

      {/* 5. Upcoming Meetings Section */}
      {todayMeetings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>اجتماعات اليوم ({todayMeetings.length})</span>
            </h3>
            <span className="text-xs text-slate-400">Google Calendar متزامن</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayMeetings.map(meeting => {
              const entity = entities.find(e => e.id === meeting.entityId);
              return (
                <div
                  key={meeting.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {entity && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
                          >
                            {entity.name}
                          </span>
                        )}
                        <span className="text-xs font-mono text-cyan-400">
                          {meeting.meetingDetails?.startTime || 'اليوم'}
                        </span>
                      </div>
                      <h4 className="font-heading font-semibold text-sm sm:text-base text-slate-100 mt-1 truncate">
                        {meeting.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => onOpenMeetingDebrief(meeting)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 font-medium shrink-0 flex items-center gap-1 transition"
                      title="محضر الاجتماع وتجهيز الأجندة"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>إقفال الاجتماع</span>
                    </button>
                  </div>

                  {meeting.meetingDetails?.agenda && meeting.meetingDetails.agenda.length > 0 && (
                    <div className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 font-bold block mb-1">الأجندة المعتمدة:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {meeting.meetingDetails.agenda.map((ag, i) => (
                          <li key={i}>{ag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        التقويم: <span className="text-slate-200">{entity?.calendarName || 'التقويم الأساسي'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {meeting.meetingDetails?.calendarSyncStatus === 'synced' ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium text-[10px]">
                          <Check className="w-3 h-3" />
                          <span>متزامن مع Google</span>
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await pushMeetingToGoogleCalendar(meeting.id);
                              alert('تمت إضافة الاجتماع بنجاح إلى Google Calendar!');
                            } catch (e: any) {
                              alert('يرجى التحقق من ربط Google Calendar في شاشة التكاملات.');
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-medium text-[10px] border border-cyan-800 transition"
                        >
                          أضف لـ Google Calendar
                        </button>
                      )}

                      {meeting.meetingDetails?.link && (
                        <a
                          href={meeting.meetingDetails.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 mr-2"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Meet</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Overdue Tasks Alert (if any) */}
      {overdueItems.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              مهام تجاوزت الموعد النهائي المحدد ({overdueItems.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {overdueItems.map(item => {
              const entity = entities.find(e => e.id === item.entityId);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-rose-900/30 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => toggleCompleteItem(item.id)}
                      className="w-4 h-4 rounded border border-rose-500/50 hover:bg-rose-500/20 flex items-center justify-center shrink-0"
                    >
                      {item.status === 'completed' && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                    <span className="text-slate-200 truncate">{item.title}</span>
                    {entity && (
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                        {entity.name}
                      </span>
                    )}
                  </div>
                  <span className="text-rose-400 font-mono text-[11px] shrink-0">
                    استحق في: {item.dueDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Entity / Space Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setSelectedEntityId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              selectedEntityId === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            جميع الجهات
          </button>
          {entities.map(ent => (
            <button
              key={ent.id}
              onClick={() => setSelectedEntityId(ent.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                selectedEntityId === ent.id
                  ? 'bg-slate-800 text-slate-50 border border-slate-700 shadow'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ent.color }} />
              <span>{ent.name}</span>
            </button>
          ))}
        </div>

        {/* Big vs Small filter toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSizeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
              activeSizeFilter === 'all' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setActiveSizeFilter('big')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
              activeSizeFilter === 'big' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            كبيرة
          </button>
          <button
            onClick={() => setActiveSizeFilter('small')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
              activeSizeFilter === 'small' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
            }`}
          >
            صغيرة
          </button>
        </div>
      </div>

      {/* 8. Today's Tasks: Categorized by Big & Small with "وش معطلني؟" */}
      <div className="space-y-4">
        {todayTasks.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-3" />
            <h4 className="font-heading font-semibold text-slate-200 text-base">
              لا توجد مهام متبقية لليوم!
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              أملِ أو اكتب التزاماً جديداً في المربع بالأعلى وسيتم تنظيمه مباشرة.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayTasks
              .filter(t => (activeSizeFilter === 'all' ? true : t.size === activeSizeFilter))
              .map(task => {
                const entity = entities.find(e => e.id === task.entityId);

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition group space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleCompleteItem(task.id)}
                          className="mt-0.5 w-5 h-5 rounded-lg border border-slate-700 hover:border-amber-500 flex items-center justify-center shrink-0 transition"
                        >
                          {task.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {entity && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
                              >
                                {entity.name}
                              </span>
                            )}

                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                task.priority === 'urgent'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : task.priority === 'high'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'أولوية عالية' : 'عادي'}
                            </span>

                            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                              {task.size === 'big' ? 'مهمة كبيرة' : 'صغيرة'}
                            </span>

                            {task.isBlockingMe && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                بانتظار قرارك!
                              </span>
                            )}
                          </div>

                          <h4
                            onClick={() => onOpenItemModal(task)}
                            className="font-heading font-semibold text-sm sm:text-base text-slate-100 hover:text-amber-300 cursor-pointer mt-1.5"
                          >
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Start timer */}
                        <button
                          onClick={() => startTimer(task.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-slate-700 transition"
                          title="بدء قياس الوقت لهذه المهمة الآن"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* "وش معطلني؟" */}
                        <button
                          onClick={() => {
                            setUnblockingItem(task);
                            setAiUnblockAdvice(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                          title="حل التعطل واقتراح المعالجة"
                        >
                          وش معطلني؟
                        </button>

                        <button
                          onClick={() => onOpenItemModal(task)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                          title="تفاصيل المهمة"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Meta info strip */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{task.assignee || user.name}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.timeEstimateMinutes || 30} د</span>
                        </span>
                        {task.checklist && task.checklist.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            <span>
                              {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                            </span>
                          </span>
                        )}
                      </div>

                      {task.dueDate && (
                        <span className="font-mono text-slate-400 text-[11px]">
                          التسليم: {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 9. "أقدر أسويها عنك" (AI Quick Action Automations) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-heading font-bold text-sm sm:text-base text-slate-100">
              أقدر أسويها عنك ⚡
            </h4>
          </div>
          <span className="text-xs text-slate-400">مساعدك التنفيذي المباشر</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => {
              addItem({
                title: 'صياغة خطاب رسمي للمورد لاعتماد عرض الأسعار',
                type: 'task',
                priority: 'high',
                entityId: 'entity-omnia',
                context: 'computer',
                timeEstimateMinutes: 15,
              });
            }}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-right space-y-1 transition group"
          >
            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 block">
              صياغة خطاب رسمي
            </span>
            <span className="text-[11px] text-slate-400 block">
              تجهيز مسودة مؤسسية معتمدة لأمنية
            </span>
          </button>

          <button
            onClick={() => {
              addItem({
                title: 'تجهيز أجندة اجتماع الشركاء للربع القادم',
                type: 'task',
                priority: 'medium',
                entityId: 'entity-clamonies',
                context: 'review',
                timeEstimateMinutes: 20,
              });
            }}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-right space-y-1 transition group"
          >
            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 block">
              إعداد أجندة الاجتماع
            </span>
            <span className="text-[11px] text-slate-400 block">
              جمع النقاط العالقة لكلايمونيز
            </span>
          </button>

          <button
            onClick={() => {
              addItem({
                title: 'تجميع رسائل المتابعة للموردين المتأخرين',
                type: 'followup',
                priority: 'urgent',
                entityId: 'entity-belza',
                context: 'call',
                timeEstimateMinutes: 10,
              });
            }}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-right space-y-1 transition group"
          >
            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 block">
              رسائل متابعة واتساب
            </span>
            <span className="text-[11px] text-slate-400 block">
              صياغة تذكير مباشر للطرف الخارجي
            </span>
          </button>
        </div>
      </div>

      {/* 10. "أُنجز اليوم" (Collapsible Completed Section with Undo) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <button
          onClick={() => setIsCompletedSectionOpen(!isCompletedSectionOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>أُنجز اليوم ({completedToday.length})</span>
          </div>
          {isCompletedSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isCompletedSectionOpen && (
          <div className="p-3 pt-0 space-y-2 border-t border-slate-800/60">
            {completedToday.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                لم يتم إنجاز أي مهام اليوم بعد.
              </p>
            ) : (
              completedToday.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400"
                >
                  <div className="flex items-center gap-2 line-through">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item.title}</span>
                  </div>
                  <button
                    onClick={() => toggleCompleteItem(item.id)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                  >
                    تراجع
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* "وش معطلني؟" Modal */}
      {unblockingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>وش معطلني في: "{unblockingItem.title}"؟</span>
              </h3>
              <button
                onClick={() => setUnblockingItem(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1.5">حدد سبب التعطل الأساسي:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'missing_info', label: 'معلومات ناقصة' },
                    { id: 'waiting_person', label: 'انتظار طرف/شخص' },
                    { id: 'decision', label: 'قرار معلق مني' },
                    { id: 'too_big', label: 'حجم المهمة كبير' },
                    { id: 'priority_change', label: 'تغيير أولوية' },
                    { id: 'none', label: 'لا يوجد عائق (إلغاء)' },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setUnblockReason(r.id as BlockerReason)}
                      className={`p-2 rounded-lg border text-right transition ${
                        unblockReason === r.id
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-850 border-slate-700 text-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">تفاصيل إضافية عن العائق:</label>
                <input
                  type="text"
                  value={unblockNotes}
                  onChange={e => setUnblockNotes(e.target.value)}
                  placeholder="مثال: ننتظر رد أحمد على موافقة الأسعار"
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {aiUnblockAdvice && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-slate-200">
                  <span className="text-[11px] font-bold text-amber-300 block mb-1">
                    مقترح الذكاء الاصطناعي لحسم التعطل:
                  </span>
                  <p className="leading-relaxed">{aiUnblockAdvice}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setUnblockingItem(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
              >
                إغلاق
              </button>
              <button
                onClick={handleResolveUnblock}
                disabled={isUnblockingLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                {isUnblockingLoading ? 'جاري التحليل...' : 'تسجيل العائق واقتراح الحل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
