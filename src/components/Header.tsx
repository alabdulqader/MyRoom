import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Briefcase,
  Search,
  Sparkles,
  Settings,
  Download,
  Share2,
  Calendar,
  Cloud,
  CheckCircle,
  AlertTriangle,
  FolderSync,
  Layers,
  Database,
  RefreshCw,
  Bell,
  BellRing,
  Clock,
  Trash2,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenIntegrations: () => void;
  onOpenBriefing: () => void;
  onOpenTrash: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenIntegrations,
  onOpenBriefing,
  onOpenTrash,
}) => {
  const {
    spaces,
    entities,
    selectedSpaceId,
    selectedEntityId,
    setSelectedSpaceId,
    setSelectedEntityId,
    searchQuery,
    setSearchQuery,
    user,
    integrations,
    isGoogleCalendarConnected,
    isDemoMode,
    loadDemoData,
    clearAllUserData,
    setIsSmartReminderModalOpen,
    urgentCommitmentsAndDecisionsCount,
  } = useDaftar();

  const [showSpacesMenu, setShowSpacesMenu] = useState(false);

  // Format today's date in Arabic (Riyadh)
  const todayFormatted = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Riyadh',
  }).format(new Date());

  const connectedIntegrationsCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Right side (RTL): Brand and Date */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/30">
              <span className="font-heading font-black text-xl text-slate-950">د</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-bold text-lg text-slate-50 tracking-tight">
                  دفتر
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-medium">
                  مكتبي التنفيذي
                </span>
                {isDemoMode && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                    بيانات استعراضية تجريبية
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{todayFormatted}</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400/90 font-mono">توقيت الرياض</span>
              </p>
            </div>
          </div>

          {/* Quick status mobile trigger */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={onOpenBriefing}
              className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-amber-300 hover:bg-slate-700 transition"
              title="الملخص التنفيذي"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث في المهام، المشاريع، القرارات، أو الجهات..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                مسح
              </button>
            )}
          </div>

          {/* Space Filter dropdown */}
          <div className="relative">
            <select
              value={selectedSpaceId}
              onChange={e => setSelectedSpaceId(e.target.value)}
              className="bg-slate-850 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">كل المساحات</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isPrivate ? '(خاص)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Left side: Executive Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Google Calendar Live Sync Indicator */}
          <button
            onClick={onOpenIntegrations}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition ${
              isGoogleCalendarConnected
                ? 'bg-cyan-950/40 hover:bg-cyan-900/40 border-cyan-800 text-cyan-300'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-400'
            }`}
            title="حالة مزامنة تقويم Google والتقاويم المخصصة"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>تقويم Google</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isGoogleCalendarConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </button>

          {/* Integrations Indicator */}
          <button
            onClick={onOpenIntegrations}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 hover:text-slate-100 transition"
            title="حالة الربط مع خدمات Google و Microsoft"
          >
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>التكاملات</span>
          </button>

          {/* Smart Reminder & Scheduling Trigger */}
          <button
            onClick={() => setIsSmartReminderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs text-amber-300 font-semibold transition relative shadow-sm"
            title="التذكير والجدولة الذكية للالتزامات والقرارات"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>التذكير الذكي</span>
            {urgentCommitmentsAndDecisionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {urgentCommitmentsAndDecisionsCount}
              </span>
            )}
          </button>

          {/* Morning Briefing Trigger */}
          <button
            onClick={onOpenBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 border border-amber-500/30 text-xs text-amber-300 font-medium transition"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>الملخص اليومي</span>
          </button>

          {/* Demo toggle / Clear data */}
          {!isDemoMode ? (
            <button
              onClick={loadDemoData}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition"
              title="تعبئة بيانات تجريبية معزولة لاختبار المزايا"
            >
              استعراض تجريبي
            </button>
          ) : (
            <button
              onClick={clearAllUserData}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-red-950/40 border border-red-800/50 hover:bg-red-900/50 text-red-300 transition"
              title="إفراغ البيانات التجريبية والعودة للبيئة النظيفة"
            >
              تفريغ التجربة
            </button>
          )}

          {/* Trash */}
          <button
            onClick={onOpenTrash}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-300 transition"
            title="سلة الاسترجاع"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-slate-100 transition"
            title="الإعدادات والصلاحيات والنسخ الاحتياطي"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User profile avatar */}
          <div className="flex items-center gap-2 pl-1 border-r border-slate-800 pr-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-300">
              {user.name.split(' ')[0]?.[0] || 'م'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
