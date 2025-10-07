import fs from 'fs/promises';
import path from 'path';
import schedule from 'node-schedule';
import { reloadSeasonSchedules } from '../config/sportsMapping.js';

/**
 * ✅ 시즌 상태를 JSON 파일에 안전하게 업데이트
 * - JavaScript 파일 대신 JSON 파일 수정 (구문 오류 위험 제거)
 * - 원자적 쓰기 (temp → rename)
 * - 자동 백업 생성
 * - 수동 오버라이드 존중
 */
async function updateSeasonStatus(sportKey, statusInfo) {
  try {
    const configPath = path.join(process.cwd(), 'server/config/seasonSchedules.json');
    
    // 1. 현재 설정 파일 읽기
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // 2. 수동 오버라이드 확인
    if (config[sportKey]?.manualOverride === true) {
      console.log(`⚠️ ${sportKey}: 수동 오버라이드 설정됨, 자동 업데이트 건너뜀`);
      return { skipped: true, reason: 'manual override' };
    }
    
    // 3. 백업 생성 (타임스탬프 포함)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = `${configPath}.backup.${timestamp}`;
    await fs.copyFile(configPath, backupPath);
    console.log(`📦 백업 생성: ${backupPath}`);
    
    // 4. 데이터 업데이트
    const oldStatus = config[sportKey]?.status || 'unknown';
    
    config[sportKey] = {
      ...config[sportKey],
      name: getLeagueName(sportKey),
      status: statusInfo.status,
      currentSeason: new Date().getFullYear().toString(),
      lastAutoUpdate: new Date().toISOString(),
      updateReason: statusInfo.reason,
      description: createDescription(statusInfo),
      manualOverride: false
    };
    
    // 메타데이터 업데이트
    config._metadata = {
      ...config._metadata,
      lastModified: new Date().toISOString(),
      modifiedBy: 'auto-updater',
      lastChange: `${sportKey}: ${oldStatus} → ${statusInfo.status}`
    };
    
    // 5. 원자적 쓰기 (temp → rename)
    const tmpPath = `${configPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(config, null, 2), 'utf8');
    await fs.rename(tmpPath, configPath);
    
    // 6. 변경 로그 기록
    await logSeasonChange(sportKey, oldStatus, statusInfo);
    
    // 7. 메모리 캐시 리로드
    reloadSeasonSchedules();
    
    console.log(`✅ ${sportKey} 시즌 상태 업데이트 완료: ${oldStatus} → ${statusInfo.status}`);
    
    return { 
      success: true, 
      sportKey, 
      oldStatus, 
      newStatus: statusInfo.status,
      reason: statusInfo.reason
    };
  } catch (error) {
    console.error(`❌ ${sportKey} 시즌 상태 업데이트 실패:`, error);
    throw error;
  }
}

/**
 * 시즌 변경 이력 로그 기록
 */
async function logSeasonChange(sportKey, oldStatus, statusInfo) {
  try {
    const logDir = path.join(process.cwd(), 'server/logs');
    const logPath = path.join(logDir, 'season-changes.log');
    
    // logs 디렉토리 없으면 생성
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (e) {
      // 이미 존재하면 무시
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      sportKey,
      oldStatus,
      newStatus: statusInfo.status,
      reason: statusInfo.reason,
      confidence: statusInfo.confidence || 'N/A',
      dataSource: statusInfo.dataSource || 'Unknown'
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logPath, logLine, 'utf8');
    
    console.log(`📝 변경 이력 기록: ${logPath}`);
  } catch (error) {
    console.error('❌ 변경 이력 기록 실패:', error);
    // 로그 실패는 치명적이지 않으므로 계속 진행
  }
}

/**
 * 상태 설명 생성
 */
function createDescription(statusInfo) {
  const statusDescriptions = {
    'active': '진행 중',
    'break': '휴식기',
    'offseason': '시즌오프'
  };
  
  const statusKorean = statusDescriptions[statusInfo.status] || statusInfo.status;
  const year = new Date().getFullYear();
  
  if (statusInfo.status === 'active') {
    return `${year}시즌 ${statusKorean} (자동 감지: ${statusInfo.reason})`;
  } else if (statusInfo.status === 'break') {
    return `시즌 중 ${statusKorean} (자동 감지: ${statusInfo.reason})`;
  } else {
    return `${statusKorean} (자동 감지: ${statusInfo.reason})`;
  }
}


/**
 * 스포츠 키에서 리그 이름 가져오기
 */
function getLeagueName(sportKey) {
  const leagueNames = {
    'soccer_japan_j_league': 'J리그',
    'soccer_china_superleague': '중국 슈퍼리그',
    'basketball_kbl': 'KBL',
    'americanfootball_nfl': 'NFL',
    'baseball_mlb': 'MLB',
    'baseball_kbo': 'KBO',
    'soccer_epl': '프리미어리그',
    'soccer_spain_la_liga': '라리가',
    'soccer_italy_serie_a': '세리에 A',
    'soccer_germany_bundesliga': '분데스리가',
    'soccer_france_ligue_one': '리그 1',
    'soccer_usa_mls': 'MLS',
    'soccer_brazil_serie_a': '브라질 세리에 A',
    'soccer_argentina_primera_division': '아르헨티나 프리메라',
    'basketball_nba': 'NBA'
  };
  
  return leagueNames[sportKey] || sportKey;
}

/**
 * 시즌 상태 체크 스케줄러 설정
 */
function setupSeasonStatusScheduler() {
  // 매일 오전 6시에 체크
  schedule.scheduleJob('0 6 * * *', async () => {
    console.log('🕕 일일 시즌 상태 체크 시작...');
    try {
      const { default: SeasonStatusChecker } = await import('./seasonStatusChecker.js');
      const checker = new SeasonStatusChecker();
      
      const results = await checker.checkAllLeagues();
      const changedLeagues = results.filter(r => r.changed);
      
      if (changedLeagues.length > 0) {
        console.log(`\n📝 시즌 상태 변경사항:`);
        changedLeagues.forEach(league => {
          console.log(`- ${league.league}: ${league.oldStatus} → ${league.newStatus}`);
          console.log(`  사유: ${league.reason}`);
        });
      } else {
        console.log('✅ 시즌 상태 변경사항 없음');
      }
    } catch (error) {
      console.error('❌ 시즌 상태 체크 실패:', error);
    }
  });
  
  console.log('⏰ 시즌 상태 자동 체크 스케줄러 설정 완료 (매일 오전 6시)');
}

export {
  updateSeasonStatus,
  setupSeasonStatusScheduler
}; 