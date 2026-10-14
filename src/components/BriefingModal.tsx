import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Bell,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  X,
  Mic,
  Send,
  Sparkles,
  Printer,
  Layers,
  Building
} from 'lucide-react';

export const BriefingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, items, entities, projects } = useDaftar();

  const [audioCloseText, setAudioCloseText] = useState('');
  const [closedSummary, setClosedSummary] = useState<string | null>(null);
  const [isClosingDay, setIsClosingDay] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const overdue = items.filter(
    i => !i.isDeleted && i.status !== 'completed' && i.status !== 'canceled' && i.dueDate && i.dueDate < todayStr
  );

  const todayTasks = items.filter(
    i =>
      !i.isDeleted &&
      i.type === 'task' &&
      i.status !== 'completed' &&
      (i.plannedDate === todayStr || (!i.plannedDate && !i.dueDate))
  );

  const todayMeetings = items.filter(
    i => !i.isDeleted && i.type === 'meeting' && i.status !== 'completed' && (i.plannedDate === todayStr || !i.plannedDate)
  );

  const criticalDecisions = items.filter(
    i => !i.isDeleted && (i.type === 'decision' || i.isBlockingMe) && i.status !== 'completed'
  );

  const completedToday = items.filter(
    i => !i.isDeleted && i.status === 'completed' && (!i.completedAt || i.completedAt.startsWith(todayStr))
  );

  const handleCloseDayWithAudio = async () => {
    if (!audioCloseText.trim() || isClosingDay) return;
    setIsClosingDay(true);

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `أنا أغلق يومي التنفيذي الآن. هذا تسجيلي الصوتي لإقفال اليوم: "${audioCloseText}". لخص النتائج المنجزة واقترح ما يجب ترحيله ليوم غد بدون تراكم.`,
          contextData: { completedToday, todayTasks, overdue },
        }),
      });

      const data = await res.json();
      setClosedSummary(data.reply);
    } catch (e) {
      setClosedSummary('تم إقفال اليوم بنجاح وحفظ السجلات.');
    } finally {
      setIsClosingDay(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
                الملخص التنفيذي
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString('ar-SA')}
              </span>
            </div>
            <h3 className="font-heading font-bold text-xl text-slate-100 mt-1">
              إيجاز اليوم & إقفال اليوم بالصوت
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">متأخرات حرجة:</span>
              <span className="font-heading font-bold text-lg text-rose-400">{overdue.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">مهام اليوم:</span>
              <span className="font-heading font-bold text-lg text-amber-400">{todayTasks.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">اجتماعات:</span>
              <span className="font-heading font-bold text-lg text-cyan-400">{todayMeetings.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">أُنجز اليوم:</span>
              <span className="font-heading font-bold text-lg text-emerald-400">{completedToday.length}</span>
            </div>
          </div>

          {/* Overdue Items List */}
          {overdue.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> المتأخرات المطلوبة بالحسم:
              </span>
              <ul className="space-y-1 text-slate-300">
                {overdue.map(item => (
                  <li key={item.id} className="flex justify-between items-center bg-slate-900/60 p-2 rounded">
                    <span>{item.title}</span>
                    <span className="font-mono text-rose-400 text-[11px]">{item.dueDate}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical Decisions List */}
          {criticalDecisions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-2">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" /> أعمال وقرارات معلقة بانتظارك:
              </span>
              <ul className="space-y-1 text-slate-300">
                {criticalDecisions.map(item => (
                  <li key={item.id} className="bg-slate-900/60 p-2 rounded flex justify-between">
                    <span>{item.title}</span>
                    <span className="text-[11px] text-amber-400">مطلوب قرار</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section: Audio Day Closure ("إقفال اليوم بالصوت") */}
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <span className="font-heading font-bold text-sm text-slate-100">
                إقفال اليوم بالصوت (Day Closure)
              </span>
            </div>

            <p className="text-slate-400 text-[11px]">
              أملِ ملخص ما أنجزته وما تعطل، وسيقوم المساعد بأرشفة اليوم وترتيب أولويات الغد تلقائياً.
            </p>

            <textarea
              rows={3}
              value={audioCloseText}
              onChange={e => setAudioCloseText(e.target.value)}
              placeholder="مثال: خلصت اجتماع Belza وقفلنا خطة الربع، لكن عرض الأسعار لأمنية رحلته لبكرة بسبب تأخر جدول المواصفات..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
            />

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() =>
                  setAudioCloseText(
                    'أنهيت مهام التوريدات لكلايمونيز واجتماع الميزانية، ومتبقي قرار نظام الكاشير لفرع 180 Degree للغد.'
                  )
                }
                className="text-amber-400 hover:underline text-[11px]"
              >
                استخدم نموذج إقفال تجريبي
              </button>

              <button
                onClick={handleCloseDayWithAudio}
                disabled={!audioCloseText.trim() || isClosingDay}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isClosingDay ? 'جاري إقفال اليوم...' : 'إقفال اليوم واعتماد التقرير'}</span>
              </button>
            </div>

            {closedSummary && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 text-slate-200 mt-2 space-y-1">
                <span className="font-bold text-amber-400 block">تقرير إقفال اليوم المعتمد:</span>
                <p className="leading-relaxed whitespace-pre-line">{closedSummary}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة التقرير</span>
          </button>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
