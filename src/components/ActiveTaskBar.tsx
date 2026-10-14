import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  Clock,
  Plus,
  Minus,
  Sparkles,
  Layers,
  Building
} from 'lucide-react';

export const ActiveTaskBar: React.FC = () => {
  const {
    activeTimer,
    items,
    entities,
    pauseTimer,
    resumeTimer,
    stopTimer,
    toggleCompleteItem,
    adjustTimeManual,
  } = useDaftar();

  const [showManualAdjust, setShowManualAdjust] = useState(false);

  if (!activeTimer.itemId) {
    return null;
  }

  const activeItem = items.find(i => i.id === activeTimer.itemId);
  if (!activeItem) return null;

  const entity = entities.find(e => e.id === activeItem.entityId);

  // Format elapsed time as HH:MM:SS
  const totalSeconds = activeTimer.elapsedSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');

  const totalLoggedMinutes = activeItem.timeActualMinutes + Math.round(totalSeconds / 60);
  const estimateMinutes = activeItem.timeEstimateMinutes || 30;

  return (
    <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-amber-950/20 relative overflow-hidden">
      {/* Background subtle glowing accent */}
      <div className="absolute top-0 right-0 w-64 h-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left (RTL Right): Active item details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-1">
            <Clock className={`w-5 h-5 ${activeTimer.isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                المهمة الجارية الآن
              </span>
              {entity && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
                >
                  {entity.name}
                </span>
              )}
              {activeItem.context && (
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                  {activeItem.context === 'computer' ? 'كمبيوتر' : activeItem.context === 'call' ? 'اتصال' : 'عام'}
                </span>
              )}
            </div>

            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-50 truncate mt-1">
              {activeItem.title}
            </h3>

            {/* Time comparison estimate vs logged */}
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>الفعلي: {totalLoggedMinutes} دقيقة</span>
              <span className="text-slate-600">•</span>
              <span>المخطط: {estimateMinutes} دقيقة</span>
              {totalLoggedMinutes > estimateMinutes && (
                <span className="text-rose-400 font-mono text-[11px]">
                  (+{totalLoggedMinutes - estimateMinutes} دقيقة تجاوز)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Large Digital Counter */}
        <div className="flex flex-col items-center justify-center bg-slate-950/80 px-6 py-2.5 rounded-xl border border-slate-800 self-center md:self-auto shadow-inner">
          <div className="font-mono font-bold text-2xl sm:text-3xl text-amber-400 tracking-wider">
            {formattedTime}
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            {activeTimer.isRunning ? 'العداد يعمل' : 'متوقف مؤقتاً'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {activeTimer.isRunning ? (
            <button
              onClick={pauseTimer}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              title="إيقاف مؤقت"
            >
              <Pause className="w-4 h-4 text-amber-400" />
              <span>إيقاف مؤقت</span>
            </button>
          ) : (
            <button
              onClick={resumeTimer}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow"
              title="استئناف العداد"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>استئناف</span>
            </button>
          )}

          <button
            onClick={stopTimer}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700 transition"
            title="حفظ الوقت وإنهاء الجلسة"
          >
            <Square className="w-3.5 h-3.5 text-slate-400" />
            <span>إنهاء العداد</span>
          </button>

          <button
            onClick={() => {
              stopTimer();
              toggleCompleteItem(activeItem.id);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition"
            title="تم الإنجاز"
          >
            <CheckCircle className="w-4 h-4" />
            <span>تم الإنجاز</span>
          </button>

          <button
            onClick={() => setShowManualAdjust(!showManualAdjust)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs transition"
            title="تعديل الوقت يدوياً"
          >
            ±
          </button>
        </div>
      </div>

      {/* Manual time adjust popover */}
      {showManualAdjust && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <span>تصحيح الوقت يدوياً:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustTimeManual(activeItem.id, -5)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              -5 دقائق
            </button>
            <button
              onClick={() => adjustTimeManual(activeItem.id, 5)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              +5 دقائق
            </button>
            <button
              onClick={() => adjustTimeManual(activeItem.id, 15)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              +15 دقيقة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
