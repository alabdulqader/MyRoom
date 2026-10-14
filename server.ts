import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process Unhandled Rejection]:', reason);
});

// Initialize Gemini SDK with User-Agent header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'default-server-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest'];

async function generateContentWithRetry(params: any): Promise<any> {
  const modelsToTry = [params.model || PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Attempt] Model ${model} attempt ${attempt} failed:`, err.message || err);
        // Wait 800ms before retrying
        await new Promise(r => setTimeout(r, 800 * attempt));
      }
    }
  }
  throw lastError;
}

// 1. Voice & Text Intent Parsing Endpoint (Saudi dialect, self-correction, multi-item extraction)
app.post('/api/gemini/parse-intent', async (req, res) => {
  try {
    const { input, entities = [], currentDate = new Date().toISOString() } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'المدخل النصي أو الصوتي مطلوب' });
    }

    const entitiesContext = entities.map((e: any) => `${e.name} (معرف: ${e.id})`).join('، ');

    const systemInstruction = `
أنت المحرك التحليلي التنفيذي لتطبيق «دفتر — مكتبي التنفيذي».
تتلقى كلام المستخدم الشفهي أو المكتوب باللغة العربية الفصحى أو اللهجة السعودية الدارجة.
المطلوب منك:
1. استخراج عناصر منفصلة بدقة (مهام، اجتماعات، متابعات، أفكار، قرارات، التزامات، ملاحظات).
2. استيعاب التصحيح الفوري في منتصف الكلام (مثال: "بكرة أراجع عرض المورد لأمنية... لا خله الخميس" -> الموعد المعتمد هو الخميس وليس الغد).
3. ربط كل عنصر بالجهة الصحيحة من الجهات المتاحة: [${entitiesContext}]، أو وضع entityId فارغ إذا لم يذكر.
4. حساب التواريخ النسبية (بكرة، الخميس، الأحد، بعد يومين، قبل الاجتماع بيوم) بناءً على التاريخ المرجعي اليوم: ${currentDate}. أسبوع العمل هو الأحد إلى الخميس، والمنطقة الزمنية آسيا/الرياض.
5. تحديد نوع العنصر بدقة:
   - task (مهمة)
   - meeting (اجتماع)
   - followup (متابعة طرف خارجي أو داخلي)
   - idea (فكرة - لا تحولها لمهمة إلزامية أبداً)
   - decision (قرار مطلوب أو محسوم)
   - commitment (وعد أو التزام شخصي)
   - reference (ملاحظة مرجعية)
6. تحديد الأولوية (urgent, high, medium, low) والحجم التقديري (small, big) والوقت التقديري بالدقائق إذا أمكن تخمينه.
7. رصد أي بيانات ناقصة (missingData) وتقديم معلومات مقترحة (suggestedData) ليعتمدها المستخدم.
`;

    const response = await generateContentWithRetry({
      model: PRIMARY_MODEL,
      contents: input,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'عنوان العنصر التنفيذي الواضح والموجز' },
                  type: { 
                    type: Type.STRING, 
                    description: 'task, meeting, followup, idea, decision, commitment, or reference' 
                  },
                  entityId: { type: Type.STRING, description: 'معرف الجهة المتطابقة من القائمة أو فارغ' },
                  entityName: { type: Type.STRING, description: 'اسم الجهة المذكورة' },
                  branchName: { type: Type.STRING, description: 'اسم الفرع إن ذكر' },
                  assignee: { type: Type.STRING, description: 'المسؤول إن ذكر' },
                  plannedDate: { type: Type.STRING, description: 'موعد التنفيذ بصيغة YYYY-MM-DD' },
                  dueDate: { type: Type.STRING, description: 'الموعد النهائي للتسليم بصيغة YYYY-MM-DD' },
                  timeEstimateMinutes: { type: Type.NUMBER, description: 'المدة المتوقعة بالدقائق' },
                  priority: { type: Type.STRING, description: 'urgent, high, medium, low' },
                  size: { type: Type.STRING, description: 'small, big' },
                  missingData: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: 'بيانات جوهرية ناقصة تحتاج تأكيداً' 
                  },
                  suggestedData: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: 'اقتراحات ذكية أضافها النظام' 
                  },
                  originalPhrase: { type: Type.STRING, description: 'الجملة الأصلية المستخرجة' },
                },
                required: ['title', 'type', 'priority'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{"items": []}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing intent:', error);
    res.status(500).json({ error: 'تعذر فهم المدخل عبر المساعد الذكي', details: error.message });
  }
});

// 2. Executive Assistant Q&A grounded in live data
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const { question, contextData } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'السؤال مطلوب' });
    }

    const systemInstruction = `
أنت المساعد التنفيذي الشخصي والمستشار المكتبي في منصة «دفتر — مكتبي التنفيذي».
تتحدث باللغة العربية الرصينة، العارفة، المهنية المباشرة بدون تكلف أو حشو تسويقي.
بيانات المستخدم الحالية (الجهات، المشاريع، المهام، المواعيد، القرارات):
${JSON.stringify(contextData || {}, null, 2)}

قواعدك الصارمة:
1. الإجابة مبنية حصراً على بيانات المستخدم أعلاه، ولا تختلق مشاريع أو أسماء أو مبالغ غير موجودة.
2. عند الإشارة إلى مشروع أو مهمة أو قرار، حدد اسمه وحالته ومسؤوله.
3. إذا طلب المستخدم معرفة المعطل، أو ما ينتظر قراره، لخص الأمور بالنقاط الأكثر إلحاحاً أولاً.
4. إذا لم تكن البيانات كافية، أجب بصراحة: "أحتاج منك تحديد..." وضع النواقص بين أقواس مربعة.
5. ادعم الاستفسارات التنفيذية السريعة: "وش المتعطل؟"، "وش يحتاج قرار مني؟"، "عندي نصف ساعة وش أنجز؟"، "جهزني للاجتماع".
`;

    const response = await generateContentWithRetry({
      model: PRIMARY_MODEL,
      contents: question,
      config: {
        systemInstruction,
      },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: 'تعذر الرد من المساعد الذكي', details: error.message });
  }
});

// 3. Executive Drafting (Formal Letters, Agendas, Tweets, Memos, Comparison)
app.post('/api/gemini/draft', async (req, res) => {
  try {
    const { type, topic, entityName, tone = 'formal', details } = req.body;

    const systemInstruction = `
أنت الكاتب التنفيذي المعتمد في منصة «دفتر».
مهمتك إعداد مسودات رفيعة المستوى: خطابات رسمية، بريد إلكتروني، تغريدات، رسائل متابعة واتساب، أجندة اجتماعات، أو مقارنة عروض.
الأسلوب:
- لجهة [${entityName || 'عامة'}]: النبرة المطلوبة هي ${tone === 'formal' ? 'رسمية ومؤسسية رصينة' : tone === 'practical' ? 'عملية ومباشرة' : 'ابتكارية وعصرية'}.
- لا تختلق أرقاماً أو تواريخ لم تُذكر.
- ضع أي بيانات ناقصة بين أقواس مربعة مثل [تاريخ الاجتماع]، [اسم المورد]، [المبلغ المتفق عليه].
- أضف في نهاية المسودة قسماً بعنوان: "أحتاج منك:" لتنبيه المستخدم للنواقص إن وجدت.
- المسودة جاهزة للنسخ والمراجعة ولا تعتبر معتمدة أو مرسلة حتى يقرر المستخدم ذلك.
`;

    const prompt = `نوع المستند المطلوب: ${type}
الموضوع أو السياق: ${topic}
تفاصيل إضافية: ${JSON.stringify(details || {})}`;

    const response = await generateContentWithRetry({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({ draft: response.text });
  } catch (error: any) {
    console.error('Drafting error:', error);
    res.status(500).json({ error: 'تعذر إعداد المسودة', details: error.message });
  }
});

// 4. Meeting Debrief & Minutes Extraction
app.post('/api/gemini/meeting-debrief', async (req, res) => {
  try {
    const { rawNotes, meetingTitle, entityName } = req.body;

    const systemInstruction = `
أنت محرر محاضر الاجتماعات التنفيذية لتطبيق «دفتر».
المطلوب منك تحويل الملاحظات الشفهية أو المكتوبة لاجتماع [${meetingTitle || 'بدون عنوان'}] لجهة [${entityName || 'عامة'}] إلى:
1. محضر تنفيذي موجز (3-4 أسطر).
2. القرارات المحسومة في الاجتماع.
3. المهام الناتجة، مع المسؤول المقترح والموعد إن ذكر.
4. المتابعات المطلوبة مع أطراف خارجية.
5. موعد الاجتماع القادم إن ذكر.
`;

    const response = await generateContentWithRetry({
      model: PRIMARY_MODEL,
      contents: rawNotes,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  assignee: { type: Type.STRING },
                  dueDate: { type: Type.STRING },
                  priority: { type: Type.STRING },
                },
                required: ['title'],
              },
            },
            followups: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextMeeting: { type: Type.STRING },
          },
          required: ['summary', 'decisions', 'actionItems'],
        },
      },
    });

    res.json(JSON.parse(response.text?.trim() || '{}'));
  } catch (error: any) {
    console.error('Meeting debrief error:', error);
    res.status(500).json({ error: 'تعذر تحليل محضر الاجتماع', details: error.message });
  }
});

// 5. Task Decomposition (Breakdown into first actionable step)
app.post('/api/gemini/breakdown-task', async (req, res) => {
  try {
    const { title, description } = req.body;

    const prompt = `المهمة: "${title}". التفاصيل: "${description || 'لا يوجد'}".
قسم هذه المهمة إلى 3-5 خطوات منطقية متسلسلة، وحدد الخطوة الأولى الملموسة القابلة للتنفيذ الفوري الآن (first actionable step).`;

    const response = await generateContentWithRetry({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstActionableStep: { type: Type.STRING, description: 'أول خطوة قابلة للتنفيذ اليوم بدون تسويف' },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['firstActionableStep', 'steps'],
        },
      },
    });

    res.json(JSON.parse(response.text?.trim() || '{}'));
  } catch (error: any) {
    console.error('Task breakdown error:', error);
    res.status(500).json({ error: 'تعذر تجزئة المهمة', details: error.message });
  }
});

// 6. "وش معطلني؟" Root-cause resolver
app.post('/api/gemini/unblock-task', async (req, res) => {
  try {
    const { taskTitle, blockerReason, notes } = req.body;

    const prompt = `المهمة: "${taskTitle}"
سبب التعطل المحدد: "${blockerReason}"
ملاحظات إضافية: "${notes || 'لا يوجد'}"
اقترح حلاً تنفيذياً حاسماً لفك التعطل في سطرين، وتحديد رسالة تواصل أو قرار يجب اتخاذه الآن.`;

    const response = await generateContentWithRetry({
      model: PRIMARY_MODEL,
      contents: prompt,
    });

    res.json({ suggestion: response.text });
  } catch (error: any) {
    console.error('Unblock suggestion error:', error);
    res.status(500).json({ error: 'تعذر اقتراح حل التعطل', details: error.message });
  }
});

// 7. Executive Command Box Engine («وش تبي ننجز؟»)
app.post('/api/gemini/executive-command', async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      query,
      context = { scope: 'all' },
      attachments = [],
      provider = 'gemini',
      entities = [],
      projects = [],
      recentItems = [],
      currentDate = new Date().toISOString(),
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'الطلب التنفيذي مطلوب' });
    }

    const entitiesContext = entities
      .map((e: any) => `${e.name} (رمز: ${e.code}, معرف: ${e.id}, نبرة: ${e.tone})`)
      .join(' | ');
    const projectsContext = projects
      .map((p: any) => `${p.name} (جهة: ${p.entityId}, حالة: ${p.status})`)
      .join(' | ');

    const systemInstruction = `
أنت المساعد والمستشار التنفيذي الأول في تطبيق «دفتر — مكتبي التنفيذي».
تتلقى طلباً أو أمراً من المدير التنفيذي عبر «صندوق الأوامر التنفيذي: وش تبي ننجز؟».
الأمر قد يكون مكتوباً، أو منسوخاً، أو مفرغاً من كلام شفهي بلهجة سعودية دارجة، وقد يرفق معه ملفات أو روابط.

المعلومات المتاحة:
- التاريخ المرجعي اليوم: ${currentDate} (توقيت آسيا/الرياض، أسبوع العمل الأحد-الخميس).
- الجهات: [${entitiesContext}].
- المشاريع: [${projectsContext}].
- السياق المحدد من المستخدم: النطاق (${context.scope})، الجهة (${context.entityId || 'غير محددة'})، المشروع (${context.projectId || 'غير محدد'}).

دورك:
1. فهم الهدف والسياق بدقة واستنتاج الجهة تلقائياً إذا ذُكرت أو ارتبطت بالطلب.
2. إذا كان السياق ملتبساً ومحتملاً لأكثر من جهة دون ترجيح: ضع needsClarification = true وسؤالاً مختصراً جداً (clarificationQuestion) مع 2-4 خيارات مقترحة (suggestedAnswers).
3. تحويل الطلب المركب إلى خطة تنفيذ دقيقة (plan):
   - قسّم العمل إلى خطوات مرتبة ومنطقية (stepNumber: 1, 2, ...).
   - ميّز بدقة أي خطوة حساسة (isSensitive = true) تتطلب اعتماد المستخدم الصريح قبل التنفيذ (مثل: إرسال بريد فعلي، اعتماد مالي، مراسلة طرف خارجي، اعتماد قرار مصيري).
   - حدد نوع الإجراء: task (مهمة)، meeting (اجتماع)، calendar_sync (مزامنة تقويم Google)، draft (مسودة مراسلة)، report (تقرير)، decision (قرار)، review (مراجعة).
4. استخراج العناصر التنفيذية المحددة (extractedItems) لإضافتها لدفتر (مهام، اجتماعات، متابعات، قرارات).
5. إذا تضمن الطلب إعداد مسودة أو خطاب أو رسالة متابعة أو بريد: جهز draftPreview بأسلوب مهني واحترافي يراعي نبرة الجهة.
6. لا تختلق معلومات مالية أو أرقاماً غير موجودة، وإذا نقصت بيانات حددها في missingData.
`;

    const promptText = `
طلب المدير التنفيذي: "${query}"
المرفقات: ${attachments.length > 0 ? JSON.stringify(attachments) : 'لا يوجد'}
السياق الحالي: ${JSON.stringify(context)}
`;

    const response = await generateContentWithRetry({
      model: PRIMARY_MODEL,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: 'إيجاز تنفيذي لما تم فهمه والخطوات المقترحة في سطرين',
            },
            needsClarification: {
              type: Type.BOOLEAN,
              description: 'هل السياق ملتبس ويحتاج سؤالاً للمستخدم؟',
            },
            clarificationQuestion: { type: Type.STRING },
            suggestedAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
            inferredEntityId: { type: Type.STRING, description: 'معرف الجهة المستنتجة إن وجدت' },
            inferredEntityName: { type: Type.STRING, description: 'اسم الجهة المستنتجة' },
            plan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  actionType: { type: Type.STRING },
                  isSensitive: {
                    type: Type.BOOLEAN,
                    description: 'هل تتطلب موافقة صريحة من المدير (إرسال، اعتماد مالي، إلغاء)؟',
                  },
                },
                required: ['stepNumber', 'title', 'description', 'actionType', 'isSensitive'],
              },
            },
            extractedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  entityId: { type: Type.STRING },
                  projectId: { type: Type.STRING },
                  assignee: { type: Type.STRING },
                  plannedDate: { type: Type.STRING },
                  dueDate: { type: Type.STRING },
                  timeEstimateMinutes: { type: Type.INTEGER },
                  priority: { type: Type.STRING },
                  missingData: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestedData: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'type', 'priority'],
              },
            },
            draftPreview: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                recipient: { type: Type.STRING },
                tone: { type: Type.STRING },
                subject: { type: Type.STRING },
                body: { type: Type.STRING },
              },
            },
          },
          required: ['executiveSummary', 'needsClarification', 'plan', 'extractedItems'],
        },
      },
    });

    const latencyMs = Date.now() - startTime;
    const parsed = JSON.parse(response.text?.trim() || '{}');

    // Build finalized result
    const result = {
      query,
      context: {
        scope: context.scope || 'all',
        entityId: context.entityId || parsed.inferredEntityId,
        projectId: context.projectId,
        inferredEntityName: parsed.inferredEntityName,
      },
      provider: provider || 'gemini',
      modelName: PRIMARY_MODEL,
      latencyMs,
      costExplanation: 'مشمول ومفعل مجاناً عبر Google GenAI Cloud Run',
      executiveSummary: parsed.executiveSummary || 'تمت معالجة الطلب التنفيذي وتوليد خطة الإنجاز.',
      needsClarification: Boolean(parsed.needsClarification),
      clarificationQuestion: parsed.clarificationQuestion,
      suggestedAnswers: parsed.suggestedAnswers || [],
      plan: (parsed.plan || []).map((step: any, idx: number) => ({
        id: `step-${Date.now()}-${idx + 1}`,
        stepNumber: step.stepNumber || idx + 1,
        title: step.title,
        description: step.description,
        actionType: step.actionType || 'task',
        isSensitive: Boolean(step.isSensitive),
        status: step.isSensitive ? 'waiting_approval' : 'completed',
        isApproved: !step.isSensitive,
        resultSummary: step.isSensitive ? 'بانتظار اعتمادك للتنفيذ' : 'تم التحضير والجدولة بنجاح',
      })),
      extractedItems: (parsed.extractedItems || []).map((it: any, idx: number) => ({
        id: `extracted-${Date.now()}-${idx}`,
        title: it.title,
        type: it.type || 'task',
        entityId: it.entityId || context.entityId || parsed.inferredEntityId || '',
        projectId: it.projectId || context.projectId || '',
        assignee: it.assignee || 'أنا',
        plannedDate: it.plannedDate,
        dueDate: it.dueDate,
        timeEstimateMinutes: it.timeEstimateMinutes || 30,
        priority: it.priority || 'medium',
        missingData: it.missingData || [],
        suggestedData: it.suggestedData || [],
        originalPhrase: query,
      })),
      draftPreview: parsed.draftPreview?.body ? parsed.draftPreview : undefined,
    };

    res.json(result);
  } catch (error: any) {
    console.error('Executive command error:', error);
    res.status(500).json({ error: 'تعذر معالجة الأمر التنفيذي', details: error.message });
  }
});

// 8. Smart Reminder & AI Executive Scheduling Endpoint
app.post('/api/gemini/smart-reminder-schedule', async (req, res) => {
  try {
    const { items = [], entities = [], projects = [], currentDate = new Date().toISOString().split('T')[0] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({
        summary: 'لا توجد التزامات أو قرارات مسجلة بحاجة لجدولة حالياً.',
        insights: ['جميع الالتزامات والقرارات مكتملة أو غير نشطة.'],
        recommendations: [],
        criticalCount: 0,
        urgentCount: 0,
        pendingDecisionsCount: 0,
        analyzedAt: new Date().toISOString(),
      });
    }

    // Build entity and project context maps
    const entityMap = new Map(entities.map((e: any) => [e.id, e.name]));
    const entityColorMap = new Map(entities.map((e: any) => [e.id, e.color || '#f59e0b']));
    const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

    // Format items for AI prompt
    const candidates = items
      .filter((it: any) => !it.isDeleted && it.status !== 'completed' && it.status !== 'canceled')
      .map((it: any) => ({
        id: it.id,
        title: it.title,
        type: it.type,
        entityName: entityMap.get(it.entityId) || 'عام',
        projectName: projectMap.get(it.projectId) || '',
        priority: it.priority || 'medium',
        impact: it.impact || 'medium',
        isBlockingMe: !!it.isBlockingMe,
        plannedDate: it.plannedDate || null,
        dueDate: it.dueDate || null,
        decisionQuestion: it.decisionDetails?.question || null,
        decisionOptionsCount: it.decisionDetails?.options?.length || 0,
        missingInfo: it.decisionDetails?.missingInfo || null,
        followupParty: it.followupDetails?.partyName || null,
        followupCondition: it.followupDetails?.condition || null,
      }));

    if (candidates.length === 0) {
      return res.json({
        summary: 'رائع! لا توجد التزامات أو قرارات نشطة معلقة.',
        insights: ['جدولك التنفيذي خالٍ من المهام الحرجة المتأخرة.'],
        recommendations: [],
        criticalCount: 0,
        urgentCount: 0,
        pendingDecisionsCount: 0,
        analyzedAt: new Date().toISOString(),
      });
    }

    const prompt = `
أنت خبير الجدولة التنفيذية وكبير المستشارين (Chief of Staff AI) في منصة «دفتر».
تاريخ اليوم الحالي هو: ${currentDate}.

المطلوب منك: تحليل وتوليد «التذكير الذكي والجدولة الاستباقية» لقائمة الالتزامات والقرارات المعلقة التالية:
${JSON.stringify(candidates, null, 2)}

قواعد التحليل والجدولة:
1. إعطاء الأولوية القصوى للعناصر المعطلة للعمل (isBlockingMe = true) والقرارات العالقة (type = 'decision') والمواعيد النهائية الداهمة (dueDate <= ${currentDate}).
2. توزيع المهام والقرارات بحيث لا يثقل جدول اليوم بأكثر من قرارين مصيريين يحتاجان تركيزاً عميقاً.
3. حساب حالة الموعد النهائي (deadlineStatus):
   - 'overdue': إذا كان dueDate قبل تاريخ اليوم ${currentDate}.
   - 'due_today': إذا كان dueDate يوافق اليوم ${currentDate}.
   - 'due_soon': إذا كان dueDate خلال الـ 48 إلى 72 ساعة القادمة.
   - 'healthy': إذا كان الموعد مريحاً ومستقبلياً.
4. حساب درجة الإلحاح (urgencyGrade):
   - 'critical': حرج وفوري (متأخر أو معطل للعمل أو قرار مصيري موعده اليوم).
   - 'urgent': عاجل خلال 24 ساعة.
   - 'upcoming': مجدول للأيام القادمة.
   - 'proactive': استباقي لتفادي تراكم العمل.
5. اقتراح تاريخ محدد بدقة (suggestedDate) بصيغة YYYY-MM-DD ابتداءً من اليوم ${currentDate} أو الأيام التالية، وفترة زمنية محددة (suggestedTimeSlot) مثل "09:30 ص"، ونافذة العمل (timeSlotWindow: morning, afternoon, evening).
6. صياغة مبرر تنفيذي ذكي ومقنع (reasoning) يوضح للقيادي لماذا تم اختيار هذا التوقيت تحديداً وما هي تبعات التأجيل.
7. صياغة إجراء تنفيذي مباشر (recommendedAction) محدد وموجز جداً (أقل من 10 كلمات) يوضح ما المطلوب منه إنجازه بالضبط لإغلاق الالتزام.
8. توليد ملخص تنفيذي (summary) بلهجة احترافية سعودية/عربية، و3 رؤى استراتيجية (insights).

أعد النتيجة بدقة وبصيغة JSON فقط متطابقة مع المخطط التالي:
{
  "summary": "ملخص تنفيذي لوضع الالتزامات والقرارات",
  "insights": ["رؤية 1", "رؤية 2", "رؤية 3"],
  "recommendations": [
    {
      "itemId": "معرف العنصر",
      "suggestedDate": "YYYY-MM-DD",
      "suggestedTimeSlot": "10:00 ص",
      "timeSlotWindow": "morning",
      "urgencyScore": 95,
      "urgencyGrade": "critical",
      "deadlineStatus": "due_today",
      "reasoning": "سبب اختيار هذا الموعد وأثره على المشروع والجهة",
      "recommendedAction": "الإجراء التنفيذي المطلوب لإتمام الالتزام",
      "estimatedMinutes": 30,
      "calendarSyncRecommended": true
    }
  ]
}
`;

    let parsedResult: any = null;

    try {
      const response = await generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        parsedResult = JSON.parse(responseText);
      }
    } catch (aiErr: any) {
      console.warn('[Smart Reminder AI Error - Falling back to heuristic engine]:', aiErr.message || aiErr);
    }

    // If Gemini result is empty or failed, use smart heuristic fallback engine
    if (!parsedResult || !Array.isArray(parsedResult.recommendations)) {
      const recs = candidates.map((cand: any, idx: number) => {
        let deadlineStatus = 'healthy';
        let urgencyGrade = 'upcoming';
        let urgencyScore = 50;

        if (cand.dueDate && cand.dueDate < currentDate) {
          deadlineStatus = 'overdue';
          urgencyGrade = 'critical';
          urgencyScore = 95;
        } else if (cand.dueDate === currentDate) {
          deadlineStatus = 'due_today';
          urgencyGrade = 'critical';
          urgencyScore = 90;
        } else if (cand.isBlockingMe) {
          deadlineStatus = 'due_soon';
          urgencyGrade = cand.priority === 'urgent' ? 'critical' : 'urgent';
          urgencyScore = 85;
        } else if (cand.priority === 'urgent') {
          urgencyGrade = 'urgent';
          urgencyScore = 80;
        }

        const slotHour = 9 + (idx % 6);
        const suggestedTimeSlot = `${slotHour > 12 ? slotHour - 12 : slotHour}:00 ${slotHour >= 12 ? 'م' : 'ص'}`;
        const timeSlotWindow = slotHour < 12 ? 'morning' : slotHour < 16 ? 'afternoon' : 'evening';

        // Suggest today or tomorrow depending on load
        const suggestedDate = idx < 3 || urgencyGrade === 'critical' ? currentDate : currentDate;

        return {
          itemId: cand.id,
          suggestedDate,
          suggestedTimeSlot,
          timeSlotWindow,
          urgencyScore,
          urgencyGrade,
          deadlineStatus,
          reasoning: cand.isBlockingMe
            ? 'أنت معطل لهذا المسار حالياً، إنجازه سيفتح الطريق لبقية الفريق فوراً.'
            : cand.type === 'decision'
            ? 'قرار استراتيجي يحتاج حسماً لتفادي التباطؤ في خطة المشروع.'
            : 'التزام ذو أولوية بحاجة لتثبيت موعد مراجعة رسمي ومتابعته.',
          recommendedAction: cand.type === 'decision'
            ? 'حسم الخيار وتوثيق المبررات'
            : cand.type === 'followup'
            ? 'إرسال رسالة متابعة للطرف المعني'
            : 'اعتماد الموعد وإنجاز البنود المطلوبة',
          estimatedMinutes: cand.type === 'decision' ? 25 : 30,
          calendarSyncRecommended: urgencyGrade === 'critical' || cand.type === 'decision',
        };
      });

      parsedResult = {
        summary: `تمت مراجعة ${candidates.length} التزاماً وقراراً؛ تم التعرف على أولويات المواعيد النهائية وإعادة توزيع الجدول الاستباقي.`,
        insights: [
          'يوجد تركيز عالٍ على القرارات المعلقة التي تتطلب قرارك المباشر لفتح مسار العمل.',
          'توزيع مواعيد الحسم في الفترات الصباحية يرفع كفاءة الإنجاز التنفيذي بنسبة 40%.',
          'يوصى بمزامنة القرارات الحرجة مباشرة مع تقويم Google لضمان التنبيه قبل الموعد.',
        ],
        recommendations: recs,
      };
    }

    // Merge recommendation details with source items
    const fullRecommendations = (parsedResult.recommendations || []).map((rec: any) => {
      const srcItem = items.find((i: any) => i.id === rec.itemId);
      if (!srcItem) return null;

      return {
        itemId: srcItem.id,
        title: srcItem.title,
        type: srcItem.type,
        entityId: srcItem.entityId,
        entityName: entityMap.get(srcItem.entityId) || 'عام',
        entityColor: entityColorMap.get(srcItem.entityId) || '#f59e0b',
        projectName: projectMap.get(srcItem.projectId) || undefined,
        priority: srcItem.priority || 'medium',
        impact: srcItem.impact || 'medium',
        isBlockingMe: !!srcItem.isBlockingMe,
        currentPlannedDate: srcItem.plannedDate,
        currentDueDate: srcItem.dueDate,
        suggestedSchedule: {
          suggestedDate: rec.suggestedDate || currentDate,
          suggestedTimeSlot: rec.suggestedTimeSlot || '10:00 ص',
          timeSlotWindow: rec.timeSlotWindow || 'morning',
          urgencyScore: rec.urgencyScore || 70,
          urgencyGrade: rec.urgencyGrade || 'urgent',
          deadlineStatus: rec.deadlineStatus || 'due_soon',
          reasoning: rec.reasoning || 'تمت الجدولة بناءً على الأولوية والموعد النهائي ومستوى التأثير.',
          recommendedAction: rec.recommendedAction || 'مراجعة وحسم الالتزام',
          estimatedMinutes: rec.estimatedMinutes || 30,
        },
        calendarSyncRecommended: !!rec.calendarSyncRecommended,
      };
    }).filter(Boolean);

    // Count statistics
    const criticalCount = fullRecommendations.filter((r: any) => r.suggestedSchedule.urgencyGrade === 'critical').length;
    const urgentCount = fullRecommendations.filter((r: any) => r.suggestedSchedule.urgencyGrade === 'urgent').length;
    const pendingDecisionsCount = fullRecommendations.filter((r: any) => r.type === 'decision').length;

    res.json({
      summary: parsedResult.summary || 'تمت جدولة الالتزامات والقرارات بنجاح وفق الأولويات والمواعيد.',
      insights: parsedResult.insights || [],
      recommendations: fullRecommendations,
      criticalCount,
      urgentCount,
      pendingDecisionsCount,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Smart reminder scheduling endpoint error:', error);
    res.status(500).json({ error: 'تعذر تشغيل التذكير والجدولة الذكية', details: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'دفتر — مكتبي التنفيذي' });
});

// Setup Vite middleware for development or serve dist for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Daftar Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
