import React from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  CalendarDays,
  FolderKanban,
  Radar,
  Sparkles,
  Mic,
  Plus
} from 'lucide-react';

export const AndroidNavBar: React.FC = () => {
  const { activeTab, setActiveTab } = useDaftar();

  const tabs = [
    { id: 'today' as const, label: 'اليوم', icon: CalendarDays },
    { id: 'projects' as const, label: 'المشاريع', icon: FolderKanban },
    { id: 'radar' as const, label: 'المتابعات والقرارات', icon: Radar },
    { id: 'assistant' as const, label: 'المساعد', icon: Sparkles },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-slate-400 px-4 py-2 flex items-center justify-around shadow-2xl md:static md:bg-transparent md:border-0 md:p-0 md:justify-start md:gap-2">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 md:py-2 rounded-xl transition duration-150 ${
              isActive
                ? 'text-amber-400 font-bold md:bg-slate-800 md:border md:border-slate-700 shadow-sm'
                : 'hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-[11px] md:text-xs font-heading">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
