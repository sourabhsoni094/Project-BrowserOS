import React from 'react';
import { useNotification, NotificationItem } from '../../stores/notification.store';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotification();

  if (toasts.length === 0) return null;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  const getBorderColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/40 bg-emerald-950/80';
      case 'warning':
        return 'border-amber-500/40 bg-amber-950/80';
      case 'error':
        return 'border-rose-500/40 bg-rose-950/80';
      case 'info':
      default:
        return 'border-blue-500/40 bg-slate-900/90';
    }
  };

  return (
    <div className="fixed top-12 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${getBorderColor(
            toast.type
          )}`}
        >
          <div className="mt-0.5">{getIcon(toast.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{toast.title}</div>
            <div className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
              {toast.message}
            </div>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
