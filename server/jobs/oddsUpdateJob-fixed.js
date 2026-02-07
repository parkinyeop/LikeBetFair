const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

let isUpdatingResults = false; // 경기 결과 업데이트 플래그
let isUpdatingOdds = false; // 배당률 업데이트 플래그
let lastUpdateTime = null;

// 서버 시작 로그
console.log('🚀 [SCHEDULER_SYSTEM] Odds Update Scheduler Starting...');
console.log('🚀 [SCHEDULER_SYSTEM] Process ID:', process.pid);
console.log('🚀 [SCHEDULER_SYSTEM] Start Time:', new Date().toISOString());
console.log('🚀 [SCHEDULER_SYSTEM] Node Version:', process.version);
console.log('🚀 [SCHEDULER_SYSTEM] Environment:', process.env.NODE_ENV || 'development');

// 스케줄러 상태 모니터링
setInterval(() => {
  console.log('[SCHEDULER_STATUS] 💓 isUpdatingOdds:', isUpdatingOdds);
  console.log('[SCHEDULER_STATUS] 💓 isUpdatingResults:', isUpdatingResults);
  console.log('[SCHEDULER_STATUS] 💓 Last Update Time:', lastUpdateTime);
}, 30 * 60 * 1000); // 30분마다

// 로그 디렉토리 생성
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 로그 파일 크기 제한 (10MB)
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// 로그 파일 정리 함수
function cleanupLogFiles() {
  try {
    const files = fs.readdirSync(logsDir);
    files.forEach(file => {
      if (file.startsWith('scheduler_') && file.endsWith('.log')) {
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
    console.error('📁 [LOG_CLEANUP] Error:', error.message);
  }
}

// 타임아웃 래퍼 함수
function withTimeout(promise, ms, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timeout after ${ms}ms`)), ms)
    )
  ]);
}

// 경기 결과 수집 함수
async function collectGameResults() {
  if (isUpdatingResults) {
    console.log('[Scheduler] 경기 결과 수집이 이미 진행 중입니다.');
    return;
  }
  
  isUpdatingResults = true;
  try {
    console.log('[Scheduler] 경기 결과 수집 시작...');
    
    // collectMissingLeagueResults 스크립트 실행
    const scriptPath = path.join(__dirname, '..', 'scripts', 'collectMissingLeagueResults-fixed-v3.js');
    if (fs.existsSync(scriptPath)) {
      console.log('[Scheduler] collectMissingLeagueResults 스크립트 실행 중...');
      const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, { 
        cwd: path.join(__dirname, '..'),
        timeout: 30 * 60 * 1000 // 30분 타임아웃
      });
      
      if (stdout) console.log('[Scheduler] 스크립트 출력:', stdout);
      if (stderr) console.error('[Scheduler] 스크립트 오류:', stderr);
      
      console.log('[Scheduler] collectMissingLeagueResults 스크립트 완료');
    } else {
      console.log('[Scheduler] collectMissingLeagueResults 스크립트를 찾을 수 없습니다.');
    }
    
    lastUpdateTime = new Date();
    console.log('[Scheduler] 경기 결과 수집 완료');
    
  } catch (error) {
    console.error('[Scheduler] 경기 결과 수집 중 오류:', error.message);
  } finally {
    isUpdatingResults = false;
  }
}

// 정산 실행 함수
async function executeSettlement() {
  try {
    console.log('[Scheduler] 정산 실행 시작...');
    
    // execute-settlement 스크립트 실행
    const scriptPath = path.join(__dirname, '..', 'execute-settlement.js');
    if (fs.existsSync(scriptPath)) {
      console.log('[Scheduler] execute-settlement 스크립트 실행 중...');
      const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, { 
        cwd: path.join(__dirname, '..'),
        timeout: 10 * 60 * 1000 // 10분 타임아웃
      });
      
      if (stdout) console.log('[Scheduler] 정산 스크립트 출력:', stdout);
      if (stderr) console.error('[Scheduler] 정산 스크립트 오류:', stderr);
      
      console.log('[Scheduler] execute-settlement 스크립트 완료');
    } else {
      console.log('[Scheduler] execute-settlement 스크립트를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('[Scheduler] 정산 실행 중 오류:', error.message);
  }
}

// 게임 매칭 실행 함수
async function executeGameMatching() {
  try {
    console.log('[Scheduler] 게임 매칭 실행 시작...');
    
    // fix-game-matching-v2 스크립트 실행
    const scriptPath = path.join(__dirname, '..', 'fix-game-matching-v2.js');
    if (fs.existsSync(scriptPath)) {
      console.log('[Scheduler] fix-game-matching-v2 스크립트 실행 중...');
      const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, { 
        cwd: path.join(__dirname, '..'),
        timeout: 15 * 60 * 1000 // 15분 타임아웃
      });
      
      if (stdout) console.log('[Scheduler] 매칭 스크립트 출력:', stdout);
      if (stderr) console.error('[Scheduler] 매칭 스크립트 오류:', stderr);
      
      console.log('[Scheduler] fix-game-matching-v2 스크립트 완료');
    } else {
      console.log('[Scheduler] fix-game-matching-v2 스크립트를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('[Scheduler] 게임 매칭 실행 중 오류:', error.message);
  }
}

// 스케줄러 설정
function setupSchedulers() {
  console.log('[Scheduler] 스케줄러 설정 시작...');
  
  // 1. 경기 결과 수집 (2시간마다)
  setInterval(async () => {
    try {
      console.log('[Scheduler] 경기 결과 수집 스케줄러 실행');
      await withTimeout(
        collectGameResults(),
        30 * 60 * 1000, // 30분
        'Game results collection'
      );
    } catch (error) {
      console.error('[Scheduler] 경기 결과 수집 스케줄러 오류:', error.message);
    }
  }, 2 * 60 * 60 * 1000); // 2시간마다
  
  // 2. 게임 매칭 (4시간마다)
  setInterval(async () => {
    try {
      console.log('[Scheduler] 게임 매칭 스케줄러 실행');
      await withTimeout(
        executeGameMatching(),
        15 * 60 * 1000, // 15분
        'Game matching'
      );
    } catch (error) {
      console.error('[Scheduler] 게임 매칭 스케줄러 오류:', error.message);
    }
  }, 4 * 60 * 60 * 1000); // 4시간마다
  
  // 3. 정산 실행 (1시간마다)
  setInterval(async () => {
    try {
      console.log('[Scheduler] 정산 실행 스케줄러 실행');
      await withTimeout(
        executeSettlement(),
        10 * 60 * 1000, // 10분
        'Settlement execution'
      );
    } catch (error) {
      console.error('[Scheduler] 정산 실행 스케줄러 오류:', error.message);
    }
  }, 1 * 60 * 60 * 1000); // 1시간마다
  
  // 4. 로그 정리 (24시간마다)
  setInterval(() => {
    try {
      console.log('[Scheduler] 로그 정리 스케줄러 실행');
      cleanupLogFiles();
    } catch (error) {
      console.error('[Scheduler] 로그 정리 스케줄러 오류:', error.message);
    }
  }, 24 * 60 * 60 * 1000); // 24시간마다
  
  console.log('[Scheduler] 모든 스케줄러 설정 완료');
}

// 서버 시작 시 즉시 실행
async function initializeScheduler() {
  try {
    console.log('[Scheduler] 초기화 시작...');
    
    // 초기 경기 결과 수집
    await collectGameResults();
    
    // 초기 게임 매칭
    await executeGameMatching();
    
    // 초기 정산 실행
    await executeSettlement();
    
    console.log('[Scheduler] 초기화 완료');
  } catch (error) {
    console.error('[Scheduler] 초기화 중 오류:', error.message);
  }
}

// 스케줄러 시작
function startScheduler() {
  console.log('[Scheduler] 스케줄러 시작...');
  
  // 스케줄러 설정
  setupSchedulers();
  
  // 초기화 실행
  initializeScheduler();
  
  console.log('[Scheduler] 스케줄러가 성공적으로 시작되었습니다!');
  console.log('[Scheduler] 다음 작업들:');
  console.log('  - 경기 결과 수집: 2시간마다');
  console.log('  - 게임 매칭: 4시간마다');
  console.log('  - 정산 실행: 1시간마다');
  console.log('  - 로그 정리: 24시간마다');
}

// 스케줄러 시작
startScheduler();

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
  console.log('[Scheduler] 프로세스 종료 신호 수신, 정리 중...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Scheduler] 프로세스 종료 신호 수신, 정리 중...');
  process.exit(0);
});

// 예상치 못한 오류 처리
process.on('uncaughtException', (error) => {
  console.error('[Scheduler] 예상치 못한 오류:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Scheduler] 처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});
