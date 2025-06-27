import cron from 'node-cron';
import oddsApiService from '../services/oddsApiService.js';
import gameResultService from '../services/gameResultService.js';
import betResultService from '../services/betResultService.js';

let isUpdating = false;
let lastUpdateTime = null;
let activeCategories = new Set([
      'K리그', 'J리그', '세리에 A', '브라질 세리에 A', 'MLS', '아르헨티나 프리메라', '중국 슈퍼리그', '스페인 라리가', '독일 분데스리가',
  'NBA', 'WNBA',
  'MLB', 'KBO',
  'CFL', 'NCAAF', 'NFL', 'NFL 프리시즌'
]); // 클라이언트 UI와 동일하게 전체 카테고리 활성화

// 활성 카테고리 관리 함수
const updateActiveCategories = (categories) => {
  activeCategories = new Set(categories);
  console.log(`[${new Date().toISOString()}] Active categories updated:`, Array.from(activeCategories));
};

// 비용 효율적인 경기 결과 업데이트 - 2시간마다 실행
cron.schedule('0 */2 * * *', async () => {
  if (isUpdating) {
    console.log('Previous game results update is still running, skipping this update');
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting cost-efficient game results update...`);
  isUpdating = true;

  try {
    // 활성 카테고리만 업데이트
    await gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories));
    
    // 경기 결과 업데이트 후 배팅 결과도 업데이트
    console.log(`[${new Date().toISOString()}] Starting bet results update after game results...`);
    const betUpdateResult = await betResultService.updateBetResults();
    console.log(`[${new Date().toISOString()}] Bet results update completed:`, betUpdateResult);
    
    lastUpdateTime = new Date();
    console.log(`[${new Date().toISOString()}] Game results and bet results update completed for active categories`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Game results update failed:`, error.message);
    
    // 에러 발생 시 10분 후 재시도 (비용 절약을 위해 재시도 간격 증가)
    setTimeout(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Retrying game results update...`);
        await gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories));
        await betResultService.updateBetResults();
        lastUpdateTime = new Date();
        console.log(`[${new Date().toISOString()}] Game results retry successful`);
      } catch (retryError) {
        console.error(`[${new Date().toISOString()}] Game results retry failed:`, retryError.message);
      } finally {
        isUpdating = false;
      }
    }, 10 * 60 * 1000); // 10분
  } finally {
    isUpdating = false;
  }
});

// 비용 효율적인 배당률 업데이트 - 3시간마다 실행 (더 긴 간격)
cron.schedule('0 */3 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting cost-efficient odds update...`);

  try {
    // 활성 카테고리만 배당률 업데이트
    await oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories));
    console.log(`[${new Date().toISOString()}] Odds update completed for active categories`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Odds update failed:`, error.message);
    
    // 에러 발생 시 15분 후 재시도
    setTimeout(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Retrying odds update...`);
        await oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories));
        console.log(`[${new Date().toISOString()}] Odds retry successful`);
      } catch (retryError) {
        console.error(`[${new Date().toISOString()}] Odds retry failed:`, retryError.message);
      }
    }, 15 * 60 * 1000); // 15분
  }
});

// 배팅 결과 업데이트 - 1시간마다 실행 (경기 결과와 독립적으로)
cron.schedule('30 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled bet results update...`);

  try {
    const result = await betResultService.updateBetResults();
    console.log(`[${new Date().toISOString()}] Scheduled bet results update completed:`, result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scheduled bet results update failed:`, error.message);
    
    // 에러 발생 시 5분 후 재시도
    setTimeout(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Retrying scheduled bet results update...`);
        await betResultService.updateBetResults();
        console.log(`[${new Date().toISOString()}] Scheduled bet results retry successful`);
      } catch (retryError) {
        console.error(`[${new Date().toISOString()}] Scheduled bet results retry failed:`, retryError.message);
      }
    }, 5 * 60 * 1000); // 5분
  }
});

