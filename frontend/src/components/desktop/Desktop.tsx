import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './TopBar';
import { Taskbar } from './Taskbar';
import { AppLauncher } from './AppLauncher';
import { ContextMenu } from './ContextMenu';
import { WindowLayer } from '../window-manager/WindowLayer';
import { appRegistry } from '../../applications/appRegistry';
import { useWindowManager } from '../../stores/window.store';
import { vfsService } from '../../services/vfs.service';
import { VfsNode } from '../../types/vfs.types';
import { Folder, FileText, FileCode, FileJson, FileQuestion } from 'lucide-react';

import { ToastContainer } from './ToastContainer';
import { WindowSwitcher } from './WindowSwitcher';

const WALLPAPER_CLASSES: Record<string, string> = {
  nebula: 'from-slate-950 via-slate-900 to-indigo-950',
  aurora: 'from-slate-950 via-emerald-950 to-teal-900',
  sunset: 'from-slate-950 via-purple-950 to-rose-950',
  cyberpunk: 'from-slate-950 via-indigo-950 to-fuchsia-950',
  midnight: 'from-black via-slate-950 to-zinc-900',
};

export const Desktop: React.FC = () => {
  const { openWindow, windows, focusWindow } = useWindowManager();
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [wallpaper, setWallpaper] = useState<string>(
    () => localStorage.getItem('browseros_wallpaper') || 'nebula'
  );

  // Desktop Virtual Filesystem Nodes
  const [desktopFiles, setDesktopFiles] = useState<VfsNode[]>([]);
  const [desktopFolderId, setDesktopFolderId] = useState<string | null>(null);

  // Quick File/Folder Creation Modal
  const [createModal, setCreateModal] = useState<{ type: 'file' | 'folder'; name: string } | null>(null);

  // Window Switcher (Alt + Tab)
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherIndex, setSwitcherIndex] = useState(0);

  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('browseros_wallpaper');
      if (saved) setWallpaper(saved);
    };
    window.addEventListener('browseros_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('browseros_settings_changed', handleSettingsChange);
  }, []);

  // Global Keyboard Shortcuts (Alt+Tab, Ctrl+Alt+T, Ctrl+Alt+E, Ctrl+Alt+N, Ctrl+Alt+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Alt + Tab
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        if (windows.length > 0) {
          setIsSwitcherOpen(true);
          setSwitcherIndex((prev) => (prev + 1) % windows.length);
        }
        return;
      }

      // Quick Launch Shortcuts (Ctrl + Alt + Key)
      if (e.ctrlKey && e.altKey && !isInput) {
        const key = e.key.toLowerCase();
        if (key === 't') {
          e.preventDefault();
          openWindow('terminal');
          return;
        }
        if (key === 'e') {
          e.preventDefault();
          openWindow('text-editor');
          return;
        }
        if (key === 'n') {
          e.preventDefault();
          openWindow('notes');
          return;
        }
        if (key === 'a') {
          e.preventDefault();
          openWindow('ai-assistant');
          return;
        }
      }

      // Start menu toggle (Ctrl+Space or Meta)
      if ((e.key === 'Meta' || (e.ctrlKey && e.code === 'Space')) && !isInput) {
        e.preventDefault();
        setIsLauncherOpen((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && isSwitcherOpen) {
        setIsSwitcherOpen(false);
        if (windows[switcherIndex]) {
          focusWindow(windows[switcherIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [windows, isSwitcherOpen, switcherIndex, focusWindow, openWindow]);

  const fetchDesktopFiles = useCallback(async () => {
    try {
      const files = await vfsService.getDesktopNodes();
      setDesktopFiles(files);

      // Find the Desktop folder ID for creating items
      const home = await vfsService.listDirectory(null);
      const desktop = home.items.find((i) => i.name === 'Desktop' && i.type === 'FOLDER');
      if (desktop) {
        setDesktopFolderId(desktop.id);
      }
    } catch (err) {
      console.warn('Could not sync desktop files yet:', err);
    }
  }, []);

  useEffect(() => {
    fetchDesktopFiles();
    // Refresh desktop files when windows change or periodically
    const interval = setInterval(fetchDesktopFiles, 5000);
    return () => clearInterval(interval);
  }, [fetchDesktopFiles]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-frame') || (e.target as HTMLElement).closest('footer')) {
      return;
    }
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDesktopClick = () => {
    if (contextMenu) setContextMenu(null);
    if (isLauncherOpen) setIsLauncherOpen(false);
  };

  const handleCreateConfirm = async () => {
    if (!createModal || !createModal.name.trim()) return;
    try {
      if (createModal.type === 'folder') {
        await vfsService.createNode(createModal.name.trim(), 'FOLDER', desktopFolderId);
      } else {
        await vfsService.createNode(createModal.name.trim(), 'FILE', desktopFolderId, '');
      }
      setCreateModal(null);
      await fetchDesktopFiles();
    } catch (err: any) {
      alert(err.message || 'Creation failed');
    }
  };

  const handleDesktopFileDoubleClick = (node: VfsNode) => {
    if (node.type === 'FOLDER') {
      openWindow('file-manager');
    } else {
      openWindow('text-editor', { initialFileId: node.id });
    }
  };

  const getFileIcon = (node: VfsNode) => {
    if (node.type === 'FOLDER') {
      return <Folder className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform" />;
    }
    const name = node.name.toLowerCase();
    if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.tsx') || name.endsWith('.jsx')) {
      return <FileCode className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform" />;
    }
    if (name.endsWith('.json')) {
      return <FileJson className="w-7 h-7 text-amber-300 group-hover:scale-110 transition-transform" />;
    }
    if (name.endsWith('.md') || name.endsWith('.txt')) {
      return <FileText className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />;
    }
    return <FileQuestion className="w-7 h-7 text-slate-400 group-hover:scale-110 transition-transform" />;
  };

  const hasVisibleWindows = windows.some((w) => !w.isMinimized);

  return (
    <div
      onContextMenu={handleContextMenu}
      onClick={handleDesktopClick}
      className={`relative h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br ${
        WALLPAPER_CLASSES[wallpaper] || WALLPAPER_CLASSES.nebula
      } text-slate-100 select-none transition-all duration-700`}
    >
      {/* Top Status Bar */}
      <TopBar />

      {/* Main Desktop Space */}
      <main className="relative flex-1 p-3 sm:p-6 overflow-y-auto sm:overflow-hidden">
        {/* Desktop Application and Virtual File Icons */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-5 max-w-5xl z-0">
          {/* Built-in System Applications */}
          {appRegistry.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onDoubleClick={() => openWindow(app.id)}
                onClick={() => openWindow(app.id)}
                className="flex flex-col items-center p-2 sm:p-3 rounded-2xl border border-transparent hover:border-slate-700/80 hover:bg-slate-800/40 cursor-pointer transition-all duration-150 group active:scale-95 text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center shadow-lg group-hover:border-blue-500/50 group-hover:shadow-blue-500/10 transition-all duration-150">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs font-medium text-slate-300 group-hover:text-white transition-colors truncate max-w-[76px] sm:max-w-[90px]">
                  {app.title}
                </span>
              </button>
            );
          })}

          {/* Synced Virtual Desktop Files */}
          {desktopFiles.map((file) => (
            <button
              key={file.id}
              onDoubleClick={() => handleDesktopFileDoubleClick(file)}
              onClick={() => handleDesktopFileDoubleClick(file)}
              className="flex flex-col items-center p-2 sm:p-3 rounded-2xl border border-transparent hover:border-blue-500/40 hover:bg-blue-600/10 cursor-pointer transition-all duration-150 group active:scale-95 text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center shadow-lg group-hover:border-blue-500/50 transition-all duration-150">
                {getFileIcon(file)}
              </div>
              <span className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate max-w-[76px] sm:max-w-[90px]">
                {file.name}
              </span>
            </button>
          ))}
        </div>

        {/* Subtle Watermark when Desktop has no active windows */}
        {!hasVisibleWindows && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-20">
            <div className="text-center px-4">
              <h1 className="text-4xl sm:text-7xl font-black tracking-widest text-slate-700 uppercase">
                BrowserOS
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2 font-mono tracking-widest">
                PostgreSQL VFS Active • Synced Desktop & Real-time Storage
              </p>
            </div>
          </div>
        )}

        {/* Window Manager Layer */}
        <WindowLayer />

        {/* Desktop Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onOpenLauncher={() => setIsLauncherOpen(true)}
            onNewFolder={() => setCreateModal({ type: 'folder', name: 'New Folder' })}
            onNewFile={() => setCreateModal({ type: 'file', name: 'notes.txt' })}
          />
        )}
      </main>

      {/* Quick Desktop Create Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-xs space-y-4">
            <h4 className="text-sm font-semibold text-white">
              {createModal.type === 'folder' ? 'Create Desktop Folder' : 'Create Desktop File'}
            </h4>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Name</label>
              <input
                type="text"
                autoFocus
                value={createModal.name}
                onChange={(e) => setCreateModal({ ...createModal, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCreateModal(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConfirm}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg shadow-blue-600/30"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Launcher (Start Menu) */}
      <AppLauncher
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
      />

      {/* Bottom Taskbar / Dock */}
      <Taskbar
        isLauncherOpen={isLauncherOpen}
        onToggleLauncher={() => setIsLauncherOpen(!isLauncherOpen)}
      />

      {/* Floating Toast Notification Queue */}
      <ToastContainer />

      {/* Alt+Tab Window Switcher Overlay */}
      <WindowSwitcher
        isOpen={isSwitcherOpen}
        selectedIndex={switcherIndex}
        onClose={() => setIsSwitcherOpen(false)}
      />
    </div>
  );
};
