import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { terminalService } from '../services/terminal.service.js';
import { AppError } from '../middleware/error.middleware.js';

const executeSchema = z.object({
  command: z.string().max(1000, 'Command too long'),
  cwdId: z.string().uuid().nullable().optional(),
});

export class TerminalController {
  async execute(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const validated = executeSchema.parse(req.body);
      const result = await terminalService.execute(req.user.id, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const terminalController = new TerminalController();
