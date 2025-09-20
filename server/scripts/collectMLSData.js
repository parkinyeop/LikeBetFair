import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

/**
 * MLS 2025 시즌 데이터 수집
 * 시즌 기간: 2025년 2월 22일 - 10월 18일 (정규시즌)
 * TheSportsDB 리그 ID: 4346
 */
async function collectMLSData() {
  console.log('🇺🇸 MLS 데이터 수집 시작...');
  
  const LEAGUE_ID = '4346';
  const SEASON = '2025';
  const MAIN_CATEGORY = 'soccer';
  const SUB_CATEGORY = 'MLS';
  
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
      if (!event.strHomeTeam || !event.strAwayTeam) {
        console.log(`⚠️ 팀명 누락: ${event.strEvent}`);
        continue;
      }
      
      // 팀명 정규화
      const homeTeam = normalizeTeamName(event.strHomeTeam);
      const awayTeam = normalizeTeamName(event.strAwayTeam);
      
      if (!homeTeam || !awayTeam) {
        console.log(`⚠️ 팀명 정규화 실패: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
        continue;
      }
      
      // 경기 날짜 파싱 (UTC 기준)
              // strTimestamp가 UTC 시간이므로 이를 사용
        let commenceTime;
        if (event.strTimestamp) {
          commenceTime = new Date(event.strTimestamp);
        } else if (event.dateEvent && event.strTime) {
          commenceTime = new Date(event.dateEvent + 'T' + (event.strTime || '00:00:00') + 'Z');
        } else {
          console.log(`⚠️ 시간 정보 없음: ${event.strHomeTeam} vs ${event.strAwayTeam}`);
          continue;
        }
      
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
    }
    
    console.log(`\n📈 MLS 데이터 수집 완료!`);
    console.log(`➕ 새로 추가된 경기: ${insertCount}개`);
    console.log(`🔄 업데이트된 경기: ${updateCount}개`);
    console.log(`📊 총 처리된 경기: ${insertCount + updateCount}개`);
    
  } catch (error) {
    console.error('❌ MLS 데이터 수집 중 오류:', error.message);
    throw error;
  }
}

// 직접 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectMLSData()
    .then(() => {
      console.log('✅ 스크립트 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 스크립트 실패:', error);
      process.exit(1);
    });
}

export { collectMLSData }; 