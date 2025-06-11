const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);

module.exports = router; 