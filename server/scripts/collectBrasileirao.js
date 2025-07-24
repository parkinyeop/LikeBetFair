import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

/**
 * 브라질 세리에 A 2025 시즌 데이터 수집
 * 시즌 재개: 2025년 7월 12일
 * TheSportsDB 리그 ID: 4351
 */
async function collectBrasileirao() {
  console.log('🇧🇷 브라질 세리에 A 데이터 수집 시작...');
  
  const LEAGUE_ID = '4351';
  const SEASON = '2025';
  const MAIN_CATEGORY = 'soccer';
  const SUB_CATEGORY = 'BRASILEIRAO';
  
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
    
    let insertCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    
    for (const event of events) {
      try {
        // 필수 데이터 검증
        if (!event.strHomeTeam || !event.strAwayTeam || !event.dateEvent) {
          console.log(`⚠️  필수 데이터 누락: ${event.strEvent || 'Unknown'}`);
          skipCount++;
          continue;
        }
        
        // 팀명 정규화
        const homeTeam = normalizeTeamName(event.strHomeTeam);
        const awayTeam = normalizeTeamName(event.strAwayTeam);
        
        // 경기 날짜 파싱
        const commenceTime = new Date(event.dateEvent + 'T' + (event.strTime || '00:00:00'));
        
        // 스코어 및 결과 파싱
        let score = null;
        let result = 'pending';
        let status = 'scheduled';
        
        if (event.intHomeScore !== null && event.intAwayScore !== null) {
          const homeScore = parseInt(event.intHomeScore);
          const awayScore = parseInt(event.intAwayScore);
          score = JSON.stringify([
            { name: homeTeam, score: homeScore.toString() },
            { name: awayTeam, score: awayScore.toString() }
          ]);
          status = 'finished';
          
          // 결과 판정
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
        
        // DB 저장/업데이트
        const [gameResult, created] = await GameResult.upsert({
          mainCategory: MAIN_CATEGORY,
          subCategory: SUB_CATEGORY,
          sportKey: 'soccer_brazil_campeonato', // 필수 필드 추가
          homeTeam,
          awayTeam,
          commenceTime,
          score,
          result,
          status,
          eventId: event.idEvent,
          lastUpdated: new Date()
        }, {
          conflictFields: ['eventId'] // eventId 기준으로 중복 체크
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
        skipCount++;
      }
    }
    
    console.log('\n📈 브라질 세리에 A 데이터 수집 완료');
    console.log(`✅ 새로 추가: ${insertCount}개`);
    console.log(`🔄 업데이트: ${updateCount}개`);
    console.log(`⚠️  스킵: ${skipCount}개`);
    console.log(`📊 총 처리: ${insertCount + updateCount + skipCount}개`);
    
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
    console.error('❌ 브라질 세리에 A 데이터 수집 실패:', error);
    throw error;
  }
}

// 직접 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectBrasileirao()
    .then(() => {
      console.log('✅ 스크립트 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 스크립트 실패:', error);
      process.exit(1);
    });
}

export { collectBrasileirao }; 