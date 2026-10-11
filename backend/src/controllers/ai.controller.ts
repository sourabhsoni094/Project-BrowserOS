import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { aiService } from '../services/ai.service.js';

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

export class AIController {
  async listConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId || 'admin';
      const conversations = await aiService.listConversations(userId);
      res.json({ conversations });
    } catch (err) {
      next(err);
    }
  }

  async getConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId || 'admin';
      const conversationId = getParamId(req.params.id);
      if (!conversationId) {
        res.status(400).json({ error: 'Conversation ID is required' });
        return;
      }
      const conversation = await aiService.getConversation(userId, conversationId);
      res.json({ conversation });
    } catch (err) {
      next(err);
    }
  }

  async createConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId || 'admin';
      const { title, model, provider } = req.body;
      const conversation = await aiService.createConversation(userId, title, model, provider);
      res.status(201).json({ conversation });
    } catch (err) {
      next(err);
    }
  }

  async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId || 'admin';
      const conversationId = getParamId(req.params.id);
      if (!conversationId) {
        res.status(400).json({ error: 'Conversation ID is required' });
        return;
      }
      await aiService.deleteConversation(userId, conversationId);
      res.json({ message: 'Conversation deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async listModels(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId || 'admin';
      const models = await aiService.listModels(userId);
      res.json(models);
    } catch (err) {
      next(err);
    }
  }

  async chat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId || 'admin';
      const { conversationId, content, model, provider, attachFileId } = req.body;
      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }
      const result = await aiService.chat(userId, {
        conversationId,
        content,
        model,
        provider,
        attachFileId,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();
