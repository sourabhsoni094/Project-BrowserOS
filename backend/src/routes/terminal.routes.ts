import { Router } from 'express';
import { terminalController } from '../controllers/terminal.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Protect terminal routes
router.use(requireAuth);

router.post('/execute', (req, res, next) => terminalController.execute(req, res, next));

export default router;
