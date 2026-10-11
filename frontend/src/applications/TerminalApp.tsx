import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Terminal as TerminalIcon } from 'lucide-react';
import { terminalService } from '../services/terminal.service';
import { TerminalTab, TerminalLine } from '../types/terminal.types';
import { useAuth } from '../stores/auth.store';
import { AppProps } from '../types/application.types';

export const TerminalApp: React.FC<AppProps> = () => {
  const { user } = useAuth();
  const username = user?.username || 'user';

  const createInitialTab = (id: string, index: number): TerminalTab => ({
    id,
    title: `bash ${index}`,
    cwdId: null,
    cwdPath: '~',
    history: [],
    historyIndex: -1,
    lines: [
      { id: '1', text: 'BrowserOS Virtual Terminal v0.1.0 (x86_64-browser-vfs)', type: 'info' },
      { id: '2', text: "Type 'help' for available commands or 'neofetch' for system info.", type: 'default' },
      { id: '3', text: 'Safe sandbox execution active. Files operate against PostgreSQL VFS.\n', type: 'default' },
    ],
    currentInput: '',
  });

  const [tabs, setTabs] = useState<TerminalTab[]>([createInitialTab('tab-1', 1)]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [tabCounter, setTabCounter] = useState<number>(2);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeTab.lines, activeTab.currentInput, scrollToBottom]);

  // Focus input when tab changes or on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTabId]);

  // Tab Management
  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab = createInitialTab(newId, tabCounter);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setTabCounter((prev) => prev + 1);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // If closing only tab, reset to clean session
      setTabs([createInitialTab(`tab-${Date.now()}`, 1)]);
      return;
    }

    const filtered = tabs.filter((t) => t.id !== tabId);
    setTabs(filtered);

    if (activeTabId === tabId) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  // Input & Command Execution
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, currentInput: val } : t))
    );
  };

  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();

    // Line representing the prompt command
    const promptLine: TerminalLine = {
      id: `${Date.now()}-prompt`,
      text: `${username}@browseros:${activeTab.cwdPath}$ ${rawCmd}`,
      type: 'prompt',
    };

    if (!trimmed) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, lines: [...t.lines, promptLine], currentInput: '' }
            : t
        )
      );
      return;
    }

    // Client-side instant commands
    if (trimmed === 'clear' || trimmed === 'cls') {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                lines: [],
                history: [trimmed, ...t.history],
                historyIndex: -1,
                currentInput: '',
              }
            : t
        )
      );
      return;
    }

    if (trimmed === 'history') {
      const historyLines: TerminalLine[] = activeTab.history
        .slice()
        .reverse()
        .map((cmd, i) => ({
          id: `${Date.now()}-hist-${i}`,
          text: `  ${(i + 1).toString().padStart(3)}  ${cmd}`,
          type: 'default',
        }));

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                lines: [...t.lines, promptLine, ...historyLines],
                history: [trimmed, ...t.history],
                historyIndex: -1,
                currentInput: '',
              }
            : t
        )
      );
      return;
    }

    // Backend Execution
    try {
      const res = await terminalService.execute(trimmed, activeTab.cwdId);

      const outputLines: TerminalLine[] = res.lines.map((l, i) => ({
        id: `${Date.now()}-${i}`,
        text: l.text,
        type: l.type || 'default',
      }));

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;

          const updatedCwdId = res.newCwd ? res.newCwd.id : t.cwdId;
          const updatedCwdPath = res.newCwd ? res.newCwd.path : t.cwdPath;
          const newTitle = res.newCwd
            ? res.newCwd.path === '~'
              ? 'bash'
              : res.newCwd.path.split('/').pop() || 'bash'
            : t.title;

          return {
            ...t,
            title: newTitle,
            cwdId: updatedCwdId,
            cwdPath: updatedCwdPath,
            lines: [...t.lines, promptLine, ...outputLines],
            history: [trimmed, ...t.history.filter((h) => h !== trimmed)],
            historyIndex: -1,
            currentInput: '',
          };
        })
      );
    } catch (err: any) {
      const errLine: TerminalLine = {
        id: `${Date.now()}-err`,
        text: `Error executing command: ${err.message || 'Unknown error'}`,
        type: 'error',
      };
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                lines: [...t.lines, promptLine, errLine],
                history: [trimmed, ...t.history],
                historyIndex: -1,
                currentInput: '',
              }
            : t
        )
      );
    }
  };

  // Keyboard Navigation: Enter, Up/Down History, Tab Completion, Ctrl+L, Ctrl+C
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl + L: Clear screen
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, lines: [] } : t))
      );
      return;
    }

    // Ctrl + C: Cancel current line
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      const cancelLine: TerminalLine = {
        id: `${Date.now()}-cancel`,
        text: `${username}@browseros:${activeTab.cwdPath}$ ${activeTab.currentInput}^C`,
        type: 'prompt',
      };
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, lines: [...t.lines, cancelLine], currentInput: '', historyIndex: -1 }
            : t
        )
      );
      return;
    }

    // Enter: Execute
    if (e.key === 'Enter') {
      e.preventDefault();
      await executeCommand(activeTab.currentInput);
      return;
    }

    // Arrow Up: Previous command
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeTab.history.length === 0) return;

      const nextIndex = Math.min(activeTab.history.length - 1, activeTab.historyIndex + 1);
      const recalled = activeTab.history[nextIndex];
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, currentInput: recalled, historyIndex: nextIndex }
            : t
        )
      );
      return;
    }

    // Arrow Down: Next command
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeTab.historyIndex <= 0) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, currentInput: '', historyIndex: -1 } : t
          )
        );
      } else {
        const nextIndex = activeTab.historyIndex - 1;
        const recalled = activeTab.history[nextIndex];
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, currentInput: recalled, historyIndex: nextIndex }
              : t
          )
        );
      }
      return;
    }

    // Tab: Auto-completion
    if (e.key === 'Tab') {
      e.preventDefault();
      const tokens = activeTab.currentInput.split(' ');
      const lastToken = tokens[tokens.length - 1];

      if (!lastToken) return;

      const suggestions = await terminalService.getCompletionSuggestions(activeTab.cwdId, lastToken);
      if (suggestions.length === 1) {
        tokens[tokens.length - 1] = suggestions[0];
        const completed = tokens.join(' ');
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, currentInput: completed } : t))
        );
      } else if (suggestions.length > 1) {
        // Print matching candidates
        const promptLine: TerminalLine = {
          id: `${Date.now()}-prompt`,
          text: `${username}@browseros:${activeTab.cwdPath}$ ${activeTab.currentInput}`,
          type: 'prompt',
        };
        const candidateLine: TerminalLine = {
          id: `${Date.now()}-candidates`,
          text: suggestions.join('  '),
          type: 'dir',
        };
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, lines: [...t.lines, promptLine, candidateLine] }
              : t
          )
        );
      }
    }
  };

  const getLineClassName = (type?: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400 font-medium';
      case 'success':
        return 'text-emerald-400';
      case 'info':
        return 'text-sky-400';
      case 'warning':
        return 'text-amber-400';
      case 'dir':
        return 'text-cyan-400 font-semibold';
      case 'prompt':
        return 'text-slate-300';
      default:
        return 'text-slate-200';
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="h-full w-full bg-slate-950 font-mono text-xs flex flex-col select-text overflow-hidden cursor-text"
    >
      {/* Tab Header Bar */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-1.5 space-x-1 select-none overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`h-7 px-2.5 rounded-t-lg flex items-center space-x-2 text-[11px] cursor-pointer border-t-2 transition-all ${
                isActive
                  ? 'bg-slate-950 border-blue-500 text-blue-300 font-medium'
                  : 'bg-slate-900/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate max-w-[100px]">{tab.title}</span>
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                title="Close Tab"
                className="w-4 h-4 rounded hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          onClick={handleNewTab}
          title="New Terminal Tab"
          className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Output Buffer */}
      <div
        ref={terminalBodyRef}
        className="flex-1 p-3.5 overflow-y-auto space-y-1 leading-relaxed"
      >
        {activeTab.lines.map((line) => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap break-all ${getLineClassName(line.type)}`}
          >
            {line.text}
          </div>
        ))}

        {/* Active Command Input Line */}
        <div className="flex items-center space-x-2 pt-1">
          <div className="flex items-center space-x-1 flex-shrink-0 select-none">
            <span className="text-blue-400 font-semibold hidden sm:inline">{username}@browseros</span>
            <span className="text-slate-500 hidden sm:inline">:</span>
            <span className="text-amber-400 font-semibold">{activeTab.cwdPath}</span>
            <span className="text-slate-400">$</span>
          </div>

          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={activeTab.currentInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-emerald-400 focus:outline-none font-mono text-xs caret-emerald-400"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
