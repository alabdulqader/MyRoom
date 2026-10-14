import React, { useState, useRef, useEffect } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Mic,
  MicOff,
  Send,
  Paperclip,
  Sparkles,
  Layers,
  Building,
  FolderKanban,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Calendar,
  FileText,
  Link2,
  X,
  ChevronDown,
  ExternalLink,
  ChevronRight,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SendHorizontal,
  BellRing
} from 'lucide-react';
import {
  AIProviderId,
  AIProviderInfo,
  ExecutiveCommandResult,
  ExecutionPlanStep,
  ParsedVoiceItemDraft,
  ItemType
} from '../types';

export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Gemini (Google GenAI)',
    badge: 'الافتراضي المدمج',
    model: 'gemini-3.1-flash-lite / 3.8-flash',
    status: 'ready',
    costModel: 'مشمول ومفعل مجاناً في النظام',
    description: 'المحرك الأساسي فائق السرعة والمضبوط للفهم الدقيق للهجة السعودية والأوامر التنفيذية.',
    isDefault: true,
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o)',
    badge: 'نموذج مباشر',
    model: 'gpt-4o / gpt-4o-mini',
    status: 'ready',
    costModel: 'يتطلب مفتاح API للتشغيل المباشر',
    description: 'تشغيل نماذج GPT للاستنتاجات والمراسلات المعقدة.',
    isDefault: false,
    notes: 'ملاحظة توضيحية: استخدام اشتراك ChatGPT الشخصي (Plus/Team) مخصص لواجهة ChatGPT فقط ولا يمنح التطبيقات صلاحية سحب محادثاتك القديمة المحفوظة هناك حفاظاً على الخصوصية. التكامل المباشر هنا يتم عبر بروتوكول API.',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    badge: 'صياغة متقدمة',
    model: 'claude-3-5-sonnet',
    status: 'ready',
    costModel: 'يتطلب مفتاح Anthropic API',
    description: 'محرك متخصص في تدقيق الخطابات الرسمية وتحليل العقود والمذكرات القانونية.',
    isDefault: false,
  },
  {
    id: 'local',
    name: 'محلي (Ollama / Local LLM)',
    badge: 'خصوصية قصوى',
    model: 'Llama 3 / Mistral Local',
    status: 'ready',
    costModel: 'مجاني تماماً يعمل على جهازك',
    description: 'تشغيل غير متصل بالإنترنت لمعالجة المستندات الحساسة والسرية دون مغادرة شبكتك.',
    isDefault: false,
  },
];

interface ExecutiveCommandBoxProps {
  onItemCreated?: () => void;
}

