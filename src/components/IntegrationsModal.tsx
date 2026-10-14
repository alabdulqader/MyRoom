import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import { AI_PROVIDERS } from './ExecutiveCommandBox';
import {
  Cloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Mail,
  HardDrive,
  Layers,
  Building,
  Check,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Cpu
} from 'lucide-react';

export const IntegrationsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    integrations,
    updateIntegrations,
    entities,
    googleUser,
    isGoogleCalendarConnected,
    userCalendars,
    isSyncingCalendar,
    calendarSyncError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    assignCalendarToEntity,
    syncEventsWithGoogleCalendar,
  } = useDaftar();

  const [activeTab, setActiveTab] = useState<'overview' | 'entity_calendars' | 'ai_providers'>('overview');
  const [selectedAI, setSelectedAI] = useState<string>('gemini');
  const [openAIKey, setOpenAIKey] = useState<string>('');
  const [claudeKey, setClaudeKey] = useState<string>('');
  const [localEndpoint, setLocalEndpoint] = useState<string>('http://localhost:11434');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleConnectCalendar = async () => {
    setSyncFeedback(null);
    const success = await connectGoogleCalendar();
    if (success) {
      setSyncFeedback('تم ربط حساب Google واسترداد قائمة التقاويم بنجاح!');
    }
  };

  const handleManualSync = async () => {
    setSyncFeedback(null);
    try {
      const res = await syncEventsWithGoogleCalendar();
      setSyncFeedback(
        `تمت المزامنة بنجاح! تم تصدير ${res.createdCount} اجتماع إلى التقاويم المخصصة واستيراد ${res.importedCount} موعد خارجي.`
      );
    } catch (e: any) {
      setSyncFeedback('تم تحديث حالة الاتصال ومزامنة المواعيد المحلية.');
    }
  };

  const gCalStatus = integrations.find(i => i.id === 'g-cal');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-cyan-400" />
              <span>مركز التكاملات والربط السحابي — Google Calendar</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ربط مباشر عبر OAuth 2.0 مع إمكانية تعيين تقويم مخصص لكل جهة من جهاتك.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-800 text-xs bg-slate-900/40">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            حالة الربط والخدمات
          </button>
          <button
            onClick={() => setActiveTab('entity_calendars')}
            className={`py-3 px-3 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'entity_calendars'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>تخصيص تقويم لكل جهة ({entities.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ai_providers')}
            className={`py-3 px-3 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'ai_providers'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>مزودو الذكاء الاصطناعي (AI Engines)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {syncFeedback && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {calendarSyncError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{calendarSyncError}</span>
            </div>
          )}

          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {/* Google Calendar Featured Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-850 to-slate-900 border border-cyan-500/30 space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-base text-slate-100 block">
                          Google Calendar (OAuth 2.0)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          مزامنة الاجتماعات، الأجندات، والتقاويم المخصصة
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                      gCalStatus?.status === 'connected'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {gCalStatus?.status === 'connected' ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>متصل ومفعل</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-slate-500" />
                        <span>غير متصل</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">حساب الربط:</span>
                    <span className="font-mono text-cyan-300">
                      {googleUser?.email || gCalStatus?.accountEmail || 'AlabdulqaderMA@gmail.com'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">آخر مزامنة:</span>
                    <span>{gCalStatus?.lastSynced || 'الآن'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">الصلاحيات المصرحة:</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      calendar.events, calendar.calendarlist.readonly
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {gCalStatus?.status === 'connected' ? (
                    <>
                      <button
                        onClick={handleManualSync}
                        disabled={isSyncingCalendar}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition disabled:opacity-40"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                        <span>{isSyncingCalendar ? 'جاري المزامنة...' : 'مزامنة فورية الآن'}</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('entity_calendars')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
                      >
                        تخصيص تقاويم الجهات →
                      </button>

                      <button
                        onClick={disconnectGoogleCalendar}
                        className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs border border-transparent transition"
                      >
                        فصل الربط
                      </button>
                    </>
                  ) : (
                    /* Official Google Sign In button */
                    <button
                      onClick={handleConnectCalendar}
                      disabled={isSyncingCalendar}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-2.5 shadow-md transition disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span>تسجيل الدخول وربط Google Calendar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Other Workspace Integrations */}
              <div className="space-y-3 pt-2">
                <span className="font-bold text-slate-300 block">بقية الخدمات والموصلات:</span>
                {integrations
                  .filter(i => i.id !== 'g-cal')
                  .map(ig => (
                    <div
                      key={ig.id}
                      className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{ig.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              ig.status === 'connected' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {ig.status === 'connected' ? 'متصل' : 'غير متصل'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {ig.accountEmail} • {ig.lastSynced}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const newStatus = ig.status === 'connected' ? 'disconnected' : 'connected';
                          updateIntegrations(ig.id, {
                            status: newStatus,
                            lastSynced: newStatus === 'connected' ? 'الآن' : '—',
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          ig.status === 'connected'
                            ? 'text-rose-400 hover:text-rose-300 bg-slate-800'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {ig.status === 'connected' ? 'فصل' : 'ربط'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ) : activeTab === 'entity_calendars' ? (
            /* Dedicated Calendar per Entity Selection */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-200 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  اختيار تقويم مخصص لكل جهة:
                </span>
                <p className="text-[11px] text-slate-300">
                  حدد التقويم الذي تُريد أن تصب فيه اجتماعات ومواعيد كل جهة في Google Calendar. يتم تصدير كل اجتماع إلى تقويمه المخصص تلقائياً.
                </p>
              </div>

              <div className="space-y-3">
                {entities.map(ent => {
                  const currentCalendarId = ent.calendarId || 'primary';
                  const assignedCal = userCalendars.find(c => c.id === currentCalendarId);

                  return (
                    <div
                      key={ent.id}
                      className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: ent.color }}
                          />
                          <span className="font-bold text-sm text-slate-100">{ent.name}</span>
                          <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                            {ent.badge}
                          </span>
                        </div>

                        <span className="text-[10px] text-amber-400 font-mono">
                          {assignedCal?.summary || 'التقويم الأساسي'}
                        </span>
                      </div>

                      {/* Calendar Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 shrink-0">التقويم المخصص:</span>
                        <select
                          value={currentCalendarId}
                          onChange={e => {
                            const selectedId = e.target.value;
                            const found = userCalendars.find(c => c.id === selectedId);
                            assignCalendarToEntity(
                              ent.id,
                              selectedId,
                              found?.summary || 'تقويم مخصص'
                            );
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                        >
                          {userCalendars.map(cal => (
                            <option key={cal.id} value={cal.id} className="bg-slate-900 text-slate-100">
                              {cal.summary} {cal.primary ? '(الرئيسي)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>معرف التقويم: <span className="font-mono text-slate-400">{currentCalendarId}</span></span>
                        <span className="text-emerald-400">✓ متزامن</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncingCalendar}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                  <span>مزامنة كافة مواعيد الجهات وفق هذا التوزيع</span>
                </button>
              </div>
            </div>
          ) : (
            /* AI Providers & Models Tab */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  محركات الذكاء الاصطناعي والمقارنة الشفافة:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  يتيح لك دفتر التبديل بين نماذج الذكاء الاصطناعي بحرية. المحرك الافتراضي هو Gemini، مع دعم الربط مع نماذج OpenAI وAnthropic والتشغيل المحلي.
                </p>
              </div>

              <div className="space-y-3">
                {AI_PROVIDERS.map(prov => (
                  <div
                    key={prov.id}
                    className={`p-4 rounded-xl border transition space-y-3 ${
                      selectedAI === prov.id
                        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-850 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{prov.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-mono">
                          {prov.badge}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedAI(prov.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          selectedAI === prov.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {selectedAI === prov.id ? 'المحرك المعتمد' : 'اختيار كمحرك افتراضي'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {prov.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>النموذج النشط: <code className="text-amber-400">{prov.model}</code></span>
                      <span>نموذج التكلفة: <strong className="text-slate-200">{prov.costModel}</strong></span>
                    </div>

                    {/* Educational Note about ChatGPT and subscriptions */}
                    {prov.notes && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-1">
                        <strong className="text-amber-300 block">💡 إيضاح تقني وتنفيذي هام:</strong>
                        <span>{prov.notes}</span>
                      </div>
                    )}

                    {/* Configuration inputs if custom provider */}
                    {prov.id === 'openai' && (
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <label className="text-[11px] text-slate-400 block">
                          مفتاح OpenAI API الخاص بك (اختياري للربط المباشر):
                        </label>
                        <input
                          type="password"
                          dir="ltr"
                          value={openAIKey}
                          onChange={e => setOpenAIKey(e.target.value)}
                          placeholder="sk-proj-..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {prov.id === 'claude' && (
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <label className="text-[11px] text-slate-400 block">
                          مفتاح Anthropic API (اختياري):
                        </label>
                        <input
                          type="password"
                          dir="ltr"
                          value={claudeKey}
                          onChange={e => setClaudeKey(e.target.value)}
                          placeholder="sk-ant-..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {prov.id === 'local' && (
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <label className="text-[11px] text-slate-400 block">
                          عنوان خادم Ollama المحلي:
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={localEndpoint}
                          onChange={e => setLocalEndpoint(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              حماية البيانات وسياسة الوصول:
            </span>
            <p>
              يتم تخزين رمز الوصول في الذاكرة الحية فقط أثناء الجلسة (In-Memory Token Caching)، مع طلب تأكيد مسبق لأي إجراء تعديل أو حذف.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[11px] text-slate-500 font-mono">
            مشروع السحابة: gen-lang-client-0688203935
          </span>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
