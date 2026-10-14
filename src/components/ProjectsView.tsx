import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  FolderKanban,
  Plus,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Building,
  DollarSign,
  User,
  Flag,
  FileText,
  ShieldAlert,
  Calendar,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  List,
  GitCommit,
  Check
} from 'lucide-react';
import { Project, ProjectStatus, ProjectTemplate } from '../types';
import { PROJECT_TEMPLATES } from '../data/initialData';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    entities,
    user,
    addProject,
    updateProject,
    selectedEntityId,
    searchQuery,
  } = useDaftar();

  const [viewMode, setViewMode] = useState<'cards' | 'kanban' | 'timeline'>('cards');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [activeTabInsideDetail, setActiveTabInsideDetail] = useState<'charter' | 'milestones' | 'risks' | 'budget'>('charter');

  // New project creation state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectEntityId, setNewProjectEntityId] = useState(entities[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-new-venture');
  const [newProjectBudget, setNewProjectBudget] = useState<number>(100000);

  // Filter projects
  const filteredProjects = projects.filter(p => {
    if (p.isArchived) return false;
    if (selectedEntityId !== 'all' && p.entityId !== selectedEntityId) return false;
    if (selectedStatusFilter !== 'all' && p.status !== selectedStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCreateFromTemplate = () => {
    if (!newProjectName.trim()) return;

    const tpl = PROJECT_TEMPLATES.find(t => t.id === selectedTemplateId);

    const stages = tpl?.suggestedStages || ['التخطيط', 'التنفيذ', 'الإغلاق'];
    const milestones = (tpl?.suggestedMilestones || ['المعلم الأول', 'المعلم النهائي']).map((m, idx) => ({
      id: `m-${Date.now()}-${idx}`,
      title: m,
      targetDate: new Date(Date.now() + (idx + 1) * 14 * 86400000).toISOString().split('T')[0],
      status: 'pending' as const,
      weight: Math.round(100 / (tpl?.suggestedMilestones.length || 2)),
    }));

    const risks = (tpl?.suggestedRisks || []).map((r, idx) => ({
      id: `r-${Date.now()}-${idx}`,
      title: r,
      probability: 'medium' as const,
      impact: 'high' as const,
      owner: user.name,
      responsePlan: 'متابعة دورية واعتماد خطة بديلة',
      status: 'open' as const,
    }));

    addProject({
      entityId: newProjectEntityId || entities[0]?.id || 'entity-clamonies',
      branchIds: [],
      name: newProjectName.trim(),
      code: newProjectCode.trim() || newProjectName.trim().substring(0, 3).toUpperCase(),
      status: 'on_track',
      aiSuggestedStatus: 'on_track',
      statusReason: 'مشروع جديد قيد التأسيس',
      currentStage: stages[0] || 'التخطيط',
      nextMilestone: milestones[0]?.title || 'المعلم الأول',
      owner: user.name,
      urgency: 'medium',
      budget: {
        allocated: newProjectBudget,
        committed: 0,
        spent: 0,
        currency: 'SAR',
      },
      charter: {
        purpose: tpl?.description || 'مشروع تنفيذي جديد',
        sponsor: user.name,
        manager: user.name,
        objectives: ['تحقيق أهداف المشروع في الوقت المحدد', 'الالتزام بسقف الميزانية'],
        outOfScope: ['أي أعمال خارج النطاق المعتمد مسبقاً'],
      },
      milestones,
      risks,
      isArchived: false,
    });

    setNewProjectName('');
    setNewProjectCode('');
    setShowNewProjectModal(false);
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'on_track':
        return { label: 'على المسار', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
      case 'at_risk':
        return { label: 'معرض للتعثر', bg: 'bg-amber-950/80 text-amber-300 border-amber-800' };
      case 'off_track':
        return { label: 'متعثر', bg: 'bg-rose-950/80 text-rose-300 border-rose-800' };
      case 'on_hold':
        return { label: 'متوقف', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
      case 'completed':
        return { label: 'مكتمل', bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' };
      case 'needs_update':
        return { label: 'يحتاج تحديثاً', bg: 'bg-purple-950/80 text-purple-300 border-purple-800' };
      default:
        return { label: status, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-slate-50 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-amber-400" />
            <span>لوحة جميع المشاريع</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة المشاريع باحترافية PMI: ميثاق المشروع، المعالم، المخاطر، وخط الأساس الزمني.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'cards' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
              }`}
              title="عرض البطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'kanban' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
              }`}
              title="عرض كانبان"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'timeline' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
              }`}
              title="عرض الجدول والمعالم"
            >
              <GitCommit className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowNewProjectModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع جديد</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 shrink-0">تصفية الحالة:</span>
        {[
          { id: 'all', label: 'الكل' },
          { id: 'on_track', label: 'على المسار' },
          { id: 'at_risk', label: 'معرض للتعثر' },
          { id: 'off_track', label: 'متعثر' },
          { id: 'on_hold', label: 'متوقف' },
          { id: 'needs_update', label: 'يحتاج تحديثاً' },
        ].map(st => (
          <button
            key={st.id}
            onClick={() => setSelectedStatusFilter(st.id)}
            className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
              selectedStatusFilter === st.id
                ? 'bg-slate-800 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Projects List / Grid / Kanban */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="font-heading font-semibold text-slate-200 text-base">
            لا توجد مشاريع مضافة حالياً
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            أنشئ مشروعك الأول باستخدام أحد القوالب التنفيذية (افتتاح فرع، إطلاق ميزة، تعاقد مع مورد).
          </p>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء أول مشروع الآن</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map(proj => {
            const entity = entities.find(e => e.id === proj.entityId);
            const statusBadge = getStatusBadge(proj.status);
            const aiBadge = proj.aiSuggestedStatus ? getStatusBadge(proj.aiSuggestedStatus) : null;

            // Milestones progress
            const totalMilestones = proj.milestones?.length || 0;
            const reachedMilestones = proj.milestones?.filter(m => m.status === 'reached').length || 0;
            const progressPercent = totalMilestones > 0 ? Math.round((reachedMilestones / totalMilestones) * 100) : 0;

            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectForDetail(proj)}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer group space-y-4 shadow-lg shadow-slate-950/40"
              >
                {/* Entity & Status Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entity && (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-bold"
                        style={{ backgroundColor: `${entity.color}22`, color: entity.color }}
                      >
                        {entity.name}
                      </span>
                    )}
                    <span className="font-mono text-xs text-slate-400 font-bold">
                      {proj.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                    {/* Distinguish AI Suggested Status if differs */}
                    {proj.aiSuggestedStatus && proj.aiSuggestedStatus !== proj.status && aiBadge && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300 font-mono"
                        title="الحالة المقترحة ذكياً بناءً على الالتزامات المتأخرة"
                      >
                        مقترح: {aiBadge.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Project Title & Stage */}
                <div>
                  <h3 className="font-heading font-bold text-lg text-slate-100 group-hover:text-amber-300 transition">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    المرحلة الحالية: <span className="text-slate-200 font-medium">{proj.currentStage}</span>
                  </p>
                </div>

                {/* Milestones Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>تقدم المعالم:</span>
                    <span className="font-mono text-amber-400 font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Meta details strip */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">المعلم القادم: {proj.nextMilestone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>المسؤول: {proj.owner}</span>
                  </div>
                  {proj.budget && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        المصروف: {proj.budget.spent.toLocaleString()} / {proj.budget.allocated.toLocaleString()} {proj.budget.currency}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] text-slate-500">
                      آخر تحديث: {new Date(proj.lastUpdated).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Timeline / Gantt View of Milestones */
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-amber-400" />
            <span>خط الأساس ومعالم المشاريع</span>
          </h3>
          <div className="space-y-4">
            {filteredProjects.map(proj => (
              <div key={proj.id} className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm text-slate-200">{proj.name}</span>
                  <span className="text-xs text-amber-400 font-mono">{proj.currentStage}</span>
                </div>
                <div className="space-y-2">
                  {proj.milestones?.map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-amber-400 font-mono">
                          {idx + 1}
                        </span>
                        <span className={m.status === 'reached' ? 'line-through text-slate-500' : 'text-slate-200'}>
                          {m.title}
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {m.targetDate} ({m.status === 'reached' ? 'تم الإنجاز' : 'قادم'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Detail Modal (PM Charter, Milestones, Risks, Budget) */}
      {selectedProjectForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    {selectedProjectForDetail.code}
                  </span>
                  <h3 className="font-heading font-bold text-xl text-slate-100">
                    {selectedProjectForDetail.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  المرحلة: {selectedProjectForDetail.currentStage} • المدير: {selectedProjectForDetail.owner}
                </p>
              </div>
              <button
                onClick={() => setSelectedProjectForDetail(null)}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                ✕
              </button>
            </div>

            {/* PM Sub-tabs */}
            <div className="flex items-center gap-1 px-5 border-b border-slate-800 text-xs bg-slate-900/50">
              {[
                { id: 'charter', label: 'ميثاق المشروع (Charter)' },
                { id: 'milestones', label: 'المعالم والجدول' },
                { id: 'risks', label: 'سجل المخاطر' },
                { id: 'budget', label: 'الميزانية والمصروف' },
              ].map(tb => (
                <button
                  key={tb.id}
                  onClick={() => setActiveTabInsideDetail(tb.id as any)}
                  className={`py-3 px-3 font-semibold border-b-2 transition ${
                    activeTabInsideDetail === tb.id
                      ? 'border-amber-500 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {activeTabInsideDetail === 'charter' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-amber-400 block">الغرض من المشروع (Purpose):</span>
                    <p className="text-slate-200 leading-relaxed">
                      {selectedProjectForDetail.charter?.purpose || 'لم يتم تسجيل غرض ميثاق المشروع بعد.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                      <span className="text-slate-400 block mb-1">راعي المشروع (Sponsor):</span>
                      <span className="font-semibold text-slate-200">
                        {selectedProjectForDetail.charter?.sponsor || 'غير محدد'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                      <span className="text-slate-400 block mb-1">مدير المشروع (Project Manager):</span>
                      <span className="font-semibold text-slate-200">
                        {selectedProjectForDetail.charter?.manager || selectedProjectForDetail.owner}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                    <span className="font-bold text-emerald-400 block">الأهداف والنتائج المستهدفة:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {selectedProjectForDetail.charter?.objectives?.map((ob, i) => (
                        <li key={i}>{ob}</li>
                      )) || <li>تحقيق الجودة والتسليم في الموعد المحدد.</li>}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                    <span className="font-bold text-rose-400 block">ما يقع خارج النطاق (Out of Scope):</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      {selectedProjectForDetail.charter?.outOfScope?.map((os, i) => (
                        <li key={i}>{os}</li>
                      )) || <li>أي أعمال خارج العقود الموقعة مسبقاً.</li>}
                    </ul>
                  </div>
                </div>
              )}

              {activeTabInsideDetail === 'milestones' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">قائمة معالم خط الأساس:</span>
                  </div>
                  {selectedProjectForDetail.milestones?.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-200 block">{m.title}</span>
                          <span className="text-[11px] text-slate-500">
                            الوزن النسبي: {m.weight}% • التاريخ المستهدف: {m.targetDate}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          m.status === 'reached'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.status === 'reached' ? 'تم الوصول إليه' : 'قيد التنفيذ'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTabInsideDetail === 'risks' && (
                <div className="space-y-3">
                  <span className="font-bold text-slate-300 block">سجل المخاطر (Risk Register):</span>
                  {selectedProjectForDetail.risks?.map(risk => (
                    <div
                      key={risk.id}
                      className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{risk.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            أثر: {risk.impact}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            احتمالية: {risk.probability}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        خطة الاستجابة: {risk.responsePlan}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTabInsideDetail === 'budget' && selectedProjectForDetail.budget && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                      <span className="text-slate-400 block mb-1">الميزانية المعتمدة:</span>
                      <span className="text-base font-bold text-slate-100">
                        {selectedProjectForDetail.budget.allocated.toLocaleString()} {selectedProjectForDetail.budget.currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                      <span className="text-slate-400 block mb-1">الالتزامات المؤكدة:</span>
                      <span className="text-base font-bold text-amber-400">
                        {selectedProjectForDetail.budget.committed.toLocaleString()} {selectedProjectForDetail.budget.currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                      <span className="text-slate-400 block mb-1">المصروف الفعلي:</span>
                      <span className="text-base font-bold text-emerald-400">
                        {selectedProjectForDetail.budget.spent.toLocaleString()} {selectedProjectForDetail.budget.currency}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedProjectForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal using Templates */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>إنشاء مشروع تنفيذي من قالب احترافي</span>
              </h3>
              <button onClick={() => setShowNewProjectModal(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Template selector */}
              <div>
                <label className="text-slate-400 block mb-1.5">اختر قالب المشروع:</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-2.5 rounded-xl border text-right transition ${
                        selectedTemplateId === tpl.id
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="block font-semibold">{tpl.name}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {tpl.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name and Entity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">اسم المشروع:</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="مثال: افتتاح فرع التحلية"
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الجهة التابعة:</label>
                  <select
                    value={newProjectEntityId}
                    onChange={e => setNewProjectEntityId(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {entities.map(ent => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget and Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">رمز المشروع المختصر:</label>
                  <input
                    type="text"
                    value={newProjectCode}
                    onChange={e => setNewProjectCode(e.target.value)}
                    placeholder="مثال: CLM-THL"
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الميزانية التقديرية (ريال):</label>
                  <input
                    type="number"
                    value={newProjectBudget}
                    onChange={e => setNewProjectBudget(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateFromTemplate}
                disabled={!newProjectName.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-40"
              >
                إنشاء المشروع بالمراحل والمعالم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