// 전체 데이터 업데이트 - 하루에 한 번만 (비용 절약)
cron.schedule('0 6 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting daily full data update...`);
  
  try {
    // 모든 카테고리에 대해 한 번에 업데이트
    await Promise.all([
      oddsApiService.fetchAndCacheOdds(),
      gameResultService.fetchAndUpdateResults()
    ]);
    
    // 배팅 결과 업데이트
    await betResultService.updateBetResults();
    
    lastUpdateTime = new Date();
    console.log(`[${new Date().toISOString()}] Daily full update completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Daily full update failed:`, error.message);
  }
});

// 데이터베이스 통계 - 매일 자정에 실행
cron.schedule('0 0 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting daily database statistics...`);
  
  try {
    const [gameStats, betStats] = await Promise.all([
      gameResultService.getDatabaseStats(),
      betResultService.getOverallBetStats()
    ]);
    
    console.log(`[${new Date().toISOString()}] Database statistics:`, {
      gameResults: gameStats,
      bets: betStats
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database statistics failed:`, error.message);
  }
});

// 서버 시작시 즉시 한 번 실행 (활성 카테고리만)
const initializeData = async () => {
  console.log(`[${new Date().toISOString()}] Starting initial data caching for active categories...`);
  try {
    // 활성 카테고리만 초기 로드
    await Promise.all([
      oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories)),
      gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories))
    ]);
    
    // 초기 배팅 결과 업데이트
    await betResultService.updateBetResults();
    
    lastUpdateTime = new Date();
    console.log(`[${new Date().toISOString()}] Initial data cached successfully for active categories`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Initial data caching failed:`, error.message);
    
    // 초기 데이터 로드 실패 시 2분 후 재시도
    setTimeout(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Retrying initial data caching...`);
        await Promise.all([
          oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories)),
          gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories))
        ]);
        await betResultService.updateBetResults();
        lastUpdateTime = new Date();
        console.log(`[${new Date().toISOString()}] Initial retry successful`);
      } catch (retryError) {
        console.error(`[${new Date().toISOString()}] Initial retry failed:`, retryError.message);
      }
    }, 2 * 60 * 1000); // 2분
  }
};

// 서버 시작시 초기화 실행
initializeData();

// 스케줄러 상태 모니터링 - 15분마다 (비용 절약을 위해 간격 증가)
setInterval(() => {
  const status = {
    isUpdating,
    lastUpdateTime: lastUpdateTime ? lastUpdateTime.toISOString() : null,
    activeCategories: Array.from(activeCategories),
    uptime: process.uptime(),
    apiCallEstimate: `~${activeCategories.size * 2} calls per hour` // 시간당 예상 API 호출 수
  };
  console.log(`[${new Date().toISOString()}] Scheduler status:`, JSON.stringify(status, null, 2));
}, 15 * 60 * 1000); // 15분

// 헬스체크 엔드포인트용 함수
const getHealthStatus = () => {
  return {
    isUpdating,
    lastUpdateTime: lastUpdateTime ? lastUpdateTime.toISOString() : null,
    activeCategories: Array.from(activeCategories),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    costOptimization: {
      strategy: 'Active categories only',
      updateFrequency: '2-3 hours',
      dailyFullUpdate: '6:00 AM',
      betResultsUpdate: 'Every hour'
    }
  };
};

// TheSportsDB 결과 업데이트 스케줄러 (1시간마다)
setInterval(async () => {
  try {
    console.log('[Scheduler] TheSportsDB에서 경기 결과 업데이트 시작');
    await gameResultService.fetchAndSaveAllResults();
    console.log('[Scheduler] TheSportsDB에서 경기 결과 업데이트 완료');
  } catch (error) {
    console.error('[Scheduler] TheSportsDB 결과 업데이트 에러:', error);
  }
}, 60 * 60 * 1000); // 1시간마다

// 배팅내역 기반 누락 경기 결과 자동 보충 (1시간마다)
setInterval(async () => {
  try {
    console.log('[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 시작');
    const updated = await gameResultService.updateMissingGameResultsFromBets();
    console.log(`[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 완료: ${updated}건 보충됨`);
  } catch (error) {
    console.error('[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 에러:', error);
  }
}, 60 * 60 * 1000); // 1시간마다

const getActiveCategories = () => Array.from(activeCategories);

export { getHealthStatus, updateActiveCategories, getActiveCategories }; 