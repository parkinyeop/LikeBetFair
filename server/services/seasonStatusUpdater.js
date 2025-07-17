import fs from 'fs/promises';
import path from 'path';
import schedule from 'node-schedule';

/**
 * 시즌 상태를 config 파일에 업데이트
 */
async function updateSeasonStatus(sportKey, statusInfo) {
  try {
    const configPath = path.join(process.cwd(), 'config/sportsMapping.js');
    
    // 현재 설정 파일 읽기
    let configContent = await fs.readFile(configPath, 'utf8');
    
    // 해당 스포츠의 시즌 정보 찾기 및 업데이트
    const seasonKey = `'${sportKey}': {`;
    const seasonStartIndex = configContent.indexOf(seasonKey);
    
    if (seasonStartIndex === -1) {
      throw new Error(`설정에서 ${sportKey}를 찾을 수 없습니다`);
    }
    
    // 해당 섹션의 끝 찾기 (다음 '},' 또는 마지막 '}')
    let braceCount = 0;
    let sectionEndIndex = seasonStartIndex;
    let foundStart = false;
    
    for (let i = seasonStartIndex; i < configContent.length; i++) {
      if (configContent[i] === '{') {
        if (!foundStart) foundStart = true;
        braceCount++;
      } else if (configContent[i] === '}') {
        braceCount--;
        if (foundStart && braceCount === 0) {
          sectionEndIndex = i + 1;
          break;
        }
      }
    }
    
    // 새로운 시즌 정보 생성
    const newSeasonInfo = createSeasonInfoString(sportKey, statusInfo);
    
    // 설정 파일 업데이트
    const beforeSection = configContent.substring(0, seasonStartIndex);
    const afterSection = configContent.substring(sectionEndIndex);
    
    const updatedContent = beforeSection + newSeasonInfo + afterSection;
    
    // 파일 저장
    await fs.writeFile(configPath, updatedContent, 'utf8');
    
    console.log(`✅ ${sportKey} 시즌 상태 업데이트 완료: ${statusInfo.status}`);
    
    return true;
  } catch (error) {
    console.error(`❌ ${sportKey} 시즌 상태 업데이트 실패:`, error);
    throw error;
  }
}

/**
 * 새로운 시즌 정보 문자열 생성
 */
function createSeasonInfoString(sportKey, statusInfo) {
  const statusDescriptions = {
    'active': '진행 중',
    'break': '휴식기', 
    'offseason': '시즌오프'
  };
  
  const statusKorean = statusDescriptions[statusInfo.status] || statusInfo.status;
  const currentDate = new Date().toISOString().split('T')[0];
  
  // 기본 시즌 정보 템플릿
  let seasonInfo = `  '${sportKey}': {\n`;
  seasonInfo += `    name: '${getLeagueName(sportKey)}',\n`;
  seasonInfo += `    status: '${statusInfo.status}',\n`;
  seasonInfo += `    currentSeason: '${new Date().getFullYear()}',\n`;
  
  // 상태에 따른 추가 정보
  if (statusInfo.status === 'active') {
    seasonInfo += `    nextSeasonStart: '${new Date().getFullYear()}-03-01',\n`;
    seasonInfo += `    description: '${new Date().getFullYear()}시즌 ${statusKorean} (자동 감지: ${statusInfo.reason})'\n`;
  } else if (statusInfo.status === 'break') {
    seasonInfo += `    breakPeriod: { start: '${currentDate}', end: 'TBD' },\n`;
    seasonInfo += `    description: '시즌 중 ${statusKorean} (자동 감지: ${statusInfo.reason})'\n`;
  } else { // offseason
    seasonInfo += `    seasonEnd: '${currentDate}',\n`;
    seasonInfo += `    nextSeasonStart: 'TBD',\n`;
    seasonInfo += `    description: '${statusKorean} (자동 감지: ${statusInfo.reason})'\n`;
  }
  
  seasonInfo += `  },`;
  
  return seasonInfo;
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