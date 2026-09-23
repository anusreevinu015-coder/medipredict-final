import { Router } from 'express';
import { login, logout, signup } from '../controllers/auth.controller.js';
import { currentUserController } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', currentUserController);

export default router;