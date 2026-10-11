import React, { useRef, useEffect } from 'react';
import { useNotification, NotificationItem } from '../../stores/notification.store';
import { Bell, Info, CheckCircle2, AlertTriangle, XCircle, Trash2, CheckCheck, X } from 'lucide-react';
import { useWindowManager } from '../../stores/window.store';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { notifications, clearAllNotifications, markAllAsRead, removeNotification } = useNotification();
  const { openWindow } = useWindowManager();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const handleNotificationClick = (item: NotificationItem) => {
    if (item.appId) {
      openWindow(item.appId);
      onClose();
    }
  };

  return (
    <div
      ref={panelRef}
      className="fixed top-10 right-2 left-2 sm:left-auto sm:right-4 w-auto sm:w-80 max-h-[480px] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-xs animate-in fade-in slide-in-from-top-3 duration-150"
    >
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white">Notifications</span>
          {notifications.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-500/30">
              {notifications.length}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearAllNotifications}
                title="Clear all notifications"
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/40">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <Bell className="w-8 h-8 text-slate-700" />
            <div className="text-xs">No notifications right now</div>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`group p-2.5 rounded-xl transition-all cursor-pointer flex items-start space-x-2.5 ${
                !item.read
                  ? 'bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20'
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="mt-0.5">{getIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 truncate text-[11px]">
                    {item.title}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                  {item.message}
                </p>
                {item.appId && (
                  <span className="inline-block mt-1 text-[9px] text-blue-400 uppercase tracking-wider font-semibold">
                    Click to view →
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 rounded transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
