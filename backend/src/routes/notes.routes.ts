import { Router } from 'express';
import { notesController } from '../controllers/notes.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => notesController.listNotes(req, res, next));
router.post('/', (req, res, next) => notesController.createNote(req, res, next));
router.get('/:id', (req, res, next) => notesController.getNote(req, res, next));
router.patch('/:id', (req, res, next) => notesController.updateNote(req, res, next));
router.delete('/:id', (req, res, next) => notesController.deleteNote(req, res, next));

export default router;
