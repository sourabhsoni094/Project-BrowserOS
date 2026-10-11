import React, { Suspense, lazy } from 'react';
import { Terminal, Folder, FileText, Bot, Cpu, Settings, StickyNote } from 'lucide-react';
import { AppDefinition, AppProps } from '../types/application.types';

const WindowLoading: React.FC = () => (
  <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center space-y-2 text-slate-400 select-none">
    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Loading App...</span>
  </div>
);

const withSuspense = (ComponentPromise: () => Promise<{ default: React.ComponentType<AppProps> }>): React.FC<AppProps> => {
  const LazyComponent = lazy(ComponentPromise);
  return (props: AppProps) => (
    <Suspense fallback={<WindowLoading />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

const FileManagerApp = withSuspense(() => import('./FileManagerApp').then((m) => ({ default: m.FileManagerApp })));
const TerminalApp = withSuspense(() => import('./TerminalApp').then((m) => ({ default: m.TerminalApp })));
const TextEditorApp = withSuspense(() => import('./TextEditorApp').then((m) => ({ default: m.TextEditorApp })));
const AIAssistantApp = withSuspense(() => import('./AIAssistantApp').then((m) => ({ default: m.AIAssistantApp })));
const SystemMonitorApp = withSuspense(() => import('./SystemMonitorApp').then((m) => ({ default: m.SystemMonitorApp })));
const SettingsApp = withSuspense(() => import('./SettingsApp').then((m) => ({ default: m.SettingsApp })));
const NotesApp = withSuspense(() => import('./NotesApp').then((m) => ({ default: m.NotesApp })));

export const appRegistry: AppDefinition[] = [
  {
    id: 'terminal',
    title: 'Terminal',
    icon: Terminal,
    category: 'Development',
    description: 'Safe virtual sandbox terminal with command history',
    defaultWidth: 640,
    defaultHeight: 420,
    minWidth: 400,
    minHeight: 280,
    component: TerminalApp,
  },
  {
    id: 'file-manager',
    title: 'Files',
    icon: Folder,
    category: 'System',
    description: 'Browse, create, rename, and manage virtual files',
    defaultWidth: 700,
    defaultHeight: 460,
    minWidth: 420,
    minHeight: 300,
    component: FileManagerApp,
  },
  {
    id: 'text-editor',
    title: 'Code Editor',
    icon: FileText,
    category: 'Development',
    description: 'Lightweight code editor with syntax highlighting and tabs',
    defaultWidth: 760,
    defaultHeight: 500,
    minWidth: 460,
    minHeight: 320,
    component: TextEditorApp,
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    icon: Bot,
    category: 'AI',
    description: 'Chat with local LLMs (Ollama) with workspace context',
    defaultWidth: 680,
    defaultHeight: 520,
    minWidth: 400,
    minHeight: 350,
    component: AIAssistantApp,
  },
  {
    id: 'system-monitor',
    title: 'System Monitor',
    icon: Cpu,
    category: 'System',
    description: 'View resource usage, running apps, and storage status',
    defaultWidth: 600,
    defaultHeight: 400,
    minWidth: 400,
    minHeight: 280,
    component: SystemMonitorApp,
  },
  {
    id: 'notes',
    title: 'Notes',
    icon: StickyNote,
    category: 'Utilities',
    description: 'Quick autosaving notes and thoughts',
    defaultWidth: 500,
    defaultHeight: 380,
    minWidth: 320,
    minHeight: 240,
    component: NotesApp,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    category: 'System',
    description: 'Customize theme, wallpaper, and system preferences',
    defaultWidth: 580,
    defaultHeight: 420,
    minWidth: 380,
    minHeight: 280,
    component: SettingsApp,
  },
];

export function getAppById(appId: string): AppDefinition | undefined {
  return appRegistry.find((app) => app.id === appId);
}
