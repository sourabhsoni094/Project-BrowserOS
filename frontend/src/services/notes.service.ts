import { api } from './api';
import { Note, CreateNotePayload, UpdateNotePayload } from '../types/notes.types';

export const notesService = {
  listNotes: async (category?: string, search?: string): Promise<Note[]> => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search && search.trim()) params.append('search', search.trim());

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await api.get<{ notes: Note[] }>(`/notes${qs}`);
    return data.notes;
  },

  getNote: async (id: string): Promise<Note> => {
    const data = await api.get<{ note: Note }>(`/notes/${id}`);
    return data.note;
  },

  createNote: async (payload: CreateNotePayload): Promise<Note> => {
    const data = await api.post<{ note: Note }>('/notes', payload);
    return data.note;
  },

  updateNote: async (id: string, payload: UpdateNotePayload): Promise<Note> => {
    const data = await api.patch<{ note: Note }>(`/notes/${id}`, payload);
    return data.note;
  },

  deleteNote: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
};
