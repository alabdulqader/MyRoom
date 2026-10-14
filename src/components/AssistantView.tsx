import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Sparkles,
  Send,
  FileText,
  Copy,
  Check,
  Building,
  HelpCircle,
  Zap,
  Bookmark,
  Share2,
  RefreshCw,
  Plus
} from 'lucide-react';

export const AssistantView: React.FC = () => {
  const { entities, projects, items, user, addItem } = useDaftar();

  const [activeSubTab, setActiveSubTab] = useState<'qa' | 'drafter'>('qa');

  // Q&A State
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; timestamp: string }>>([
    {
      sender: 'assistant',
      text: `أهلاً بك يا ${user.name}. أنا مستشارك ومساعدك التنفيذي في «دفتر».
بياناتك للجهات الأربع (كلايمونيز، أمنية، Belza، 180 Degree) ومشاريعك والتزاماتك محدثة بالكامل.
يمكنك سؤالي مباشرة عن المعطلات، القرارات، أو اختيار مهمة سريعة حسب وقتك المتاح.`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Drafter State
  const [draftType, setDraftType] = useState('خطاب رسمي مؤسسي');
  const [draftEntityId, setDraftEntityId] = useState(entities[0]?.id || '');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftDetails, setDraftDetails] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const QUICK_QUESTIONS = [
    'وش المتعطل في أمنية؟',
    'وش يحتاج قرار مني؟',
    'وش أنتظر فيه رد من الأطراف؟',
    'عندي نصف ساعة، وش أنجز؟',
    'جهزني لاجتماع اليوم القادم',
    'وش تغير في المشاريع هذا الأسبوع؟',
  ];

  const handleSendQuestion = async (customQ?: string) => {
    const q = (customQ || chatQuestion).trim();
    if (!q || chatLoading) return;

    const timeStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    setChatMessages(prev => [...prev, { sender: 'user', text: q, timestamp: timeStr }]);
    setChatQuestion('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          contextData: {
            user,
            entities: entities.map(e => ({ id: e.id, name: e.name, tone: e.tone })),
            projects: projects.map(p => ({ id: p.id, name: p.name, status: p.status, stage: p.currentStage, owner: p.owner })),
            activeItems: items.filter(i => !i.isDeleted && i.status !== 'completed').map(i => ({
              id: i.id,
              title: i.title,
              type: i.type,
              entityId: i.entityId,
              dueDate: i.dueDate,
              priority: i.priority,
              isBlockingMe: i.isBlockingMe,
              blockerReason: i.blockerReason,
            })),
          },
        }),
      });

      const data = await res.json();
      setChatLoading(false);

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: data.reply || 'عذراً، لم أتمكن من الحصول على الإجابة.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (e: any) {
      setChatLoading(false);
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'حدث خطأ أثناء الاتصال بالمساعد التنفيذي. يرجى المحاولة مرة أخرى.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleGenerateDraft = async () => {
    if (!draftTopic.trim() || draftLoading) return;
    setDraftLoading(true);

    const selectedEntity = entities.find(e => e.id === draftEntityId);

    try {
      const res = await fetch('/api/gemini/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: draftType,
          topic: draftTopic,
          entityName: selectedEntity?.name || 'عامة',
          tone: selectedEntity?.tone || 'formal',
          details: { extra: draftDetails },
        }),
      });

      const data = await res.json();
      setGeneratedDraft(data.draft || 'تعذر توليد المسودة.');
    } catch (e) {
      setGeneratedDraft('حدث خطأ أثناء إعداد المسودة التنفيذية.');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCopyDraft = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSaveDraftAsTask = () => {
    if (!generatedDraft) return;
    addItem({
      title: `مراجعة واعتماد مسودة: ${draftTopic}`,
      description: generatedDraft,
      type: 'task',
      entityId: draftEntityId,
      priority: 'high',
      context: 'review',
    });
    alert('تم حفظ المسودة كمهمة جديدة في الدفتر.');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-slate-50 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <span>المساعد التنفيذي الذكي</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إجابات مرتبطة بمشاريعك وجهاتك، وصياغة خطابات ومسودات رسمية رفيعة المستوى.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('qa')}
            className={`px-4 py-1.5 rounded-lg transition font-medium ${
              activeSubTab === 'qa' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            الاستفسارات والتحليل
          </button>
          <button
            onClick={() => setActiveSubTab('drafter')}
            className={`px-4 py-1.5 rounded-lg transition font-medium ${
              activeSubTab === 'drafter' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            صياغة المسودات والخطابات
          </button>
        </div>
      </div>

      {activeSubTab === 'qa' ? (
        <div className="space-y-4">
          {/* Quick Grounded Question Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 shrink-0">أسئلة تنفيذية سريعة:</span>
            {QUICK_QUESTIONS.map((qq, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuestion(qq)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 shrink-0 transition"
              >
                {qq}
              </button>
            ))}
          </div>

          {/* Chat Stream Window */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 h-[480px] overflow-y-auto space-y-4 shadow-inner">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-start' : 'justify-start'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-slate-800 border border-slate-700 text-amber-300'
                      : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  }`}
                >
                  {msg.sender === 'user' ? 'أنت' : 'د'}
                </div>
                <div className="space-y-1 max-w-[85%]">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans ${
                      msg.sender === 'user'
                        ? 'bg-slate-850 border border-slate-700 text-slate-100'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 px-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-3 items-center text-xs text-slate-400 p-2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>المساعد يستشير سجلات الدفتر ويحلل المعطيات...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatQuestion}
              onChange={e => setChatQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendQuestion();
              }}
              placeholder="اسأل المساعد التنفيذي (مثال: وش ناقص في مشروع التحلية؟ أو لخص التزامات أمنية)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            <button
              onClick={() => handleSendQuestion()}
              disabled={!chatQuestion.trim() || chatLoading}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <Send className="w-4 h-4 rotate-180" />
              <span>إرسال</span>
            </button>
          </div>
        </div>
      ) : (
        /* Drafter SubTab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Form */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>إعداد المسودة التنفيذية</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">نوع المسودة:</label>
                <select
                  value={draftType}
                  onChange={e => setDraftType(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                >
                  <option value="خطاب رسمي مؤسسي">خطاب رسمي مؤسسي</option>
                  <option value="بريد إلكتروني تنفيذي">بريد إلكتروني تنفيذي</option>
                  <option value="رسالة واتساب رسمية">رسالة واتساب رسمية</option>
                  <option value="تغريدة / منشور لينكد إن">تغريدة / منشور لينكد إن</option>
                  <option value="أجندة اجتماع استراتيجي">أجندة اجتماع استراتيجي</option>
                  <option value="مقارنة عروض موردين">مقارنة عروض موردين</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">الجهة المعنية (لتطبيق النبرة):</label>
                <select
                  value={draftEntityId}
                  onChange={e => setDraftEntityId(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                >
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} (نبرة: {e.tone === 'formal' ? 'رسمية ومؤسسية' : 'عملية ومباشرة'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">الموضوع أو الهدف:</label>
                <input
                  type="text"
                  value={draftTopic}
                  onChange={e => setDraftTopic(e.target.value)}
                  placeholder="مثال: طلب تخفيض أسعار توريد معدات فرع التحلية"
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">معلومات أو نقاط أساسية للتضمين:</label>
                <textarea
                  rows={4}
                  value={draftDetails}
                  onChange={e => setDraftDetails(e.target.value)}
                  placeholder="أي أرقام، أسماء موردين، أو شروط جزائية..."
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none"
                />
              </div>

              <button
                onClick={handleGenerateDraft}
                disabled={!draftTopic.trim() || draftLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                {draftLoading ? (
                  <span>جاري الصياغة وفق النبرة التنفيذية...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>توليد المسودة الجاهزة للمراجعة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Output */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-heading font-bold text-sm text-slate-200">
                  المسودة الناتجة
                </span>
                {generatedDraft && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyDraft}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 border border-slate-700"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isCopied ? 'تم النسخ!' : 'نسخ المسودة'}</span>
                    </button>
                    <button
                      onClick={handleSaveDraftAsTask}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center gap-1 border border-amber-500/30 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>حفظ كمهمة</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line min-h-[300px] overflow-y-auto">
                {generatedDraft ? (
                  generatedDraft
                ) : (
                  <span className="text-slate-600 italic">
                    اختر نوع المسودة واكتب الموضوع واضغط توليد... ستظهر المسودة هنا جاهزة للنسخ أو التعديل مع وضع النواقص بين أقواس [مثل هذا].
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              * تنبيه تنفيذي: إعداد المسودة لا يعني إرسالها للطرف الآخر دون مراجعتك واعتمادك.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
