import React from 'react';
import { useDaftar } from '../context/DaftarContext';
import { Trash2, RotateCcw, X, AlertTriangle } from 'lucide-react';

export const TrashModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { items, restoreItem, deleteItem } = useDaftar();

  const deletedItems = items.filter(i => i.isDeleted);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h3 className="font-heading font-bold text-base text-slate-100">
              سلة الاسترجاع ({deletedItems.length})
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3 text-xs">
          {deletedItems.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              سلة الاسترجاع فارغة حالياً.
            </p>
          ) : (
            deletedItems.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-200 block truncate">{item.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    حذف في: {new Date(item.updatedAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => restoreItem(item.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium flex items-center gap-1 border border-slate-700"
                    title="استرجاع إلى الدفتر"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استرجاع</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذه الخطوة.')) {
                        deleteItem(item.id, true);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                    title="حذف نهائي"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
