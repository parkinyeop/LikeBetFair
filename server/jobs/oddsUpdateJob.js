import cron from 'node-cron';
import oddsApiService from '../services/oddsApiService.js';
import oddsCleanupService from '../services/oddsCleanupService.js';
import gameResultService from '../services/gameResultService.js';
import betResultService from '../services/betResultService.js';
import ExchangeSettlementService from '../services/exchangeSettlementService.js';
import multibetSettlementService from '../services/multibetSettlementService.js';
import { cleanupOldLogs, getLogStats } from '../utils/logCleanup.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { collectPremierLeagueData } from '../scripts/collectPremierLeagueData.js';
import createScriptSequelize from '../config/scriptDatabase.js';
import GameResult from '../models/gameResultModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import { Op } from 'sequelize';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

const execAsync = promisify(exec);

let isUpdatingResults = false; // 경기 결과 업데이트 플래그
let isUpdatingOdds = false; // 배당률 업데이트 플래그
let lastUpdateTime = null;
let isInitializing = false; // 초기화 중복 실행 방지
let lastInitTime = null; // 마지막 초기화 시간

// ✅ 스마트 스케줄링: 효율성 추적 변수
let totalSchedulerRuns = 0;
let skippedRuns = 0;
let lastEfficiencyLog = Date.now();

// 💰 API 예산 최적화 스케줄러
// 월간 20,000 크레딧 한도 내 운영을 위한 최적화 적용
// 
// 📅 최적화된 스케줄러 일정:
// - 고우선순위: 4시간마다 (일 6회)
// - 중우선순위: 6시간마다 (일 4회)
// - 저우선순위: 24시간마다 (일 1회)
// - 경기 결과: 2시간마다 (일 12회)
// - Regions: us만 사용
// - 예상 비용: 17,370 크레딧/월 (86.9% 사용)

// 서버 시작 로그
console.log('🚀 [SCHEDULER_SYSTEM] Odds Update Scheduler Starting...');
console.log('🚀 [SCHEDULER_SYSTEM] Process ID:', process.pid);
console.log('🚀 [SCHEDULER_SYSTEM] Start Time:', new Date().toISOString());
console.log('🚀 [SCHEDULER_SYSTEM] Node Version:', process.version);
console.log('🚀 [SCHEDULER_SYSTEM] Environment:', process.env.NODE_ENV || 'development');
console.log('💰 [SCHEDULER_SYSTEM] API BUDGET OPTIMIZED - 17,370 CREDITS/MONTH (86.9%)');

// 🔧 데드락 방지: 서버 시작 시 플래그 강제 리셋
console.log(`[SCHEDULER_SYSTEM_FLAG] 🔧 Server startup - Force resetting flags to prevent deadlock`);
console.log(`[SCHEDULER_SYSTEM_FLAG] 🔧 Previous isUpdatingOdds: ${isUpdatingOdds}`);
console.log(`[SCHEDULER_SYSTEM_FLAG] 🔧 Previous isUpdatingResults: ${isUpdatingResults}`);
isUpdatingOdds = false;
isUpdatingResults = false;
console.log(`[SCHEDULER_SYSTEM_FLAG] ✅ Flags reset - isUpdatingOdds: ${isUpdatingOdds}, isUpdatingResults: ${isUpdatingResults}`);

// 스케줄러 상태 모니터링 및 효율성 리포팅 (30분마다)
setInterval(() => {
  console.log('[SCHEDULER_STATUS] 💓 isUpdatingOdds:', isUpdatingOdds);
  console.log('[SCHEDULER_STATUS] 💓 isUpdatingResults:', isUpdatingResults);

  // ✅ 효율성 리포팅
  const currentTime = Date.now();
  const timeSinceLastLog = (currentTime - lastEfficiencyLog) / (1000 * 60); // 분 단위

  if (timeSinceLastLog >= 30) { // 30분마다 효율성 리포트
    const efficiencyRate = totalSchedulerRuns > 0 ? ((skippedRuns / totalSchedulerRuns) * 100).toFixed(1) : 0;

    console.log('📊 [SCHEDULER_EFFICIENCY] 최적화 성과 리포트:');
    console.log(`   총 실행 횟수: ${totalSchedulerRuns}`);
    console.log(`   건너뛴 횟수: ${skippedRuns}`);
    console.log(`   효율성 개선율: ${efficiencyRate}%`);
    console.log(`   리소스 절약: CPU/DB 연결 ${efficiencyRate}% 절약`);

    // 로그 저장
    saveUpdateLog('scheduler_efficiency', 'report', {
      message: 'Scheduler efficiency report',
      totalRuns: totalSchedulerRuns,
      skippedRuns: skippedRuns,
      efficiencyRate: parseFloat(efficiencyRate),
      reportPeriod: `${timeSinceLastLog.toFixed(1)} minutes`
    });

    lastEfficiencyLog = currentTime;
  }
}, 30 * 60 * 1000); // 30분마다

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

// 로그 파일 크기 제한 (10MB)
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// 로그 파일 정리 함수 (분리된 로그 파일들 포함)
function cleanupLogFiles() {
  try {
    const files = fs.readdirSync(logsDir);
    files.forEach(file => {
      if ((file.startsWith('scheduler_') || file.startsWith('game_results_') || 
           file.startsWith('odds_data_') || file.startsWith('bet_results_')) && 
          file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.size > MAX_LOG_SIZE) {
          // 파일이 너무 크면 백업 후 새로 생성
          const backupPath = filePath + '.backup';
          fs.renameSync(filePath, backupPath);
          console.log(`📁 [LOG_CLEANUP] Log file ${file} backed up due to size limit`);
        }
      }
    });
  } catch (error) {
    console.error('❌ [LOG_CLEANUP] Error cleaning up log files:', error.message);
  }
}

