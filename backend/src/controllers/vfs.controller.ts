import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { vfsService } from '../services/vfs.service.js';
import { AppError } from '../middleware/error.middleware.js';

const createNodeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).regex(/^[^<>:"/\\|?*]+$/, 'Invalid file or folder name'),
  type: z.enum(['FILE', 'FOLDER']),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string().optional(),
  mimeType: z.string().optional(),
});

const updateNodeSchema = z.object({
  name: z.string().min(1).max(255).regex(/^[^<>:"/\\|?*]+$/, 'Invalid file or folder name').optional(),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string().optional(),
});

const uploadSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string(),
  mimeType: z.string().optional(),
});

const getNodeId = (req: AuthRequest): string =>
  Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

export class VfsController {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const parentId = (req.query.parentId as string) || null;
      const result = await vfsService.getDirectoryContents(req.user.id, parentId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getDesktop(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const nodes = await vfsService.getDesktopNodes(req.user.id);
      res.status(200).json({ success: true, data: nodes });
    } catch (err) {
      next(err);
    }
  }

  async getTrash(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const nodes = await vfsService.getTrashNodes(req.user.id);
      res.status(200).json({ success: true, data: nodes });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const node = await vfsService.getNodeById(req.user.id, getNodeId(req));
      res.status(200).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const validated = createNodeSchema.parse(req.body);
      const node = await vfsService.createNode(req.user.id, validated);
      res.status(201).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }

  async upload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const validated = uploadSchema.parse(req.body);
      const node = await vfsService.createNode(req.user.id, {
        name: validated.name,
        type: 'FILE',
        parentId: validated.parentId,
        content: validated.content,
        mimeType: validated.mimeType || 'text/plain',
      });
      res.status(201).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const validated = updateNodeSchema.parse(req.body);
      const node = await vfsService.updateNode(req.user.id, getNodeId(req), validated);
      res.status(200).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }

  async moveToTrash(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const node = await vfsService.moveToTrash(req.user.id, getNodeId(req));
      res.status(200).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }

  async restore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const node = await vfsService.restoreFromTrash(req.user.id, getNodeId(req));
      res.status(200).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }

  async deletePermanently(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      await vfsService.deletePermanently(req.user.id, getNodeId(req));
      res.status(200).json({ success: true, message: 'Node permanently deleted' });
    } catch (err) {
      next(err);
    }
  }

  async emptyTrash(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      await vfsService.emptyTrash(req.user.id);
      res.status(200).json({ success: true, message: 'Trash emptied successfully' });
    } catch (err) {
      next(err);
    }
  }

  async duplicate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const node = await vfsService.duplicateNode(req.user.id, getNodeId(req));
      res.status(201).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }

  async search(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const query = (req.query.q as string) || '';
      const results = await vfsService.searchNodes(req.user.id, query);
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  async getStorage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const stats = await vfsService.getStorageUsage(req.user.id);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}

export const vfsController = new VfsController();
