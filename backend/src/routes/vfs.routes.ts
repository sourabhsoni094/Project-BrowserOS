import { Router } from 'express';
import { vfsController } from '../controllers/vfs.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all VFS routes
router.use(requireAuth);

router.get('/', (req, res, next) => vfsController.list(req, res, next));
router.get('/desktop', (req, res, next) => vfsController.getDesktop(req, res, next));
router.get('/trash', (req, res, next) => vfsController.getTrash(req, res, next));
router.get('/storage', (req, res, next) => vfsController.getStorage(req, res, next));
router.get('/search', (req, res, next) => vfsController.search(req, res, next));
router.get('/:id', (req, res, next) => vfsController.getById(req, res, next));

router.post('/', (req, res, next) => vfsController.create(req, res, next));
router.post('/upload', (req, res, next) => vfsController.upload(req, res, next));
router.post('/:id/copy', (req, res, next) => vfsController.duplicate(req, res, next));
router.post('/:id/trash', (req, res, next) => vfsController.moveToTrash(req, res, next));
router.post('/:id/restore', (req, res, next) => vfsController.restore(req, res, next));

router.patch('/:id', (req, res, next) => vfsController.update(req, res, next));

router.delete('/trash', (req, res, next) => vfsController.emptyTrash(req, res, next));
router.delete('/:id', (req, res, next) => vfsController.deletePermanently(req, res, next));

export default router;
