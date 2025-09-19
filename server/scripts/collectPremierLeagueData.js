import axios from 'axios';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName, findBestTeamMatch } from '../normalizeUtils.js';
import sequelize from '../models/sequelize.js';

const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '3'; // 실제 운영키로 교체 필요
const LEAGUE_ID = '4328'; // EPL 리그 ID
const MAIN_CATEGORY = 'soccer';
const SUB_CATEGORY = 'EPL';

// EPL 2025-26 시즌 기준 20개 팀 (표준명)
const EPL_TEAMS = [
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Burnley',
  'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool', 'Manchester City',
  'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sheffield United',
  'Tottenham Hotspur', 'West Ham United', 'Wolverhampton', 'Leeds United'
];

function matchTeamName(rawName) {
  // 1차: 표준화
  const norm = normalizeTeamName(rawName);
  // 2차: NLP 유사도
  const best = findBestTeamMatch(norm, EPL_TEAMS.map(normalizeTeamName), 0.8);
  if (best) {
    // 표준명 반환
    return EPL_TEAMS[EPL_TEAMS.map(normalizeTeamName).indexOf(best.team)];
  }
  return rawName;
}

async function collectPremierLeagueData() {
  console.log('🏴 EPL 데이터 수집 시작...');
  const seasons = ['2024-2025', '2025-2026'];
  let insertCount = 0;
  let updateCount = 0;

  for (const season of seasons) {
    const url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/eventsseason.php?id=${LEAGUE_ID}&s=${season}`;
    console.log(`API 호출: ${url}`);
    try {
      const response = await axios.get(url);
      if (!response.data || !response.data.events) {
        console.log(`❌ ${season} 시즌 데이터 없음`);
        continue;
      }
      const events = response.data.events;
      for (const event of events) {
        if (!event.strHomeTeam || !event.strAwayTeam) continue;
        // 팀명 NLP 매칭
        const homeTeam = matchTeamName(event.strHomeTeam);
        const awayTeam = matchTeamName(event.strAwayTeam);
        if (!homeTeam || !awayTeam) continue;
        // 경기 시간(UTC)
        let commenceTime = null;
        if (event.strTimestamp) {
          commenceTime = new Date(event.strTimestamp);
        } else if (event.dateEvent && event.strTime) {
          commenceTime = new Date(event.dateEvent + 'T' + (event.strTime || '00:00:00') + 'Z');
        }
        // 스코어/상태/결과
        let homeScore = null, awayScore = null, status = 'scheduled', result = 'pending';
        if (event.intHomeScore !== null && event.intAwayScore !== null) {
          homeScore = parseInt(event.intHomeScore);
          awayScore = parseInt(event.intAwayScore);
          status = 'finished';
          if (homeScore > awayScore) result = 'home_win';
          else if (awayScore > homeScore) result = 'away_win';
          else result = 'draw';
        } else if (event.strStatus === 'Match Finished' || event.strStatus === 'FT') {
          status = 'finished';
        } else if (event.strStatus === 'Postponed') {
          status = 'cancelled';
        }
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
          where: { homeTeam, awayTeam, commenceTime }
        });
        if (created) insertCount++;
        else updateCount++;
      }
    } catch (error) {
      console.error(`❌ ${season} 시즌 오류:`, error.message);
    }
  }
  console.log(`✅ EPL 데이터 수집 완료! 추가: ${insertCount}, 업데이트: ${updateCount}`);
}

// 직접 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  collectPremierLeagueData()
    .then(async () => {
 console.log('✅ 스크립트 완료'); process.exit(0); 
      // 데이터베이스 연결 종료
      console.log('🔌 데이터베이스 연결 종료 중...');
      await sequelize.close();
      console.log('✅ 데이터베이스 연결 종료 완료');
    })
    .catch(async (error) => {
 console.error('❌ 스크립트 실패:', error); process.exit(1); 
      // 데이터베이스 연결 종료
      console.log('🔌 데이터베이스 연결 종료 중...');
      await sequelize.close();
      console.log('✅ 데이터베이스 연결 종료 완료');
    });
}

export { collectPremierLeagueData }; 