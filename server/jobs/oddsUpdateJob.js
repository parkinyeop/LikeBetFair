const cron = require('node-cron');
const oddsApiService = require('../services/oddsApiService');
const gameResultService = require('../services/gameResultService');

let isUpdating = false;

// 매 시간 정각에 실행 (0분 0초)
cron.schedule('0 * * * *', async () => {
  if (isUpdating) {
    console.log('Previous update is still running, skipping this update');
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting odds and results update job...`);
  isUpdating = true;

  try {
    // 배팅 데이터 업데이트
    await oddsApiService.fetchAndCacheOdds();
    console.log(`[${new Date().toISOString()}] Odds update completed successfully`);

    // 게임 결과 업데이트
    await gameResultService.fetchAndUpdateResults();
    console.log(`[${new Date().toISOString()}] Game results update completed successfully`);

    console.log(`[${new Date().toISOString()}] All updates completed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Update job failed:`, error);
    
    // 에러 발생 시 5분 후 재시도
    setTimeout(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Retrying updates...`);
        await oddsApiService.fetchAndCacheOdds();
        await gameResultService.fetchAndUpdateResults();
        console.log(`[${new Date().toISOString()}] Retry successful`);
      } catch (retryError) {
        console.error(`[${new Date().toISOString()}] Retry failed:`, retryError);
      } finally {
        isUpdating = false;
      }
    }, 5 * 60 * 1000); // 5분
  } finally {
    isUpdating = false;
  }
});

// 서버 시작시 즉시 한 번 실행
const initializeData = async () => {
  console.log(`[${new Date().toISOString()}] Starting initial data caching...`);
  try {
    await oddsApiService.fetchAndCacheOdds();
    await gameResultService.fetchAndUpdateResults();
    console.log(`[${new Date().toISOString()}] Initial data cached successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Initial data caching failed:`, error);
    
    // 초기 데이터 로드 실패 시 1분 후 재시도
    setTimeout(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Retrying initial data caching...`);
        await oddsApiService.fetchAndCacheOdds();
        await gameResultService.fetchAndUpdateResults();
        console.log(`[${new Date().toISOString()}] Initial retry successful`);
      } catch (retryError) {
        console.error(`[${new Date().toISOString()}] Initial retry failed:`, retryError);
      }
    }, 60 * 1000); // 1분
  }
};

// 서버 시작시 초기화 실행
initializeData();

// 스케줄러 상태 모니터링
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Scheduler status: ${isUpdating ? 'Updating' : 'Idle'}`);
}, 15 * 60 * 1000); // 15분마다 상태 로깅

module.exports = {
  isUpdating: () => isUpdating
}; 