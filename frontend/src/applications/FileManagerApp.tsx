import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  FileCode,
  FileJson,
  FileArchive,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Search,
  LayoutGrid,
  List,
  Upload,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Copy,
  Info,
  Edit2,
  HardDrive,
  Home,
  Monitor,
  FolderKanban,
  FileQuestion,
  Bot,
  PanelLeft,
} from 'lucide-react';
import { vfsService } from '../services/vfs.service';
import { VfsNode, BreadcrumbItem, StorageStats } from '../types/vfs.types';
import { AppProps } from '../types/application.types';
import { useWindowManager } from '../stores/window.store';
import { useNotification } from '../stores/notification.store';

export const FileManagerApp: React.FC<AppProps> = () => {
  const { openWindow } = useWindowManager();
  const { notify } = useNotification();
  // Navigation & State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [items, setItems] = useState<VfsNode[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [isTrashView, setIsTrashView] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Context Menu & Selection
  const [selectedNode, setSelectedNode] = useState<VfsNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node?: VfsNode } | null>(null);

  // Modals
  const [modalType, setModalType] = useState<'new_folder' | 'new_file' | 'rename' | 'properties' | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load directory or trash
  const loadDirectory = useCallback(
    async (folderId?: string | null, pushToHistory = true) => {
      try {
        setLoading(true);
        setIsTrashView(false);

        const data = await vfsService.listDirectory(folderId);
        setItems(data.items);
        setBreadcrumbs(data.breadcrumbs);
        const resolvedId = data.currentFolder ? data.currentFolder.id : null;
        setCurrentFolderId(resolvedId);

        if (pushToHistory && resolvedId) {
          setHistory((prev) => [...prev.slice(0, historyIndex + 1), resolvedId]);
          setHistoryIndex((prev) => prev + 1);
        }

        const stats = await vfsService.getStorage();
        setStorage(stats);
      } catch (err) {
        console.error('Failed to load directory:', err);
      } finally {
        setLoading(false);
      }
    },
    [historyIndex]
  );

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      setIsTrashView(true);
      const trashItems = await vfsService.getTrashNodes();
      setItems(trashItems);
      setBreadcrumbs([{ id: 'trash', name: 'Trash' }]);
      const stats = await vfsService.getStorage();
      setStorage(stats);
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(null, true);
  }, []);

  // Back & Forward navigation
  const handleBack = () => {
    if (historyIndex > 0) {
      const prevId = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      loadDirectory(prevId, false);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextId = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      loadDirectory(nextId, false);
    }
  };

  const handleUp = () => {
    if (breadcrumbs.length > 1) {
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      loadDirectory(parentCrumb.id);
    }
  };

  // File Upload Handlers
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      setLoading(true);
      for (let i = 0; i < fileList.length; i++) {
        await vfsService.uploadFile(fileList[i], currentFolderId);
      }
      await loadDirectory(currentFolderId, false);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Drag-and-drop from Host OS
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Node Actions
  const handleItemDoubleClick = (node: VfsNode) => {
    if (node.type === 'FOLDER') {
      loadDirectory(node.id);
    } else {
      openWindow('text-editor', { initialFileId: node.id });
    }
  };

  const handleCreateConfirm = async () => {
    if (!modalInput.trim()) return;
    try {
      if (modalType === 'new_folder') {
        await vfsService.createNode(modalInput.trim(), 'FOLDER', currentFolderId);
      } else if (modalType === 'new_file') {
        await vfsService.createNode(modalInput.trim(), 'FILE', currentFolderId, '');
      } else if (modalType === 'rename' && selectedNode) {
        await vfsService.updateNode(selectedNode.id, { name: modalInput.trim() });
      }
      setModalType(null);
      setModalInput('');
      await loadDirectory(currentFolderId, false);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleMoveToTrash = async (node: VfsNode) => {
    try {
      await vfsService.moveToTrash(node.id);
      await loadDirectory(currentFolderId, false);
    } catch (err: any) {
      alert(err.message || 'Failed to move to trash');
    }
  };

  const handleRestore = async (node: VfsNode) => {
    try {
      await vfsService.restoreFromTrash(node.id);
      await loadTrash();
    } catch (err: any) {
      alert(err.message || 'Failed to restore');
    }
  };

  const handleDeletePermanently = async (node: VfsNode) => {
    if (!window.confirm(`Permanently delete "${node.name}"? This cannot be undone.`)) return;
    try {
      await vfsService.deletePermanently(node.id);
      if (isTrashView) await loadTrash();
      else await loadDirectory(currentFolderId, false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty all items from Trash? This cannot be undone.')) return;
    try {
      await vfsService.emptyTrash();
      await loadTrash();
    } catch (err: any) {
      alert(err.message || 'Failed to empty trash');
    }
  };

  const handleDuplicate = async (node: VfsNode) => {
    try {
      await vfsService.duplicateNode(node.id);
      await loadDirectory(currentFolderId, false);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate');
    }
  };

  // Helper icon selector
  const getFileIcon = (node: VfsNode) => {
    if (node.type === 'FOLDER') {
      return <Folder className="w-10 h-10 text-amber-400" />;
    }
    const name = node.name.toLowerCase();
    if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.tsx') || name.endsWith('.jsx')) {
      return <FileCode className="w-10 h-10 text-blue-400" />;
    }
    if (name.endsWith('.json')) {
      return <FileJson className="w-10 h-10 text-amber-300" />;
    }
    if (name.endsWith('.md') || name.endsWith('.txt')) {
      return <FileText className="w-10 h-10 text-emerald-400" />;
    }
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.svg')) {
      return <ImageIcon className="w-10 h-10 text-purple-400" />;
    }
    if (name.endsWith('.zip') || name.endsWith('.tar') || name.endsWith('.gz')) {
      return <FileArchive className="w-10 h-10 text-red-400" />;
    }
    return <FileQuestion className="w-10 h-10 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setContextMenu(null)}
      className="relative h-full w-full bg-slate-950 text-slate-200 flex flex-col select-none overflow-hidden"
    >
      {/* Hidden file input for host upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      {/* Drag & Drop Host Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/30 backdrop-blur-sm border-2 border-dashed border-blue-400 flex flex-col items-center justify-center text-white pointer-events-none">
          <Upload className="w-14 h-14 mb-3 animate-bounce" />
          <p className="text-sm font-semibold">Drop files here to upload into BrowserOS</p>
        </div>
      )}

      {/* Top Toolbar */}
      <header className="h-11 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-xs space-x-2">
        {/* Navigation Buttons & Mobile Sidebar Toggle */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSidebar((prev) => !prev)}
            title="Toggle Sidebar"
            className="sm:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <PanelLeft className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            title="Back"
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            title="Forward"
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleUp}
            disabled={breadcrumbs.length <= 1 || isTrashView}
            title="Up one level"
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Breadcrumb Bar */}
        <div className="flex-1 max-w-xl mx-2 flex items-center px-3 py-1 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs overflow-x-auto scrollbar-none space-x-1">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              {idx > 0 && <span className="text-slate-500">/</span>}
              <button
                onClick={() => !isTrashView && loadDirectory(crumb.id)}
                className="hover:text-blue-400 font-medium whitespace-nowrap transition-colors"
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search Input (desktop/tablet) */}
        <div className="hidden md:block relative w-36 lg:w-44">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Actions & View Toggle */}
        <div className="flex items-center space-x-1">
          {!isTrashView ? (
            <>
              <button
                onClick={() => {
                  setModalType('new_folder');
                  setModalInput('New Folder');
                }}
                title="New Folder"
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-medium text-slate-200 flex items-center space-x-1 transition-colors border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Folder</span>
              </button>

              <button
                onClick={() => {
                  setModalType('new_file');
                  setModalInput('untitled.txt');
                }}
                title="New File"
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-medium text-slate-200 flex items-center space-x-1 transition-colors border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">File</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload from PC"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-[11px] font-medium text-white flex items-center space-x-1 transition-colors shadow-sm shadow-blue-500/20"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Upload</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleEmptyTrash}
              title="Empty Trash"
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-[11px] font-medium text-white flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}

          <div className="w-[1px] h-5 bg-slate-800 mx-1" />

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'List View' : 'Grid View'}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Dual-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Backdrop */}
        {showSidebar && (
          <div
            className="absolute inset-0 bg-black/60 z-20 sm:hidden backdrop-blur-xs"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Navigation Sidebar */}
        <aside
          className={`${
            showSidebar
              ? 'absolute inset-y-0 left-0 z-30 w-52 bg-slate-900 border-r border-slate-800 p-3 flex flex-col justify-between text-xs shadow-2xl animate-in slide-in-from-left duration-150'
              : 'hidden sm:flex sm:w-48 bg-slate-900/60 border-r border-slate-800/80 p-3 flex-col justify-between text-xs'
          }`}
        >
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                Quick Access
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    loadDirectory(null);
                    setShowSidebar(false);
                  }}
                  className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    !isTrashView && breadcrumbs.length <= 2
                      ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/20'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Home className="w-4 h-4 text-blue-400" />
                  <span>Home</span>
                </button>

                <button
                  onClick={async () => {
                    const data = await vfsService.listDirectory(null);
                    const desktop = data.items.find((i) => i.name === 'Desktop' && i.type === 'FOLDER');
                    if (desktop) loadDirectory(desktop.id);
                    setShowSidebar(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>Desktop</span>
                </button>

                <button
                  onClick={async () => {
                    const data = await vfsService.listDirectory(null);
                    const docs = data.items.find((i) => i.name === 'Documents' && i.type === 'FOLDER');
                    if (docs) loadDirectory(docs.id);
                    setShowSidebar(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-300" />
                  <span>Documents</span>
                </button>

                <button
                  onClick={async () => {
                    const data = await vfsService.listDirectory(null);
                    const projects = data.items.find((i) => i.name === 'Projects' && i.type === 'FOLDER');
                    if (projects) loadDirectory(projects.id);
                    setShowSidebar(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <FolderKanban className="w-4 h-4 text-amber-400" />
                  <span>Projects</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                System
              </div>
              <button
                onClick={() => {
                  loadTrash();
                  setShowSidebar(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isTrashView
                    ? 'bg-red-600/20 text-red-400 font-semibold border border-red-500/20'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Trash</span>
                </div>
                {storage && storage.trashBytes > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                )}
              </button>
            </div>
          </div>

          {/* Virtual Storage Metric */}
          {storage && (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5 font-medium">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  <span>Storage</span>
                </span>
                <span>{formatSize(storage.totalBytes)}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, Math.max(3, (storage.totalBytes / storage.limitBytes) * 100))}%`,
                  }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <div className="text-[10px] text-slate-500 text-right">
                Limit: {formatSize(storage.limitBytes)}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
          className="flex-1 p-4 overflow-y-auto"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Loading filesystem...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Folder className="w-12 h-12 text-slate-700" />
              <p className="text-xs">
                {searchQuery ? 'No matching items found.' : isTrashView ? 'Trash is empty.' : 'Folder is empty.'}
              </p>
              {!isTrashView && (
                <p className="text-[11px] text-slate-600">Drag files from your computer to upload.</p>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNode(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedNode(item);
                    setContextMenu({ x: e.clientX, y: e.clientY, node: item });
                  }}
                  className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedNode?.id === item.id
                      ? 'bg-blue-600/20 border-blue-500/50 shadow-md shadow-blue-500/10'
                      : 'border-transparent hover:border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="mb-2 transition-transform duration-150 group-hover:scale-105">
                    {getFileIcon(item)}
                  </div>
                  <span className="text-xs font-medium text-slate-200 text-center truncate w-full">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {item.type === 'FILE' ? formatSize(item.size) : 'Folder'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNode(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedNode(item);
                    setContextMenu({ x: e.clientX, y: e.clientY, node: item });
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    selectedNode?.id === item.id
                      ? 'bg-blue-600/20 text-white font-medium'
                      : 'hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="scale-75 origin-left">{getFileIcon(item)}</div>
                    <span className="text-xs truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-6 text-[11px] text-slate-500">
                    <span>{item.type === 'FILE' ? formatSize(item.size) : '--'}</span>
                    <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{ left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`, top: `${Math.min(contextMenu.y, window.innerHeight - 250)}px` }}
          className="fixed z-50 w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl p-1 text-xs text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node ? (
            isTrashView ? (
              <>
                <button
                  onClick={() => {
                    handleRestore(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => {
                    handleDeletePermanently(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    handleItemDoubleClick(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                  <span>{contextMenu.node.type === 'FOLDER' ? 'Open Folder' : 'Open / View'}</span>
                </button>

                {contextMenu.node.type === 'FILE' && (
                  <>
                    <button
                      onClick={() => {
                        openWindow('text-editor', { initialFileId: contextMenu.node!.id });
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                    >
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>Edit in Code Editor</span>
                    </button>

                    <button
                      onClick={() => {
                        openWindow('ai-assistant', { attachFileId: contextMenu.node!.id });
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-purple-600/20 text-purple-300 transition-colors text-left"
                    >
                      <Bot className="w-3.5 h-3.5 text-purple-400" />
                      <span>Analyze with AI Assistant</span>
                    </button>

                    <button
                      onClick={() => {
                        vfsService.downloadToHost(contextMenu.node!);
                        notify({
                          title: 'Download Started',
                          message: `Downloading ${contextMenu.node!.name} to host machine.`,
                          type: 'info',
                          appId: 'file-manager',
                        });
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download to PC</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setModalType('rename');
                    setModalInput(contextMenu.node!.name);
                    setSelectedNode(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rename</span>
                </button>

                <button
                  onClick={() => {
                    handleDuplicate(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duplicate</span>
                </button>

                <button
                  onClick={() => {
                    setModalType('properties');
                    setSelectedNode(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Info className="w-3.5 h-3.5 text-purple-400" />
                  <span>Properties</span>
                </button>

                <div className="my-1 border-t border-slate-800" />

                <button
                  onClick={() => {
                    handleMoveToTrash(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to Trash</span>
                </button>
              </>
            )
          ) : (
            // Background Right-Click
            !isTrashView && (
              <>
                <button
                  onClick={() => {
                    setModalType('new_folder');
                    setModalInput('New Folder');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>New Folder</span>
                </button>
                <button
                  onClick={() => {
                    setModalType('new_file');
                    setModalInput('untitled.txt');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New Text File</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>Upload Files...</span>
                </button>
              </>
            )
          )}
        </div>
      )}

      {/* Action / Input Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-xs space-y-4">
            <h4 className="text-sm font-semibold text-white">
              {modalType === 'new_folder' && 'Create New Folder'}
              {modalType === 'new_file' && 'Create New File'}
              {modalType === 'rename' && 'Rename Item'}
              {modalType === 'properties' && 'Item Properties'}
            </h4>

            {modalType === 'properties' && selectedNode ? (
              <div className="space-y-2 text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-semibold text-white truncate max-w-[180px]">{selectedNode.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span>{selectedNode.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Size:</span>
                  <span>{formatSize(selectedNode.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MIME:</span>
                  <span>{selectedNode.mimeType || 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span>{new Date(selectedNode.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">Item Name</label>
                <input
                  type="text"
                  autoFocus
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setModalType(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                {modalType === 'properties' ? 'Close' : 'Cancel'}
              </button>
              {modalType !== 'properties' && (
                <button
                  onClick={handleCreateConfirm}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg shadow-blue-600/30"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
