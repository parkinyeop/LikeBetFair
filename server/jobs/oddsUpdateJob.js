import cron from 'node-cron';
import oddsApiService from '../services/oddsApiService.js';
import gameResultService from '../services/gameResultService.js';
import betResultService from '../services/betResultService.js';
import fs from 'fs';
import path from 'path';

let isUpdating = false;
let lastUpdateTime = null;

// 리그별 우선순위 설정 (API 사용량 최적화)
const highPriorityCategories = new Set([
  'NBA', 'MLB', 'KBO', 'NFL' // 활발한 시즌 또는 높은 베팅 볼륨
]);

const mediumPriorityCategories = new Set([
  'MLS', 'K리그', 'J리그', '세리에 A'
]);

const lowPriorityCategories = new Set([
  '브라질 세리에 A', '아르헨티나 프리메라', '중국 슈퍼리그', '라리가', '분데스리가'
]);

let activeCategories = new Set([
  ...highPriorityCategories,
  ...mediumPriorityCategories,
  ...lowPriorityCategories
]); // 클라이언트 UI와 동일하게 전체 카테고리 활성화

// 활성 카테고리 관리 함수
const updateActiveCategories = (categories) => {
  activeCategories = new Set(categories);
  console.log(`[${new Date().toISOString()}] Active categories updated:`, Array.from(activeCategories));
};

// 로그 디렉토리 생성
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 로그 저장 함수
function saveUpdateLog(type, status, data = {}) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const logFile = path.join(logsDir, `scheduler_${dateStr}.log`);
  
  const logEntry = {
    timestamp: now.toISOString(),
    type: type, // 'odds', 'results', 'bets', 'full'
    status: status, // 'start', 'success', 'error'
    ...data
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logFile, logLine);
  
  // 콘솔에도 출력
  const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '🚀';
  console.log(`${emoji} [${now.toISOString()}] ${type.toUpperCase()} ${status.toUpperCase()}:`, data.message || '');
}

// 비용 효율적인 경기 결과 업데이트 - 2시간마다 실행
cron.schedule('0 */2 * * *', async () => {
  if (isUpdating) {
    console.log('Previous game results update is still running, skipping this update');
    return;
  }

  saveUpdateLog('results', 'start', { message: 'Starting cost-efficient game results update', categories: Array.from(activeCategories) });
  isUpdating = true;

  try {
    // 활성 카테고리만 업데이트
    const updateResult = await gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories));
    
    // 경기 결과 업데이트 후 배팅 결과도 업데이트
    saveUpdateLog('bets', 'start', { message: 'Starting bet results update after game results' });
    const betUpdateResult = await betResultService.updateBetResults();
    
    lastUpdateTime = new Date();
    
    saveUpdateLog('results', 'success', { 
      message: 'Game results and bet results update completed',
      gameResultsUpdated: updateResult?.updatedCount || 'N/A',
      betResultsUpdated: betUpdateResult?.updatedCount || 0,
      categories: Array.from(activeCategories)
    });
    
  } catch (error) {
    saveUpdateLog('results', 'error', { 
      message: 'Game results update failed',
      error: error.message,
      categories: Array.from(activeCategories)
    });
    
    // 에러 발생 시 10분 후 재시도 (비용 절약을 위해 재시도 간격 증가)
    setTimeout(async () => {
      try {
        saveUpdateLog('results', 'start', { message: 'Retrying game results update', isRetry: true });
        await gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories));
        await betResultService.updateBetResults();
        lastUpdateTime = new Date();
        saveUpdateLog('results', 'success', { message: 'Game results retry successful', isRetry: true });
      } catch (retryError) {
        saveUpdateLog('results', 'error', { message: 'Game results retry failed', error: retryError.message, isRetry: true });
      } finally {
        isUpdating = false;
      }
    }, 10 * 60 * 1000); // 10분
  } finally {
    isUpdating = false;
  }
});

