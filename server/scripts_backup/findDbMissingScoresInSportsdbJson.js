import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';
import fs from 'fs';

// sportsdb_results_tmp.json 로드
const sportsdbResults = JSON.parse(fs.readFileSync('server/sportsdb_results_tmp.json', 'utf-8'));

function findEventInSportsdb(game) {
  const date = game.commenceTime.toISOString().slice(0, 10);
  const homeNorm = normalizeTeamName(game.homeTeam);
  const awayNorm = normalizeTeamName(game.awayTeam);
  for (const [league, events] of Object.entries(sportsdbResults)) {
    for (const event of events) {
      // 날짜 매칭: _fetchedDate 또는 dateEvent
      const eventDate = event._fetchedDate || event.dateEvent;
      if (eventDate !== date) continue;
      // 팀명 normalize 매칭
      const eventHomeNorm = normalizeTeamName(event.strHomeTeam);
      const eventAwayNorm = normalizeTeamName(event.strAwayTeam);
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

async function main() {
  const allGames = await GameResult.findAll();
  let matched = [], notFound = [];
  for (const game of allGames) {
    if (game.status === 'finished' && (!game.score || game.score === '' || game.score === '[null, null]' || game.score === null)) {
      const event = findEventInSportsdb(game);
      if (event && event.intHomeScore != null && event.intAwayScore != null) {
        matched.push({
          id: game.id,
          date: game.commenceTime.toISOString().slice(0, 10),
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          eventHome: event.strHomeTeam,
          eventAway: event.strAwayTeam,
          homeScore: event.intHomeScore,
          awayScore: event.intAwayScore,
          status: event.strStatus
        });
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
  console.log(`\n[DB에 스코어가 없는 경기 중 sportsdb_results_tmp.json에서 찾은 목록]`);
  matched.forEach(g => {
    console.log(`${g.date} | ${g.homeTeam} vs ${g.awayTeam} | API: ${g.eventHome} ${g.homeScore} - ${g.awayScore} ${g.eventAway} | status: ${g.status}`);
  });
  console.log(`\n[여전히 못 찾은 경기]`);
  notFound.forEach(g => {
    console.log(`${g.date} | ${g.homeTeam} vs ${g.awayTeam}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); }); 