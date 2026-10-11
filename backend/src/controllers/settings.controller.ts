import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { settingsService } from '../services/settings.service.js';

export class SettingsController {
  async getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const preferences = await settingsService.getPreferences(req.user!.userId);
      res.json({ preferences });
    } catch (err) {
      next(err);
    }
  }

  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const preferences = await settingsService.updatePreferences(req.user!.userId, req.body);
      res.json({ preferences, message: 'Preferences updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
