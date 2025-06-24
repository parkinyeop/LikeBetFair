import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';
import fs from 'fs';
import path from 'path';

// 팀명 매핑 테이블 (DB팀명/스포츠DB팀명 → 표준팀명)
const teamNameMap = {
  // KBO
  'Hanwha Ea': 'Hanwha Eagles',
  'Kiwoom He': 'Kiwoom Heroes',
  'KT Wiz': 'KT Wiz',
  'NC Dinos': 'NC Dinos',
  'Kia Tiger': 'Kia Tigers',
  'SSG Lande': 'SSG Landers',
  'Lotte Gia': 'Lotte Giants',
  'Doosan Be': 'Doosan Bears',
  'LG Twins': 'LG Twins',
  'Samsung L': 'Samsung Lions',
  // MLB
  'Los Angel': 'Los Angeles Angels',
  'San Diego': 'San Diego Padres',
  'Philadelp': 'Philadelphia Phillies',
  'Cincinnat': 'Cincinnati Reds',
  'Pittsburg': 'Pittsburgh Pirates',
  'Texas Ran': 'Texas Rangers',
  'Chicago W': 'Chicago White Sox',
  'Toronto B': 'Toronto Blue Jays',
  'Detroit T': 'Detroit Tigers',
  'New York': 'New York Yankees', // ambiguous, 실제로는 구분 필요
  'Miami Mar': 'Miami Marlins',
  'Atlanta B': 'Atlanta Braves',
  'Chicago C': 'Chicago Cubs',
  'Seattle M': 'Seattle Mariners',
  'St. Louis': 'St. Louis Cardinals',
  'Baltimore': 'Baltimore Orioles',
  'Colorado': 'Colorado Rockies',
  'Houston A': 'Houston Astros',
  // ... 필요시 추가 ...
};

// sportsdb_results_tmp.json 로드
const sportsdbResults = JSON.parse(fs.readFileSync('server/sportsdb_results_tmp.json', 'utf-8'));

function mapTeamName(name) {
  return teamNameMap[name] || name;
}

function findEventInSportsdb(game) {
  const date = game.commenceTime.toISOString().slice(0, 10);
  const homeNorm = normalizeTeamName(mapTeamName(game.homeTeam));
  const awayNorm = normalizeTeamName(mapTeamName(game.awayTeam));
  for (const [league, events] of Object.entries(sportsdbResults)) {
    for (const event of events) {
      const eventDate = event._fetchedDate || event.dateEvent;
      if (eventDate !== date) continue;
      const eventHomeNorm = normalizeTeamName(mapTeamName(event.strHomeTeam));
      const eventAwayNorm = normalizeTeamName(mapTeamName(event.strAwayTeam));
      if (
        (eventHomeNorm === homeNorm && eventAwayNorm === awayNorm) ||
        (eventHomeNorm === awayNorm && eventAwayNorm === homeNorm)
      ) {
        return event;
      }
    }
  }
  return null;
}

function getResult(homeScore, awayScore) {
  if (homeScore == null || awayScore == null) return 'pending';
  if (Number(homeScore) > Number(awayScore)) return 'home_win';
  if (Number(homeScore) < Number(awayScore)) return 'away_win';
  if (Number(homeScore) === Number(awayScore)) return 'draw';
  return 'pending';
}

function getStatusAndResult(event) {
  // 연기 여부 우선
  if ((event.strStatus && event.strStatus.toLowerCase().includes('post')) || event.strPostponed === 'yes') {
    return { status: 'postponed', result: 'postponed' };
  }
  // 정상 종료
  if (event.strStatus && (event.strStatus === 'FT' || event.strStatus === 'Match Finished')) {
    return { status: 'finished', result: null }; // result는 getResult로 판정
  }
  // 기타(진행중, 예정 등)
  return { status: event.strStatus || 'scheduled', result: 'pending' };
}

async function main() {
  // 로그 파일 경로 생성
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const logFile = path.join(logDir, `game_result_update_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.log.json`);
  const allGames = await GameResult.findAll();
  let updated = 0, notFound = [], postponed = 0;
  for (const game of allGames) {
    if (game.status === 'finished' && (!game.score || game.score === '' || game.score === '[null, null]' || game.score === null)) {
      const event = findEventInSportsdb(game);
      if (event) {
        const { status, result } = getStatusAndResult(event);
        if (status === 'postponed') {
          await game.update({ status: 'postponed', result: 'postponed', score: null, lastUpdated: new Date() });
          postponed++;
          // 로그 기록
          const logObj = {
            timestamp: new Date().toISOString(),
            type: 'game_result_update',
            league: event.strLeague || '',
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            commenceTime: game.commenceTime,
            status: 'postponed',
            message: 'Game postponed',
            data: {}
          };
          fs.appendFileSync(logFile, JSON.stringify(logObj) + '\n');
          continue;
        }
        if (event.intHomeScore != null && event.intAwayScore != null) {
          const homeScore = Number(event.intHomeScore);
          const awayScore = Number(event.intAwayScore);
          const finalResult = getResult(homeScore, awayScore);
          const scoreArr = [
            { team: event.strHomeTeam, score: homeScore },
            { team: event.strAwayTeam, score: awayScore }
          ];
          await game.update({
            score: scoreArr,
            result: finalResult,
            status: 'finished',
            lastUpdated: new Date()
          });
          updated++;
          // 로그 기록
          const logObj = {
            timestamp: new Date().toISOString(),
            type: 'game_result_update',
            league: event.strLeague || '',
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            commenceTime: game.commenceTime,
            status: 'success',
            message: 'Game result updated',
            data: {
              score: scoreArr,
              result: finalResult
            }
          };
          fs.appendFileSync(logFile, JSON.stringify(logObj) + '\n');
        } else {
          notFound.push({
            id: game.id,
            date: game.commenceTime.toISOString().slice(0, 10),
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam
          });
        }
      } else {
        notFound.push({
          id: game.id,
          date: game.commenceTime.toISOString().slice(0, 10),
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam
        });
      }
    }
  }
  console.log(`\n총 ${updated}건 DB 업데이트 완료.`);
  console.log(`총 ${postponed}건 연기(postponed) 처리.`);
  console.log(`\n[여전히 못 찾은 경기]`);
  notFound.forEach(g => {
    console.log(`${g.date} | ${g.homeTeam} vs ${g.awayTeam}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); }); 