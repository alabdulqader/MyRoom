import React, { useState, useEffect } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  BellRing,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Building,
  ArrowUpRight,
  Send,
  HelpCircle,
  X,
  Zap,
  Check,
  CalendarCheck,
  Info,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SmartReminderItem, Item, ItemType, PriorityLevel } from '../types';

export const SmartReminderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenDecisionModal?: (item: Item) => void;
}> = ({ isOpen, onClose, onOpenDecisionModal }) => {
  const {
    items,
    entities,
    projects,
    addItem,
    smartRemindersBatch,
    isAnalyzingReminders,
    fetchSmartReminderSchedule,
    applySmartReminderSchedule,
    applySingleReminderSchedule,
    pushReminderToGoogleCalendar,
    isGoogleCalendarConnected,
    connectGoogleCalendar,
  } = useDaftar();

  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'decisions' | 'commitments' | 'timeline'>('all');
  const [syncedItemIds, setSyncedItemIds] = useState<Record<string, boolean>>({});
  const [appliedItemIds, setAppliedItemIds] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Add Commitment / Decision state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ItemType>('commitment');
  const [newEntityId, setNewEntityId] = useState<string>('');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('urgent');
  const [newDueDate, setNewDueDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const handleCreateAndSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmittingNew(true);
    try {
      const isDecision = newType === 'decision';
      const entId = newEntityId || entities[0]?.id || '';
      const created = addItem({
        title: newTitle.trim(),
        type: newType,
        entityId: entId,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        plannedDate: newDueDate || undefined,
        isBlockingMe: isDecision || newPriority === 'urgent',
        status: isDecision ? 'waiting' : 'not_started',
        decisionDetails: isDecision
          ? {
              question: newTitle.trim(),
              options: [
                { id: `opt-1-${Date.now()}`, label: 'الموافقة والاعتماد الفوري', pros: 'سرعة الإنجاز والبت', cons: '' },
                { id: `opt-2-${Date.now()}`, label: 'طلب تدقيق إضافي وتعديل الشروط', pros: 'تقليل المخاطر', cons: 'تأخير طفيف في الجدول' },
              ],
            }
          : undefined,
      });

      setNewTitle('');
      setShowAddForm(false);
      showToast(`تمت إضافة "${created.title}"، جاري وزن الأولوية والجدولة الذكية...`);

      // Refetch AI schedule batch so the newly added item gets scheduled immediately
      await fetchSmartReminderSchedule();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Auto-fetch if modal opened and no batch exists yet
  useEffect(() => {
    if (isOpen && (!smartRemindersBatch || smartRemindersBatch.recommendations.length === 0)) {
      fetchSmartReminderSchedule().catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const recommendations = smartRemindersBatch?.recommendations || [];

  // Filter recommendations based on activeTab
  const filteredRecs = recommendations.filter(rec => {
    if (activeTab === 'critical') {
      return (
        rec.suggestedSchedule.urgencyGrade === 'critical' ||
        rec.suggestedSchedule.deadlineStatus === 'overdue' ||
        rec.suggestedSchedule.deadlineStatus === 'due_today'
      );
    }
    if (activeTab === 'decisions') {
      return rec.type === 'decision';
    }
    if (activeTab === 'commitments') {
      return rec.type === 'commitment' || rec.type === 'followup' || rec.isBlockingMe;
    }
    return true;
  });

  const handleApplySingle = (rec: SmartReminderItem) => {
    applySingleReminderSchedule(rec);
    setAppliedItemIds(prev => ({ ...prev, [rec.itemId]: true }));
    showToast(`تم اعتماد الموعد [${rec.suggestedSchedule.suggestedDate} - ${rec.suggestedSchedule.suggestedTimeSlot}] بنجاح`);
  };

  const handleApplyAll = () => {
    applySmartReminderSchedule(recommendations);
    const newApplied: Record<string, boolean> = {};
    recommendations.forEach(r => {
      newApplied[r.itemId] = true;
    });
    setAppliedItemIds(newApplied);
    showToast(`تم تطبيق الجدولة الذكية لـ ${recommendations.length} التزاماً وقراراً بنجاح!`);
  };

  const handleSyncToCalendar = async (rec: SmartReminderItem) => {
    const item = items.find(i => i.id === rec.itemId);
    if (!item) return;

    if (!isGoogleCalendarConnected) {
      const ok = await connectGoogleCalendar();
      if (!ok) return;
    }

    const success = await pushReminderToGoogleCalendar(
      item,
      rec.suggestedSchedule.suggestedDate,
      rec.suggestedSchedule.suggestedTimeSlot
    );

    if (success) {
      setSyncedItemIds(prev => ({ ...prev, [rec.itemId]: true }));
      showToast('تم تصدير التذكير الذكي إلى Google Calendar بنجاح');
    } else {
      showToast('فشل التصدير إلى التقويم، يرجى مراجعة إعدادات الربط');
    }
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
  };

  // Group by date for timeline tab
  const timelineGroups: Record<string, SmartReminderItem[]> = {};
  recommendations.forEach(rec => {
    const d = rec.suggestedSchedule.suggestedDate;
    if (!timelineGroups[d]) timelineGroups[d] = [];
    timelineGroups[d].push(rec);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-lg sm:text-xl text-slate-100">
                  التذكير والجدولة الذكية للالتزامات والقرارات
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                توزيع استباقي للمواعيد النهائية وحسم القرارات وفق الأولوية لمنع التعطيل وتخفيف الحمل الذهني.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSmartReminderSchedule()}
              disabled={isAnalyzingReminders}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
              title="إعادة فحص الالتزامات والجدولة"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingReminders ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">إعادة التحليل</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 px-5 py-2.5 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* AI Strategic Insights Banner */}
        {smartRemindersBatch && (
          <div className="bg-slate-850/60 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                ملخص الرؤية التنفيذية:
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {smartRemindersBatch.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApplyAll}
                disabled={recommendations.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>اعتماد الجدولة الذكية للجميع ({recommendations.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-900/60 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              activeTab === 'all'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            جميع الالتزامات ({recommendations.length})
          </button>

          <button
            onClick={() => setActiveTab('critical')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'critical'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>حرج وداهم ({smartRemindersBatch?.criticalCount || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'decisions'
                ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>قرارات عالقة ({smartRemindersBatch?.pendingDecisionsCount || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('commitments')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'commitments'
                ? 'bg-purple-950/70 text-purple-300 border border-purple-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>التزامات ومتابعات</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-300" />
            <span>الجدول الزمني المقترح</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Quick Add Commitment / Decision for Smart Scheduling Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-850/90 border border-slate-800 hover:border-amber-500/30 transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>إدراج التزام أو قرار جديد في الجدولة الذكية</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal">
                      AI Priority
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    أضف أي قرار مطلوب أو التزام تنفيذي ليقوم الذكاء الاصطناعي بوزن أولويته وتحديد موعده الأمثل وتذكيرك به.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto shrink-0"
              >
                {showAddForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{showAddForm ? 'إخفاء النموذج' : '➕ أضف التزاماً أو قراراً'}</span>
              </button>
            </div>

            {/* Expanded Add Form */}
            {showAddForm && (
              <form onSubmit={handleCreateAndSchedule} className="mt-4 pt-3 border-t border-slate-800/80 space-y-3.5 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      عنوان الالتزام أو القرار المطلوب *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="مثال: حسم ترسية عقد المقاولات لمشروع فرع أمنية، أو إرسال تقرير الميزانية لكلايمونيز"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      نوع العنصر
                    </label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="decision">قرار مطلوب وحاسم (Decision)</option>
                      <option value="commitment">التزام تنفيذي مباشر (Commitment)</option>
                      <option value="followup">متابعة مع طرف خارجي (Follow-up)</option>
                      <option value="task">مهمة عاجلة (Task)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      الجهة المعنية
                    </label>
                    <select
                      value={newEntityId}
                      onChange={e => setNewEntityId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {entities.map(ent => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      مستوى الأولوية
                    </label>
                    <select
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value as PriorityLevel)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="urgent">🚨 عاجل وحاسم (يعطل العمل فوراً)</option>
                      <option value="high">📌 أولوية عالية استراتيجية</option>
                      <option value="medium">⏱️ متوسط</option>
                      <option value="low">☕ اعتيادي / مرن</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      الموعد النهائي المستهدف (Deadline)
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew || !newTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 transition"
                  >
                    {isSubmittingNew ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                    )}
                    <span>إضافة وجدولة فورية بالذكاء الاصطناعي</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {isAnalyzingReminders && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                يقوم الذكاء الاصطناعي الآن بتحليل أولويات المواعيد وتوزيع الجداول الاستباقية...
              </p>
              <p className="text-xs text-slate-500">
                تقييم القرارات العالقة، المواعيد النهائية، والاختناقات التشغيلية
              </p>
            </div>
          )}

          {!isAnalyzingReminders && filteredRecs.length === 0 && (
            <div className="py-16 text-center space-y-3 bg-slate-850/40 border border-slate-800 rounded-2xl p-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">لا توجد التزامات معلقة في هذا التصنيف</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                جميع القرارات والالتزامات مجدولة بشكل مريح أو مكتملة بنجاح. يمكنك دائماً إضافة التزامات جديدة من صندوق الأوامر التنفيذي.
              </p>
            </div>
          )}

          {!isAnalyzingReminders && activeTab !== 'timeline' && filteredRecs.map(rec => {
            const isApplied = appliedItemIds[rec.itemId] || rec.currentPlannedDate === rec.suggestedSchedule.suggestedDate;
            const isSynced = syncedItemIds[rec.itemId];

            const gradeBadge = {
              critical: { bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300', text: '🚨 حرج وفوري' },
              urgent: { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300', text: '⚠️ عاجل اليوم' },
              upcoming: { bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300', text: '⏳ مجدول قريباً' },
              proactive: { bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', text: '💡 استباقي' },
            }[rec.suggestedSchedule.urgencyGrade];

            const deadlineBadge = {
              overdue: { bg: 'bg-rose-950/80 text-rose-400 border-rose-800', label: 'الموعد منقضٍ (متأخر)' },
              due_today: { bg: 'bg-amber-950/80 text-amber-400 border-amber-800', label: 'الموعد النهائي اليوم' },
              due_soon: { bg: 'bg-slate-800 text-slate-300 border-slate-700', label: 'الموعد خلال 48 ساعة' },
              healthy: { bg: 'bg-slate-850 text-slate-400 border-slate-800', label: 'موعد مرن' },
            }[rec.suggestedSchedule.deadlineStatus];

            return (
              <div
                key={rec.itemId}
                className="p-4 sm:p-5 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 transition space-y-3.5 shadow-sm"
              >
                {/* Top Row: Entity, Type, and Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: rec.entityColor || '#f59e0b' }}
                    />
                    <span className="text-xs font-bold text-slate-300">
                      {rec.entityName}
                    </span>
                    {rec.projectName && (
                      <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700/60">
                        {rec.projectName}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {rec.type === 'decision'
                        ? '⚖️ قرار حاسم'
                        : rec.type === 'commitment'
                        ? '🤝 التزام'
                        : rec.type === 'followup'
                        ? '📞 متابعة'
                        : '📋 مهمة تنفيذية'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${gradeBadge.bg}`}>
                      {gradeBadge.text}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${deadlineBadge.bg}`}>
                      {deadlineBadge.label}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h4 className="font-heading font-bold text-sm sm:text-base text-slate-100 flex items-start gap-2">
                    <span>{rec.title}</span>
                  </h4>
                </div>

                {/* AI Reasoning & Action Box */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">مبرر التوقيت الذكي: </span>
                      <span className="text-[11px] text-slate-300 leading-relaxed">
                        {rec.suggestedSchedule.reasoning}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                    <span className="font-bold text-emerald-400">الإجراء المطلوب:</span>
                    <span className="text-slate-200 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                      {rec.suggestedSchedule.recommendedAction}
                    </span>
                  </div>
                </div>

                {/* Timing & Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>الموعد المقترح:</span>
                      <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {rec.suggestedSchedule.suggestedDate} ({rec.suggestedSchedule.suggestedTimeSlot})
                      </span>
                    </div>

                    <span className="text-slate-600">|</span>
                    <span className="text-[11px]">المدة التقديرية: {rec.suggestedSchedule.estimatedMinutes} دقيقة</span>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* If decision, offer direct approval */}
                    {rec.type === 'decision' && onOpenDecisionModal && (
                      <button
                        onClick={() => {
                          const it = items.find(i => i.id === rec.itemId);
                          if (it) onOpenDecisionModal(it);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>حسم القرار الآن</span>
                      </button>
                    )}

                    {/* Google Calendar Sync */}
                    <button
                      onClick={() => handleSyncToCalendar(rec)}
                      disabled={isSynced}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
                        isSynced
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                      title="إضافة تذكير في تقويم Google"
                    >
                      {isSynced ? (
                        <>
                          <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>في التقويم</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>تقويم Google</span>
                        </>
                      )}
                    </button>

                    {/* Apply Schedule */}
                    <button
                      onClick={() => handleApplySingle(rec)}
                      disabled={isApplied}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isApplied
                          ? 'bg-slate-800 border border-slate-700 text-emerald-400 cursor-default'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>معتمد بالجدول</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>اعتماد الموعد</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Timeline View */}
          {!isAnalyzingReminders && activeTab === 'timeline' && (
            <div className="space-y-6">
              {Object.keys(timelineGroups).sort().map(dateStr => {
                const dayRecs = timelineGroups[dateStr];
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div key={dateStr} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <h4 className="font-heading font-bold text-sm text-slate-200">
                        {isToday ? `اليوم (${dateStr})` : dateStr}
                      </h4>
                      <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        {dayRecs.length} التزامات/قرارات
                      </span>
                    </div>

                    <div className="space-y-2 border-r-2 border-slate-800 pr-4 mr-1">
                      {dayRecs.map(rec => (
                        <div
                          key={rec.itemId}
                          className="p-3.5 rounded-xl bg-slate-850 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                                {rec.suggestedSchedule.suggestedTimeSlot}
                              </span>
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: rec.entityColor || '#f59e0b' }}
                              />
                              <span className="text-slate-400 text-[11px]">{rec.entityName}</span>
                            </div>
                            <span className="font-bold text-slate-200 block">{rec.title}</span>
                            <span className="text-[11px] text-slate-400">{rec.suggestedSchedule.recommendedAction}</span>
                          </div>

                          <button
                            onClick={() => handleApplySingle(rec)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold shrink-0 text-xs"
                          >
                            اعتماد
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <span>يتم ضبط المواعيد تلقائياً وفق أولوية العمل لضمان عدم تضارب المهام الحيوية.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
