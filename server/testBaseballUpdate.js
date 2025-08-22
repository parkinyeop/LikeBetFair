import oddsApiService from './services/oddsApiService.js';

async function testBaseballUpdate() {
  try {
    console.log('🏟️ 야구 데이터 업데이트 테스트 시작...');
    
    // MLB와 KBO만 업데이트
    const activeCategories = ['MLB', 'KBO'];
    
    console.log(`📋 업데이트할 카테고리: ${activeCategories.join(', ')}`);
    
    // 야구 데이터 업데이트 실행
    const result = await oddsApiService.fetchAndCacheOddsForCategories(activeCategories, 'high');
    
    console.log('✅ 야구 데이터 업데이트 완료!');
    console.log('📊 결과:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ 야구 데이터 업데이트 실패:', error);
    console.error('🔍 오류 스택:', error.stack);
  }
}

// 스크립트 실행
testBaseballUpdate();
