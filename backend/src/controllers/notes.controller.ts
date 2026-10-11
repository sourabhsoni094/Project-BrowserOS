import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { notesService } from '../services/notes.service.js';

function getParamId(param: string | string[] | undefined): string | null {
  if (Array.isArray(param)) {
    const first = param[0];
    return typeof first === 'string' && first.trim().length > 0 ? first.trim() : null;
  }
  if (typeof param === 'string' && param.trim().length > 0) {
    return param.trim();
  }
  return null;
}

function getQueryParam(queryVal: unknown): string | undefined {
  if (Array.isArray(queryVal)) {
    const first = queryVal[0];
    return typeof first === 'string' && first.trim().length > 0 ? first.trim() : undefined;
  }
  if (typeof queryVal === 'string' && queryVal.trim().length > 0) {
    return queryVal.trim();
  }
  return undefined;
}

export class NotesController {
  async listNotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = getQueryParam(req.query.category);
      const search = getQueryParam(req.query.search);
      const notes = await notesService.listNotes(req.user!.userId, category, search);
      res.json({ notes });
    } catch (err) {
      next(err);
    }
  }

  async getNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const noteId = getParamId(req.params.id);
      if (!noteId) {
        res.status(400).json({ error: 'Note ID is required' });
        return;
      }
      const note = await notesService.getNote(req.user!.userId, noteId);
      res.json({ note });
    } catch (err) {
      next(err);
    }
  }

  async createNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, category, isPinned } = req.body;
      const note = await notesService.createNote(req.user!.userId, {
        title: title || 'Untitled Note',
        content,
        category,
        isPinned,
      });
      res.status(201).json({ note });
    } catch (err) {
      next(err);
    }
  }

  async updateNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const noteId = getParamId(req.params.id);
      if (!noteId) {
        res.status(400).json({ error: 'Note ID is required' });
        return;
      }
      const { title, content, category, isPinned } = req.body;
      const note = await notesService.updateNote(req.user!.userId, noteId, {
        title,
        content,
        category,
        isPinned,
      });
      res.json({ note });
    } catch (err) {
      next(err);
    }
  }

  async deleteNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const noteId = getParamId(req.params.id);
      if (!noteId) {
        res.status(400).json({ error: 'Note ID is required' });
        return;
      }
      await notesService.deleteNote(req.user!.userId, noteId);
      res.json({ message: 'Note deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const notesController = new NotesController();
