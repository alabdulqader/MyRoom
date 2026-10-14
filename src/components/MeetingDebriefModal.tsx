import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Calendar,
  Sparkles,
  Mic,
  Send,
  Check,
  CheckCircle,
  Clock,
  ListTodo,
  ShieldCheck,
  X,
  FileText
} from 'lucide-react';
import { Item } from '../types';

export const MeetingDebriefModal: React.FC<{
  meeting: Item;
  onClose: () => void;
}> = ({ meeting, onClose }) => {
  const { entities, addItem, updateItem } = useDaftar();

  const [rawDebriefNotes, setRawDebriefNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedDebrief, setExtractedDebrief] = useState<{
    summary?: string;
    decisions?: string[];
    actionItems?: Array<{ title: string; assignee?: string; dueDate?: string; priority?: string }>;
    followups?: string[];
    nextMeeting?: string;
  } | null>(null);

  const entity = entities.find(e => e.id === meeting.entityId);

  const handleProcessDebrief = async () => {
    if (!rawDebriefNotes.trim() || isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/meeting-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawNotes: rawDebriefNotes,
          meetingTitle: meeting.title,
          entityName: entity?.name || 'عامة',
        }),
      });

      const data = await res.json();
      setExtractedDebrief(data);
    } catch (e) {
      console.error(e);
      alert('تعذر استخراج محضر الاجتماع ذكياً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdoptAndSaveAll = () => {
    if (!extractedDebrief) return;

    // 1. Update the meeting with minutes summary
    updateItem(meeting.id, {
      status: 'completed',
      meetingDetails: {
        ...(meeting.meetingDetails || {
          startTime: '10:00',
          durationMinutes: 60,
          location: 'مقر العمل',
          attendees: [],
          agenda: [],
          prepChecklist: [],
          calendarSyncStatus: 'synced',
        }),
        minutesSummary: extractedDebrief.summary,
      },
    });

    // 2. Add action items to Daftar
    extractedDebrief.actionItems?.forEach(act => {
      addItem({
        title: act.title,
        type: 'task',
        entityId: meeting.entityId,
        assignee: act.assignee || meeting.assignee,
        dueDate: act.dueDate,
        priority: (act.priority as any) || 'medium',
        source: 'system',
      });
    });

    // 3. Add decisions if any
    extractedDebrief.decisions?.forEach(dec => {
      addItem({
        title: `قرار معتمد من اجتماع ${meeting.title}: ${dec}`,
        type: 'decision',
        entityId: meeting.entityId,
        status: 'completed',
        decisionDetails: {
          question: dec,
          options: [{ id: 'opt-1', label: dec, pros: 'تم اعتماده بالاجتماع', cons: '' }],
          approvedOption: 'opt-1',
          rationale: `اعتمد في اجتماع ${meeting.title}`,
        },
      });
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-800">
                إقفال الاجتماع والمحضر
              </span>
              {entity && <span className="text-xs text-slate-400 font-bold">{entity.name}</span>}
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-100 mt-1">
              {meeting.title}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {!extractedDebrief ? (
            <div className="space-y-3">
              <label className="text-slate-300 font-bold block">
                أملِ أو اكتب ملخص ما دار في الاجتماع والقرارات والمهام:
              </label>
              <textarea
                rows={5}
                value={rawDebriefNotes}
                onChange={e => setRawDebriefNotes(e.target.value)}
                placeholder="مثال: اتفقنا على اعتماد المورد الأول بخصم 10%، محمد يستلم توقيع العقد قبل الخميس، وأحمد يتابع التراخيص البلدية..."
                className="w-full bg-slate-850 border border-slate-700 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRawDebriefNotes(
                      'اتفقنا على اعتماد عرض شركة أمنية، محمد يراجع بنود العقد غداً، وأحمد يتابع شحنة التوريدات يوم الخميس.'
                    );
                  }}
                  className="text-amber-400 hover:underline text-[11px]"
                >
                  استخدم نصاً تجريبياً للمحضر
                </button>
                <button
                  onClick={handleProcessDebrief}
                  disabled={!rawDebriefNotes.trim() || isLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow transition disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoading ? 'جاري التحليل واستخراج المحضر...' : 'استخراج المحضر والقرارات'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Results of extraction */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 block">المحضر التنفيذي الموجز:</span>
                <p className="text-slate-200 leading-relaxed font-sans">{extractedDebrief.summary}</p>
              </div>

              {extractedDebrief.decisions && extractedDebrief.decisions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> القرارات المحسومة ({extractedDebrief.decisions.length}):
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-200">
                    {extractedDebrief.decisions.map((dec, i) => (
                      <li key={i}>{dec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {extractedDebrief.actionItems && extractedDebrief.actionItems.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4" /> المهام الناتجة والتكليفات ({extractedDebrief.actionItems.length}):
                  </span>
                  <div className="space-y-1.5">
                    {extractedDebrief.actionItems.map((act, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900">
                        <span className="text-slate-200">{act.title}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          المسؤول: {act.assignee || 'أنت'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs">
            إغلاق
          </button>
          {extractedDebrief && (
            <button
              onClick={handleAdoptAndSaveAll}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow"
            >
              <CheckCircle className="w-4 h-4" />
              <span>اعتماد المحضر وحفظ المهام في الدفتر</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
