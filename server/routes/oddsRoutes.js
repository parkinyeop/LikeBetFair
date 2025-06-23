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

export default router; 