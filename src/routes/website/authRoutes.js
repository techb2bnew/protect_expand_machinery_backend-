import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, logout } from '../../controllers/website/authController.js';
import { authenticate } from '../../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);

router.post('/login', login);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password/:token', resetPassword);

router.post('/logout', authenticate, logout);

export default router;


