const express = require('express');
const router = express.Router();
const gameResultService = require('../services/gameResultService');

// 모든 게임 결과 가져오기
router.get('/results', async (req, res) => {
  try {
    const { mainCategory, subCategory, status, limit = 100 } = req.query;
    const results = await gameResultService.getGameResults(
      mainCategory,
      subCategory,
      status,
      parseInt(limit)
    );
    res.json(results);
  } catch (error) {
    console.error('Error fetching game results:', error);
    res.status(500).json({ error: 'Failed to fetch game results' });
  }
});

// 특정 게임의 결과 가져오기
router.get('/results/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const result = await gameResultService.getGameResultById(gameId);
    if (!result) {
      return res.status(404).json({ error: 'Game result not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching game result:', error);
    res.status(500).json({ error: 'Failed to fetch game result' });
  }
});

// 게임 결과 업데이트 (관리자용)
router.put('/results/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const updateData = req.body;
    
    // 허용된 필드만 업데이트
    const allowedFields = ['status', 'score', 'result'];
    const filteredUpdateData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    const updatedGame = await gameResultService.updateGameResult(gameId, filteredUpdateData);
    res.json(updatedGame);
  } catch (error) {
    console.error('Error updating game result:', error);
    res.status(500).json({ error: 'Failed to update game result' });
  }
});

module.exports = router; 