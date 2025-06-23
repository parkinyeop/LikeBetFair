import express from 'express';
import authController from '../controllers/authController.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);

export default router; 