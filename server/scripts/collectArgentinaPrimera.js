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
  let allEvents = [];
  
  try {
    // 1. 2025 시즌 경기 결과 가져오기
    console.log('\n📅 1단계: 2025 시즌 경기 데이터 수집...');
    const seasonUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${LEAGUE_ID}&s=${SEASON}`;
    console.log(`API 호출: ${seasonUrl}`);
    
    const seasonResponse = await axios.get(seasonUrl);
    
    if (seasonResponse.data && seasonResponse.data.events) {
      allEvents = [...allEvents, ...seasonResponse.data.events];
      console.log(`✅ 시즌 데이터: ${seasonResponse.data.events.length}개 경기`);
    } else {
      console.log('⚠️ 시즌 API 응답에 경기 데이터가 없습니다');
    }

    // 2. 최근 경기 결과 가져오기
    console.log('\n📅 2단계: 최근 경기 데이터 수집...');
    const recentUrl = `https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${LEAGUE_ID}`;
    console.log(`API 호출: ${recentUrl}`);
    
    const recentResponse = await axios.get(recentUrl);
    
    if (recentResponse.data && recentResponse.data.events) {
      allEvents = [...allEvents, ...recentResponse.data.events];
      console.log(`✅ 최근 경기: ${recentResponse.data.events.length}개 경기`);
    } else {
      console.log('⚠️ 최근 경기 API 응답에 경기 데이터가 없습니다');
    }

    // 3. 9월 11일 특정 날짜 경기 가져오기
    console.log('\n📅 3단계: 9월 11일 특정 날짜 경기 데이터 수집...');
    const dayUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=2025-09-11&s=Soccer`;
    console.log(`API 호출: ${dayUrl}`);
    
    const dayResponse = await axios.get(dayUrl);
    
    if (dayResponse.data && dayResponse.data.events) {
      // 아르헨티나 프리메라 디비시온 경기만 필터링
      const argentinaEvents = dayResponse.data.events.filter(event => 
        event.strLeague && event.strLeague.toLowerCase().includes('argentina')
      );
      allEvents = [...allEvents, ...argentinaEvents];
      console.log(`✅ 9월 11일 아르헨티나 경기: ${argentinaEvents.length}개 경기`);
    } else {
      console.log('⚠️ 9월 11일 API 응답에 경기 데이터가 없습니다');
    }

    // 4. 8월-9월 기간 경기 가져오기
    console.log('\n📅 4단계: 8월-9월 기간 경기 데이터 수집...');
    const months = ['08', '09'];
    for (const month of months) {
      const monthUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=2025-${month}-11&s=Soccer`;
      console.log(`API 호출: ${monthUrl}`);
      
      try {
        const monthResponse = await axios.get(monthUrl);
        
        if (monthResponse.data && monthResponse.data.events) {
          const argentinaEvents = monthResponse.data.events.filter(event => 
            event.strLeague && event.strLeague.toLowerCase().includes('argentina')
          );
          allEvents = [...allEvents, ...argentinaEvents];
          console.log(`✅ 2025-${month}-11 아르헨티나 경기: ${argentinaEvents.length}개 경기`);
        }
      } catch (error) {
        console.log(`⚠️ 2025-${month}-11 API 호출 실패: ${error.message}`);
      }
    }

    // 중복 제거 (event.idEvent 기준)
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.idEvent === event.idEvent)
    );
    
    console.log(`\n📊 총 수집된 경기: ${allEvents.length}개`);
    console.log(`📊 중복 제거 후: ${uniqueEvents.length}개`);
    
    const events = uniqueEvents;
    
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
        
        // DB 저장/업데이트 (upsert 대신 findOrCreate 사용)
        const [gameResult, created] = await GameResult.findOrCreate({
          where: {
            homeTeam,
            awayTeam,
            commenceTime
          },
          defaults: {
            mainCategory: MAIN_CATEGORY,
            subCategory: SUB_CATEGORY,
            homeTeam,
            awayTeam,
            commenceTime,
            score,
            status,
            result,
            eventId: event.idEvent,
            sportKey: 'soccer_argentina_primera_division',
            sportTitle: '아르헨티나 프리메라 디비시온'
          }
        });

        // 기존 경기인 경우 업데이트
        if (!created) {
          await gameResult.update({
            score,
            status,
            result,
            eventId: event.idEvent,
            sportKey: 'soccer_argentina_primera_division',
            sportTitle: '아르헨티나 프리메라 디비시온'
          });
        }
        
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