// 고우선순위 리그 - 3시간마다 업데이트
cron.schedule('0 */3 * * *', async () => {
  saveUpdateLog('odds', 'start', { 
    message: 'Starting high-priority leagues odds update',
    priority: 'high',
    leagues: Array.from(highPriorityCategories)
  });
  
  try {
    // 동적 우선순위 확인
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    const actualPriority = dynamicPriority === 'high' ? 'high' : 'medium';
    
    if (dynamicPriority === 'high') {
      // API 사용량이 높을 때는 고우선순위만
      await oddsApiService.fetchAndCacheOddsForCategories(Array.from(highPriorityCategories), 'high');
    } else {
      // 정상적일 때는 기존대로
      await oddsApiService.fetchAndCacheOddsForCategories(Array.from(highPriorityCategories), 'medium');
    }
    
    saveUpdateLog('odds', 'success', { 
      message: 'High-priority odds update completed',
      priority: actualPriority,
      leagues: Array.from(highPriorityCategories),
      dynamicPriority: dynamicPriority
    });
    
  } catch (error) {
    saveUpdateLog('odds', 'error', { 
      message: 'High-priority odds update failed',
      priority: 'high',
      leagues: Array.from(highPriorityCategories),
      error: error.message
    });
  }
});

// 중우선순위 리그 - 6시간마다 업데이트  
cron.schedule('0 */6 * * *', async () => {
  saveUpdateLog('odds', 'start', { 
    message: 'Starting medium-priority leagues odds update',
    priority: 'medium',
    leagues: Array.from(mediumPriorityCategories)
  });
  
  try {
    // API 사용량이 높지 않을 때만 실행
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    if (dynamicPriority !== 'high') {
      await oddsApiService.fetchAndCacheOddsForCategories(Array.from(mediumPriorityCategories), 'medium');
      saveUpdateLog('odds', 'success', { 
        message: 'Medium-priority odds update completed',
        priority: 'medium',
        leagues: Array.from(mediumPriorityCategories),
        dynamicPriority: dynamicPriority
      });
    } else {
      saveUpdateLog('odds', 'skip', { 
        message: 'Skipping medium-priority update due to high API usage',
        priority: 'medium',
        leagues: Array.from(mediumPriorityCategories),
        dynamicPriority: dynamicPriority
      });
    }
  } catch (error) {
    saveUpdateLog('odds', 'error', { 
      message: 'Medium-priority odds update failed',
      priority: 'medium',
      leagues: Array.from(mediumPriorityCategories),
      error: error.message
    });
  }
});

// 저우선순위 리그 - 12시간마다 업데이트 (시즌 오프 리그들)
cron.schedule('0 */12 * * *', async () => {
  saveUpdateLog('odds', 'start', { 
    message: 'Starting low-priority leagues odds update',
    priority: 'low',
    leagues: Array.from(lowPriorityCategories)
  });
  
  try {
    // API 사용량이 낮을 때만 실행
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    if (dynamicPriority === 'low') {
      await oddsApiService.fetchAndCacheOddsForCategories(Array.from(lowPriorityCategories), 'low');
      saveUpdateLog('odds', 'success', { 
        message: 'Low-priority odds update completed',
        priority: 'low',
        leagues: Array.from(lowPriorityCategories),
        dynamicPriority: dynamicPriority
      });
    } else {
      saveUpdateLog('odds', 'skip', { 
        message: 'Skipping low-priority update due to API usage constraints',
        priority: 'low',
        leagues: Array.from(lowPriorityCategories),
        dynamicPriority: dynamicPriority
      });
    }
  } catch (error) {
    saveUpdateLog('odds', 'error', { 
      message: 'Low-priority odds update failed',
      priority: 'low',
      leagues: Array.from(lowPriorityCategories),
      error: error.message
    });
  }
});

