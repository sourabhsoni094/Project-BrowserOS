import React from 'react';
import { useWindowManager } from '../../stores/window.store';
import { getAppById } from '../../applications/appRegistry';
import { AppWindow } from 'lucide-react';

interface WindowSwitcherProps {
  isOpen: boolean;
  selectedIndex: number;
  onClose?: () => void;
}

export const WindowSwitcher: React.FC<WindowSwitcherProps> = ({ isOpen, selectedIndex }) => {
  const { windows } = useWindowManager();

  if (!isOpen || windows.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-100">
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl max-w-2xl w-full flex flex-col items-center space-y-4">
        <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Active Windows (Alt + Tab)
        </div>

        <div className="flex items-center space-x-3 overflow-x-auto p-2 max-w-full">
          {windows.map((win, idx) => {
            const app = getAppById(win.appId);
            const Icon = app ? app.icon : AppWindow;
            const isSelected = idx === selectedIndex;

            return (
              <div
                key={win.id}
                className={`flex flex-col items-center p-3.5 rounded-2xl transition-all duration-150 w-28 text-center border-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-600/20 scale-105 shadow-xl shadow-blue-500/20'
                    : 'border-slate-800 bg-slate-800/40 opacity-70'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-2 border border-slate-700">
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                </div>
                <div className="text-xs font-semibold text-white truncate w-full">
                  {win.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate w-full mt-0.5">
                  {win.isMinimized ? 'Minimized' : 'Running'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
