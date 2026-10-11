import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/conversations', (req, res, next) => aiController.listConversations(req, res, next));
router.post('/conversations', (req, res, next) => aiController.createConversation(req, res, next));
router.get('/conversations/:id', (req, res, next) => aiController.getConversation(req, res, next));
router.delete('/conversations/:id', (req, res, next) => aiController.deleteConversation(req, res, next));
router.get('/models', (req, res, next) => aiController.listModels(req, res, next));
router.post('/chat', (req, res, next) => aiController.chat(req, res, next));

export default router;