// 로그 저장 함수 (최적화됨 + 타입별 분리)
function saveUpdateLog(type, status, data = {}) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  
  // 타입별 로그 파일 분리
  let logFileName;
  if (type === 'results') {
    logFileName = `game_results_${dateStr}.log`;
  } else if (type === 'odds') {
    logFileName = `odds_data_${dateStr}.log`;
  } else if (type === 'bets') {
    logFileName = `bet_results_${dateStr}.log`;
  } else {
    logFileName = `scheduler_${dateStr}.log`; // 기타 로그들
  }
  
  const logFile = path.join(logsDir, logFileName);
  
  // init 타입 로그 최적화 - 중복 방지
  if (type === 'init' && status === 'start') {
    // 마지막 초기화로부터 5분 이내면 로그 생략
    if (lastInitTime && (now - lastInitTime) < 5 * 60 * 1000) {
      console.log(`⏭️ Skipping init log (last init: ${Math.round((now - lastInitTime) / 1000)}s ago)`);
      return;
    }
    lastInitTime = now;
  }
  
  // 불필요한 데이터 제거
  const cleanData = { ...data };
  if (cleanData.categories && Array.isArray(cleanData.categories)) {
    cleanData.categoryCount = cleanData.categories.length;
    delete cleanData.categories; // 카테고리 배열 제거로 로그 크기 감소
  }
  
  const logEntry = {
    timestamp: now.toISOString(),
    type: type,
    status: status,
    ...cleanData
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logFile, logLine);
  
  // 콘솔 출력 최적화 - 스케줄러 검색 키워드 추가
  const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '🚀';
  const message = cleanData.message || '';
  const searchKeyword = `[SCHEDULER_${type.toUpperCase()}]`; // 검색용 키워드
  console.log(`${searchKeyword} ${emoji} [${now.toISOString()}] ${type.toUpperCase()} ${status.toUpperCase()}: ${message}`);
}

// 타임아웃 래퍼 함수
function withTimeout(promise, timeoutMs, operationName) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// 경기 결과 업데이트 - 10분마다 실행 (✅ TheSportsDB 무료 API 사용)
cron.schedule('*/10 * * * *', async () => {
  console.log('[SCHEDULER_RESULTS] 🚀 Starting game results update at:', new Date().toISOString());
  
  if (isUpdatingResults) {
    console.log('[SCHEDULER_RESULTS] ⏭️ Previous game results update is still running, skipping this update');
    return;
  }

  saveUpdateLog('results', 'start', { message: 'Starting cost-efficient game results update', categories: Array.from(activeCategories) });
  isUpdatingResults = true;

  try {
    // ✨ The Odds API scores로 경기 결과 업데이트 (3일치 - API 제한)
    const updateResults = await withTimeout(
      gameResultService.fetchAndSaveAllResults(),  // ✅ TheSportsDB 메서드
      10 * 60 * 1000, // 10분
      'Game results update'
    );
    
    // ✨ 결과 집계 (상세 정보 추가) - 단일 객체 처리
    const updateResult = {
      updatedCount: updateResults.updatedCount || 0,
      newCount: updateResults.newCount || 0,
      updatedExistingCount: updateResults.updatedExistingCount || 0,
      skippedCount: updateResults.skippedCount || 0,
      categories: updateResults.categories || [],
      // 상세 정보
      sportsDBAPIProvided: updateResults.sportsDBAPIProvided || 0,
      saved: updateResults.saved || 0,
      updated: updateResults.updated || 0,
      savedGames: updateResults.savedGames || [],
      skippedGames: updateResults.skippedGames || []
    };
    
    // --- ✅ 효율성 최적화: 경기 결과 업데이트가 있을 때만 베팅 정산 실행 ---
    if (updateResult?.updatedCount > 0) {
      console.log(`[SCHEDULER_BETS] 🎯 ${updateResult.updatedCount}개 경기 결과 업데이트됨 - 베팅 정산 진행`);
      saveUpdateLog('bets', 'start', {
        message: 'Starting bet results update after game results',
        gameUpdates: updateResult.updatedCount
      });

      const betUpdateResult = await withTimeout(
        betResultService.updateBetResults(),
        2 * 60 * 1000, // 2분
        'Bet results update'
      );
    } else {
      console.log('[SCHEDULER_BETS] ⚡ 경기 결과 업데이트 없음 - 베팅 정산 건너뛰기');
      saveUpdateLog('bets', 'skipped', {
        message: 'Bet results update skipped (효율성 최적화)',
        reason: 'No game results updated'
      });

      // betUpdateResult를 빈 결과로 설정
      var betUpdateResult = { updatedCount: 0, errorCount: 0, skipped: true };
    }
    
    lastUpdateTime = new Date();
    
    // ✨ 실제 업데이트 결과를 상세히 로그에 기록 (개선됨)
    const gameResultsSummary = {
      totalUpdated: updateResult?.updatedCount || 0,
      newGames: updateResult?.newCount || 0,
      existingGamesUpdated: updateResult?.updatedExistingCount || 0,
      skippedGames: updateResult?.skippedCount || 0,
      categoriesProcessed: updateResult?.categories?.length || 0,
      // ✨ 새로운 상세 정보
      sportsDBAPIProvided: updateResult?.sportsDBAPIProvided || 0,
      saved: updateResult?.saved || 0,
      updated: updateResult?.updated || 0,
      savedGames: updateResult?.savedGames || [],
      skippedGames: updateResult?.skippedGames || []
    };
    
    console.log('[SCHEDULER_RESULTS] ✅ Game results and bet results update completed:');
    console.log('[SCHEDULER_RESULTS]   - SportsDB Provided:', gameResultsSummary.sportsDBAPIProvided);
    console.log('[SCHEDULER_RESULTS]   - Saved:', gameResultsSummary.saved);
    console.log('[SCHEDULER_RESULTS]   - Updated:', gameResultsSummary.updated);
    console.log('[SCHEDULER_RESULTS]   - Skipped:', gameResultsSummary.skippedGames);
    console.log('[SCHEDULER_RESULTS]   - Total Updated:', gameResultsSummary.totalUpdated);
    console.log('[SCHEDULER_RESULTS]   - Bet Results Updated:', betUpdateResult?.updatedCount || 0);
    
    if (gameResultsSummary.savedGames.length > 0) {
      console.log('[SCHEDULER_RESULTS] 💾 Saved Games (first 5):');
      gameResultsSummary.savedGames.slice(0, 5).forEach(g => console.log(`[SCHEDULER_RESULTS]     - ${g}`));
    }
    
    // ✨ Bet Results 상세 정보 추가
    const betResultsSummary = {
      pendingBetsChecked: betUpdateResult?.pendingBetsChecked || 0,
      settled: betUpdateResult?.settled || 0,
      failed: betUpdateResult?.failed || 0,
      stillPending: betUpdateResult?.stillPending || 0,
      skipped: betUpdateResult?.skipped || false
    };
    
    if (!betResultsSummary.skipped) {
      console.log('[SCHEDULER_BETS] 📊 Bet Results Summary:');
      console.log('[SCHEDULER_BETS]   - Pending Bets Checked:', betResultsSummary.pendingBetsChecked);
      console.log('[SCHEDULER_BETS]   - Settled:', betResultsSummary.settled);
      console.log('[SCHEDULER_BETS]   - Failed:', betResultsSummary.failed);
      console.log('[SCHEDULER_BETS]   - Still Pending:', betResultsSummary.stillPending);
    }
    
    saveUpdateLog('results', 'success', { 
      message: 'Game results and bet results update completed',
      gameResultsUpdated: gameResultsSummary.totalUpdated,
      gameResultsDetail: gameResultsSummary,
      betResultsUpdated: betUpdateResult?.updatedCount || 0,
      betResultsDetail: betResultsSummary,
      categories: Array.from(activeCategories)
    });
    
  } catch (error) {
    console.log('[SCHEDULER_RESULTS] ❌ Game results update failed:', error.message);
    
    saveUpdateLog('results', 'error', { 
      message: 'Game results update failed',
      error: error.message,
      categories: Array.from(activeCategories)
    });
    
    // 에러 발생 시 15분 후 재시도 (비용 절약을 위해 재시도 간격 증가)
    setTimeout(async () => {
      try {
        saveUpdateLog('results', 'start', { message: 'Retrying game results update', isRetry: true });
        const retryResults = await withTimeout(
          gameResultService.fetchAndSaveAllResults(),  // ✅ TheSportsDB 메서드
          10 * 60 * 1000, // 10분
          'Game results retry'
        );
        
        const retryResult = {
          updatedCount: retryResults.updatedCount || 0,
          newCount: retryResults.newCount || 0,
          updatedExistingCount: retryResults.updatedExistingCount || 0,
          skippedCount: retryResults.skippedCount || 0
        };

        // --- ✅ 효율성 최적화: 재시도에서도 경기 결과 업데이트가 있을 때만 베팅 정산 실행 ---
        let betRetryResult;
        if (retryResult?.updatedCount > 0) {
          console.log(`[SCHEDULER_RETRY] 🎯 재시도에서 ${retryResult.updatedCount}개 경기 결과 업데이트됨 - 베팅 정산 진행`);
          betRetryResult = await withTimeout(
            betResultService.updateBetResults(),
            2 * 60 * 1000,
            'Bet results retry'
          );
        } else {
          console.log('[SCHEDULER_RETRY] ⚡ 재시도에서 경기 결과 업데이트 없음 - 베팅 정산 건너뛰기');
          betRetryResult = { updatedCount: 0, errorCount: 0, skipped: true };
        }
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
        isUpdatingResults = false;
      }
    }, 15 * 60 * 1000); // 15분
  } finally {
    isUpdatingResults = false;
  }
});

