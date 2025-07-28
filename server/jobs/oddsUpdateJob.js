import cron from 'node-cron';
import oddsApiService from '../services/oddsApiService.js';
import gameResultService from '../services/gameResultService.js';
import betResultService from '../services/betResultService.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { collectPremierLeagueData } from '../scripts/collectPremierLeagueData.js';

const execAsync = promisify(exec);

let isUpdating = false;
let lastUpdateTime = null;

// 리그별 우선순위 설정 (API 사용량 최적화)
const highPriorityCategories = new Set([
  'NBA', 'MLB', 'KBO', 'NFL', '프리미어리그' // 활발한 시즌 또는 높은 베팅 볼륨
]);

const mediumPriorityCategories = new Set([
  'MLS', 'KLEAGUE', 'JLEAGUE', 'SERIEA'
]);

const lowPriorityCategories = new Set([
  'BRASILEIRAO', 'ARGENTINA_PRIMERA', 'CSL', 'LALIGA', 'BUNDESLIGA'
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

// 경기 결과 업데이트 - 10분마다 실행
cron.schedule('*/10 * * * *', async () => {
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
    
    // 실제 업데이트 결과를 상세히 로그에 기록
    const gameResultsSummary = {
      totalUpdated: updateResult?.updatedCount || 0,
      newGames: updateResult?.newCount || 0,
      existingGamesUpdated: updateResult?.updatedExistingCount || 0,
      skippedGames: updateResult?.skippedCount || 0,
      categoriesProcessed: updateResult?.categories?.length || 0
    };
    
    saveUpdateLog('results', 'success', { 
      message: 'Game results and bet results update completed',
      gameResultsUpdated: gameResultsSummary.totalUpdated,
      gameResultsDetail: gameResultsSummary,
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
        const retryResult = await gameResultService.fetchAndUpdateResultsForCategories(Array.from(activeCategories));
        const betRetryResult = await betResultService.updateBetResults();
        lastUpdateTime = new Date();
        
        const retrySummary = {
          totalUpdated: retryResult?.updatedCount || 0,
          newGames: retryResult?.newCount || 0,
          existingGamesUpdated: retryResult?.updatedExistingCount || 0,
          skippedGames: retryResult?.skippedCount || 0
        };
        
        saveUpdateLog('results', 'success', { 
          message: 'Game results retry successful', 
          isRetry: true,
          gameResultsUpdated: retrySummary.totalUpdated,
          gameResultsDetail: retrySummary,
          betResultsUpdated: betRetryResult?.updatedCount || 0
        });
      } catch (retryError) {
        saveUpdateLog('results', 'error', { 
          message: 'Game results retry failed', 
          error: retryError.message, 
          isRetry: true 
        });
      } finally {
        isUpdating = false;
      }
    }, 10 * 60 * 1000); // 10분
  } finally {
    isUpdating = false;
  }
});

