import React, { useState, useEffect } from 'react';
import { useAuth } from '../../stores/auth.store';
import { useNotification } from '../../stores/notification.store';
import { NotificationCenter } from './NotificationCenter';
import { Monitor, Wifi, RotateCw, Bell } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotification();
  const [time, setTime] = useState<string>('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="h-9 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-2.5 sm:px-4 flex items-center justify-between text-xs text-slate-300 z-40 select-none">
        {/* Left: OS Brand & Quick menu */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-1.5 font-semibold text-white tracking-wide">
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs sm:text-sm">BrowserOS</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hover:text-slate-200 cursor-default hidden sm:inline">Activities</span>
        </div>

        {/* Center: System Clock */}
        <div className="font-medium text-slate-200 tracking-wider text-[11px] sm:text-xs">
          {time || '--:--:--'}
        </div>

        {/* Right: System Tray & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-400 hidden md:inline">Online</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative p-1.5 rounded-lg transition-colors ${
              isNotifOpen ? 'bg-blue-600/30 text-blue-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Notification Center"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white font-bold text-[9px] flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-200">
              <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-[10px] font-bold text-blue-400">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium hidden sm:inline">{user?.username}</span>
            </div>

            <button
              onClick={() => window.location.reload()}
              title="Reload Desktop"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors ml-1"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Dropdown Notification Center */}
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};
