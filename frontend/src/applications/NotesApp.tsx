import React, { useState, useEffect, useRef } from 'react';
import { 
  StickyNote, Plus, Search, Pin, Trash2, Tag, CheckCircle2, Clock, FileText, ArrowLeft 
} from 'lucide-react';
import { AppProps } from '../types/application.types';
import { notesService } from '../services/notes.service';
import { Note } from '../types/notes.types';

const CATEGORIES = ['All', 'General', 'Work', 'Personal', 'Code', 'Ideas'];

export const NotesApp: React.FC<AppProps> = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

  // Active note editing states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [isPinned, setIsPinned] = useState(false);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadNotes();
  }, [selectedCategory, searchQuery]);

  const loadNotes = async () => {
    try {
      const data = await notesService.listNotes(
        selectedCategory === 'All' ? undefined : selectedCategory,
        searchQuery || undefined
      );
      setNotes(data);
      if (data.length > 0 && !selectedNoteId) {
        selectNote(data[0]);
      } else if (data.length === 0) {
        setSelectedNoteId(null);
        setTitle('');
        setContent('');
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const selectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setIsPinned(note.isPinned);
    setMobileView('editor');
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await notesService.createNote({
        title: 'Untitled Note',
        content: '',
        category: selectedCategory === 'All' ? 'General' : selectedCategory,
        isPinned: false,
      });
      setNotes((prev) => [newNote, ...prev]);
      selectNote(newNote);
      setMobileView('editor');
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    try {
      await notesService.deleteNote(noteId);
      const remaining = notes.filter((n) => n.id !== noteId);
      setNotes(remaining);
      if (selectedNoteId === noteId) {
        if (remaining.length > 0) {
          selectNote(remaining[0]);
        } else {
          setSelectedNoteId(null);
          setTitle('');
          setContent('');
          setMobileView('list');
        }
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const triggerAutosave = (newTitle: string, newContent: string, newCat: string, newPinned: boolean) => {
    if (!selectedNoteId) return;
    setIsSaving(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      try {
        const updated = await notesService.updateNote(selectedNoteId, {
          title: newTitle,
          content: newContent,
          category: newCat,
          isPinned: newPinned,
        });

        setNotes((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n))
        );
        setIsSaving(false);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error('Failed to autosave note:', err);
        setIsSaving(false);
      }
    }, 500);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutosave(val, content, category, isPinned);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerAutosave(title, val, category, isPinned);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    triggerAutosave(title, content, val, isPinned);
  };

  const handleTogglePin = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    const updatedPinned = !note.isPinned;
    if (selectedNoteId === note.id) {
      setIsPinned(updatedPinned);
    }
    triggerAutosave(note.id === selectedNoteId ? title : note.title, note.content, note.category, updatedPinned);
  };

  return (
    <div className="h-full w-full bg-slate-950 text-slate-200 flex flex-row overflow-hidden select-text text-xs">
      {/* Sidebar / Note Explorer */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-col flex-shrink-0`}>
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StickyNote className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">Notes</span>
          </div>
          <button
            onClick={handleCreateNote}
            className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] transition-colors"
            title="Create new note"
          >
            <Plus className="w-3 h-3" />
            <span>New Note</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 focus-within:border-amber-500">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-slate-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 p-2 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-[11px]">
              No notes found.
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`group p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/30 text-white'
                      : 'bg-slate-800/40 border-transparent hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-medium truncate text-xs flex-1 flex items-center space-x-1.5">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      <span className="truncate">{note.title || 'Untitled Note'}</span>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => handleTogglePin(e, note)}
                        className={`p-1 rounded hover:bg-slate-700 ${note.isPinned ? 'text-amber-400' : 'text-slate-400'}`}
                        title={note.isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteNote(e, note.id)}
                        className="p-1 rounded hover:bg-slate-700 hover:text-red-400 text-slate-400"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {note.content ? note.content : <span className="italic text-slate-600">Empty note...</span>}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-amber-300/80">
                      {note.category}
                    </span>
                    <span>{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Pane */}
      <div className={`${mobileView === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-slate-900/60`}>
        {selectedNoteId ? (
          <>
            {/* Header / Meta Bar */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors mr-1"
                  title="Back to notes list"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const next = !isPinned;
                    setIsPinned(next);
                    triggerAutosave(title, content, category, next);
                  }}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs transition-colors ${
                    isPinned
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Pin className={`w-3 h-3 ${isPinned ? 'fill-amber-300' : ''}`} />
                  <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                </button>
              </div>

              {/* Autosave Status */}
              <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                {isSaving ? (
                  <div className="flex items-center space-x-1 text-amber-400">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>Autosaving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Note Title Input */}
            <div className="px-6 pt-4 pb-2">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Note Title"
                className="w-full bg-transparent text-xl font-bold text-white focus:outline-none placeholder-slate-600 border-b border-transparent focus:border-slate-800 pb-1"
              />
            </div>

            {/* Note Content Textarea */}
            <div className="flex-1 px-6 pb-6 pt-2">
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write your note here..."
                className="w-full h-full bg-transparent text-slate-200 text-sm leading-relaxed resize-none focus:outline-none placeholder-slate-600 font-sans"
              />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-500">
            <FileText className="w-10 h-10 text-slate-600" />
            <div className="text-sm font-medium text-slate-400">No Note Selected</div>
            <p className="text-xs max-w-xs">
              Select an existing note from the sidebar or click "New Note" to start writing.
            </p>
            <button
              onClick={handleCreateNote}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium rounded-lg text-xs transition-colors"
            >
              Create Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
