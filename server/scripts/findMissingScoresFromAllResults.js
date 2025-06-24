import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';
import fs from 'fs';

// allResults.json 로드
const allResults = JSON.parse(fs.readFileSync('server/allResults.json', 'utf-8'));

function findScoreFromAllResults(game) {
  // 날짜, 팀명 normalize
  const date = game.commenceTime.toISOString().slice(0, 10);
  const homeNorm = normalizeTeamName(game.homeTeam);
  const awayNorm = normalizeTeamName(game.awayTeam);
  // 리그별로 순회
  for (const [league, games] of Object.entries(allResults)) {
    for (const g of games) {
      if (g.date !== date) continue;
      if (
        (normalizeTeamName(g.home) === homeNorm && normalizeTeamName(g.away) === awayNorm) ||
        (normalizeTeamName(g.home) === awayNorm && normalizeTeamName(g.away) === homeNorm)
      ) {
        return g.score;
      }
    }
  }
  return null;
}

async function main() {
  const allGames = await GameResult.findAll();
  let missingScores = [];
  for (const game of allGames) {
    if (game.status === 'finished' && (!game.score || game.score === '' || game.score === '[null, null]' || game.score === null)) {
      const foundScore = findScoreFromAllResults(game);
      missingScores.push({
        id: game.id,
        date: game.commenceTime.toISOString().slice(0, 10),
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        foundScore
      });
    }
  }
  console.log(`\n[스코어 이슈 경기 중 allResults에서 스코어를 찾은 목록]`);
  missingScores.filter(g => g.foundScore).forEach(g => {
    console.log(`${g.date} | ${g.homeTeam} vs ${g.awayTeam} | score: ${g.foundScore}`);
  });
  console.log(`\n[스코어를 못 찾은 경기]`);
  missingScores.filter(g => !g.foundScore).forEach(g => {
    console.log(`${g.date} | ${g.homeTeam} vs ${g.awayTeam}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); }); 