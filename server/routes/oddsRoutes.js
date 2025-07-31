import express from 'express';
import { oddsController } from '../controllers/oddsController.js';

const router = express.Router();

// 카테고리 목록 가져오기
router.get('/categories', async (req, res) => {
  try {
    // oddsController에서 카테고리 목록 제공
    const categories = Object.keys(oddsController.sportKeyMapping || {});
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// 스포츠별 배팅 데이터 가져오기 - oddsController 사용
router.get('/:sportKey', oddsController.getOdds);

// odds 업데이트 엔드포인트
router.post('/update-odds', oddsController.updateOdds);

// odds 상태 확인
router.get('/status', async (req, res) => {
  try {
    // oddsController를 통한 상태 확인
    res.json({
      message: 'Odds controller is active',
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting odds status:', error);
    res.status(500).json({ error: 'Failed to get odds status' });
  }
});

export default router; 