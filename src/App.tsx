import React, { useState } from 'react';
import { DaftarProvider, useDaftar } from './context/DaftarContext';
import { Header } from './components/Header';
import { TodayView } from './components/TodayView';
import { ProjectsView } from './components/ProjectsView';
import { CommitmentRadarView } from './components/CommitmentRadarView';
import { AssistantView } from './components/AssistantView';
import { AndroidNavBar } from './components/AndroidNavBar';
import { MeetingDebriefModal } from './components/MeetingDebriefModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { SettingsModal } from './components/SettingsModal';
import { BriefingModal } from './components/BriefingModal';
import { TrashModal } from './components/TrashModal';
import { SmartReminderModal } from './components/SmartReminderModal';
import { Item } from './types';
import { Smartphone, Download, Check, Shield } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSmartReminderModalOpen,
    setIsSmartReminderModalOpen,
  } = useDaftar();

  const [showSettings, setShowSettings] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [selectedMeetingForDebrief, setSelectedMeetingForDebrief] = useState<Item | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Executive Header */}
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onOpenIntegrations={() => setShowIntegrations(true)}
        onOpenBriefing={() => setShowBriefing(true)}
        onOpenTrash={() => setShowTrash(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5">
        {/* Desktop Secondary Navigation Bar */}
        <div className="hidden md:flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
          <AndroidNavBar />
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>أندرويد متزامن (Android-First PWA)</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>تشفير محلي وسحابي</span>
            </span>
          </div>
        </div>

        {/* View Switching */}
        {activeTab === 'today' && (
          <TodayView
            onOpenMeetingDebrief={m => setSelectedMeetingForDebrief(m)}
            onOpenItemModal={it => setSelectedItemForDetail(it)}
          />
        )}

        {activeTab === 'projects' && <ProjectsView />}

        {activeTab === 'radar' && <CommitmentRadarView />}

        {activeTab === 'assistant' && <AssistantView />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden">
        <AndroidNavBar />
      </div>

      {/* Modals */}
      {selectedMeetingForDebrief && (
        <MeetingDebriefModal
          meeting={selectedMeetingForDebrief}
          onClose={() => setSelectedMeetingForDebrief(null)}
        />
      )}

      {selectedItemForDetail && (
        <ItemDetailModal
          item={selectedItemForDetail}
          onClose={() => setSelectedItemForDetail(null)}
        />
      )}

      {showIntegrations && (
        <IntegrationsModal onClose={() => setShowIntegrations(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showBriefing && (
        <BriefingModal onClose={() => setShowBriefing(false)} />
      )}

      {showTrash && (
        <TrashModal onClose={() => setShowTrash(false)} />
      )}

      {/* Smart Reminder & AI Scheduling Modal */}
      <SmartReminderModal
        isOpen={isSmartReminderModalOpen}
        onClose={() => setIsSmartReminderModalOpen(false)}
        onOpenDecisionModal={it => setSelectedItemForDetail(it)}
      />
    </div>
  );
};

export default function App() {
  return (
    <DaftarProvider>
      <MainLayout />
    </DaftarProvider>
  );
}