// 고우선순위 리그 - 30분마다 업데이트 (10분에서 변경)
cron.schedule('*/30 * * * *', async () => {
  saveUpdateLog('odds', 'start', { 
    message: 'Starting high-priority leagues odds update (30min interval)',
    priority: 'high',
    leagues: Array.from(highPriorityCategories)
  });
  
  try {
    // 동적 우선순위 확인
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    const actualPriority = dynamicPriority === 'high' ? 'high' : 'medium';
    
    let oddsUpdateResult;
    if (dynamicPriority === 'high') {
      // API 사용량이 높을 때는 고우선순위만
      oddsUpdateResult = await oddsApiService.fetchAndCacheOddsForCategories(Array.from(highPriorityCategories), 'high');
    } else {
      // 정상적일 때는 기존대로
      oddsUpdateResult = await oddsApiService.fetchAndCacheOddsForCategories(Array.from(highPriorityCategories), 'medium');
    }
    
    // 실제 업데이트 결과를 상세히 로그에 기록
    const oddsSummary = {
      totalUpdated: oddsUpdateResult?.updatedCount || 0,
      newOdds: oddsUpdateResult?.newCount || 0,
      existingOddsUpdated: oddsUpdateResult?.updatedExistingCount || 0,
      skippedOdds: oddsUpdateResult?.skippedCount || 0,
      apiCalls: oddsUpdateResult?.apiCalls || 0,
      categoriesProcessed: oddsUpdateResult?.categories?.length || 0
    };
    
    saveUpdateLog('odds', 'success', { 
      message: 'High-priority odds update completed (30min interval)',
      priority: actualPriority,
      leagues: Array.from(highPriorityCategories),
      dynamicPriority: dynamicPriority,
      oddsUpdated: oddsSummary.totalUpdated,
      oddsDetail: oddsSummary
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

// 중우선순위 리그 - 2시간마다 업데이트 (1시간에서 변경)
cron.schedule('0 */2 * * *', async () => {
  saveUpdateLog('odds', 'start', { 
    message: 'Starting medium-priority leagues odds update (2hour interval)',
    priority: 'medium',
    leagues: Array.from(mediumPriorityCategories)
  });
  
  try {
    // API 사용량이 높지 않을 때만 실행
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    if (dynamicPriority !== 'high') {
      const oddsUpdateResult = await oddsApiService.fetchAndCacheOddsForCategories(Array.from(mediumPriorityCategories), 'medium');
      
      // 실제 업데이트 결과를 상세히 로그에 기록
      const oddsSummary = {
        totalUpdated: oddsUpdateResult?.updatedCount || 0,
        newOdds: oddsUpdateResult?.newCount || 0,
        existingOddsUpdated: oddsUpdateResult?.updatedExistingCount || 0,
        skippedOdds: oddsUpdateResult?.skippedCount || 0,
        apiCalls: oddsUpdateResult?.apiCalls || 0,
        categoriesProcessed: oddsUpdateResult?.categories?.length || 0
      };
      
      saveUpdateLog('odds', 'success', { 
        message: 'Medium-priority odds update completed (2hour interval)',
        priority: 'medium',
        leagues: Array.from(mediumPriorityCategories),
        dynamicPriority: dynamicPriority,
        oddsUpdated: oddsSummary.totalUpdated,
        oddsDetail: oddsSummary
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

// 저우선순위 리그 - 24시간마다 업데이트 (시즌 오프 리그들)
cron.schedule('0 0 * * *', async () => {
  saveUpdateLog('odds', 'start', { 
    message: 'Starting low-priority leagues odds update (24hour interval)',
    priority: 'low',
    leagues: Array.from(lowPriorityCategories)
  });
  
  try {
    // API 사용량이 낮을 때만 실행
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    if (dynamicPriority === 'low') {
      await oddsApiService.fetchAndCacheOddsForCategories(Array.from(lowPriorityCategories), 'low');
      saveUpdateLog('odds', 'success', { 
        message: 'Low-priority odds update completed (24hour interval)',
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

// 스케줄러 상태 모니터링 - 30분마다 (15분에서 변경)
setInterval(() => {
  const status = {
    isUpdating,
    lastUpdateTime: lastUpdateTime ? lastUpdateTime.toISOString() : null,
    activeCategories: Array.from(activeCategories),
    uptime: process.uptime(),
    apiCallEstimate: `~${activeCategories.size * 2} calls per hour`,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  };
  
  saveUpdateLog('monitor', 'info', { 
    message: 'Scheduler status check',
    ...status
  });
}, 30 * 60 * 1000); // 30분

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
    const updated = await gameResultService.collectMissingGameResults();
    console.log(`[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 완료: ${updated}건 보충됨`);
  } catch (error) {
    console.error('[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 에러:', error);
  }
}, 60 * 60 * 1000); // 1시간마다

const getActiveCategories = () => Array.from(activeCategories);

// 🔒 보안 감사 작업 - 매일 새벽 3시에 실행
cron.schedule('0 3 * * *', async () => {
  saveUpdateLog('security_audit', 'start', { 
    message: 'Starting daily PaymentHistory security audit'
  });
  
  try {
    console.log('🔒 [Security Audit] 시작: PaymentHistory 무결성 검사');
    
    // PaymentHistory 감사 스크립트 실행
    const { stdout, stderr } = await execAsync('node scripts/auditPaymentHistory.js', {
      cwd: process.cwd()
    });
    
    // 출력 파싱
    const hasIssues = stdout.includes('❌ PaymentHistory 누락된 취소 베팅:') && 
                     !stdout.includes('❌ PaymentHistory 누락된 취소 베팅: 0개');
    
    if (hasIssues) {
      // 문제 발견 시 알림
      saveUpdateLog('security_audit', 'warning', { 
        message: 'PaymentHistory 무결성 문제 발견',
        details: stdout,
        requires_attention: true
      });
      
      console.log('🚨 [Security Audit] PaymentHistory 문제 발견! 수동 확인 필요');
      
      // 심각한 문제 시 이메일/슬랙 알림 추가 가능
      
    } else {
      saveUpdateLog('security_audit', 'success', { 
        message: 'PaymentHistory 무결성 검사 통과',
        details: '모든 취소된 베팅의 환불 기록이 정상적으로 존재'
      });
      
      console.log('✅ [Security Audit] PaymentHistory 무결성 검사 통과');
    }
    
  } catch (error) {
    saveUpdateLog('security_audit', 'error', { 
      message: 'PaymentHistory 보안 감사 실패',
      error: error.message,
      requires_attention: true
    });
    
    console.error('❌ [Security Audit] 보안 감사 실패:', error.message);
  }
});

// 🔒 긴급 보안 감사 작업 - 베팅 취소 후 5분마다 실행 (오후 6시-자정만)
cron.schedule('*/5 18-23 * * *', async () => {
  try {
    // 최근 5분 내에 취소된 베팅이 있는지 확인
    const { stdout } = await execAsync('node -e "import Bet from \'./models/betModel.js\'; import { Op } from \'sequelize\'; const recentCancelled = await Bet.count({ where: { status: \'cancelled\', updatedAt: { [Op.gte]: new Date(Date.now() - 5*60*1000) } } }); console.log(recentCancelled);"', {
      cwd: process.cwd()
    });
    
    const recentCancelledCount = parseInt(stdout.trim());
    
    if (recentCancelledCount > 0) {
      console.log(`🔍 [Emergency Audit] 최근 5분간 ${recentCancelledCount}개 베팅 취소됨, 긴급 감사 실행`);
      
      // 긴급 감사 실행
      const { stdout: auditResult } = await execAsync('node scripts/auditPaymentHistory.js', {
        cwd: process.cwd()
      });
      
      const hasIssues = auditResult.includes('❌ PaymentHistory 누락된 취소 베팅:') && 
                       !auditResult.includes('❌ PaymentHistory 누락된 취소 베팅: 0개');
      
      if (hasIssues) {
        saveUpdateLog('emergency_audit', 'critical', { 
          message: '긴급: 최근 취소된 베팅의 PaymentHistory 누락 감지',
          recentCancelledCount: recentCancelledCount,
          details: auditResult,
          requires_immediate_action: true
        });
        
        console.error('🚨 [Emergency Audit] 긴급 상황: PaymentHistory 누락 감지!');
      } else {
        console.log('✅ [Emergency Audit] 최근 취소 베팅들의 PaymentHistory 정상 확인');
      }
    }
    
  } catch (error) {
    // 긴급 감사 실패는 조용히 로깅 (너무 많은 알림 방지)
    console.log('⚠️ [Emergency Audit] 감사 실패:', error.message);
  }
});

// EPL 경기 결과/odds 별도 10분마다 강제 실행 (시즌중 여부 무관)
cron.schedule('*/10 * * * *', async () => {
  saveUpdateLog('epl', 'start', { message: 'EPL 프리미어리그 데이터 강제 업데이트' });
  try {
    await collectPremierLeagueData();
    saveUpdateLog('epl', 'success', { message: 'EPL 프리미어리그 데이터 업데이트 완료' });
  } catch (error) {
    saveUpdateLog('epl', 'error', { message: 'EPL 프리미어리그 데이터 업데이트 실패', error: error.message });
  }
});

// OddsHistory 정리 스케줄러 - 매일 새벽 4시에 실행
cron.schedule('0 4 * * *', async () => {
  saveUpdateLog('cleanup', 'start', { 
    message: 'Starting OddsHistory cleanup (7+ days old data)'
  });
  
  try {
    const { default: OddsHistory } = await import('../models/oddsHistoryModel.js');
    const { Op } = await import('sequelize');
    
    // 7일 이상 된 데이터 삭제
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deletedCount = await OddsHistory.destroy({
      where: {
        snapshotTime: {
          [Op.lt]: sevenDaysAgo
        }
      }
    });
    
    saveUpdateLog('cleanup', 'success', { 
      message: 'OddsHistory cleanup completed',
      deletedCount: deletedCount,
      cutoffDate: sevenDaysAgo.toISOString()
    });
    
    console.log(`🧹 [Cleanup] OddsHistory에서 ${deletedCount}개 레코드 삭제 완료 (7일 이상)`);
    
  } catch (error) {
    saveUpdateLog('cleanup', 'error', { 
      message: 'OddsHistory cleanup failed',
      error: error.message
    });
    
    console.error('❌ [Cleanup] OddsHistory 정리 실패:', error.message);
  }
});

export { getHealthStatus, updateActiveCategories, getActiveCategories }; 