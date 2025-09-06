// 간단한 경기 결과 서비스 테스트
import gameResultService from './services/gameResultService.js';

(async () => {
  try {
    console.log('🔍 경기 결과 서비스 테스트 시작');
    
    // 단일 카테고리 테스트 (NBA만)
    const testCategories = ['NBA'];
    console.log(`테스트 카테고리: ${testCategories.join(', ')}`);
    
    const startTime = Date.now();
    const result = await gameResultService.fetchAndUpdateResultsForCategories(testCategories);
    const endTime = Date.now();
    
    console.log(`✅ 테스트 완료 (${endTime - startTime}ms)`);
    console.log('결과:', result);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('스택:', error.stack);
    process.exit(1);
  }
})();