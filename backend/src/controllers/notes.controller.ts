import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { notesService } from '../services/notes.service.js';

export class NotesController {
  async listNotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const notes = await notesService.listNotes(req.user!.userId, category, search);
      res.json({ notes });
    } catch (err) {
      next(err);
    }
  }

  async getNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const note = await notesService.getNote(req.user!.userId, req.params.id);
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
      const { title, content, category, isPinned } = req.body;
      const note = await notesService.updateNote(req.user!.userId, req.params.id, {
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
      await notesService.deleteNote(req.user!.userId, req.params.id);
      res.json({ message: 'Note deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const notesController = new NotesController();
