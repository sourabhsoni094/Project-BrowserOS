import React from 'react';
import { Monitor, Bell, Volume2, Wifi } from 'lucide-react';
import { getAppById } from '../../applications/appRegistry';
import { useWindowManager } from '../../stores/window.store';

interface TaskbarProps {
  isLauncherOpen: boolean;
  onToggleLauncher: () => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({ isLauncherOpen, onToggleLauncher }) => {
  const { windows, activeWindowId, toggleWindowFromDock, minimizeWindow } = useWindowManager();

  // Pinned apps IDs
  const pinnedAppIds = ['terminal', 'file-manager', 'text-editor', 'ai-assistant', 'system-monitor', 'notes', 'settings'];

  // All apps to show in dock: pinned apps + any open unpinned apps
  const openAppIds = windows.map((w) => w.appId);
  const displayAppIds = Array.from(new Set([...pinnedAppIds, ...openAppIds]));

  const handleShowDesktop = () => {
    windows.forEach((win) => {
      if (!win.isMinimized) {
        minimizeWindow(win.id);
      }
    });
  };

  return (
    <footer className="h-14 w-full bg-slate-950/85 backdrop-blur-2xl border-t border-slate-800/80 px-2 sm:px-3 flex items-center justify-between text-xs z-40 select-none shadow-2xl">
      {/* Left: Start / Launcher Button */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={onToggleLauncher}
          title="Application Launcher"
          className={`h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl flex items-center space-x-2 font-semibold transition-all ${
            isLauncherOpen
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/50'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <Monitor className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline tracking-wide text-xs">Start</span>
        </button>
      </div>

      {/* Center: Dock App Icons */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1 px-1 sm:px-2 max-w-[calc(100vw-80px)] sm:max-w-[65vw] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {displayAppIds.map((appId) => {
          const app = getAppById(appId);
          if (!app) return null;
          const Icon = app.icon;

          const openWindow = windows.find((w) => w.appId === appId);
          const isRunning = !!openWindow;
          const isFocused = isRunning && openWindow.id === activeWindowId && !openWindow.isMinimized;

          return (
            <button
              key={appId}
              onClick={() => toggleWindowFromDock(appId)}
              title={app.title}
              className={`relative h-9 w-9 sm:h-10 sm:w-11 min-w-[36px] sm:min-w-[44px] rounded-xl flex flex-col items-center justify-center transition-all group ${
                isFocused
                  ? 'bg-slate-800/90 border border-slate-600/80 shadow-md shadow-blue-500/10'
                  : isRunning
                  ? 'bg-slate-900/80 border border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                  : 'hover:bg-slate-900/60 border border-transparent hover:border-slate-800'
              }`}
            >
              <Icon
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110 ${
                  isFocused
                    ? 'text-blue-400'
                    : isRunning
                    ? 'text-slate-200'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />

              {/* Running Indicator Dot */}
              {isRunning && (
                <div
                  className={`absolute bottom-0.5 sm:bottom-1 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full transition-all ${
                    isFocused ? 'bg-blue-400 w-3 shadow-sm shadow-blue-400' : 'bg-slate-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right: System Tray & Show Desktop */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 text-slate-400 pl-2">
          <button title="Network: Connected" className="p-1.5 rounded-lg hover:bg-slate-800/80 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
          </button>
          <button title="Sound: 100%" className="p-1.5 rounded-lg hover:bg-slate-800/80 hover:text-slate-200">
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button title="Notifications" className="p-1.5 rounded-lg hover:bg-slate-800/80 hover:text-slate-200">
            <Bell className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Show Desktop Trigger */}
        <button
          onClick={handleShowDesktop}
          title="Show Desktop (Minimize all windows)"
          className="h-9 w-2 sm:w-3 ml-1 rounded-sm bg-slate-800/60 hover:bg-blue-500/60 border-l border-slate-700/80 transition-colors"
        />
      </div>
    </footer>
  );
};
