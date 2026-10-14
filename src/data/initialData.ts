import { Space, Entity, UserProfile, Project, ProjectTemplate } from '../types';

export const INITIAL_SPACES: Space[] = [
  {
    id: 'work',
    name: 'العمل',
    color: '#3b82f6', // Blue
    icon: 'Briefcase',
    isPrivate: false,
  },
  {
    id: 'commercial',
    name: 'المشاريع التجارية',
    color: '#f59e0b', // Amber
    icon: 'TrendingUp',
    isPrivate: false,
  },
  {
    id: 'personal',
    name: 'الشخصي',
    color: '#10b981', // Emerald
    icon: 'User',
    isPrivate: true, // Personal is private by default
  },
];

export const INITIAL_ENTITIES: Entity[] = [
  {
    id: 'entity-clamonies',
    spaceId: 'commercial',
    name: 'كلايمونيز',
    code: 'CLM',
    color: '#8b5cf6', // Violet
    badge: 'كلايمونيز',
    description: 'إدارة وتطوير علامة كلايمونيز التجارية وفروعها ومشاريعها.',
    tone: 'formal',
    branches: [
      { id: 'clm-b1', name: 'الفرع الرئيسي', city: 'الرياض' },
    ],
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'entity-omnia',
    spaceId: 'commercial',
    name: 'أمنية',
    code: 'OMN',
    color: '#06b6d4', // Cyan
    badge: 'أمنية',
    description: 'مشاريع واستثمارات جهة أمنية ومتابعات الموردين والشركاء.',
    tone: 'formal',
    branches: [
      { id: 'omn-b1', name: 'المقر العام', city: 'الرياض' },
    ],
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'entity-belza',
    spaceId: 'work',
    name: 'Belza',
    code: 'BLZ',
    color: '#ec4899', // Pink
    badge: 'Belza',
    description: 'أعمال وتطوير مشاريع ومبادرات Belza التنفيذية.',
    tone: 'practical',
    branches: [
      { id: 'blz-b1', name: 'المركز التشغيلي', city: 'الرياض' },
    ],
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'entity-180deg',
    spaceId: 'work',
    name: '180 Degree',
    code: '180D',
    color: '#f97316', // Orange
    badge: '180 Degree',
    description: 'مشاريع التحول والتطوير الاستراتيجي لـ 180 Degree.',
    tone: 'innovative',
    branches: [
      { id: '180-b1', name: 'المكتب الرئيسي', city: 'الرياض' },
    ],
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_USER: UserProfile = {
  name: 'محمد العبدالقادر',
  title: 'المدير التنفيذي',
  email: 'AlabdulqaderMA@gmail.com',
  role: 'owner',
  timezone: 'Asia/Riyadh',
  workDays: [0, 1, 2, 3, 4], // Sunday to Thursday (Saudi work week)
  quietHours: { start: '22:00', end: '07:00' },
  audioRetentionPolicy: 'delete_after_parse',
  notificationBriefTime: '08:30',
};

// Templates for starting new projects professionally (PMI based)

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-new-venture',
    name: 'تأسيس مشروع جديد',
    description: 'ميثاق المشروع، دراسة الجدوى، استكمال النطاق، والجاهزية للانطلاق.',
    suggestedStages: ['ميثاق المشروع والاعتماد', 'تحديد المتطلبات ودراسة السوق', 'التنفيذ وتجهيز الأصول', 'الإطلاق التجريبي', 'الإغلاق وتقييم الفوائد'],
    suggestedMilestones: ['اعتماد الميثاق', 'اكتمال الميزانية المبدئية', 'جاهزية الإطلاق الأولي', 'الإطلاق الرسمي'],
    suggestedRisks: ['تأخر اعتمادات الشركاء', 'تجاوز الميزانية التقديرية', 'تضارب المواعيد مع مشاريع أخرى']
  },
  {
    id: 'tpl-branch-opening',
    name: 'افتتاح محل أو فرع',
    description: 'اختيار الموقع، التعاقدات والتجهيز، والتشغيل الفعلي.',
    suggestedStages: ['الموقع والاشتراطات', 'المقاول والتجهيزات الداخلية', 'التوريدات والأنظمة', 'التشغيل المبدئي', 'الافتتاح الرسمي'],
    suggestedMilestones: ['توقيع عقد الموقع', 'اكتمال أعمال الديكور', 'استلام التوريدات', 'يوم الافتتاح'],
    suggestedRisks: ['تأخر مقاول التجهيز', 'تأخر شحنات المواد الأساسية', 'تأخر التراخيص البلدية']
  },
  {
    id: 'tpl-feature-launch',
    name: 'إطلاق تطبيق أو ميزة تقنية',
    description: 'تحديد النطاق والمتطلبات، التطوير، الاختبار، والإطلاق للمستخدمين.',
    suggestedStages: ['وثيقة المتطلبات والنطاق', 'التصميم وتجربة المستخدم', 'التطوير البرمجي', 'فحص الجودة والأمان', 'النشر والإطلاق'],
    suggestedMilestones: ['اعتماد التصميم', 'انتهاء النسخة التجريبية (Beta)', 'اجتياز فحص الأمان', 'الإطلاق المباشر'],
    suggestedRisks: ['ظهور عيوب برمجية غير متوقعة', 'تأخر اعتماد متجر التطبيقات', 'ضعف التجاوب مع الخوادم']
  },
  {
    id: 'tpl-marketing-campaign',
    name: 'حملة تسويقية',
    description: 'الأهداف، الرسائل، صانعي المحتوى والميزانية، وقياس العائد.',
    suggestedStages: ['الخطة والرسائل الأساسية', 'إنتاج المواد والتصاميم', 'الجدولة والتوزيع', 'المتابعة وقياس الأثر'],
    suggestedMilestones: ['اعتماد الخطة والميزانية', 'اكتمال المواد الإعلانية', 'انطلاق الحملة', 'تقرير الأداء النهائي'],
    suggestedRisks: ['تأخر تسليم المواد الإعلانية', 'عدم تحقيق التفاعل المستهدف', 'تغير في سياسات المنصات']
  },
  {
    id: 'tpl-vendor-contract',
    name: 'تعاقد مع مورد أو شريك',
    description: 'مقارنة العروض، التفاوض، توقيع العقد، ومتابعة التسليمات.',
    suggestedStages: ['استدراج ومقارنة العروض', 'المفاوضات الفنية والمالية', 'صياغة العقد والمراجعة', 'التوقيع وبدء التوريد'],
    suggestedMilestones: ['استلام كافة العروض', 'اختيار المورد المفضل', 'توقيع العقد الرسمي', 'استلام الدفعة الأولى'],
    suggestedRisks: ['عدم التزام المورد بالمواصفات', 'تأخر التوريد في أوقات الذروة', 'تغير الأسعار والشروط']
  },
  {
    id: 'tpl-personal-project',
    name: 'مشروع شخصي أو عائلي',
    description: 'تخطيط مرن مع الحفاظ على الخصوصية والمواعيد المهمة.',
    suggestedStages: ['التخطيط المبدئي', 'التنفيذ خطوة بخطوة', 'المتابعة والإتمام'],
    suggestedMilestones: ['بدء أول خطوة', 'نصف المسافة', 'الإنجاز التام'],
    suggestedRisks: ['ضيق الوقت بسبب التزامات العمل', 'تشتت التركيز']
  }
];
