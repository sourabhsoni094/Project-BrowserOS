import React, { useEffect } from 'react';
import { Terminal, Folder, Cpu, RotateCw, Sparkles, Monitor, Plus, FileText } from 'lucide-react';
import { useWindowManager } from '../../stores/window.store';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpenLauncher: () => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onOpenLauncher,
  onNewFile,
  onNewFolder,
}) => {
  const { openWindow, minimizeWindow, windows } = useWindowManager();

  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  // Clamp within screen
  const menuWidth = 210;
  const menuHeight = 280;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 10);

  const handleShowDesktop = () => {
    windows.forEach((win) => {
      if (!win.isMinimized) minimizeWindow(win.id);
    });
    onClose();
  };

  return (
    <div
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      className="fixed z-50 w-52 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {onNewFolder && (
        <button
          onClick={() => {
            onNewFolder();
            onClose();
          }}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          <span>New Folder</span>
        </button>
      )}

      {onNewFile && (
        <button
          onClick={() => {
            onNewFile();
            onClose();
          }}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>New Text File</span>
        </button>
      )}

      {(onNewFile || onNewFolder) && <div className="my-1.5 border-t border-slate-800/80" />}

      <button
        onClick={() => {
          openWindow('terminal');
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      >
        <Terminal className="w-4 h-4 text-emerald-400" />
        <span>Open Terminal</span>
      </button>

      <button
        onClick={() => {
          openWindow('file-manager');
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      >
        <Folder className="w-4 h-4 text-amber-400" />
        <span>Open File Manager</span>
      </button>

      <button
        onClick={() => {
          openWindow('system-monitor');
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      >
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span>System Monitor</span>
      </button>

      <div className="my-1.5 border-t border-slate-800/80" />

      <button
        onClick={() => {
          onOpenLauncher();
          onClose();
        }}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      >
        <Monitor className="w-4 h-4 text-blue-400" />
        <span>Application Launcher</span>
      </button>

      <button
        onClick={handleShowDesktop}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      >
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span>Show Desktop</span>
      </button>

      <button
        onClick={() => window.location.reload()}
        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      >
        <RotateCw className="w-4 h-4 text-slate-400" />
        <span>Reload Shell</span>
      </button>
    </div>
  );
};
