import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

/**
 * 아르헨티나 프리메라 디비시온 2025 시즌 데이터 수집
 * 시즌 재개: 2025년 7월 12일
 * TheSportsDB 리그 ID: 4406
 */
async function collectArgentinaPrimera() {
  console.log('🇦🇷 아르헨티나 프리메라 디비시온 데이터 수집 시작...');
  
  const LEAGUE_ID = '4406';
  const SEASON = '2025';
  const MAIN_CATEGORY = 'soccer';
  const SUB_CATEGORY = 'ARGENTINA_PRIMERA';
  
  let insertCount = 0;
  let updateCount = 0;
  
  try {
    // 2025 시즌 경기 결과 가져오기
    const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${LEAGUE_ID}&s=${SEASON}`;
    console.log(`API 호출: ${url}`);
    
    const response = await axios.get(url);
    
    if (!response.data || !response.data.events) {
      console.log('❌ API 응답에 경기 데이터가 없습니다');
      return;
    }
    
    const events = response.data.events;
    console.log(`📊 총 ${events.length}개 경기 발견`);
    
    for (const event of events) {
      try {
        // 필수 데이터 검증
        if (!event.strHomeTeam || !event.strAwayTeam || !event.dateEvent) {
          console.log(`⚠️  필수 데이터 누락: ${event.strEvent || 'Unknown'}`);
          continue;
        }
        
        // 팀명 정규화
        const homeTeam = normalizeTeamName(event.strHomeTeam);
        const awayTeam = normalizeTeamName(event.strAwayTeam);
        
        // 경기 날짜 파싱
        const commenceTime = new Date(event.dateEvent + 'T' + (event.strTime || '00:00:00'));
        
        // 스코어 파싱 (완료된 경기만)
        let homeScore = null;
        let awayScore = null;
        let status = 'scheduled';
        let result = 'pending';
        
        if (event.intHomeScore !== null && event.intAwayScore !== null) {
          homeScore = parseInt(event.intHomeScore);
          awayScore = parseInt(event.intAwayScore);
          status = 'finished';
          
          // 결과 계산
          if (homeScore > awayScore) {
            result = 'home_win';
          } else if (awayScore > homeScore) {
            result = 'away_win';
          } else {
            result = 'draw';
          }
        } else if (event.strStatus === 'Match Finished' || event.strStatus === 'FT') {
          status = 'finished';
        } else if (event.strStatus === 'Postponed') {
          status = 'cancelled';
          result = 'cancelled';
        }
        
        // score 객체 생성 (기존 시스템 규칙에 맞게)
        const score = (homeScore !== null && awayScore !== null) ? JSON.stringify([
          { name: homeTeam, score: homeScore.toString() },
          { name: awayTeam, score: awayScore.toString() }
        ]) : null;
        
        // DB 저장/업데이트
        const [gameResult, created] = await GameResult.upsert({
          mainCategory: MAIN_CATEGORY,
          subCategory: SUB_CATEGORY,
          homeTeam,
          awayTeam,
          commenceTime,
          score,
          status,
          result,
          eventId: event.idEvent
        }, {
          where: {
            homeTeam,
            awayTeam,
            commenceTime
          }
        });
        
        if (created) {
          insertCount++;
          console.log(`✅ 새 경기 추가: ${homeTeam} vs ${awayTeam} (${commenceTime.toISOString().split('T')[0]})`);
        } else {
          updateCount++;
          console.log(`🔄 경기 업데이트: ${homeTeam} vs ${awayTeam} (${commenceTime.toISOString().split('T')[0]})`);
        }
        
      } catch (error) {
        console.error(`❌ 경기 처리 실패: ${event.strEvent}`, error.message);
      }
    }
    
    console.log('\n📈 아르헨티나 프리메라 디비시온 데이터 수집 완료!');
    console.log(`➕ 새로 추가된 경기: ${insertCount}개`);
    console.log(`🔄 업데이트된 경기: ${updateCount}개`);
    console.log(`📊 총 처리된 경기: ${insertCount + updateCount}개`);
    
    // 팀별 통계
    const teamStats = {};
    events.forEach(event => {
      if (event.strHomeTeam) {
        const homeTeam = normalizeTeamName(event.strHomeTeam);
        teamStats[homeTeam] = (teamStats[homeTeam] || 0) + 1;
      }
      if (event.strAwayTeam) {
        const awayTeam = normalizeTeamName(event.strAwayTeam);
        teamStats[awayTeam] = (teamStats[awayTeam] || 0) + 1;
      }
    });
    
    console.log('\n🏆 참가 팀 통계:');
    Object.entries(teamStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([team, count]) => {
        console.log(`  ${team}: ${count}경기`);
      });
    
  } catch (error) {
    console.error('❌ 아르헨티나 프리메라 디비시온 데이터 수집 실패:', error);
    throw error;
  }
}

// 직접 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectArgentinaPrimera()
    .then(() => {
      console.log('✅ 스크립트 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 스크립트 실패:', error);
      process.exit(1);
    });
}

export { collectArgentinaPrimera }; 