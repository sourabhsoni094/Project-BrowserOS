import { Router } from 'express';
import authRoutes from './auth.routes.js';
import vfsRoutes from './vfs.routes.js';
import terminalRoutes from './terminal.routes.js';
import aiRoutes from './ai.routes.js';
import notesRoutes from './notes.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/files', vfsRoutes);
router.use('/terminal', terminalRoutes);
router.use('/ai', aiRoutes);
router.use('/notes', notesRoutes);
router.use('/settings', settingsRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
