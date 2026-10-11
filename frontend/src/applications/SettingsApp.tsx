import React, { useState, useEffect } from 'react';
import { 
  Settings, Palette, Bot, Terminal, Info, Check, Save, RefreshCw, 
  Monitor, Cpu, HardDrive, ShieldCheck, CheckCircle2, AlertCircle
} from 'lucide-react';
import { AppProps } from '../types/application.types';
import { settingsService } from '../services/settings.service';
import { aiService } from '../services/ai.service';
import { UserPreferences } from '../types/settings.types';
import { useAuth } from '../stores/auth.store';

const WALLPAPERS = [
  { id: 'nebula', name: 'Deep Nebula', class: 'from-slate-950 via-slate-900 to-indigo-950' },
  { id: 'aurora', name: 'Emerald Aurora', class: 'from-slate-950 via-emerald-950 to-teal-900' },
  { id: 'sunset', name: 'Cosmic Sunset', class: 'from-slate-950 via-purple-950 to-rose-950' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', class: 'from-slate-950 via-indigo-950 to-fuchsia-950' },
  { id: 'midnight', name: 'Pure Midnight', class: 'from-black via-slate-950 to-zinc-900' },
];

export const SettingsApp: React.FC<AppProps> = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'appearance' | 'ai' | 'terminal' | 'about'>('appearance');

  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    id: '',
    userId: '',
    theme: 'dark',
    wallpaper: 'nebula',
    fontSize: 14,
    ollamaUrl: 'http://localhost:11434',
    aiModel: 'llama3',
    terminalFontSize: 13,
    updatedAt: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await settingsService.getPreferences();
      setPreferences(data);
      // Ensure localStorage has the saved wallpaper
      if (data.wallpaper) {
        localStorage.setItem('browseros_wallpaper', data.wallpaper);
        window.dispatchEvent(new Event('browseros_settings_changed'));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSave = async (overrides?: Partial<UserPreferences>) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload = {
        theme: overrides?.theme ?? preferences.theme,
        wallpaper: overrides?.wallpaper ?? preferences.wallpaper,
        fontSize: overrides?.fontSize ?? preferences.fontSize,
        ollamaUrl: overrides?.ollamaUrl ?? preferences.ollamaUrl,
        aiModel: overrides?.aiModel ?? preferences.aiModel,
        terminalFontSize: overrides?.terminalFontSize ?? preferences.terminalFontSize,
      };

      const updated = await settingsService.updatePreferences(payload);
      setPreferences(updated);

      if (payload.wallpaper) {
        localStorage.setItem('browseros_wallpaper', payload.wallpaper);
        window.dispatchEvent(new Event('browseros_settings_changed'));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const testOllamaConnection = async () => {
    setTestResult({ status: 'testing', message: 'Connecting to Ollama host...' });
    try {
      const data = await aiService.listModels();
      if (data.ollama.length > 0) {
        setTestResult({
          status: 'success',
          message: `Connected successfully! Found ${data.ollama.length} installed model(s): ${data.ollama.map((m) => m.name).join(', ')}`,
        });
      } else {
        setTestResult({
          status: 'error',
          message: `Host reachable, but no models found at ${preferences.ollamaUrl}. BrowserOS will use offline companion fallback.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Could not reach Ollama at ${preferences.ollamaUrl} (${err.message || 'Connection refused'}). Offline companion mode is active.`,
      });
    }
  };

  return (
    <div className="h-full w-full bg-slate-950 text-slate-200 flex flex-col sm:flex-row overflow-hidden select-text text-xs">
      {/* Navigation Sidebar */}
      <div className="w-full sm:w-52 bg-slate-900 border-b sm:border-b-0 sm:border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-2.5 sm:p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-white">System Settings</span>
          </div>

          {/* Mobile Save Button */}
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="sm:hidden px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center space-x-1 text-[11px]"
          >
            {isSaving ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3 h-3 text-emerald-300" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>{isSaving ? 'Saving' : saveSuccess ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <div className="p-1.5 sm:p-2 flex sm:flex-col overflow-x-auto sm:overflow-visible space-x-1 sm:space-x-0 sm:space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-auto sm:w-full flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-left flex-shrink-0 whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4 flex-shrink-0" />
            <span>Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`w-auto sm:w-full flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-left flex-shrink-0 whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 flex-shrink-0" />
            <span>AI & Ollama</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`w-auto sm:w-full flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-left flex-shrink-0 whitespace-nowrap ${
              activeTab === 'terminal'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 flex-shrink-0" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`w-auto sm:w-full flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-left flex-shrink-0 whitespace-nowrap ${
              activeTab === 'about'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>About BrowserOS</span>
          </button>
        </div>

        {/* Desktop Save Button */}
        <div className="hidden sm:block mt-auto p-3 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-900/40">
        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Appearance & Personalization</h3>
              <p className="text-slate-400 text-xs mt-0.5">Customize your desktop wallpaper, theme, and font sizes.</p>
            </div>

            {/* Wallpaper Selection Gallery */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Desktop Wallpaper</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {WALLPAPERS.map((wp) => {
                  const isSelected = preferences.wallpaper === wp.id;
                  return (
                    <div
                      key={wp.id}
                      onClick={() => {
                        setPreferences({ ...preferences, wallpaper: wp.id });
                        handleSave({ wallpaper: wp.id });
                      }}
                      className={`group relative h-20 rounded-xl bg-gradient-to-br ${wp.class} p-2 cursor-pointer border-2 transition-all flex flex-col justify-end ${
                        isSelected
                          ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-medium text-white drop-shadow flex items-center justify-between">
                        <span>{wp.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Theme & Style */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">System Visual Theme</div>
                  <div className="text-[11px] text-slate-400">Glassmorphism dark desktop environment</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 text-[11px] font-semibold border border-blue-500/30">
                  Modern Dark Glass
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-700/40">
                <div>
                  <div className="font-medium text-slate-200">Base Font Scale</div>
                  <div className="text-[11px] text-slate-400">Standard user interface readability</div>
                </div>
                <div className="flex items-center space-x-2">
                  {[12, 14, 16].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPreferences({ ...preferences, fontSize: size })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                        preferences.fontSize === size
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI & Ollama Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">AI Assistant & Local LLM Provider</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Configure your local Ollama instance or fallback settings for privacy-first AI.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Ollama Host URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={preferences.ollamaUrl}
                    onChange={(e) => setPreferences({ ...preferences, ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                  <button
                    onClick={testOllamaConnection}
                    className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-xl font-medium transition-colors text-xs whitespace-nowrap"
                  >
                    Test Host
                  </button>
                </div>
              </div>

              {/* Test Result Message */}
              {testResult.status !== 'idle' && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                    testResult.status === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : testResult.status === 'testing'
                      ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {testResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Default AI Model</label>
                <input
                  type="text"
                  value={preferences.aiModel}
                  onChange={(e) => setPreferences({ ...preferences, aiModel: e.target.value })}
                  placeholder="llama3, mistral, codellama..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Must be pulled locally via <code className="text-purple-400">ollama run {preferences.aiModel || 'llama3'}</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Terminal Preferences</h3>
              <p className="text-slate-400 text-xs mt-0.5">Configure virtual sandbox terminal display options.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Terminal Font Size</div>
                  <div className="text-[11px] text-slate-400">Controls character size inside terminal sessions</div>
                </div>
                <div className="flex items-center space-x-2">
                  {[12, 13, 14, 16].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPreferences({ ...preferences, terminalFontSize: size })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                        preferences.terminalFontSize === size
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Terminal Preview */}
              <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] space-y-1 text-emerald-400">
                <div>
                  <span className="text-purple-400">guest@browseros</span>:<span className="text-blue-400">~</span>$ neofetch
                </div>
                <div className="text-slate-400">OS: BrowserOS Virtual Environment</div>
                <div className="text-slate-400">VFS: PostgreSQL Self-Referencing Tree</div>
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">About BrowserOS</h3>
              <p className="text-slate-400 text-xs mt-0.5">System diagnostics, specifications, and architecture.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-start space-x-3">
                <Monitor className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Version</div>
                  <div className="text-sm font-semibold text-white">BrowserOS 1.0.0</div>
                  <div className="text-[10px] text-slate-400">Phase 6 & 7 Release</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-start space-x-3">
                <HardDrive className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Filesystem Engine</div>
                  <div className="text-sm font-semibold text-white">PostgreSQL VFS</div>
                  <div className="text-[10px] text-slate-400">Strict Host Isolation</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Active User</div>
                  <div className="text-sm font-semibold text-white truncate max-w-[130px]">
                    {user?.username || 'Guest'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email || 'N/A'}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-start space-x-3">
                <Cpu className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">LLM Provider</div>
                  <div className="text-sm font-semibold text-white">Ollama / Fallback</div>
                  <div className="text-[10px] text-slate-400">{preferences.aiModel}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
