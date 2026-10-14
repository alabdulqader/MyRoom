import React, { useState } from 'react';
import { useDaftar } from '../context/DaftarContext';
import {
  Settings,
  User,
  Shield,
  Clock,
  Mic,
  Bell,
  Download,
  Upload,
  Trash2,
  X,
  Check,
  FileSpreadsheet,
  Printer
} from 'lucide-react';

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, updateUser, exportDataJSON, importDataJSON, clearAllUserData, items } = useDaftar();

  const [name, setName] = useState(user.name);
  const [title, setTitle] = useState(user.title);
  const [role, setRole] = useState(user.role);
  const [timezone, setTimezone] = useState(user.timezone);
  const [audioRetention, setAudioRetention] = useState(user.audioRetentionPolicy);
  const [briefTime, setBriefTime] = useState(user.notificationBriefTime);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveProfile = () => {
    updateUser({
      name,
      title,
      role: role as any,
      timezone,
      audioRetentionPolicy: audioRetention as any,
      notificationBriefTime: briefTime,
    });
    alert('تم حفظ الإعدادات بنجاح.');
    onClose();
  };

  const handleDownloadJSON = () => {
    const data = exportDataJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daftar-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['العنوان', 'النوع', 'الحالة', 'الأولوية', 'التاريخ المخطط', 'الموعد النهائي', 'المسؤول'];
    const rows = items.map(i => [
      `"${i.title.replace(/"/g, '""')}"`,
      i.type,
      i.status,
      i.priority,
      i.plannedDate || '',
      i.dueDate || '',
      `"${i.assignee || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daftar-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const success = importDataJSON(content);
      if (success) {
        setImportStatus('تم استعادة النسخة الاحتياطية بنجاح!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('خطأ في قراءة ملف النسخة الاحتياطية.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              <span>إعدادات المكتب التنفيذي والخصوصية</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة الهوية، الصلاحيات، سياسة الصوت، وتصدير واستعادة البيانات.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* User Profile */}
          <div className="space-y-3">
            <span className="font-bold text-slate-300 block">الملف التنفيذي والصلاحيات:</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">المسمى التنفيذي:</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">الدور والصلاحية:</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                >
                  <option value="owner">مالك (صلاحيات كاملة مطلقة)</option>
                  <option value="manager">مدير مشاريع (إدارة واعتماد)</option>
                  <option value="member">عضو فريق (تنفيذ وتحديث)</option>
                  <option value="viewer">مشاهد (اطلاع فقط)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">المنطقة الزمنية وأسبوع العمل:</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                >
                  <option value="Asia/Riyadh">آسيا/الرياض (الأحد - الخميس)</option>
                  <option value="Asia/Dubai">آسيا/دبي</option>
                  <option value="Africa/Cairo">إفريقيا/القاهرة</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacy & Audio retention */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="font-bold text-slate-300 block">الخصوصية وإدارة التسجيلات الصوتية:</span>
            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audioRetention"
                  value="delete_after_parse"
                  checked={audioRetention === 'delete_after_parse'}
                  onChange={() => setAudioRetention('delete_after_parse')}
                  className="text-amber-500 focus:ring-0"
                />
                <span className="text-slate-200 font-medium">
                  حذف التسجيل الصوتي فور استخراج المحتوى والمهام (أعلى درجات الخصوصية)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audioRetention"
                  value="keep"
                  checked={audioRetention === 'keep'}
                  onChange={() => setAudioRetention('keep')}
                  className="text-amber-500 focus:ring-0"
                />
                <span className="text-slate-200 font-medium">
                  الاحتفاظ بالتسجيل كمرجع صوتي ملحق بالعنصر
                </span>
              </label>
            </div>
          </div>

          {/* Morning Briefing Schedule */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <span className="font-bold text-slate-300 block">توقيت إرسال الملخص التنفيذي الصباحي:</span>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={briefTime}
                onChange={e => setBriefTime(e.target.value)}
                className="bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
              />
              <span className="text-slate-400">
                (أيام العمل الأحد - الخميس 8:30 ص، نهاية الأسبوع 12:00 م)
              </span>
            </div>
          </div>

          {/* Data Export & Backup */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="font-bold text-slate-300 block">النسخ الاحتياطي وتصدير البيانات:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadJSON}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>تصدير نسخة كاملة (JSON)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تصدير المهام (CSV)</span>
              </button>

              <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>استعادة نسخة (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <p className="text-emerald-400 font-medium">{importStatus}</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('هل أنت متأكد من رغبتك في تفريغ كافة البيانات والبدء من الصفر؟')) {
                clearAllUserData();
                onClose();
              }
            }}
            className="text-rose-400 hover:text-rose-300 text-xs"
          >
            إعادة تعيين المكتب بالكامل
          </button>

          <button
            onClick={handleSaveProfile}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
};