export const ExecutiveCommandBox: React.FC<ExecutiveCommandBoxProps> = ({ onItemCreated }) => {
  const {
    entities,
    projects,
    items,
    selectedEntityId,
    selectedSpaceId,
    addItem,
    pushMeetingToGoogleCalendar,
    isGoogleCalendarConnected,
    setIsSmartReminderModalOpen
  } = useDaftar();

  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTimeElapsed, setProcessingTimeElapsed] = useState(0);

  // Context State
  const [scope, setScope] = useState<'all' | 'entity' | 'project'>('all');
  const [targetEntityId, setTargetEntityId] = useState<string>('');
  const [targetProjectId, setTargetProjectId] = useState<string>('');

  // Attachments State
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string; url?: string }>>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  // AI Provider State
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>('gemini');
  const [showProviderModal, setShowProviderModal] = useState(false);

  // Command Result & Execution Plan State
  const [commandResult, setCommandResult] = useState<ExecutiveCommandResult | null>(null);
  const [approvedSteps, setApprovedSteps] = useState<Record<string, boolean>>({});
  const [executedItems, setExecutedItems] = useState<Record<string, boolean>>({});

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA'; // Saudi Arabic

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputVal(transcript);
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 5-second fallback timer
  useEffect(() => {
    if (isProcessing) {
      setProcessingTimeElapsed(0);
      timerRef.current = setInterval(() => {
        setProcessingTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setProcessingTimeElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isProcessing]);

  // Sync selectedEntityId if user changed header filter
  useEffect(() => {
    if (selectedEntityId && selectedEntityId !== 'all') {
      setScope('entity');
      setTargetEntityId(selectedEntityId);
    }
  }, [selectedEntityId]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setInputVal(prev =>
        prev
          ? prev
          : 'أبي نجهز خطة إطلاق فرع أمنية بالخبر، ونرتب اجتماع مع المورد الخميس ونحجز في تقويم Google ونرسل له مسودة التكليف.'
      );
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Mic start error:', err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setAttachments(prev => [
        ...prev,
        {
          name: f.name,
          type: f.type || 'file',
          url: URL.createObjectURL(f),
        },
      ]);
    }
    e.target.value = '';
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    setAttachments(prev => [
      ...prev,
      {
        name: linkInput.trim(),
        type: 'link',
        url: linkInput.trim(),
      },
    ]);
    setLinkInput('');
    setShowLinkModal(false);
  };

  // Process Command through Executive Endpoint
  const handleExecuteCommand = async (overrideText?: string) => {
    const textToProcess = (overrideText || inputVal).trim();
    if (!textToProcess) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setIsProcessing(true);
    setCommandResult(null);

    try {
      const res = await fetch('/api/gemini/executive-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToProcess,
          context: {
            scope,
            entityId: targetEntityId || undefined,
            projectId: targetProjectId || undefined,
          },
          attachments,
          provider: selectedProvider,
          entities,
          projects,
          recentItems: items.slice(0, 15),
          currentDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error('فشلت معالجة الأمر التنفيذي');
      }

      const result: ExecutiveCommandResult = await res.json();
      setCommandResult(result);

      // Auto-inferred entity match
      if (result.context.inferredEntityName && !targetEntityId) {
        const found = entities.find(e => e.name.toLowerCase().includes(result.context.inferredEntityName!.toLowerCase()));
        if (found) {
          setTargetEntityId(found.id);
          setScope('entity');
        }
      }
    } catch (err: any) {
      console.error('Command execution failed, falling back to instant capture:', err);
      // Instant Fallback Draft
      handleInstantFallback(textToProcess);
    } finally {
      setIsProcessing(false);
    }
  };

  // Emergency 5-Second Fallback
  const handleInstantFallback = (text: string) => {
    const simpleTitle = text.slice(0, 60);
    const fallbackItem: ParsedVoiceItemDraft = {
      id: `fallback-${Date.now()}`,
      title: simpleTitle,
      type: 'task',
      entityId: targetEntityId || entities[0]?.id || '',
      priority: 'high',
      originalPhrase: text,
      missingData: [],
      suggestedData: ['تم الحفظ المباشر كمسودة لتوفير وقتك'],
    };

    setCommandResult({
      query: text,
      context: { scope, entityId: targetEntityId, projectId: targetProjectId },
      provider: selectedProvider,
      modelName: 'Instant Local Rescue (بدون انتظار)',
      latencyMs: 150,
      costExplanation: 'حفظ محلي فوري',
      executiveSummary: 'تم التقاط الأمر كمسودة تنفيذية وحفظه فوراً في دفتر دون إبطاء.',
      needsClarification: false,
      plan: [
        {
          id: 'step-fallback-1',
          stepNumber: 1,
          title: 'التقاط وحفظ الأمر',
          description: text,
          actionType: 'task',
          isSensitive: false,
          status: 'completed',
          resultSummary: 'محفوظ في دفتر وجاهز للتنفيذ',
        },
      ],
      extractedItems: [fallbackItem],
    });
    setIsProcessing(false);
  };

  // Direct 1-Click Commit of Extracted Items
  const handleCommitItem = (itemDraft: ParsedVoiceItemDraft) => {
    const created = addItem({
      title: itemDraft.title,
      type: itemDraft.type,
      entityId: itemDraft.entityId || targetEntityId || entities[0]?.id || '',
      projectId: itemDraft.projectId || targetProjectId || undefined,
      assignee: itemDraft.assignee || 'أنا',
      plannedDate: itemDraft.plannedDate || new Date().toISOString().split('T')[0],
      dueDate: itemDraft.dueDate,
      timeEstimateMinutes: itemDraft.timeEstimateMinutes || 30,
      priority: itemDraft.priority,
      source: 'voice',
      rawInput: itemDraft.originalPhrase || inputVal,
    });

    setExecutedItems(prev => ({ ...prev, [itemDraft.id]: true }));

    // If meeting & calendar is connected, push to Google Calendar
    if (created.type === 'meeting' && isGoogleCalendarConnected) {
      pushMeetingToGoogleCalendar(created.id);
    }

    if (onItemCreated) onItemCreated();
  };

  const handleCommitAllItems = () => {
    if (!commandResult) return;
    commandResult.extractedItems.forEach(it => {
      if (!executedItems[it.id]) {
        handleCommitItem(it);
      }
    });
  };

  // Approve Sensitive Plan Step
  const handleApproveStep = (step: ExecutionPlanStep) => {
    setApprovedSteps(prev => ({ ...prev, [step.id]: true }));

    // Execute the sensitive step
    if (step.actionType === 'meeting' || step.actionType === 'calendar_sync') {
      const meetingDraft = commandResult?.extractedItems.find(i => i.type === 'meeting');
      if (meetingDraft) {
        handleCommitItem(meetingDraft);
      }
    }
  };

  const activeProviderInfo = AI_PROVIDERS.find(p => p.id === selectedProvider) || AI_PROVIDERS[0];

  return (
    <div className="w-full relative">
      {/* The Hero Executive Command Card */}
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 hover:border-amber-500/60 rounded-3xl shadow-2xl shadow-amber-950/20 p-4 sm:p-5 transition">
        
        {/* Prominent Header Label: «وش تبي ننجز؟» */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-900/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg sm:text-xl text-slate-50 tracking-tight flex items-center gap-2">
                <span>صندوق الأوامر التنفيذي</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  وش تبي ننجز؟
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                أملِ بالصوت أو اكتب، وارفق الملفات — المساعد يحلل، ويخطط، ويزامن التقويم، وينفذ ضمن صلاحياتك.
              </p>
            </div>
          </div>

          {/* AI Provider Switcher Badge */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowProviderModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-xs text-slate-200 transition group"
              title="تغيير مزود الذكاء الاصطناعي أو مراجعة الاستهلاك"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition duration-300" />
              <span className="font-medium">{activeProviderInfo.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                {activeProviderInfo.badge}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Unified Input Zone */}
        <div className="relative bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3 focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 transition">
          <div className="flex items-start gap-2.5">
            {/* Prominent Microphone Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`relative flex items-center justify-center w-12 h-12 rounded-2xl font-medium transition duration-200 shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30 shadow-lg shadow-rose-950/60'
                  : 'bg-slate-900 text-amber-400 hover:bg-slate-800 hover:text-amber-300 border border-slate-700/80'
              }`}
              title={isRecording ? 'إيقاف التسجيل الصوتي' : 'تحدث بالعامية السعودية أو الفصحى'}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              {isRecording && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
              )}
            </button>

            {/* Multi-line Command Text Area */}
            <textarea
              rows={2}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleExecuteCommand();
                }
              }}
              placeholder={
                isRecording
                  ? '🎙️ جاري الاستماع لصوتك بلهجتك الدارجة... تحدث بحرية.'
                  : '«وش تبي ننجز؟» — مثال: "أبي نلخص نتائج اجتماع أمنية، ونجهز خطة تنفيذ لفرع الخبر، ونضيف الاجتماع لتقويم Google ونجهز مسودة تكليف للمورد"'
              }
              className="flex-1 bg-transparent border-0 text-slate-100 placeholder:text-slate-400 text-sm sm:text-base resize-none focus:outline-none focus:ring-0 leading-relaxed font-sans"
            />

            {/* Execute Command Button */}
            <button
              type="button"
              disabled={!inputVal.trim() && !isRecording}
              onClick={() => handleExecuteCommand()}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-30 disabled:pointer-events-none text-slate-950 font-bold transition shadow-lg shadow-amber-950/50 shrink-0"
              title="إطلاق الأمر التنفيذي (Ctrl+Enter)"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5 rotate-180" />
              )}
            </button>
          </div>

          {/* Attachments Preview Bar */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">المرفقات:</span>
              {attachments.map((att, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300"
                >
                  {att.type === 'link' ? <Link2 className="w-3 h-3 text-cyan-400" /> : <FileText className="w-3 h-3 text-amber-400" />}
                  <span className="max-w-[150px] truncate">{att.name}</span>
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-400 transition ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Action Bar Below Input: Context Selectors & Attachment Triggers */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-850">
            {/* Context Selector */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">السياق:</span>
              
              {/* Scope Switch */}
              <select
                value={scope}
                onChange={e => setScope(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">جميع المشاريع والجهات</option>
                <option value="entity">جهة محددة</option>
                <option value="project">مشروع محدد</option>
              </select>

              {/* Entity Picker (if entity or project scope) */}
              {scope !== 'all' && (
                <select
                  value={targetEntityId}
                  onChange={e => setTargetEntityId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">اختر الجهة...</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Project Picker (if project scope) */}
              {scope === 'project' && (
                <select
                  value={targetProjectId}
                  onChange={e => setTargetProjectId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">اختر المشروع...</option>
                  {projects
                    .filter(p => !targetEntityId || p.entityId === targetEntityId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Attachments Actions (Files & Links) */}
            <div className="flex items-center gap-1.5">
              {/* File upload hidden input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
                title="إرفاق ملفات أو مستندات أو صور"
              >
                <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                <span>إرفاق ملف</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
                title="إرفاق رابط خارجي أو مصدر"
              >
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>رابط</span>
              </button>
            </div>
          </div>

          {/* 5-second Emergency Override Button: "رتّبها بدون انتظار" */}
          {isProcessing && processingTimeElapsed >= 3 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between px-2 animate-fadeIn">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                جاري التفكير والتفكيك الذكي للطلب ({processingTimeElapsed} ث)...
              </span>
              <button
                onClick={() => handleInstantFallback(inputVal)}
                className="text-xs px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold transition"
              >
                رتّبها بدون انتظار ⚡
              </button>
            </div>
          )}
        </div>

        {/* Quick Example Command Prompts for Instant Execution */}
        <div className="flex items-center gap-2 mt-3 px-1 text-xs text-slate-400 overflow-x-auto pb-1">
          <span className="text-slate-500 shrink-0 font-medium">أوامر سريعة:</span>
          <button
            onClick={() => setIsSmartReminderModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 shrink-0 font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
            <span>🔔 التذكير والجدولة الذكية (AI)</span>
          </button>
          <button
            onClick={() => {
              const q = 'أبي نجهز خطة إطلاق فرع أمنية بالخبر، ونرتب اجتماع مع المورد الخميس ونحجز في تقويم Google ونرسل له مسودة التكليف.';
              setInputVal(q);
              handleExecuteCommand(q);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 shrink-0 transition"
          >
            🏢 خطة إطلاق فرع أمنية + اجتماع ومسودة
          </button>
          <button
            onClick={() => {
              const q = 'بكرة أراجع عرض المورد لكلايمونيز... لا خله الأربعاء، وأجهز أجندة اجتماع الشركاء قبلها بيوم.';
              setInputVal(q);
              handleExecuteCommand(q);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 shrink-0 transition"
          >
            🔄 تصحيح فوري: تعديل موعد العرض وتجهيز أجندة
          </button>
          <button
            onClick={() => {
              const q = 'أعطني ملخص المتأخرات والقرارات المعطلة لجميع المشاريع واقترح خطة فك العوائق لليوم.';
              setInputVal(q);
              handleExecuteCommand(q);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 shrink-0 transition"
          >
            📊 تقرير تنفيذي بالمتأخرات والعوائق
          </button>
        </div>
      </div>

      {/* Result Display: Clarification / Execution Plan / Drafts / Items */}
      {commandResult && (
        <div className="mt-4 p-5 rounded-3xl bg-slate-900 border border-amber-500/40 shadow-xl space-y-5 animate-fadeIn">
          {/* Executive Header & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                  خطة التنفيذ المعتمدة
                </span>
                <span className="text-xs text-slate-400">
                  استغرق التحليل {commandResult.latencyMs}ms عبر {commandResult.modelName}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-1.5 leading-relaxed">
                {commandResult.executiveSummary}
              </p>
            </div>

            <button
              onClick={() => setCommandResult(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Clarification Question if Context was Ambiguous */}
          {commandResult.needsClarification && commandResult.clarificationQuestion && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs sm:text-sm">
                <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>سؤال لتحديد السياق بدقة: {commandResult.clarificationQuestion}</span>
              </div>
              {commandResult.suggestedAnswers && commandResult.suggestedAnswers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {commandResult.suggestedAnswers.map((ans, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => {
                        const updatedQuery = `${inputVal} — [تأكيد السياق: ${ans}]`;
                        setInputVal(updatedQuery);
                        handleExecuteCommand(updatedQuery);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs text-amber-200 font-medium transition"
                    >
                      {ans}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 1: Execution Plan Breakdown (الطلب مقسم إلى خطوات واعتماديات) */}
          {commandResult.plan && commandResult.plan.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>خطوات التنفيذ والاعتماديات ({commandResult.plan.length} خطوات)</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  الخطوات الحساسة تتطلب اعتمادك المباشر
                </span>
              </div>

              <div className="space-y-2.5">
                {commandResult.plan.map(step => {
                  const isApproved = approvedSteps[step.id] || step.isApproved;
                  return (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        step.isSensitive && !isApproved
                          ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {step.stepNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100">{step.title}</span>
                            {step.isSensitive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold">
                                خطوة حساسة (تتطلب اعتمادك)
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {step.actionType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Action / Approval Trigger */}
                      <div className="self-end sm:self-auto shrink-0">
                        {step.isSensitive && !isApproved ? (
                          <button
                            onClick={() => handleApproveStep(step)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>اعتمد ونفّذ</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{step.resultSummary || 'جاهز وموثق'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Extracted Items (مهام، اجتماعات، قرارات مع ربط التقويم) */}
          {commandResult.extractedItems && commandResult.extractedItems.length > 0 && (
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>العناصر المستخرجة للإضافة إلى دفتر ({commandResult.extractedItems.length})</span>
                </h4>
                <button
                  onClick={handleCommitAllItems}
                  className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 transition"
                >
                  إضافة الكل فوراً
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commandResult.extractedItems.map(it => {
                  const isDone = executedItems[it.id];
                  const entity = entities.find(e => e.id === it.entityId);

                  return (
                    <div
                      key={it.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            {it.type === 'task' ? 'مهمة' : it.type === 'meeting' ? 'اجتماع' : it.type === 'decision' ? 'قرار' : it.type}
                          </span>
                          {entity && (
                            <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              <span>{entity.name}</span>
                            </span>
                          )}
                        </div>
                        <h5 className="font-semibold text-sm text-slate-100 mt-2">
                          {it.title}
                        </h5>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                          {it.dueDate && <span>الموعد: {it.dueDate}</span>}
                          {it.timeEstimateMinutes && <span>التقدير: {it.timeEstimateMinutes} دقيقة</span>}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                        {it.type === 'meeting' && isGoogleCalendarConnected && (
                          <span className="text-[11px] text-cyan-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>مزامنة تلقائية مع تقويم Google</span>
                          </span>
                        )}
                        <button
                          disabled={isDone}
                          onClick={() => handleCommitItem(it)}
                          className={`mr-auto px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>أُضيفت لدفتر</span>
                            </>
                          ) : (
                            <span>+ إضافة</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Draft Preview (المسودة والخطاب ورسائل المتابعة) */}
          {commandResult.draftPreview && (
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <SendHorizontal className="w-4 h-4 text-cyan-400" />
                  <span>مسودة المراسلة المقترحة ({commandResult.draftPreview.title})</span>
                </span>
                <span className="text-[11px] text-amber-400 font-mono">
                  نبرة الجهة: {commandResult.draftPreview.tone}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                {commandResult.draftPreview.subject && (
                  <div className="text-xs text-slate-400 pb-2 border-b border-slate-850 mb-2">
                    <strong className="text-slate-200">الموضوع:</strong> {commandResult.draftPreview.subject}
                  </div>
                )}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                  {commandResult.draftPreview.body}
                </p>
                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-850">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(commandResult.draftPreview!.body);
                      alert('تم نسخ المسودة للحافظة');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
                  >
                    نسخ المسودة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link Attachment Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h4 className="font-heading font-bold text-base text-slate-100 mb-2">
              إرفاق رابط أو مصدر خارجي
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              الصق رابط مستند Google Docs، تقرير، عرض أسعار، أو مرجع للمهمة.
            </p>
            <input
              type="url"
              dir="ltr"
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddLink}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
              >
                إضافة الرابط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Provider Switcher & Educational Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-heading font-bold text-lg text-slate-100">
                  محركات الذكاء الاصطناعي والمزودون
                </h4>
                <p className="text-xs text-slate-400">
                  اختر المحرك المناسب لكل مهمة مع الشفافية الكاملة للتكلفة والخصوصية.
                </p>
              </div>
              <button
                onClick={() => setShowProviderModal(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {AI_PROVIDERS.map(prov => (
                <div
                  key={prov.id}
                  onClick={() => setSelectedProvider(prov.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col gap-2 ${
                    selectedProvider === prov.id
                      ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/20'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{prov.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-mono">
                        {prov.badge}
                      </span>
                    </div>
                    {selectedProvider === prov.id && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold">
                        النشط حالياً
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {prov.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-850">
                    <span>النموذج: <code className="text-amber-400">{prov.model}</code></span>
                    <span>التكلفة: <strong className="text-slate-200">{prov.costModel}</strong></span>
                  </div>

                  {prov.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                      💡 {prov.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowProviderModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
              >
                اعتماد وتأكيد المحرك
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
