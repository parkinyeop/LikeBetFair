import gameResultService from './services/gameResultService.js';

async function debugGameResultService() {
  console.log('=== 게임 결과 서비스 디버깅 ===');
  
  try {
    // 1. 활성 카테고리 테스트
    const activeCategories = ['NBA', 'MLB', 'KBO', 'NFL', 'MLS', 'K리그', 'J리그', '세리에 A', '브라질 세리에 A', '아르헨티나 프리메라', '중국 슈퍼리그', '라리가', '분데스리가'];
    
    console.log('1. 활성 카테고리:', activeCategories);
    
    // 2. fetchAndUpdateResultsForCategories 실행
    console.log('\n2. fetchAndUpdateResultsForCategories 실행 중...');
    
    const result = await gameResultService.fetchAndUpdateResultsForCategories(activeCategories);
    
    console.log('3. 결과:', result);
    
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

debugGameResultService(); 