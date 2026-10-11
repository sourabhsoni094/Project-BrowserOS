import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCode,
  Folder,
  FolderOpen,
  Save,
  Search,
  X,
  FilePlus,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { vfsService } from '../services/vfs.service';
import { VfsNode } from '../types/vfs.types';
import { useNotification } from '../stores/notification.store';
import { AppProps } from '../types/application.types';

interface EditorTab {
  id: string; // VFS Node ID or temporary id
  name: string;
  path?: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

interface TextEditorProps extends AppProps {
  initialFileId?: string;
}

const KEYWORDS = [
  'const',
  'let',
  'var',
  'function',
  'return',
  'import',
  'export',
  'from',
  'default',
  'class',
  'interface',
  'type',
  'async',
  'await',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'typeof',
  'instanceof',
  'console.log',
  'document',
  'window',
  'true',
  'false',
  'null',
  'undefined',
];

export const TextEditorApp: React.FC<TextEditorProps> = ({ initialFileId }) => {
  const { notify } = useNotification();
  // Tabs & Active Document
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Explorer & Search Sidebar
  const [activeSidebar, setActiveSidebar] = useState<'explorer' | 'search'>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : false));
  const [fileTree, setFileTree] = useState<VfsNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderChildren, setFolderChildren] = useState<Record<string, VfsNode[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VfsNode[]>([]);

  // Find & Replace in current editor
  const [showFindBar, setShowFindBar] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Cursor & Status bar
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Basic Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  // Determine Language from filename
  const detectLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'TypeScript';
      case 'js':
      case 'jsx':
        return 'JavaScript';
      case 'json':
        return 'JSON';
      case 'md':
        return 'Markdown';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'py':
        return 'Python';
      case 'sql':
        return 'SQL';
      default:
        return 'Plain Text';
    }
  };

  // Open file in Editor
  const openFile = useCallback(async (nodeId: string) => {
    try {
      // Check if already open
      const existing = tabs.find((t) => t.id === nodeId);
      if (existing) {
        setActiveTabId(existing.id);
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setIsSidebarVisible(false);
        }
        return;
      }

      const node = await vfsService.getNode(nodeId);
      if (node.type !== 'FILE') return;

      const newTab: EditorTab = {
        id: node.id,
        name: node.name,
        content: node.content || '',
        originalContent: node.content || '',
        isDirty: false,
        language: detectLanguage(node.name),
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (err) {
      console.error('Failed to open file in editor:', err);
    }
  }, [tabs]);

  // Initial loading of tree & optional initial file
  useEffect(() => {
    async function initEditor() {
      try {
        const homeData = await vfsService.listDirectory(null);
        setFileTree(homeData.items);

        if (initialFileId) {
          await openFile(initialFileId);
        } else {
          // Open welcome.txt or index.ts if available
          const sample = homeData.items.find((i) => i.name === 'index.ts' || i.name === 'welcome.txt');
          if (sample) {
            await openFile(sample.id);
          } else {
            // New untitled file
            const untitled: EditorTab = {
              id: `untitled-${Date.now()}`,
              name: 'untitled.ts',
              content: '// Welcome to BrowserOS Code Editor\n// Press Ctrl+S to save your changes to the Virtual Filesystem\n\nconsole.log("Hello, BrowserOS!");\n',
              originalContent: '',
              isDirty: true,
              language: 'TypeScript',
            };
            setTabs([untitled]);
            setActiveTabId(untitled.id);
          }
        }
      } catch (err) {
        console.error('Editor initialization error:', err);
      }
    }
    initEditor();
  }, [initialFileId, openFile]);

  // Folder Expansion in Sidebar
  const toggleFolder = async (folderId: string) => {
    const isExpanded = expandedFolders[folderId];
    if (isExpanded) {
      setExpandedFolders((prev) => ({ ...prev, [folderId]: false }));
    } else {
      setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
      if (!folderChildren[folderId]) {
        try {
          const res = await vfsService.listDirectory(folderId);
          setFolderChildren((prev) => ({ ...prev, [folderId]: res.items }));
        } catch (err) {
          console.error('Failed to fetch folder children:', err);
        }
      }
    }
  };

  // Content Change Handler
  const handleContentChange = (newContent: string) => {
    if (!activeTab) return;

    const isDirty = newContent !== activeTab.originalContent;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, content: newContent, isDirty } : t))
    );

    // Basic Autocomplete word extraction
    if (textareaRef.current) {
      const cursor = textareaRef.current.selectionStart;
      const textBeforeCursor = newContent.slice(0, cursor);
      const match = textBeforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);

      if (match && match[1].length >= 2) {
        const prefix = match[1].toLowerCase();
        const matches = KEYWORDS.filter((kw) => kw.toLowerCase().startsWith(prefix) && kw !== prefix);
        setSuggestions(matches.slice(0, 5));
        setSelectedSuggestionIndex(0);
      } else {
        setSuggestions([]);
      }
    }
  };

  // Save current file to VFS
  const handleSave = useCallback(async () => {
    if (!activeTab) return;

    try {
      if (activeTab.id.startsWith('untitled-')) {
        // Prompt for file name if new
        const fileName = window.prompt('Enter file name to save:', activeTab.name);
        if (!fileName) return;

        // Save in user home / projects
        const saved = await vfsService.createNode(fileName.trim(), 'FILE', null, activeTab.content);
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  id: saved.id,
                  name: saved.name,
                  originalContent: activeTab.content,
                  isDirty: false,
                  language: detectLanguage(saved.name),
                }
              : t
          )
        );
        setActiveTabId(saved.id);
      } else {
        await vfsService.updateNode(activeTab.id, { content: activeTab.content });
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id ? { ...t, originalContent: activeTab.content, isDirty: false } : t
          )
        );
      }

      setSaveStatus('Saved');
      notify({
        title: 'File Saved',
        message: `Saved changes to ${activeTab.name}`,
        type: 'success',
        appId: 'text-editor',
      });
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    }
  }, [activeTab]);

  // Tab Close Handler
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (tabToClose?.isDirty) {
      if (!window.confirm(`"${tabToClose.name}" has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    const filtered = tabs.filter((t) => t.id !== tabId);
    setTabs(filtered);

    if (activeTabId === tabId) {
      setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
    }
  };

  // Keyboard Shortcuts (Ctrl+S, Ctrl+F, Tab Indent, Autocomplete)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl + S: Save
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      handleSave();
      return;
    }

    // Ctrl + F: Find
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setShowFindBar((prev) => !prev);
      return;
    }

    // Autocomplete Navigation (Up/Down/Enter/Tab)
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }

    // Tab key: Insert 2 spaces
    if (e.key === 'Tab' && suggestions.length === 0) {
      e.preventDefault();
      if (!textareaRef.current) return;

      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const current = activeTab?.content || '';
      const updated = current.substring(0, start) + '  ' + current.substring(end);

      handleContentChange(updated);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const insertSuggestion = (word: string) => {
    if (!textareaRef.current || !activeTab) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = activeTab.content.slice(0, cursor);
    const textAfter = activeTab.content.slice(cursor);
    const match = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);

    if (match) {
      const prefixLength = match[1].length;
      const newContent = textBefore.slice(0, -prefixLength) + word + textAfter;
      handleContentChange(newContent);
      setSuggestions([]);

      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = cursor - prefixLength + word.length;
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
        }
      }, 0);
    }
  };

  // Track cursor position
  const handleTextareaSelect = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const text = textareaRef.current.value.slice(0, pos);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Sync scrolling between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Search in Files
  const handleSearchInFiles = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await vfsService.searchNodes(searchQuery.trim());
      setSearchResults(results.filter((r) => r.type === 'FILE'));
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  // Find & Replace Execution
  const handleReplace = () => {
    if (!findText || !activeTab) return;
    const updated = activeTab.content.replace(findText, replaceText);
    handleContentChange(updated);
  };

  const handleReplaceAll = () => {
    if (!findText || !activeTab) return;
    const regex = new RegExp(findText, 'g');
    const updated = activeTab.content.replace(regex, replaceText);
    handleContentChange(updated);
  };

  // Syntax Highlighting Line Parser
  const renderHighlightedLine = (line: string) => {
    // Quick regex tokenization for code coloring
    const parts = line.split(/(\/\/.*$|".*?"|'.*?'|`.*?`|\b(?:const|let|var|function|return|import|export|from|class|interface|type|async|await|if|else|for|while|new)\b|\b\d+\b)/g);

    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('//')) {
        return <span key={i} className="text-slate-500 italic">{part}</span>;
      }
      if (part.startsWith('"') || part.startsWith("'") || part.startsWith('`')) {
        return <span key={i} className="text-emerald-400">{part}</span>;
      }
      if (/^\b(?:const|let|var|function|return|import|export|from|class|interface|type|async|await|if|else|for|while|new)\b$/.test(part)) {
        return <span key={i} className="text-purple-400 font-semibold">{part}</span>;
      }
      if (/^\b\d+\b$/.test(part)) {
        return <span key={i} className="text-amber-400">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const linesCount = (activeTab?.content.split('\n').length || 1);

  return (
    <div className="h-full w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Main Toolbar */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">Editor</span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400">{activeTab ? activeTab.name : 'No file open'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={!activeTab || !activeTab.isDirty}
            title="Save File (Ctrl+S)"
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 rounded-lg text-[11px] font-medium text-white flex items-center space-x-1.5 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Save className="w-3 h-3" />
            <span>Save</span>
          </button>
          <button
            onClick={() => setShowFindBar((prev) => !prev)}
            title="Find & Replace (Ctrl+F)"
            className={`p-1.5 rounded-lg transition-colors ${showFindBar ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar */}
        <div className="w-10 bg-slate-900/90 border-r border-slate-800/80 flex flex-col items-center py-2.5 space-y-3 text-slate-400 z-30 flex-shrink-0">
          <button
            onClick={() => {
              if (activeSidebar === 'explorer' && isSidebarVisible) {
                setIsSidebarVisible(false);
              } else {
                setActiveSidebar('explorer');
                setIsSidebarVisible(true);
              }
            }}
            title="File Explorer"
            className={`p-2 rounded-xl transition-all ${activeSidebar === 'explorer' && isSidebarVisible ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'hover:text-slate-200'}`}
          >
            <Folder className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (activeSidebar === 'search' && isSidebarVisible) {
                setIsSidebarVisible(false);
              } else {
                setActiveSidebar('search');
                setIsSidebarVisible(true);
              }
            }}
            title="Search in Files"
            className={`p-2 rounded-xl transition-all ${activeSidebar === 'search' && isSidebarVisible ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'hover:text-slate-200'}`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const untitled: EditorTab = {
                id: `untitled-${Date.now()}`,
                name: `untitled-${tabs.length + 1}.ts`,
                content: '',
                originalContent: '',
                isDirty: true,
                language: 'TypeScript',
              };
              setTabs((prev) => [...prev, untitled]);
              setActiveTabId(untitled.id);
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setIsSidebarVisible(false);
              }
            }}
            title="New File"
            className="p-2 rounded-xl hover:text-slate-200 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile backdrop */}
        {isSidebarVisible && (
          <div
            className="absolute inset-0 bg-black/60 z-20 sm:hidden backdrop-blur-xs"
            onClick={() => setIsSidebarVisible(false)}
          />
        )}

        {/* Sidebar Panel */}
        <aside
          className={`${
            isSidebarVisible
              ? 'absolute inset-y-0 left-10 z-30 w-52 sm:static sm:w-52 sm:z-auto'
              : 'hidden'
          } bg-slate-900 border-r border-slate-800/80 flex flex-col text-xs shadow-2xl sm:shadow-none`}
        >
          {activeSidebar === 'explorer' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2.5 font-bold uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800/60 flex items-center justify-between">
                <span>Explorer</span>
                <span className="text-[10px] text-slate-500 font-mono">VFS</span>
              </div>
              <div className="flex-1 p-2 overflow-y-auto space-y-1">
                {fileTree.map((node) => (
                  <div key={node.id}>
                    {node.type === 'FOLDER' ? (
                      <div>
                        <button
                          onClick={() => toggleFolder(node.id)}
                          className="w-full flex items-center space-x-1.5 p-1 rounded-md hover:bg-slate-800/70 text-slate-300 transition-colors text-left"
                        >
                          {expandedFolders[node.id] ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          {expandedFolders[node.id] ? (
                            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="truncate">{node.name}</span>
                        </button>

                        {expandedFolders[node.id] && folderChildren[node.id] && (
                          <div className="pl-4 space-y-0.5 mt-0.5">
                            {folderChildren[node.id].map((child) => (
                              <button
                                key={child.id}
                                onClick={() => child.type === 'FILE' && openFile(child.id)}
                                className={`w-full flex items-center space-x-1.5 p-1 rounded-md transition-colors text-left truncate ${activeTabId === child.id ? 'bg-blue-600/20 text-blue-400 font-medium' : 'hover:bg-slate-800/70 text-slate-300'}`}
                              >
                                {child.type === 'FOLDER' ? (
                                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                                ) : (
                                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                                )}
                                <span className="truncate">{child.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openFile(node.id)}
                        className={`w-full flex items-center space-x-1.5 p-1 rounded-md transition-colors text-left truncate ${activeTabId === node.id ? 'bg-blue-600/20 text-blue-400 font-medium' : 'hover:bg-slate-800/70 text-slate-300'}`}
                      >
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        <span className="truncate">{node.name}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-2.5 space-y-3 overflow-hidden">
              <div className="font-bold uppercase text-[10px] tracking-wider text-slate-400">
                Search in Files
              </div>
              <div className="flex space-x-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchInFiles()}
                  placeholder="Search file contents..."
                  className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearchInFiles}
                  className="p-1.5 bg-blue-600 rounded-lg text-white hover:bg-blue-500"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => openFile(res.id)}
                    className="w-full p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors"
                  >
                    <div className="font-medium text-slate-200 truncate">{res.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {res.mimeType || 'text/plain'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Editor Main Canvas */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {/* Editor Tabs Bar */}
          <div className="h-8 bg-slate-900 border-b border-slate-800 flex items-center px-1 space-x-1 overflow-x-auto scrollbar-none select-none">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`h-7 px-3 rounded-t-md flex items-center space-x-2 text-xs cursor-pointer border-t-2 transition-all ${isActive ? 'bg-slate-950 border-blue-500 text-blue-300 font-medium' : 'bg-slate-900/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'}`}
                >
                  <FileCode className="w-3 h-3 text-blue-400" />
                  <span className="truncate max-w-[120px]">{tab.name}</span>

                  {tab.isDirty ? (
                    <span
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      title="Unsaved changes (Click to close)"
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-slate-400 hover:text-white"
                    >
                      ●
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      title="Close"
                      className="w-4 h-4 rounded hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Find and Replace Bar */}
          {showFindBar && (
            <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center space-x-2 text-xs z-20">
              <input
                type="text"
                placeholder="Find"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white placeholder-slate-500 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Replace"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white placeholder-slate-500 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleReplace}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium"
              >
                All
              </button>
              <button
                onClick={() => setShowFindBar(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Code Editing Space */}
          {activeTab ? (
            <div className="flex-1 flex overflow-hidden relative font-mono text-xs">
              {/* Line Numbers */}
              <div
                ref={lineNumbersRef}
                className="w-12 bg-slate-950/90 text-slate-600 select-none py-3 text-right pr-3 font-mono text-xs border-r border-slate-850 overflow-hidden"
              >
                {Array.from({ length: linesCount }, (_, i) => (
                  <div key={i + 1} className="leading-5 h-5">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Textarea Overlay */}
              <div className="flex-1 relative overflow-hidden">
                {/* Syntax Highlight Rendering Background */}
                <div
                  className="absolute inset-0 p-3 pointer-events-none overflow-hidden whitespace-pre-wrap font-mono text-xs leading-5 text-transparent select-none"
                  aria-hidden="true"
                >
                  {activeTab.content.split('\n').map((line, idx) => (
                    <div key={idx} className="h-5 leading-5">
                      {renderHighlightedLine(line)}
                    </div>
                  ))}
                </div>

                {/* Interactive Transparent Textarea */}
                <textarea
                  ref={textareaRef}
                  value={activeTab.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onSelect={handleTextareaSelect}
                  onScroll={handleScroll}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  className="absolute inset-0 p-3 bg-transparent text-slate-200 caret-blue-400 focus:outline-none resize-none font-mono text-xs leading-5 whitespace-pre-wrap selection:bg-blue-600/40"
                />

                {/* Autocomplete Popup */}
                {suggestions.length > 0 && (
                  <div className="absolute left-14 top-16 z-30 w-44 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden p-1 text-xs">
                    {suggestions.map((suggestion, idx) => (
                      <div
                        key={suggestion}
                        onClick={() => insertSuggestion(suggestion)}
                        className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${idx === selectedSuggestionIndex ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-850'}`}
                      >
                        <span>{suggestion}</span>
                        <span className="text-[10px] opacity-70">keyword</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <FileCode className="w-12 h-12 text-slate-800" />
              <p className="text-xs">No file is open.</p>
              <p className="text-[11px] text-slate-600">Select a file from the explorer on the left or create one.</p>
            </div>
          )}

          {/* Bottom Editor Status Bar */}
          <footer className="h-6 bg-blue-600/10 border-t border-slate-800/80 px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
            <div className="flex items-center space-x-3">
              <span>{activeTab ? activeTab.language : 'Plain Text'}</span>
              <span>•</span>
              <span>UTF-8</span>
              <span>•</span>
              <span>Spaces: 2</span>
            </div>

            <div className="flex items-center space-x-3">
              {saveStatus ? (
                <span className="text-emerald-400 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>{saveStatus}</span>
                </span>
              ) : activeTab?.isDirty ? (
                <span className="text-amber-400">● Unsaved (Ctrl+S)</span>
              ) : null}
              <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
