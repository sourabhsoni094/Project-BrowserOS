import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCw, Sparkles } from 'lucide-react';
import { appRegistry, getAppById } from '../../applications/appRegistry';
import { useWindowManager } from '../../stores/window.store';
import { useAuth } from '../../stores/auth.store';
import { AppCategory } from '../../types/application.types';

interface AppLauncherProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: ('All' | AppCategory)[] = ['All', 'Development', 'System', 'AI', 'Utilities'];

export const AppLauncher: React.FC<AppLauncherProps> = ({ isOpen, onClose }) => {
  const { openWindow, recentAppIds } = useWindowManager();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | AppCategory>('All');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
      setSelectedCategory('All');
    }
  }, [isOpen]);

  // Handle escape key & click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredApps = appRegistry.filter((app) => {
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    const matchesSearch =
      app.title.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLaunch = (appId: string) => {
    openWindow(appId);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 sm:hidden backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        className="fixed bottom-16 left-3 right-3 sm:left-4 sm:right-auto w-auto sm:w-96 max-h-[80vh] sm:max-h-[540px] h-[520px] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 flex flex-col z-50 text-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150"
      >
      {/* Top Search Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applications, files, or settings..."
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex space-x-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Recently Used Apps (Only when not searching) */}
        {!search && selectedCategory === 'All' && recentAppIds.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Recent Applications</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentAppIds.slice(0, 3).map((id) => {
                const app = getAppById(id);
                if (!app) return null;
                const Icon = app.icon;
                return (
                  <button
                    key={id}
                    onClick={() => handleLaunch(app.id)}
                    className="flex flex-col items-center p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all text-center group"
                  >
                    <Icon className="w-6 h-6 text-blue-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-medium text-slate-200 truncate w-full">
                      {app.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All / Filtered Applications Grid */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {search ? 'Search Results' : 'All Applications'}
          </div>

          {filteredApps.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No applications match your search.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredApps.map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    onClick={() => handleLaunch(app.id)}
                    className="w-full flex items-center p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mr-3 group-hover:border-blue-500/50 transition-colors">
                      <Icon className="w-5 h-5 text-blue-400 group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {app.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {app.description}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                      {app.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom User & Power Footer */}
      <div className="h-14 bg-slate-950/80 border-t border-slate-800/80 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-200">{user?.username}</div>
            <div className="text-[10px] text-slate-400">BrowserOS User</div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => window.location.reload()}
            title="Reload Desktop"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
