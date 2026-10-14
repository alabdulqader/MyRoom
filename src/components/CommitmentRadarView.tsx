import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Radar,
  AlertOctagon,
  HelpCircle,
  Clock,
  CheckCircle,
  Copy,
  Send,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Building,
  User,
  ShieldCheck,
  Check,
  BellRing
} from 'lucide-react';
import { Item } from '../types';

export const CommitmentRadarView: React.FC = () => {
  const { items, entities, projects, approveDecision, updateItem, setIsSmartReminderModalOpen } = useDaftar();

  const [activeRadarTab, setActiveRadarTab] = useState<'blocking_me' | 'decisions' | 'followups' | 'stale'>('blocking_me');
  const [selectedDecisionItem, setSelectedDecisionItem] = useState<Item | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [decisionRationale, setDecisionRationale] = useState<string>('');
  const [copiedFollowupId, setCopiedFollowupId] = useState<string | null>(null);

  // Categorize items
  const nonDeleted = items.filter(i => !i.isDeleted);

  // 1. "هل أنا معطّل المشروع؟" - Items blocked waiting for current user's decision or input
  const blockingMeItems = nonDeleted.filter(
    i => i.isBlockingMe && i.status !== 'completed' && i.status !== 'canceled'
  );

  // 2. Pending Decisions
  const pendingDecisions = nonDeleted.filter(
    i => i.type === 'decision' && i.status !== 'completed' && i.status !== 'canceled'
  );

  // 3. Follow-ups waiting for external or internal parties
  const followUpItems = nonDeleted.filter(
    i => (i.type === 'followup' || i.status === 'waiting') && i.status !== 'completed' && i.status !== 'canceled'
  );

  // 4. Stale items (tasks without next step or projects without recent update)
  const staleItems = nonDeleted.filter(
    i => i.status !== 'completed' && (!i.plannedDate || i.blockerReason === 'missing_info')
  );

  const handleCopyMessage = (id: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedFollowupId(id);
    setTimeout(() => setCopiedFollowupId(null), 2500);
  };

  const handleApproveSelectedDecision = () => {
    if (!selectedDecisionItem || !selectedOptionId) return;
    approveDecision(selectedDecisionItem.id, selectedOptionId, decisionRationale);
    setSelectedDecisionItem(null);
    setSelectedOptionId('');
    setDecisionRationale('');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-slate-50 flex items-center gap-2">
            <Radar className="w-6 h-6 text-amber-400" />
            <span>رادار الالتزامات والقرارات الحيوية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            كشف الاختناقات: الأعمال المتوقفة عليك، القرارات العالقة، والمتابعات مع الأطراف الخارجية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Smart Reminder Trigger */}
          <button
            onClick={() => setIsSmartReminderModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition shrink-0"
          >
            <BellRing className="w-4 h-4 fill-slate-950" />
            <span>التذكير والجدولة الذكية (AI)</span>
          </button>

          {/* Radar Tab pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveRadarTab('blocking_me')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 shrink-0 ${
              activeRadarTab === 'blocking_me'
                ? 'bg-rose-950/80 text-rose-300 font-bold border border-rose-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>هل أنا معطّل المشروع؟ ({blockingMeItems.length})</span>
          </button>

          <button
            onClick={() => setActiveRadarTab('decisions')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 shrink-0 ${
              activeRadarTab === 'decisions'
                ? 'bg-amber-950/80 text-amber-300 font-bold border border-amber-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>القرارات المنتظرة ({pendingDecisions.length})</span>
          </button>

          <button
            onClick={() => setActiveRadarTab('followups')}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 shrink-0 ${
              activeRadarTab === 'followups'
                ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>المتابعات المشروطة ({followUpItems.length})</span>
          </button>
        </div>
      </div>
    </div>

      {/* Tab 1: "هل أنا معطّل المشروع؟" */}
      {activeRadarTab === 'blocking_me' && (
        <div className="space-y-3">
          {blockingMeItems.length === 0 ? (
            <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-heading font-bold text-slate-100 text-base">
                أنت لا تعطل أي مشروع حالياً! ✨
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                جميع المشاريع تسير بسلاسة دون وجود قرارات أو اعتمادات عالقة تنتظر تدخلك.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  هذه الأعمال متوقفة تماماً وتنتظر قرارك المباشر أو اعتمادك المالي لتستأنف الفرق عملها:
                </span>
              </div>

              {blockingMeItems.map(item => {
                const entity = entities.find(e => e.id === item.entityId);
                const project = projects.find(p => p.id === item.projectId);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900 border border-rose-900/50 hover:border-rose-700 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {entity && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                              style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
                            >
                              {entity.name}
                            </span>
                          )}
                          {project && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              مشروع: {project.name}
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800">
                            عائق: {item.blockerReason === 'decision' ? 'قرارك مطلوب' : item.blockerNotes || 'اعتماد معلق'}
                          </span>
                        </div>

                        <h3 className="font-heading font-bold text-base text-slate-100 mt-1.5">
                          {item.title}
                        </h3>

                        {item.blockerNotes && (
                          <p className="text-xs text-amber-300/90 bg-slate-950/60 p-2 rounded-lg border border-slate-800 mt-2">
                            سبب الانتظار: {item.blockerNotes}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          updateItem(item.id, { isBlockingMe: false, blockerReason: 'none' });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعتمدتُ الإجراء (فك التعطل)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Decisions & Audit ("ليش اتخذنا هذا القرار؟") */}
      {activeRadarTab === 'decisions' && (
        <div className="space-y-4">
          {pendingDecisions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-heading font-bold text-slate-200 text-base">
                لا توجد قرارات مفتوحة معلقة
              </h4>
              <p className="text-xs text-slate-500">
                يمكنك تسجيل أي قرار قادم بالصوت عبر شريط الإدخال.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDecisions.map(item => {
                const entity = entities.find(e => e.id === item.entityId);
                const dec = item.decisionDetails;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      {entity && (
                        <span
                          className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
                        >
                          {entity.name}
                        </span>
                      )}
                      <span className="text-[11px] text-amber-400 font-mono">
                        قرار تنفيذي
                      </span>
                    </div>

                    <div>
                      <h3 className="font-heading font-bold text-base text-slate-100">
                        {item.title}
                      </h3>
                      {dec?.question && (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          "{dec.question}"
                        </p>
                      )}
                    </div>

                    {/* Options list */}
                    {dec?.options && dec.options.length > 0 && (
                      <div className="space-y-2 text-xs">
                        <span className="text-slate-400 font-bold block">الخيارات المتاحة:</span>
                        {dec.options.map(opt => (
                          <div
                            key={opt.id}
                            className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 space-y-1"
                          >
                            <span className="font-bold text-slate-200 block">{opt.label}</span>
                            <div className="text-[11px] text-emerald-400">✓ {opt.pros}</div>
                            <div className="text-[11px] text-rose-400">✗ {opt.cons}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Missing info notice */}
                    {dec?.missingInfo && (
                      <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        معلومات ناقصة للمفاضلة: {dec.missingInfo}
                      </p>
                    )}

                    <button
                      onClick={() => {
                        setSelectedDecisionItem(item);
                        setSelectedOptionId(item.decisionDetails?.options[0]?.id || 'opt-1');
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                    >
                      حسم القرار وتسجيل أسبابه
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Conditional Follow-ups ("إذا لم يصل العرض الخميس ذكّرني") */}
      {activeRadarTab === 'followups' && (
        <div className="space-y-3">
          {followUpItems.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-cyan-400 mx-auto" />
              <h4 className="font-heading font-bold text-slate-200 text-base">
                لا توجد متابعات مشروطة معلقة
              </h4>
            </div>
          ) : (
            <div className="space-y-3">
              {followUpItems.map(item => {
                const entity = entities.find(e => e.id === item.entityId);
                const fup = item.followupDetails;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {entity && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                              style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
                            >
                              {entity.name}
                            </span>
                          )}
                          <span className="text-xs text-cyan-400 font-bold">
                            الطرف المعني: {fup?.partyName || item.assignee || 'طرف خارجي'}
                          </span>
                        </div>
                        <h4 className="font-heading font-semibold text-sm sm:text-base text-slate-100 mt-1">
                          {item.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          updateItem(item.id, { status: 'completed' });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        تم الاستلام
                      </button>
                    </div>

                    {fup?.condition && (
                      <p className="text-xs text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        الشرط المسجل: {fup.condition}
                      </p>
                    )}

                    {/* Pre-drafted WhatsApp message */}
                    {fup?.draftMessage && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            رسالة المتابعة الجاهزة للإرسال:
                          </span>
                          <button
                            onClick={() => handleCopyMessage(item.id, fup.draftMessage)}
                            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedFollowupId === item.id ? 'تم النسخ!' : 'نسخ النص'}</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {fup.draftMessage}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Decision Resolution Modal */}
      {selectedDecisionItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>حسم القرار وتوثيق أسبابه</span>
              </h3>
              <button
                onClick={() => setSelectedDecisionItem(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-300 block">{selectedDecisionItem.title}</span>

              <div>
                <label className="text-slate-400 block mb-1.5">اختر الخيار المعتمد:</label>
                <div className="space-y-2">
                  {selectedDecisionItem.decisionDetails?.options.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`w-full p-2.5 rounded-xl border text-right transition ${
                        selectedOptionId === opt.id
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-850 border-slate-800 text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  مبررات القرار («ليش اتخذنا هذا القرار؟»):
                </label>
                <textarea
                  rows={3}
                  value={decisionRationale}
                  onChange={e => setDecisionRationale(e.target.value)}
                  placeholder="سجل أسباب الاختيار حتى يظل التبرير محفوظاً مستقبلاً في سجل المشروع..."
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedDecisionItem(null)}
                className="px-3 py-1.5 text-slate-400 text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleApproveSelectedDecision}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                اعتماد القرار وتوثيقه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
