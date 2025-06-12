const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const verifyToken = require('../middleware/verifyToken');

// Bet routes
router.post('/', verifyToken, betController.placeBet);
router.get('/history', verifyToken, betController.getBetHistory);
router.get('/active', verifyToken, betController.getActiveBets);
router.get('/:id', verifyToken, betController.getBetById);
router.post('/:id/cancel', verifyToken, betController.cancelBet);

module.exports = router; 