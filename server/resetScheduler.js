import cron from 'node-cron';
import oddsApiService from './services/oddsApiService.js';
import gameResultService from './services/gameResultService.js';
import betResultService from './services/betResultService.js';

console.log('=== 스케줄러 강제 리셋 스크립트 ===');

// 스케줄러 상태 확인 및 리셋
async function resetScheduler() {
  try {
    console.log('1. 현재 스케줄러 상태 확인...');
    
    // 스케줄러 모듈에서 직접 상태 확인 (실제로는 모듈 내부 변수에 접근할 수 없으므로)
    // 대신 배당율 업데이트를 수동으로 실행해서 상태를 리셋
    
    console.log('2. 배당율 업데이트 수동 실행...');
    
    // 고우선순위 리그들로 배당율 업데이트 실행
    const highPriorityCategories = ['NBA', 'MLB', 'KBO', 'NFL', '프리미어리그'];
    
    console.log('3. 고우선순위 리그 배당율 업데이트 시작...');
    const result = await oddsApiService.fetchAndCacheOddsForCategories(highPriorityCategories, 'high');
    
    console.log('4. 업데이트 결과:', result);
    
    console.log('5. 중우선순위 리그 배당율 업데이트 시작...');
    const mediumPriorityCategories = ['MLS', 'KLEAGUE', 'JLEAGUE', 'SERIEA'];
    const mediumResult = await oddsApiService.fetchAndCacheOddsForCategories(mediumPriorityCategories, 'medium');
    
    console.log('6. 중우선순위 업데이트 결과:', mediumResult);
    
    console.log('✅ 스케줄러 리셋 완료!');
    console.log('📊 총 업데이트된 배당율:', (result?.updatedCount || 0) + (mediumResult?.updatedCount || 0));
    
  } catch (error) {
    console.error('❌ 스케줄러 리셋 실패:', error.message);
  }
  
  process.exit(0);
}

resetScheduler(); 