// 💰 API 예산 최적화 - 고우선순위 리그
// 고우선순위 리그 - 4시간마다 업데이트 (예산 최적화)
cron.schedule('0 */4 * * *', async () => {
  console.log('[SCHEDULER_ODDS] 🔔 Cron job triggered at:', new Date().toISOString());
  
  if (isUpdatingOdds) {
    console.log('[SCHEDULER_ODDS] ⏭️ Previous odds update is still running, skipping this update');
    console.log('[SCHEDULER_ODDS] ⏭️ isUpdatingOdds flag is:', isUpdatingOdds);
    saveUpdateLog('odds', 'skip', { 
      message: 'Previous odds update still running, skipping',
      reason: 'isUpdatingOdds flag is true'
    });
    return;
  }
  
  // 안전장치: 20분 이상 실행 중이면 강제 리셋
  const updateStartTime = Date.now();
  const maxUpdateTime = 20 * 60 * 1000; // 20분
  
  // 타임아웃 설정
  const timeoutId = setTimeout(() => {
    console.log('[SCHEDULER_ODDS] ⚠️ Odds update timeout detected, forcing reset');
    console.log(`[SCHEDULER_ODDS_FLAG] ⚠️ Forcing isUpdatingOdds to false due to timeout. Previous value: ${isUpdatingOdds}`);
    isUpdatingOdds = false;
  }, maxUpdateTime);
  
  // 플래그 설정 직전/직후 로그 추가
  console.log(`[SCHEDULER_ODDS_FLAG] 🟢 Setting isUpdatingOdds to true. Previous value: ${isUpdatingOdds}`);
  isUpdatingOdds = true;
  console.log('[SCHEDULER_ODDS] 🚀 Starting high-priority leagues odds update (30min interval)');
  console.log('[SCHEDULER_ODDS] 📋 Target leagues:', Array.from(highPriorityCategories));
  saveUpdateLog('odds', 'start', { 
    message: 'Starting high-priority leagues odds update (30min interval)',
    priority: 'high',
    leagues: Array.from(highPriorityCategories)
  });
  
  try {
    // 동적 우선순위 확인
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    const actualPriority = dynamicPriority === 'high' ? 'high' : 'medium';
    
    console.log('[SCHEDULER_ODDS] 🔍 Dynamic priority level:', dynamicPriority);
    console.log('[SCHEDULER_ODDS] 🎯 Actual priority level:', actualPriority);
    
    let oddsUpdateResult;
    console.log('[SCHEDULER_ODDS] 🔧 About to call fetchAndCacheOddsForCategories with:', Array.from(highPriorityCategories));
    console.log('[SCHEDULER_ODDS] 🔧 oddsApiService type:', typeof oddsApiService);
    console.log('[SCHEDULER_ODDS] 🔧 fetchAndCacheOddsForCategories type:', typeof oddsApiService.fetchAndCacheOddsForCategories);
    
    // 15분 타임아웃 설정
    if (dynamicPriority === 'high') {
      // API 사용량이 높을 때는 고우선순위만
      console.log('[SCHEDULER_ODDS] ⚠️ High API usage detected, processing high-priority leagues only');
      oddsUpdateResult = await withTimeout(
        oddsApiService.fetchAndCacheOddsForCategories(Array.from(highPriorityCategories), 'high'),
        15 * 60 * 1000, // 15분
        'High-priority odds update'
      );
    } else {
      // 정상적일 때는 기존대로
      console.log('[SCHEDULER_ODDS] ✅ Normal API usage, processing all high-priority leagues');
      console.log('[SCHEDULER_ODDS] 🔧 Calling fetchAndCacheOddsForCategories...');
      oddsUpdateResult = await withTimeout(
        oddsApiService.fetchAndCacheOddsForCategories(Array.from(highPriorityCategories), 'medium'),
        15 * 60 * 1000, // 15분
        'High-priority odds update'
      );
      console.log('[SCHEDULER_ODDS] 🔧 fetchAndCacheOddsForCategories returned:', oddsUpdateResult);
    }
    
    // ✨ 실제 업데이트 결과를 상세히 로그에 기록 (개선됨)
    const oddsSummary = {
      totalUpdated: oddsUpdateResult?.updatedCount || 0,
      newOdds: oddsUpdateResult?.newCount || 0,
      existingOddsUpdated: oddsUpdateResult?.updatedExistingCount || 0,
      skippedOdds: oddsUpdateResult?.skippedCount || 0,
      apiCalls: oddsUpdateResult?.apiCalls || 0,
      categoriesProcessed: oddsUpdateResult?.categories?.length || 0,
      // ✨ 새로운 상세 정보
      oddsAPIProvided: oddsUpdateResult?.oddsAPIProvided || 0,  // OddsAPI가 제공한 총 경기 수
      filteredOut: oddsUpdateResult?.filteredOut || 0,          // 시간 필터로 제외된 경기
      duplicatesRemoved: oddsUpdateResult?.duplicatesRemoved || 0,  // 중복 제거된 경기
      validationFailed: oddsUpdateResult?.validationFailed || 0,    // 검증 실패 경기
      saved: oddsUpdateResult?.saved || 0,                      // 실제 저장된 경기
      savedGames: oddsUpdateResult?.savedGames || [],           // 저장된 경기 목록 (간략)
      skippedGames: oddsUpdateResult?.skippedGames || []        // 건너뛴 경기 목록 (간략)
    };
    
    console.log('[SCHEDULER_ODDS] 📊 Update Summary:');
    console.log('[SCHEDULER_ODDS]   - OddsAPI Provided:', oddsSummary.oddsAPIProvided);
    console.log('[SCHEDULER_ODDS]   - Filtered Out:', oddsSummary.filteredOut);
    console.log('[SCHEDULER_ODDS]   - Duplicates Removed:', oddsSummary.duplicatesRemoved);
    console.log('[SCHEDULER_ODDS]   - Validation Failed:', oddsSummary.validationFailed);
    console.log('[SCHEDULER_ODDS]   - Saved:', oddsSummary.saved);
    console.log('[SCHEDULER_ODDS]   - Total Updated:', oddsSummary.totalUpdated);
    console.log('[SCHEDULER_ODDS]   - New Odds:', oddsSummary.newOdds);
    console.log('[SCHEDULER_ODDS]   - Existing Updated:', oddsSummary.existingOddsUpdated);
    console.log('[SCHEDULER_ODDS]   - Skipped:', oddsSummary.skippedOdds);
    console.log('[SCHEDULER_ODDS]   - API Calls:', oddsSummary.apiCalls);
    console.log('[SCHEDULER_ODDS]   - Categories Processed:', oddsSummary.categoriesProcessed);
    
    if (oddsSummary.savedGames.length > 0) {
      console.log('[SCHEDULER_ODDS] 💾 Saved Games (first 5):');
      oddsSummary.savedGames.slice(0, 5).forEach(g => console.log(`[SCHEDULER_ODDS]     - ${g}`));
    }
    
    if (oddsSummary.skippedGames.length > 0) {
      console.log('[SCHEDULER_ODDS] ⏭️ Skipped Games (first 5):');
      oddsSummary.skippedGames.slice(0, 5).forEach(g => console.log(`[SCHEDULER_ODDS]     - ${g.game}: ${g.reason}`));
    }
    
    saveUpdateLog('odds', 'success', { 
      message: 'High-priority odds update completed (30min interval)',
      priority: actualPriority,
      leagues: Array.from(highPriorityCategories),
      dynamicPriority: dynamicPriority,
      oddsUpdated: oddsSummary.totalUpdated,
      oddsDetail: oddsSummary
    });
    
  } catch (error) {
    console.log('[SCHEDULER_ODDS] ❌ High-priority odds update failed:', error.message);
    console.log('[SCHEDULER_ODDS] ❌ Error stack:', error.stack);
    saveUpdateLog('odds', 'error', { 
      message: 'High-priority odds update failed',
      priority: 'high',
      leagues: Array.from(highPriorityCategories),
      error: error.message,
      errorStack: error.stack
    });
  } finally {
    clearTimeout(timeoutId); // 타임아웃 클리어
    // 플래그 해제 직전/직후 로그 추가
    console.log(`[SCHEDULER_ODDS_FLAG] 🔴 Setting isUpdatingOdds to false. Previous value: ${isUpdatingOdds}`);
    isUpdatingOdds = false;
    console.log('[SCHEDULER_ODDS] ✅ High-priority odds update process completed at:', new Date().toISOString());
    console.log(`[SCHEDULER_ODDS_FLAG] ✅ isUpdatingOdds flag is now: ${isUpdatingOdds}`);
  }
});

