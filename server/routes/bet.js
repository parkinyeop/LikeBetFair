const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const betResultService = require('../services/betResultService');
const verifyToken = require('../middleware/verifyToken');

// Bet routes
router.post('/', verifyToken, betController.placeBet);
router.get('/history', verifyToken, betController.getBetHistory);
router.get('/active', verifyToken, betController.getActiveBets);
router.get('/:id', verifyToken, betController.getBetById);
router.post('/:id/cancel', verifyToken, betController.cancelBet);

// 배팅 결과 업데이트 (관리자용)
router.post('/update-results', async (req, res) => {
  try {
    const result = await betResultService.updateBetResults();
    res.json({
      message: 'Bet results updated successfully',
      ...result
    });
  } catch (error) {
    console.error('Error updating bet results:', error);
    res.status(500).json({ error: 'Failed to update bet results' });
  }
});

// 클라이언트에서 배당률을 제공하는 모든 게임 목록 조회
router.get('/games/betting', async (req, res) => {
  try {
    const bettingGames = await betResultService.collectAllBettingGames();
    res.json({
      message: 'Betting games collected successfully',
      totalGames: bettingGames.length,
      games: bettingGames
    });
  } catch (error) {
    console.error('Error collecting betting games:', error);
    res.status(500).json({ error: 'Failed to collect betting games' });
  }
});

// 누락된 경기 결과 식별
router.get('/games/missing-results', async (req, res) => {
  try {
    const missingGames = await betResultService.identifyMissingGameResults();
    res.json({
      message: 'Missing game results identified',
      totalMissing: missingGames.length,
      missingGames: missingGames
    });
  } catch (error) {
    console.error('Error identifying missing game results:', error);
    res.status(500).json({ error: 'Failed to identify missing game results' });
  }
});

// 전체 배팅 통계 (관리자용)
router.get('/stats/overall', async (req, res) => {
  try {
    const stats = await betResultService.getOverallBetStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting overall bet stats:', error);
    res.status(500).json({ error: 'Failed to get overall bet stats' });
  }
});

// 사용자별 배팅 통계
router.get('/stats/user/:userId', async (req, res) => {
  try {
    const stats = await betResultService.getUserBetStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting user bet stats:', error);
    res.status(500).json({ error: 'Failed to get user bet stats' });
  }
});

// 내 배팅 통계 (인증된 사용자)
router.get('/stats/my', verifyToken, async (req, res) => {
  try {
    const stats = await betResultService.getUserBetStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error getting my bet stats:', error);
    res.status(500).json({ error: 'Failed to get my bet stats' });
  }
});

// 배팅 상세 정보 (관리자용)
router.get('/details/:betId', async (req, res) => {
  try {
    const betDetails = await betResultService.getBetDetails(req.params.betId);
    if (!betDetails) {
      return res.status(404).json({ error: 'Bet not found' });
    }
    res.json(betDetails);
  } catch (error) {
    console.error('Error getting bet details:', error);
    res.status(500).json({ error: 'Failed to get bet details' });
  }
});

// 모든 배팅 조회 (관리자용)
router.get('/admin/all', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, userId } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;

    const bets = await require('../models/betModel').findAndCountAll({
      where: whereClause,
      include: [{ model: require('../models/userModel'), attributes: ['email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      bets: bets.rows,
      total: bets.count,
      page: parseInt(page),
      totalPages: Math.ceil(bets.count / limit)
    });
  } catch (error) {
    console.error('Error getting all bets:', error);
    res.status(500).json({ error: 'Failed to get all bets' });
  }
});

module.exports = router; 