// 배팅 결과 업데이트 - 1시간마다 실행 (경기 결과와 독립적으로)
cron.schedule('30 * * * *', async () => {
  saveUpdateLog('bets', 'start', { message: 'Starting scheduled bet results update' });

  try {
    const result = await betResultService.updateBetResults();
    saveUpdateLog('bets', 'success', { 
      message: 'Scheduled bet results update completed',
      updatedCount: result?.updatedCount || 0,
      pendingCount: result?.pendingCount || 0
    });
  } catch (error) {
    saveUpdateLog('bets', 'error', { 
      message: 'Scheduled bet results update failed',
      error: error.message
    });
    
    // 에러 발생 시 5분 후 재시도
    setTimeout(async () => {
      try {
        saveUpdateLog('bets', 'start', { message: 'Retrying scheduled bet results update', isRetry: true });
        const retryResult = await betResultService.updateBetResults();
        saveUpdateLog('bets', 'success', { 
          message: 'Scheduled bet results retry successful',
          updatedCount: retryResult?.updatedCount || 0,
          isRetry: true
        });
      } catch (retryError) {
        saveUpdateLog('bets', 'error', { 
          message: 'Scheduled bet results retry failed',
          error: retryError.message,
          isRetry: true
        });
      }
    }, 5 * 60 * 1000); // 5분
  }
});

// 전체 데이터 업데이트 - 하루에 한 번만 (비용 절약)
cron.schedule('0 6 * * *', async () => {
  saveUpdateLog('full', 'start', { 
    message: 'Starting daily full data update',
    includesOdds: true,
    includesResults: true,
    includesBets: true
  });
  
  try {
    // 모든 카테고리에 대해 한 번에 업데이트
    const [oddsResult, resultsResult] = await Promise.all([
      oddsApiService.fetchAndCacheOdds(),
      gameResultService.fetchAndUpdateResults()
    ]);
    
    // 배팅 결과 업데이트
    const betResult = await betResultService.updateBetResults();
    
    lastUpdateTime = new Date();
    saveUpdateLog('full', 'success', { 
      message: 'Daily full update completed',
      oddsUpdated: 'All categories',
      resultsUpdated: resultsResult?.updatedCount || 'N/A',
      betsUpdated: betResult?.updatedCount || 0
    });
  } catch (error) {
    saveUpdateLog('full', 'error', { 
      message: 'Daily full update failed',
      error: error.message
    });
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
  saveUpdateLog('init', 'start', { 
    message: 'Starting initial data caching for active categories',
    categories: Array.from(activeCategories)
  });
  
  try {
    // 활성 카테고리만 초기 로드
    const [oddsResult, resultsResult] = await Promise.all([
      oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories)),
      gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories))
    ]);
    
    // 초기 배팅 결과 업데이트
    const betResult = await betResultService.updateBetResults();
    
    lastUpdateTime = new Date();
    saveUpdateLog('init', 'success', { 
      message: 'Initial data cached successfully for active categories',
      categories: Array.from(activeCategories),
      oddsUpdated: 'Active categories only',
      resultsUpdated: resultsResult?.updatedCount || 'N/A',
      betsUpdated: betResult?.updatedCount || 0
    });
  } catch (error) {
    saveUpdateLog('init', 'error', { 
      message: 'Initial data caching failed',
      error: error.message,
      categories: Array.from(activeCategories)
    });
    
    // 초기 데이터 로드 실패 시 2분 후 재시도
    setTimeout(async () => {
      try {
        saveUpdateLog('init', 'start', { message: 'Retrying initial data caching', isRetry: true });
        await Promise.all([
          oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories)),
          gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories))
        ]);
        await betResultService.updateBetResults();
        lastUpdateTime = new Date();
        saveUpdateLog('init', 'success', { message: 'Initial retry successful', isRetry: true });
      } catch (retryError) {
        saveUpdateLog('init', 'error', { message: 'Initial retry failed', error: retryError.message, isRetry: true });
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
    apiCallEstimate: `~${activeCategories.size * 2} calls per hour`, // 시간당 예상 API 호출 수
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  };
  
  saveUpdateLog('monitor', 'info', { 
    message: 'Scheduler status check',
    ...status
  });
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