import React, { useState, useEffect } from 'react';
import { 
  Cpu, Activity, Radio, RefreshCw, Database, CheckCircle2, 
  AppWindow, ShieldAlert, Zap
} from 'lucide-react';
import { AppProps } from '../types/application.types';
import { useWindowManager } from '../stores/window.store';
import { vfsService } from '../services/vfs.service';
import { StorageStats } from '../types/vfs.types';
import { API_BASE } from '../services/api';

export const SystemMonitorApp: React.FC<AppProps> = () => {
  const { windows, closeWindow, focusWindow } = useWindowManager();
  const [activeTab, setActiveTab] = useState<'overview' | 'processes' | 'storage'>('overview');

  // Real-time simulated & browser metrics
  const [cpuUsage, setCpuUsage] = useState(12);
  const [memoryUsedMB, setMemoryUsedMB] = useState(48);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(4);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('online');
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [filesBreakdown, setFilesBreakdown] = useState<{ [ext: string]: number }>({});

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(updateFluctuations, 2500);
    return () => clearInterval(interval);
  }, []);

  const updateFluctuations = () => {
    // Dynamic simulated CPU load based on number of open windows
    const baseLoad = 8 + windows.length * 4;
    const randomJitter = Math.floor(Math.random() * 8) - 4;
    setCpuUsage(Math.min(95, Math.max(5, baseLoad + randomJitter)));

    // Heap memory from browser performance if supported
    const perf = window.performance as any;
    if (perf && perf.memory && perf.memory.usedJSHeapSize) {
      setMemoryUsedMB(Math.round(perf.memory.usedJSHeapSize / (1024 * 1024)));
    } else {
      setMemoryUsedMB((prev) => Math.min(280, Math.max(40, prev + Math.floor(Math.random() * 5) - 2)));
    }
  };

  const fetchMetrics = async () => {
    // Ping API for health & latency
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`);
      const latency = Math.round(performance.now() - start);
      setApiLatencyMs(latency);
      setApiStatus(res.ok ? 'online' : 'offline');
    } catch {
      setApiLatencyMs(null);
      setApiStatus('offline');
    }

    // Fetch storage stats
    try {
      const stats = await vfsService.getStorage();
      setStorageStats(stats);

      const allNodes = await vfsService.searchNodes('');
      const extCount: { [ext: string]: number } = {};
      allNodes.filter((n) => n.type === 'FILE').forEach((file) => {
        const parts = file.name.split('.');
        const ext = parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : 'no-extension';
        extCount[ext] = (extCount[ext] || 0) + 1;
      });
      setFilesBreakdown(extCount);
    } catch (err) {
      console.error('Failed to load storage telemetry:', err);
    }
  };

  // Approximate process memory footprint
  const getAppMemoryEstimate = (appId: string) => {
    switch (appId) {
      case 'text-editor':
        return 34;
      case 'terminal':
        return 22;
      case 'ai-assistant':
        return 28;
      case 'file-manager':
        return 18;
      case 'notes':
        return 14;
      case 'settings':
        return 16;
      default:
        return 15;
    }
  };

  return (
    <div className="h-full w-full bg-slate-950 text-slate-200 flex flex-col overflow-hidden select-text text-xs">
      {/* Top Navigation */}
      <div className="h-11 px-2 sm:px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 flex-shrink-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white hidden sm:inline">System Monitor</span>
        </div>

        <div className="flex items-center space-x-0.5 sm:space-x-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('processes')}
            className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors ${
              activeTab === 'processes'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tasks ({windows.length})
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors ${
              activeTab === 'storage'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Storage
          </button>
        </div>

        <button
          onClick={fetchMetrics}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Refresh metrics"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-900/40">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 max-w-3xl">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CPU Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">CPU Utilization</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white font-mono">{cpuUsage}%</div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        cpuUsage > 75 ? 'bg-rose-500' : cpuUsage > 45 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${cpuUsage}%` }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">Virtual Environment Threading</div>
              </div>

              {/* Memory Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Browser Memory</span>
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white font-mono">{memoryUsedMB} MB</div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (memoryUsedMB / 512) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">JS Heap & Sandbox Allocation</div>
              </div>

              {/* Host Backend Status */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Backend Gateway</span>
                  <Radio className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        apiStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <div className="text-xl font-bold text-white capitalize">{apiStatus}</div>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Latency: {apiLatencyMs !== null ? `${apiLatencyMs} ms` : 'N/A'}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">Express API (localhost:5000)</div>
              </div>
            </div>

            {/* VFS Storage Quick Summary */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">PostgreSQL Virtual Filesystem</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-500/30">
                  Isolated Sandbox
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-1">
                <div>
                  <div className="text-[11px] text-slate-400">Total Virtual Files</div>
                  <div className="text-lg font-bold text-white">{storageStats?.fileCount ?? '...'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Total Folders</div>
                  <div className="text-lg font-bold text-white">{storageStats?.folderCount ?? '...'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Storage Used</div>
                  <div className="text-lg font-bold text-white">
                    {storageStats
                      ? storageStats.totalBytes < 1024
                        ? `${storageStats.totalBytes} Bytes`
                        : `${(storageStats.totalBytes / 1024).toFixed(1)} KB`
                      : '...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROCESSES (TASK MANAGER) */}
        {activeTab === 'processes' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Active Windows & Processes</h3>
              <p className="text-slate-400 text-xs">
                Manage running applications and terminate unneeded processes.
              </p>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Process / App</th>
                    <th className="p-3">Window ID</th>
                    <th className="p-3">State</th>
                    <th className="p-3">Est. Memory</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {windows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No user windows currently open.
                      </td>
                    </tr>
                  ) : (
                    windows.map((win) => {
                      const mem = getAppMemoryEstimate(win.appId);
                      return (
                        <tr key={win.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 flex items-center space-x-2 font-medium text-white">
                            <AppWindow className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span
                              onClick={() => focusWindow(win.id)}
                              className="cursor-pointer hover:underline"
                            >
                              {win.title}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                            {win.id}
                          </td>
                          <td className="p-3">
                            {win.isMinimized ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                Minimized
                              </span>
                            ) : win.isFocused ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                                Focused
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-300">{mem} MB</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => closeWindow(win.id)}
                              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition-colors"
                            >
                              End Task
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Background Daemon Services */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold uppercase text-slate-500 mb-2">Core OS Services</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-800/30 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>PostgreSQL VFS Sync Daemon</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Running</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/30 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                    <span>Virtual Shell Sandbox Quarantine</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Enforced</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VFS STORAGE */}
        {activeTab === 'storage' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Virtual Filesystem Telemetry</h3>
              <p className="text-slate-400 text-xs">
                Detailed file breakdown stored inside PostgreSQL database `browseros`.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="text-xs font-semibold text-white">Files by Extension</div>
                <div className="space-y-1.5 pt-1">
                  {Object.keys(filesBreakdown).length === 0 ? (
                    <div className="text-slate-500 text-xs">No files scanned yet.</div>
                  ) : (
                    Object.entries(filesBreakdown).map(([ext, count]) => (
                      <div key={ext} className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-purple-300">{ext}</span>
                        <span className="text-slate-400 font-mono">{count} file(s)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="text-xs font-semibold text-white">Security & Isolation Guarantee</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  BrowserOS virtual files exist entirely as rows within the <code className="text-blue-300">vfs_nodes</code> table in PostgreSQL. Real host hard drives and local system files are never touched or modified.
                </p>
                <div className="pt-2 flex items-center space-x-1.5 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Host Sandbox: Quarantined</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