// 💰 API 예산 최적화 - 중우선순위 리그
// 중우선순위 리그 - 6시간마다 업데이트 (예산 최적화)
cron.schedule('0 */6 * * *', async () => {
  // 중복 실행 방지
  if (isUpdatingOdds) {
    console.log('[SCHEDULER_ODDS_MEDIUM] ⏭️ Previous odds update is still running, skipping medium-priority update');
    saveUpdateLog('odds', 'skip', { 
      message: 'Previous odds update still running, skipping medium-priority update',
      priority: 'medium',
      reason: 'isUpdatingOdds flag is true'
    });
    return;
  }
  
  saveUpdateLog('odds', 'start', { 
    message: 'Starting medium-priority leagues odds update (2hour interval)',
    priority: 'medium',
    leagues: Array.from(mediumPriorityCategories)
  });
  
  try {
    // API 사용량이 높지 않을 때만 실행
    const dynamicPriority = oddsApiService.getDynamicPriorityLevel();
    if (dynamicPriority !== 'high') {
      const oddsUpdateResult = await withTimeout(
        oddsApiService.fetchAndCacheOddsForCategories(Array.from(mediumPriorityCategories), 'medium'),
        10 * 60 * 1000, // 10분
        'Medium-priority odds update'
      );
      
      // 실제 업데이트 결과를 상세히 로그에 기록
      const oddsSummary = {
        totalUpdated: oddsUpdateResult?.updatedCount || 0,
        newOdds: oddsUpdateResult?.newCount || 0,
        existingOddsUpdated: oddsUpdateResult?.updatedExistingCount || 0,
        skippedOdds: oddsUpdateResult?.skippedCount || 0,
        apiCalls: oddsUpdateResult?.apiCalls || 0,
        categoriesProcessed: oddsUpdateResult?.categories?.length || 0
      };
      
      console.log('[SCHEDULER_ODDS] 📊 Medium-priority Update Summary:');
      console.log('[SCHEDULER_ODDS]   - Total Updated:', oddsSummary.totalUpdated);
      console.log('[SCHEDULER_ODDS]   - New Odds:', oddsSummary.newOdds);
      console.log('[SCHEDULER_ODDS]   - Existing Updated:', oddsSummary.existingOddsUpdated);
      console.log('[SCHEDULER_ODDS]   - Skipped:', oddsSummary.skippedOdds);
      console.log('[SCHEDULER_ODDS]   - API Calls:', oddsSummary.apiCalls);
      console.log('[SCHEDULER_ODDS]   - Categories Processed:', oddsSummary.categoriesProcessed);
      
      saveUpdateLog('odds', 'success', { 
        message: 'Medium-priority odds update completed (2hour interval)',
        priority: 'medium',
        leagues: Array.from(mediumPriorityCategories),
        dynamicPriority: dynamicPriority,
        oddsUpdated: oddsSummary.totalUpdated,
        oddsDetail: oddsSummary
      });
    } else {
      console.log('[SCHEDULER_ODDS] ⚠️ Skipping medium-priority update due to high API usage');
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

// 🚫 TEMPORARILY DISABLED - 500K API LIMIT RESPONSE
// 저우선순위 리그 - 24시간마다 업데이트 (원래 코드)
// cron.schedule('0 0 * * *', async () => {
//   // ... 기존 코드 전체 주석 처리 ...
// });

// ✅ 저우선순위 리그 - 매일 자정에 업데이트 (활성화)
cron.schedule('0 0 * * *', async () => {
  // 중복 실행 방지
  if (isUpdatingOdds) {
    console.log('[SCHEDULER_ODDS_LOW] ⏭️ Previous odds update is still running, skipping low-priority update');
    saveUpdateLog('odds_low', 'skip', {
      message: 'Previous odds update still running, skipping low-priority update',
      priority: 'low',
      reason: 'isUpdatingOdds flag is true'
    });
    return;
  }
  
  saveUpdateLog('odds_low', 'start', {
    message: 'Starting low-priority leagues odds update (daily)',
    priority: 'low',
    leagues: Array.from(lowPriorityCategories)
  });

  try {
    const oddsUpdateResult = await withTimeout(
      oddsApiService.fetchAndCacheOddsForCategories(Array.from(lowPriorityCategories), 'low'),
      15 * 60 * 1000, // 15분 타임아웃
      'Low-priority odds update'
    );

    const oddsSummary = {
      totalUpdated: oddsUpdateResult?.updatedCount || 0,
      newOdds: oddsUpdateResult?.newCount || 0,
      existingOddsUpdated: oddsUpdateResult?.updatedExistingCount || 0,
      skippedOdds: oddsUpdateResult?.skippedCount || 0,
      apiCalls: oddsUpdateResult?.apiCalls || 0,
      categoriesProcessed: oddsUpdateResult?.categories?.length || 0
    };

    console.log('[SCHEDULER_LOW] 📊 Low-priority Update Summary:');
    console.log('[SCHEDULER_LOW]   - Total Updated:', oddsSummary.totalUpdated);
    console.log('[SCHEDULER_LOW]   - New Odds:', oddsSummary.newOdds);
    console.log('[SCHEDULER_LOW]   - Existing Updated:', oddsSummary.existingOddsUpdated);
    console.log('[SCHEDULER_LOW]   - Skipped:', oddsSummary.skippedOdds);
    console.log('[SCHEDULER_LOW]   - API Calls:', oddsSummary.apiCalls);
    console.log('[SCHEDULER_LOW]   - Categories Processed:', oddsSummary.categoriesProcessed);

    saveUpdateLog('odds_low', 'success', {
      message: 'Low-priority odds update completed',
      priority: 'low',
      leagues: Array.from(lowPriorityCategories),
      oddsUpdated: oddsSummary.totalUpdated,
      oddsDetail: oddsSummary
    });

  } catch (error) {
    console.error('[SCHEDULER_LOW] ❌ Error:', error.message);
    saveUpdateLog('odds_low', 'error', {
      message: 'Low-priority odds update failed',
      priority: 'low',
      leagues: Array.from(lowPriorityCategories),
      error: error.message
    });
  }
});

// 🚫 TEMPORARILY DISABLED - 500K API LIMIT RESPONSE
// 전체 데이터 업데이트 - 하루에 한 번만 (비용 절약) (원래 코드)
// cron.schedule('0 6 * * *', async () => {
//   // ... 기존 코드 전체 주석 처리 ...
// });

// 🚫 TEMPORARILY DISABLED - ORIGINAL SCHEDULER RESTORED
// 전체 데이터 업데이트 - 하루에 한 번만 (원래 코드)
// cron.schedule('0 6 */3 * *', async () => {
//   saveUpdateLog('full_temp', 'start', { 
//     message: 'Starting TEMPORARY full data update (3day interval - 500K limit)',
//     includesOdds: true,
//     includesResults: true,
//     includesBets: true,
//       note: 'Temporary scheduler due to 500K API limit'
//   });
//   
//   try {
//     // 모든 카테고리에 대해 한 번에 업데이트 (20분 타임아웃 - 임시)
//     const [oddsResult, resultsResult] = await withTimeout(
//       Promise.all([
//         oddsApiService.fetchAndCacheOdds(),
//         gameResultCount: Array.from(activeCategories).length
//       ]),
//       20 * 60 * 1000, // 20분
//       'Temporary daily full update'
//     );
//     
//     // 배팅 결과 업데이트 (3분 타임아웃 - 임시)
//     const betResult = await withTimeout(
//       betResultService.updateBetResults(),
//       3 * 60 * 1000, // 3분
//       'Temporary daily bet results update'
//     );
//     
//     lastUpdateTime = new Date();
//     saveUpdateLog('full_temp', 'success', { 
//       message: 'Temporary full data update completed (3day interval)',
//       oddsUpdated: 'All categories',
//       resultsUpdated: resultsResult?.updatedCount || 'N/A',
//       betsUpdated: betResult?.updatedCount || 0,
//       note: 'Temporary scheduler due to 500K API limit'
//     });
//   } catch (error) {
//     saveUpdateLog('full_temp', 'error', { 
//       message: 'Temporary full data update failed',
//       error: error.message,
//       note: 'Temporary scheduler due to 500K API limit'
//     });
//   }
// });

// 데이터베이스 통계 - 매일 자정에 실행
cron.schedule('0 0 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting daily database statistics...`);
  
  try {
    const [gameStats, betStats] = await withTimeout(
      Promise.all([
        gameResultService.getDatabaseStats(),
        betResultService.getOverallBetStats()
      ]),
      5 * 60 * 1000, // 5분
      'Database statistics'
    );
    
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
  if (isInitializing) {
    console.log('Initialization already in progress, skipping...');
    return;
  }
  isInitializing = true;
  saveUpdateLog('init', 'start', { 
    message: 'Starting initial data caching for active categories',
    categories: Array.from(activeCategories)
  });
  
  try {
    // 활성 카테고리만 초기 로드 (20분 타임아웃)
    const oddsResult = await withTimeout(
      oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories)),
      20 * 60 * 1000, // 20분
      'Initial odds caching'
    );
    
    // ✨ The Odds API scores로 경기 결과 초기 로드 (3일치 - API 제한)
    const resultsResult = await withTimeout(
      gameResultService.fetchAndSaveAllResults(),  // ✅ TheSportsDB 메서드
      10 * 60 * 1000, // 10분
      'Initial game results loading'
    );
    
    // 초기 배팅 결과 업데이트 (3분 타임아웃)
    const betResult = await withTimeout(
      betResultService.updateBetResults(),
      3 * 60 * 1000, // 3분
      'Initial bet results update'
    );
    
    lastUpdateTime = new Date();
    
    // 결과 집계
    const totalResults = resultsResult.reduce((sum, r) => sum + (r.saved || 0) + (r.updated || 0), 0);
    
    // ✨ 상세 로그 정보 추가
    const oddsSummary = {
      totalUpdated: oddsResult?.updatedCount || 0,
      newOdds: oddsResult?.newCount || 0,
      existingOddsUpdated: oddsResult?.updatedExistingCount || 0,
      skippedOdds: oddsResult?.skippedCount || 0,
      apiCalls: oddsResult?.apiCalls || 0,
      categoriesProcessed: oddsResult?.categories?.length || 0,
      oddsAPIProvided: oddsResult?.oddsAPIProvided || 0,
      filteredOut: oddsResult?.filteredOut || 0,
      duplicatesRemoved: oddsResult?.duplicatesRemoved || 0,
      validationFailed: oddsResult?.validationFailed || 0,
      saved: oddsResult?.saved || 0,
      savedGames: oddsResult?.savedGames?.slice(0, 10) || [],
      skippedGames: oddsResult?.skippedGames?.slice(0, 10) || []
    };
    
    saveUpdateLog('init', 'success', { 
      message: 'Initial data cached successfully for active categories',
      categories: Array.from(activeCategories),
      oddsUpdated: oddsResult?.updatedCount || 0,
      resultsUpdated: totalResults || 0,
      betsUpdated: betResult?.updatedCount || 0,
      oddsDetail: oddsSummary  // ✨ 상세 정보 추가
    });
  } catch (error) {
    saveUpdateLog('init', 'error', { 
      message: 'Initial data caching failed',
      error: error.message,
      categories: Array.from(activeCategories)
    });
    
    // 초기 데이터 로드 실패 시 5분 후 재시도 (중복 방지)
    setTimeout(async () => {
      if (isInitializing) {
        console.log('Retry skipped - initialization already in progress');
        return;
      }
      try {
        saveUpdateLog('init', 'start', { message: 'Retrying initial data caching', isRetry: true });
        await withTimeout(
          oddsApiService.fetchAndCacheOddsForCategories(Array.from(activeCategories)),
          20 * 60 * 1000, // 20분
          'Initial odds retry'
        );
        await withTimeout(
          gameResultService.fetchAndSaveAllResults(),  // ✅ TheSportsDB 메서드
          10 * 60 * 1000, // 10분
          'Initial game results retry'
        );
        await withTimeout(
          betResultService.updateBetResults(),
          3 * 60 * 1000, // 3분
          'Initial bet results retry'
        );
        lastUpdateTime = new Date();
        saveUpdateLog('init', 'success', { message: 'Initial retry successful', isRetry: true });
      } catch (retryError) {
        saveUpdateLog('init', 'error', { message: 'Initial retry failed', error: retryError.message, isRetry: true });
      } finally {
        isInitializing = false;
      }
    }, 5 * 60 * 1000); // 5분
  }
};

// 서버 시작시 초기화 실행 (중복 방지)
if (!isInitializing) {
  initializeData();
}

// 스케줄러 상태 모니터링 - 1시간마다 (30분에서 변경)
setInterval(() => {
  const status = {
    isUpdatingResults,
    isUpdatingOdds,
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
  
  // 로그 파일 정리 (매번 실행)
  cleanupLogFiles();
}, 60 * 60 * 1000); // 1시간

// 헬스체크 엔드포인트용 함수
const getHealthStatus = () => {
  return {
    isUpdatingResults,
    isUpdatingOdds,
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

// TheSportsDB 결과 업데이트 스케줄러 (10분마다 - TheSportsDB 무료 API 사용)
setInterval(async () => {
  try {
    console.log('[Scheduler] TheSportsDB에서 경기 결과 업데이트 시작');
    await withTimeout(
      gameResultService.fetchAndSaveAllResults(),
      10 * 60 * 1000, // 10분
      'TheSportsDB results update'
    );
    console.log('[Scheduler] TheSportsDB에서 경기 결과 업데이트 완료');
  } catch (error) {
    console.error('[Scheduler] TheSportsDB 결과 업데이트 에러:', error);
  }
}, 10 * 60 * 1000); // 10분마다

// 배팅내역 기반 누락 경기 결과 자동 보충 (30분마다 - 더 자주 보충)
setInterval(async () => {
  try {
    console.log('[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 시작');
    const updated = await withTimeout(
      gameResultService.collectMissingGameResults(),
      5 * 60 * 1000, // 5분
      'Missing game results collection'
    );
    console.log(`[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 완료: ${updated}건 보충됨`);
  } catch (error) {
    console.error('[Scheduler] 배팅내역 기반 누락 경기 결과 자동 보충 에러:', error);
  }
}, 30 * 60 * 1000); // 30분마다

const getActiveCategories = () => Array.from(activeCategories);

// 🧹 로그 파일 자동 정리 - 매일 새벽 2시에 실행 (7일 이상 된 로그 삭제)
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('🧹 [LogCleanup] 오래된 로그 파일 정리 시작');
    
    // 로그 통계 확인
    const statsBefore = getLogStats();
    console.log(`[LogCleanup] 현재 로그: ${statsBefore.totalFiles}개 파일, ${statsBefore.totalSizeInMB} MB`);
    
    // 7일 이상 된 로그 삭제
    cleanupOldLogs(7);
    
    // 정리 후 통계
    const statsAfter = getLogStats();
    console.log(`[LogCleanup] 정리 후: ${statsAfter.totalFiles}개 파일, ${statsAfter.totalSizeInMB} MB`);
    
    saveUpdateLog('log_cleanup', 'success', {
      before: statsBefore,
      after: statsAfter,
      deletedFiles: statsBefore.totalFiles - statsAfter.totalFiles,
      freedSpace: `${(statsBefore.totalSize - statsAfter.totalSize) / 1024 / 1024} MB`
    });
  } catch (error) {
    console.error('🧹 [LogCleanup] 로그 정리 실패:', error);
    saveUpdateLog('log_cleanup', 'error', { error: error.message });
  }
});

// 🔒 보안 감사 작업 - 매일 새벽 3시에 실행
cron.schedule('0 3 * * *', async () => {
  saveUpdateLog('security_audit', 'start', { 
    message: 'Starting daily PaymentHistory security audit'
  });
  
  try {
    console.log('🔒 [Security Audit] 시작: PaymentHistory 무결성 검사');
    
    // 10분 타임아웃 설정
    await withTimeout(
      (async () => {
        const { default: PaymentHistory } = await import('../models/paymentHistoryModel.js');
        const { default: User } = await import('../models/userModel.js');
        
        // 사용자별 결제 내역 통계
        const userPaymentStats = await PaymentHistory.findAll({
          attributes: [
            'userId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'paymentCount'],
            [sequelize.fn('SUM', sequelize.cast(sequelize.col('amount'), 'DECIMAL(10,2)')), 'totalAmount']
          ],
          group: ['userId'],
          having: sequelize.literal('COUNT(id) > 10 OR SUM(CAST(amount AS DECIMAL(10,2))) > 1000000')
        });
        
        if (userPaymentStats.length > 0) {
          console.log('⚠️ [Security Audit] 의심스러운 결제 패턴 발견:', userPaymentStats.length, '명');
          saveUpdateLog('security_audit', 'warning', { 
            message: 'Suspicious payment patterns detected',
            suspiciousUsers: userPaymentStats.length,
            details: userPaymentStats.map(stat => ({
              userId: stat.userId,
              paymentCount: stat.dataValues.paymentCount,
              totalAmount: stat.dataValues.totalAmount
            }))
          });
        } else {
          console.log('✅ [Security Audit] 결제 내역 무결성 검사 통과');
          saveUpdateLog('security_audit', 'success', { 
            message: 'PaymentHistory integrity check passed'
          });
        }
      })(),
      10 * 60 * 1000, // 10분
      'Security audit'
    );
    
  } catch (error) {
    // 긴급 감사 실패는 조용히 로깅 (너무 많은 알림 방지)
    console.log('⚠️ [Emergency Audit] 감사 실패:', error.message);
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

// 🔄 Exchange 주문 자동 만료 처리 - 매 10분마다 실행
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('🔄 [Exchange] 만료된 주문 자동 취소 시작...');
    
    // Exchange 주문 만료 처리 실행 (직접 호출)
    const service = new ExchangeSettlementService();
    await service.cancelUnmatchedOrdersAtKickoff();
    
    console.log('✅ [Exchange] 만료된 주문 자동 취소 완료');
    
  } catch (error) {
    console.error('❌ [Exchange] 만료된 주문 자동 취소 실패:', error.message);
    
    // 오류 로그 저장
    saveUpdateLog('exchange_order_expiry', 'error', {
      message: 'Exchange 주문 자동 만료 처리 실패',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 Exchange 주문 자동 정산 처리 - 매 5분마다 실행 (효율성 최적화 적용)
cron.schedule('*/5 * * * *', async () => {
  totalSchedulerRuns++; // 효율성 추적

  try {
    console.log('🔍 [Exchange] 정산 필요성 검증 시작...');

    // --- ✅ 효율성 최적화: 정산 필요성 사전 검증 ---

    // 1. 최근 6분 내에 업데이트된 'finished' 상태의 경기 결과 확인
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    const recentFinishedGames = await GameResult.count({
      where: {
        status: 'finished',
        updatedAt: { [Op.gte]: sixMinutesAgo }
      }
    });

    // 2. 정산 대상 Exchange 주문 확인
    const pendingExchangeOrders = await ExchangeOrder.count({
      where: {
        status: { [Op.in]: ['matched', 'partially_matched'] },
        settledAt: null
      }
    });

    // 3. 효율성 체크: 신규 경기 결과도 없고 정산 대상 주문도 없으면 건너뛰기
    if (recentFinishedGames === 0 && pendingExchangeOrders === 0) {
      skippedRuns++; // 효율성 추적
      console.log('⚡ [Exchange] 정산 건너뛰기: 신규 경기 결과 없음, 정산 대상 주문 없음');
      saveUpdateLog('exchange_settlement', 'skipped', {
        message: 'Exchange 정산 건너뛰기 (효율성 최적화)',
        timestamp: new Date().toISOString(),
        reason: 'No recent game results and no pending orders',
        efficiency: {
          totalRuns: totalSchedulerRuns,
          skippedRuns: skippedRuns,
          efficiencyRate: ((skippedRuns / totalSchedulerRuns) * 100).toFixed(1)
        }
      });
      return;
    }

    console.log(`🎯 [Exchange] 정산 진행: 신규 경기 ${recentFinishedGames}개, 정산 대상 주문 ${pendingExchangeOrders}개`);

    // --- 기존 정산 로직 실행 ---

    // Exchange 개별 주문 자동 정산 실행 (직접 호출)
    const service = new ExchangeSettlementService();
    const individualResult = await service.settleAllConnectedOrders();
    console.log('✅ [Exchange] 개별 주문 자동 정산 완료:', individualResult);

    // 멀티배팅 주문 자동 정산 실행 (직접 호출)
    console.log('🎯 [Exchange] 멀티배팅 주문 자동 정산 시작...');
    const multibetResult = await multibetSettlementService.settleAllMultibetOrders();
    console.log('✅ [Exchange] 멀티배팅 주문 자동 정산 완료:', multibetResult);

    // 정산 결과 로그 저장 (최적화 정보 포함)
    saveUpdateLog('exchange_settlement', 'success', {
      message: 'Exchange 주문 자동 정산 완료 (개별 + 멀티배팅)',
      timestamp: new Date().toISOString(),
      individualOrders: individualResult,
      multibetOrders: multibetResult,
      optimization: {
        recentGames: recentFinishedGames,
        pendingOrders: pendingExchangeOrders,
        skipped: false
      }
    });

  } catch (error) {
    console.error('❌ [Exchange] 매칭된 주문 자동 정산 실패:', error.message);

    // 오류 로그 저장
    saveUpdateLog('exchange_settlement', 'error', {
      message: 'Exchange 주문 자동 정산 실패',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// EPL 경기 결과/odds 별도 30분마다 강제 실행 (10분에서 변경)
cron.schedule('*/30 * * * *', async () => {
  saveUpdateLog('epl', 'start', { message: 'EPL 프리미어리그 데이터 강제 업데이트' });
  try {
    await withTimeout(
      collectPremierLeagueData(),
      5 * 60 * 1000, // 5분
      'EPL data collection'
    );
    saveUpdateLog('epl', 'success', { message: 'EPL 프리미어리그 데이터 업데이트 완료' });
  } catch (error) {
    saveUpdateLog('epl', 'error', { message: 'EPL 프리미어리그 데이터 업데이트 실패', error: error.message });
  }
});

// OddsHistory 정리 스케줄러 - 매일 새벽 4시에 실행
cron.schedule('0 4 * * *', async () => {
  saveUpdateLog('cleanup', 'start', {
    message: 'Starting OddsHistory cleanup (3+ days old data)'
  });

  try {
    const { default: OddsHistory } = await import('../models/oddsHistoryModel.js');
    const { Op } = await import('sequelize');

    // 3일 이상 된 데이터 삭제 (5분 타임아웃)
    await withTimeout(
      (async () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const deletedCount = await OddsHistory.destroy({
          where: {
            snapshotTime: {
              [Op.lt]: threeDaysAgo
            }
          }
        });

        saveUpdateLog('cleanup', 'success', {
          message: 'OddsHistory cleanup completed',
          deletedCount: deletedCount,
          cutoffDate: threeDaysAgo.toISOString()
        });

        console.log(`🧹 [Cleanup] OddsHistory에서 ${deletedCount}개 레코드 삭제 완료 (3일 이상)`);
      })(),
      5 * 60 * 1000, // 5분
      'OddsHistory cleanup'
    );

  } catch (error) {
    saveUpdateLog('cleanup', 'error', {
      message: 'OddsHistory cleanup failed',
      error: error.message
    });

    console.error('❌ [Cleanup] OddsHistory 정리 실패:', error.message);
  }
});

// 🧹 OddsCache 오래된 데이터 정리 스케줄러 - 매일 새벽 5시에 실행
cron.schedule('0 5 * * *', async () => {
  saveUpdateLog('odds_cleanup', 'start', {
    message: 'Starting OddsCache old data cleanup'
  });

  try {
    // 5분 타임아웃으로 클린업 실행
    const cleanupResult = await withTimeout(
      oddsCleanupService.cleanupOldOdds(),
      5 * 60 * 1000, // 5분
      'OddsCache cleanup'
    );

    saveUpdateLog('odds_cleanup', 'success', {
      message: 'OddsCache cleanup completed',
      totalDeleted: cleanupResult.totalDeleted,
      breakdown: cleanupResult.breakdown,
      executionTime: cleanupResult.executionTime
    });

    console.log(`🧹 [OddsCleanup] 총 ${cleanupResult.totalDeleted}개 오래된 배당률 데이터 삭제 완료`);
    console.log(`   - 과거 경기 + 오래된 업데이트: ${cleanupResult.breakdown.abandonedPastGames}개`);
    console.log(`   - 너무 먼 미래 경기 (14일 초과): ${cleanupResult.breakdown.farFutureGames}개`);
    console.log(`   - 오래 업데이트 안 된 데이터 (7일 이상): ${cleanupResult.breakdown.staleData}개`);

  } catch (error) {
    saveUpdateLog('odds_cleanup', 'error', {
      message: 'OddsCache cleanup failed',
      error: error.message
    });

    console.error('❌ [OddsCleanup] 배당률 데이터 정리 실패:', error.message);
  }
});

// 프로세스 종료 감지
process.on('SIGTERM', () => {
  console.log('🛑 [SCHEDULER_SYSTEM] SIGTERM received, shutting down gracefully...');
  console.log('🛑 [SCHEDULER_SYSTEM] Process ID:', process.pid);
  console.log('🛑 [SCHEDULER_SYSTEM] Shutdown Time:', new Date().toISOString());
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 [SCHEDULER_SYSTEM] SIGINT received, shutting down gracefully...');
  console.log('🛑 [SCHEDULER_SYSTEM] Process ID:', process.pid);
  console.log('🛑 [SCHEDULER_SYSTEM] Shutdown Time:', new Date().toISOString());
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 [SCHEDULER_SYSTEM] Uncaught Exception:', error.message);
  console.error('💥 [SCHEDULER_SYSTEM] Error stack:', error.stack);
  console.error('💥 [SCHEDULER_SYSTEM] Process ID:', process.pid);
  console.error('💥 [SCHEDULER_SYSTEM] Error Time:', new Date().toISOString());
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [SCHEDULER_SYSTEM] Unhandled Rejection at:', promise);
  console.error('💥 [SCHEDULER_SYSTEM] Reason:', reason);
  console.error('💥 [SCHEDULER_SYSTEM] Process ID:', process.pid);
  console.error('💥 [SCHEDULER_SYSTEM] Error Time:', new Date().toISOString());
});

// 정기적인 생존 신호 (10분마다, 5분에서 변경)
setInterval(() => {
  console.log('💓 [SCHEDULER_SYSTEM] Heartbeat - Process alive');
  console.log('💓 [SCHEDULER_SYSTEM] PID:', process.pid);
  console.log('💓 [SCHEDULER_SYSTEM] Uptime:', Math.round(process.uptime()), 'seconds');
  console.log('💓 [SCHEDULER_SYSTEM] Memory:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
  console.log('💓 [SCHEDULER_SYSTEM] isUpdatingOdds:', isUpdatingOdds);
  console.log('💓 [SCHEDULER_SYSTEM] isUpdatingResults:', isUpdatingResults);
  console.log('💓 [SCHEDULER_SYSTEM] Time:', new Date().toISOString());
}, 10 * 60 * 1000); // 10분마다

export { getHealthStatus, updateActiveCategories, getActiveCategories }; 