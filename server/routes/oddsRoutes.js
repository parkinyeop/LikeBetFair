import express from 'express';
import oddsApiService from '../services/oddsApiService.js';

const router = express.Router();

// 카테고리 목록 가져오기
router.get('/categories', async (req, res) => {
  try {
    const categories = await oddsApiService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// 스포츠별 배팅 데이터 가져오기
router.get('/odds/:sportKey', async (req, res) => {
  try {
    const { sportKey } = req.params;
    const { limit = 100 } = req.query;
    const odds = await oddsApiService.getCachedOdds(sportKey, null, parseInt(limit));
    res.json(odds);
  } catch (error) {
    console.error('Error fetching odds:', error);
    res.status(500).json({ error: 'Failed to fetch odds data' });
  }
});

// 테스트용 odds 데이터 가져오기
router.get('/test-odds', async (req, res) => {
  try {
    const odds = await oddsApiService.getCachedOdds('soccer', null, 10);
    res.json(odds);
  } catch (error) {
    console.error('Error fetching test odds:', error);
    res.status(500).json({ error: 'Failed to fetch test odds' });
  }
});

// odds 업데이트 엔드포인트
router.post('/update-odds', async (req, res) => {
  try {
    const { priority = 'high' } = req.body;
    console.log(`[API] Odds 업데이트 요청 - priority: ${priority}`);
    
    const result = await oddsApiService.updateOdds(priority);
    res.json({
      success: true,
      message: 'Odds updated successfully',
      result
    });
  } catch (error) {
    console.error('Error updating odds:', error);
    res.status(500).json({ error: 'Failed to update odds' });
  }
});

// odds 상태 확인
router.get('/status', async (req, res) => {
  try {
    const count = await oddsApiService.getOddsCount();
    res.json({
      totalOdds: count,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting odds status:', error);
    res.status(500).json({ error: 'Failed to get odds status' });
  }
});

export default router; 