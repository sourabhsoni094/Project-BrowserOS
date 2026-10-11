import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => settingsController.getPreferences(req, res, next));
router.patch('/', (req, res, next) => settingsController.updatePreferences(req, res, next));

export default router;
