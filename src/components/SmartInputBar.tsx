import React, { useState, useRef, useEffect } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Mic,
  MicOff,
  Send,
  Paperclip,
  Sparkles,
  Clock,
  AlertCircle,
  Check,
  CheckCheck,
  X,
  FileText,
  Calendar,
  User,
  Tag,
  Building,
  Flag,
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Item, ItemType, PriorityLevel, ParsedVoiceItemDraft } from '../types';

export const SmartInputBar: React.FC = () => {
  const { entities, projects, user, addItem, addBatchItems } = useDaftar();

  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTimeElapsed, setProcessingTimeElapsed] = useState(0);
  const [reviewDrafts, setReviewDrafts] = useState<ParsedVoiceItemDraft[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rawCapturedText, setRawCapturedText] = useState('');
  const [fallbackApplied, setFallbackApplied] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Initialize Speech Recognition if supported in browser
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

  // Handle 5-second timeout counter for "رتّبها بدون انتظار"
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

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      // Fallback: prompt test text or alert
      setInputVal(prev => prev ? prev : 'بكرة أراجع عرض المورد لأمنية... لا خله الخميس، وأجهز أجندة اجتماع كلايمونيز قبل الاجتماع بيوم.');
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
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Immediate preservation before network
  const handleProcessInput = async (customText?: string) => {
    const textToProcess = (customText || inputVal).trim();
    if (!textToProcess) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    // Rule: Save raw immediately so it is NEVER lost
    setRawCapturedText(textToProcess);
    try {
      const pending = JSON.parse(localStorage.getItem('daftar_pending_inputs') || '[]');
      pending.push({ text: textToProcess, timestamp: new Date().toISOString() });
      localStorage.setItem('daftar_pending_inputs', JSON.stringify(pending));
    } catch (e) {
      console.warn('Could not save raw backup', e);
    }

    setIsProcessing(true);
    setFallbackApplied(false);

    try {
      const res = await fetch('/api/gemini/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: textToProcess,
          entities: entities.map(e => ({ id: e.id, name: e.name })),
          currentDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setIsProcessing(false);

      if (data.items && data.items.length > 0) {
        // Map returned items to draft cards
        const drafts: ParsedVoiceItemDraft[] = data.items.map((it: any, index: number) => {
          // Find matching entity
          let matchedEntityId = it.entityId;
          if (!matchedEntityId && it.entityName) {
            const found = entities.find(e => e.name.includes(it.entityName) || it.entityName.includes(e.name));
            if (found) matchedEntityId = found.id;
          }
          if (!matchedEntityId) matchedEntityId = entities[0]?.id || 'entity-clamonies';

          return {
            id: `draft-${Date.now()}-${index}`,
            title: it.title || 'عنصر جديد',
            type: (it.type as ItemType) || 'task',
            entityId: matchedEntityId,
            assignee: it.assignee || user.name,
            plannedDate: it.plannedDate || new Date().toISOString().split('T')[0],
            dueDate: it.dueDate,
            timeEstimateMinutes: it.timeEstimateMinutes || 30,
            priority: (it.priority as PriorityLevel) || 'medium',
            missingData: it.missingData || [],
            suggestedData: it.suggestedData || [],
            originalPhrase: it.originalPhrase || textToProcess,
          };
        });

        setReviewDrafts(drafts);
        setShowReviewModal(true);
        setInputVal('');
      } else {
        // Simple fallback draft
        createSimpleFallbackDraft(textToProcess);
      }
    } catch (err) {
      console.error('AI parse failed, activating simple draft fallback:', err);
      setIsProcessing(false);
      createSimpleFallbackDraft(textToProcess);
    }
  };

  // "رتّبها بدون انتظار" or offline fallback
  const createSimpleFallbackDraft = (text: string) => {
    setFallbackApplied(true);
    setIsProcessing(false);

    // Naive local extractor
    let guessedEntityId = entities[0]?.id;
    for (const ent of entities) {
      if (text.includes(ent.name)) {
        guessedEntityId = ent.id;
        break;
      }
    }

    const fallbackDraft: ParsedVoiceItemDraft = {
      id: `draft-fallback-${Date.now()}`,
      title: text.length > 60 ? text.substring(0, 60) + '...' : text,
      type: text.includes('اجتماع') ? 'meeting' : text.includes('قرار') ? 'decision' : 'task',
      entityId: guessedEntityId,
      assignee: user.name,
      plannedDate: new Date().toISOString().split('T')[0],
      timeEstimateMinutes: 30,
      priority: 'medium',
      missingData: ['تم الإنشاء بالنمط السريع — راجع التفاصيل قبل التأكيد'],
      suggestedData: [],
      originalPhrase: text,
    };

    setReviewDrafts([fallbackDraft]);
    setShowReviewModal(true);
    setInputVal('');
  };

  const handleUpdateDraft = (id: string, updates: Partial<ParsedVoiceItemDraft>) => {
    setReviewDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const handleRemoveDraft = (id: string) => {
    setReviewDrafts(prev => prev.filter(d => d.id !== id));
    if (reviewDrafts.length <= 1) {
      setShowReviewModal(false);
    }
  };

  const handleConfirmSingleDraft = (draft: ParsedVoiceItemDraft) => {
    addItem({
      title: draft.title,
      type: draft.type,
      entityId: draft.entityId,
      assignee: draft.assignee,
      plannedDate: draft.plannedDate,
      dueDate: draft.dueDate,
      timeEstimateMinutes: draft.timeEstimateMinutes,
      priority: draft.priority,
      source: 'voice',
      rawInput: draft.originalPhrase || rawCapturedText,
    });
    handleRemoveDraft(draft.id);
  };

  const handleConfirmAllDrafts = () => {
    reviewDrafts.forEach(draft => {
      addItem({
        title: draft.title,
        type: draft.type,
        entityId: draft.entityId,
        assignee: draft.assignee,
        plannedDate: draft.plannedDate,
        dueDate: draft.dueDate,
        timeEstimateMinutes: draft.timeEstimateMinutes,
        priority: draft.priority,
        source: 'voice',
        rawInput: draft.originalPhrase || rawCapturedText,
      });
    });
    setReviewDrafts([]);
    setShowReviewModal(false);
  };

  return (
    <div className="w-full">
      {/* The Single Executive Input Bar */}
      <div className="relative bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-2xl shadow-xl shadow-slate-950/50 p-2 sm:p-2.5 transition focus-within:border-amber-500/70 focus-within:ring-2 focus-within:ring-amber-500/20">
        <div className="flex items-center gap-2">
          {/* Prominent Mic Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`relative flex items-center justify-center w-11 h-11 rounded-xl font-medium transition duration-200 shrink-0 ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30 shadow-lg shadow-rose-900/50'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700 hover:text-amber-300 border border-slate-700'
            }`}
            title={isRecording ? 'إيقاف التسجيل الصوتي' : 'تسجيل صوتي مباشر (اضغط وتحدث)'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isRecording && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </button>

          {/* Unified Input Box */}
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleProcessInput();
              }
            }}
            placeholder={
              isRecording
                ? 'جاري الاستماع لصوتك بلهجتك الدارجة...'
                : 'أملِ أو اكتب التزامك (مثال: بكرة أراجع عرض المورد لأمنية... لا خله الخميس)'
            }
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-0 px-2 py-1"
          />

          {/* Send / Process Button */}
          <button
            type="button"
            disabled={!inputVal.trim() && !isRecording}
            onClick={() => handleProcessInput()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold transition shadow-md shadow-amber-950/40 shrink-0"
            title="معالجة والتقاط الالتزام"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 rotate-180" />
            )}
          </button>
        </div>

        {/* 5-second Emergency Override Button: "رتّبها بدون انتظار" */}
        {isProcessing && processingTimeElapsed >= 3 && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between px-2 animate-fadeIn">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              جاري الفهم الذكي وتفكيك اللهجة ({processingTimeElapsed} ثوانٍ)...
            </span>
            <button
              onClick={() => createSimpleFallbackDraft(rawCapturedText || inputVal)}
              className="text-xs px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition"
            >
              رتّبها بدون انتظار ⚡
            </button>
          </div>
        )}
      </div>

      {/* Quick Example Pills to test Saudi dialect self-correction easily */}
      <div className="flex items-center gap-2 mt-2 px-1 text-xs text-slate-400 overflow-x-auto pb-1">
        <span className="text-slate-500 shrink-0">جرّب صوتياً أو بنقرة:</span>
        <button
          onClick={() => {
            setInputVal('بكرة أراجع عرض المورد لأمنية... لا خله الخميس، وأجهز أجندة اجتماع كلايمونيز قبل الاجتماع بيوم.');
            handleProcessInput('بكرة أراجع عرض المورد لأمنية... لا خله الخميس، وأجهز أجندة اجتماع كلايمونيز قبل الاجتماع بيوم.');
          }}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
        >
          «بكرة أراجع عرض المورد لأمنية... لا خله الخميس»
        </button>
        <button
          onClick={() => {
            setInputVal('اجتماع الأحد مع فريق Belza الساعة عشر للربع القادم');
            handleProcessInput('اجتماع الأحد مع فريق Belza الساعة عشر للربع القادم');
          }}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
        >
          «اجتماع الأحد مع Belza الساعة 10»
        </button>
      </div>

      {/* Review Modal / Drawer (بطاقة المراجعة القابلة للتعديل) */}
      {showReviewModal && reviewDrafts.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-100">
                    مراجعة العناصر الملتقطة ({reviewDrafts.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    عدّل أي خانة قبل الاعتماد، أو اعتمد الجميع بنقرة واحدة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - List of Draft Cards */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {reviewDrafts.map((draft, idx) => {
                const currentEntity = entities.find(e => e.id === draft.entityId);

                return (
                  <div
                    key={draft.id}
                    className="p-4 rounded-xl bg-slate-850 border border-slate-700/80 space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400/80">
                          #{idx + 1}
                        </span>
                        {/* Type Picker */}
                        <select
                          value={draft.type}
                          onChange={e => handleUpdateDraft(draft.id, { type: e.target.value as ItemType })}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-medium focus:outline-none"
                        >
                          <option value="task">مهمة</option>
                          <option value="meeting">اجتماع</option>
                          <option value="followup">متابعة</option>
                          <option value="decision">قرار</option>
                          <option value="idea">فكرة</option>
                          <option value="commitment">التزام</option>
                          <option value="reference">مرجع</option>
                        </select>

                        {/* Priority Picker */}
                        <select
                          value={draft.priority}
                          onChange={e => handleUpdateDraft(draft.id, { priority: e.target.value as PriorityLevel })}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="urgent">عاجل جداً</option>
                          <option value="high">أولوية عالية</option>
                          <option value="medium">متوسطة</option>
                          <option value="low">منخفضة</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleRemoveDraft(draft.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="حذف هذا العنصر"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Editable Title */}
                    <input
                      type="text"
                      value={draft.title}
                      onChange={e => handleUpdateDraft(draft.id, { title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
                      placeholder="عنوان العنصر"
                    />

                    {/* Entity & Responsible Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400 shrink-0">الجهة:</span>
                        <select
                          value={draft.entityId}
                          onChange={e => handleUpdateDraft(draft.id, { entityId: e.target.value })}
                          className="bg-transparent border-0 text-slate-200 text-xs w-full focus:outline-none"
                        >
                          {entities.map(ent => (
                            <option key={ent.id} value={ent.id} className="bg-slate-900">
                              {ent.name} ({ent.badge})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400 shrink-0">المسؤول:</span>
                        <input
                          type="text"
                          value={draft.assignee || ''}
                          onChange={e => handleUpdateDraft(draft.id, { assignee: e.target.value })}
                          className="bg-transparent border-0 text-slate-200 text-xs w-full focus:outline-none"
                          placeholder="اسم المسؤول"
                        />
                      </div>
                    </div>

                    {/* Dates & Duration Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400 shrink-0">التنفيذ:</span>
                        <input
                          type="date"
                          value={draft.plannedDate || ''}
                          onChange={e => handleUpdateDraft(draft.id, { plannedDate: e.target.value })}
                          className="bg-transparent border-0 text-slate-200 text-xs w-full focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="text-slate-400 shrink-0">الموعد النهائي:</span>
                        <input
                          type="date"
                          value={draft.dueDate || ''}
                          onChange={e => handleUpdateDraft(draft.id, { dueDate: e.target.value })}
                          className="bg-transparent border-0 text-slate-200 text-xs w-full focus:outline-none"
                          placeholder="غير محدد"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400 shrink-0">المدة:</span>
                        <input
                          type="number"
                          value={draft.timeEstimateMinutes || 30}
                          onChange={e => handleUpdateDraft(draft.id, { timeEstimateMinutes: parseInt(e.target.value) || 0 })}
                          className="bg-transparent border-0 text-slate-200 text-xs w-14 focus:outline-none"
                        />
                        <span className="text-slate-500">دقيقة</span>
                      </div>
                    </div>

                    {/* Missing Data Badges / Suggested Data */}
                    {draft.missingData && draft.missingData.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> نواقص:
                        </span>
                        {draft.missingData.map((m, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Original voice phrase snippet */}
                    {draft.originalPhrase && (
                      <p className="text-[11px] text-slate-500 font-mono italic pt-1 border-t border-slate-800">
                        المدخل الأصلي: "{draft.originalPhrase}"
                      </p>
                    )}

                    {/* Individual confirm button */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleConfirmSingleDraft(draft)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        اعتماد هذا العنصر فقط
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 rounded-b-2xl">
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg"
              >
                إلغاء المراجعة
              </button>
              <button
                onClick={handleConfirmAllDrafts}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-950/50 transition"
              >
                <CheckCheck className="w-4 h-4" />
                اعتماد وحفظ جميع العناصر ({reviewDrafts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
