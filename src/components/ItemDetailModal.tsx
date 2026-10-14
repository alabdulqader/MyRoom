import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  X,
  Calendar,
  Clock,
  User,
  Building,
  Flag,
  CheckSquare,
  Sparkles,
  Trash2,
  Share2,
  Check,
  Play,
  RotateCcw,
  ListTodo,
  ShieldCheck,
  AlertCircle,
  Paperclip,
  Activity
} from 'lucide-react';
import { Item, ItemType, ItemStatus, PriorityLevel, ExecutionContext, FocusLevel } from '../types';

export const ItemDetailModal: React.FC<{
  item: Item;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const {
    entities,
    projects,
    updateItem,
    deleteItem,
    convertItemType,
    toggleChecklistItem,
    addChecklistItem,
    startTimer,
    toggleCompleteItem,
  } = useDaftar();

  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [priority, setPriority] = useState<PriorityLevel>(item.priority);
  const [context, setContext] = useState<ExecutionContext>(item.context);
  const [focusLevel, setFocusLevel] = useState<FocusLevel>(item.focusLevel);
  const [plannedDate, setPlannedDate] = useState(item.plannedDate || '');
  const [dueDate, setDueDate] = useState(item.dueDate || '');
  const [timeEstimate, setTimeEstimate] = useState(item.timeEstimateMinutes || 30);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [definitionOfDone, setDefinitionOfDone] = useState(item.definitionOfDone || '');

  // AI Breakdown state
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<string[]>([]);
  const [firstStep, setFirstStep] = useState<string | null>(null);

  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const entity = entities.find(e => e.id === item.entityId);

  const handleSaveChanges = () => {
    updateItem(item.id, {
      title,
      description,
      status,
      priority,
      context,
      focusLevel,
      plannedDate,
      dueDate,
      timeEstimateMinutes: timeEstimate,
      definitionOfDone,
    });
    onClose();
  };

  const handleBreakdownTask = async () => {
    setIsBreakingDown(true);
    try {
      const res = await fetch('/api/gemini/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, description: item.description }),
      });
      const data = await res.json();
      setBreakdownSteps(data.steps || []);
      setFirstStep(data.firstActionableStep || null);

      // Automatically add suggested steps to checklist
      if (data.steps && data.steps.length > 0) {
        data.steps.forEach((st: string) => addChecklistItem(item.id, st));
      }
    } catch (e) {
      alert('تعذر تجزئة المهمة حالياً.');
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    addChecklistItem(item.id, newChecklistText.trim());
    setNewChecklistText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {entity && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
              >
                {entity.name}
              </span>
            )}
            {/* Convert Item Type selector */}
            <select
              value={item.type}
              onChange={e => convertItemType(item.id, e.target.value as ItemType)}
              className="bg-slate-800 border border-slate-700 text-amber-300 text-xs px-2 py-0.5 rounded-lg focus:outline-none"
            >
              <option value="task">نوع: مهمة</option>
              <option value="meeting">نوع: اجتماع</option>
              <option value="decision">نوع: قرار</option>
              <option value="followup">نوع: متابعة</option>
              <option value="idea">نوع: فكرة</option>
              <option value="commitment">نوع: التزام</option>
              <option value="reference">نوع: ملاحظة مرجعية</option>
            </select>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Title input */}
          <div>
            <label className="text-slate-400 block mb-1">العنوان:</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-slate-400 block mb-1">الوصف والتفاصيل:</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-amber-500"
              placeholder="اكتب أي ملاحظات أو روابط أو معايير قبول..."
            />
          </div>

          {/* Status, Priority, Context Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">الحالة:</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ItemStatus)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
              >
                <option value="not_started">لم تبدأ</option>
                <option value="in_progress">جارية</option>
                <option value="paused">متوقفة</option>
                <option value="waiting">بانتظار طرف</option>
                <option value="needs_review">تحتاج مراجعة</option>
                <option value="completed">مكتملة</option>
                <option value="canceled">ملغاة</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">الأولوية:</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
              >
                <option value="urgent">عاجل جداً</option>
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="low">منخفضة</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">سياق التنفيذ:</label>
              <select
                value={context}
                onChange={e => setContext(e.target.value as ExecutionContext)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
              >
                <option value="computer">كمبيوتر</option>
                <option value="call">اتصال</option>
                <option value="visit">زيارة / فرع</option>
                <option value="review">مراجعة</option>
                <option value="general">عام</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">مستوى التركيز:</label>
              <select
                value={focusLevel}
                onChange={e => setFocusLevel(e.target.value as FocusLevel)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
              >
                <option value="deep">تركيز عميق</option>
                <option value="medium">متوسط</option>
                <option value="light">خفيف وسريع</option>
              </select>
            </div>
          </div>

          {/* Dates & Time Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">موعد التنفيذ المخطط:</label>
              <input
                type="date"
                value={plannedDate}
                onChange={e => setPlannedDate(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">الموعد النهائي للتسليم:</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">الوقت المقدر (دقيقة):</label>
              <input
                type="number"
                value={timeEstimate}
                onChange={e => setTimeEstimate(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Definition of Done */}
          <div>
            <label className="text-slate-400 block mb-1">تعريف الإنجاز (Definition of Done):</label>
            <input
              type="text"
              value={definitionOfDone}
              onChange={e => setDefinitionOfDone(e.target.value)}
              placeholder="مثال: تسليم التقرير للمدير التنفيذي واعتماده رسمياً"
              className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            />
          </div>

          {/* Checklist & AI Decomposition */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-cyan-400" /> قائمة التحقق والخطوات ({item.checklist.length})
              </span>
              <button
                type="button"
                onClick={handleBreakdownTask}
                disabled={isBreakingDown}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isBreakingDown ? 'جاري التجزئة...' : 'قسّم المهمة ذكياً'}</span>
              </button>
            </div>

            {firstStep && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200">
                <span className="text-[11px] font-bold text-amber-400 block mb-0.5">
                  أول خطوة قابلة للتنفيذ الفوري (First Actionable Step):
                </span>
                <span className="font-semibold">{firstStep}</span>
              </div>
            )}

            <div className="space-y-1.5">
              {item.checklist.map(chk => (
                <div
                  key={chk.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-850 border border-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => toggleChecklistItem(item.id, chk.id)}
                    className="w-4 h-4 rounded border border-slate-600 flex items-center justify-center text-emerald-400"
                  >
                    {chk.completed && <Check className="w-3 h-3" />}
                  </button>
                  <span className={`flex-1 ${chk.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {chk.text}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddChecklist} className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={e => setNewChecklistText(e.target.value)}
                placeholder="أضف خطوة أو بند تحقق..."
                className="flex-1 bg-slate-850 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium"
              >
                إضافة
              </button>
            </form>
          </div>

          {/* Activity Log / Audit Trail */}
          {item.activityLog && item.activityLog.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <span className="font-bold text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> سجل النشاط والتوثيق (Audit Trail):
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto text-[11px] text-slate-400">
                {item.activityLog.map(log => (
                  <div key={log.id} className="flex justify-between bg-slate-950/40 p-1.5 rounded">
                    <span>
                      {log.actor}: {log.action}
                    </span>
                    <span className="font-mono text-slate-600">
                      {new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف إلى السلة</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300 font-bold">تحذف هذه المهمة نهائياً؟</span>
                <button
                  onClick={() => {
                    deleteItem(item.id, true);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-bold"
                >
                  نعم، احذف
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                >
                  تراجع
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                startTimer(item.id);
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>بدء العداد الآن</span>
            </button>
            <button
              onClick={handleSaveChanges}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow"
            >
              حفظ التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
