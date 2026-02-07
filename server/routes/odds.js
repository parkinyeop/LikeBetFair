import express from 'express';
import oddsController from '../controllers/oddsController.js';
import oddsApiService from '../services/oddsApiService.js';

const router = express.Router();

router.get('/:sport', oddsController.getOdds);
router.post('/update-odds', oddsController.updateOdds);

// 🆕 야구 데이터 업데이트 테스트용 엔드포인트 추가
router.post('/test-baseball-update', async (req, res) => {
  try {
    console.log('🏟️ 야구 데이터 업데이트 테스트 API 호출됨');
    
    // MLB와 KBO만 업데이트
    const activeCategories = ['MLB', 'KBO'];
    
    console.log(`📋 업데이트할 카테고리: ${activeCategories.join(', ')}`);
    
    // 야구 데이터 업데이트 실행
    const result = await oddsApiService.fetchAndCacheOddsForCategories(activeCategories, 'high');
    
    console.log('✅ 야구 데이터 업데이트 완료!');
    console.log('📊 결과:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      message: '야구 데이터 업데이트 완료',
      result: result
    });
    
  } catch (error) {
    console.error('❌ 야구 데이터 업데이트 실패:', error);
    console.error('🔍 오류 스택:', error.stack);
    
    res.status(500).json({
      success: false,
      message: '야구 데이터 업데이트 실패',
      error: error.message
    });
  }
});

export default router; 