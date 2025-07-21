import express from 'express';
import oddsApiService from '../services/oddsApiService.js';

// 클라이언트에서 사용하는 sport key 매핑 (oddsApiService에서 복사)
const clientSportKeyMap = {
  // 축구 (Soccer)
  'K리그': 'soccer_korea_kleague1',
  'J리그': 'soccer_japan_j_league',
  '세리에 A': 'soccer_italy_serie_a',
  '브라질 세리에 A': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  '아르헨티나 프리메라': 'soccer_argentina_primera_division',
  '중국 슈퍼리그': 'soccer_china_superleague',
  '라리가': 'soccer_spain_la_liga',
  '분데스리가': 'soccer_germany_bundesliga',
  '프리미어리그': 'soccer_epl',
  
  // 농구 (Basketball)
  'NBA': 'basketball_nba',
  
  // 야구 (Baseball)
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  
  // 미식축구 (American Football)
  'NFL': 'americanfootball_nfl'
};

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
router.get('/:sportKey', async (req, res) => {
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
    console.log(`[API] Odds 업데이트 요청`);
    
    const result = await oddsApiService.fetchAndCacheOdds();
    
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