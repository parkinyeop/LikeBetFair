import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

const teamNamePattern = /^[A-Za-z가-힣 ]{5,}$/; // 너무 짧거나 잘린 팀명 탐지

function parseScore(score) {
  if (!score || !Array.isArray(score)) return null;
  if (score.length < 2) return null;
  let home = null, away = null;
  if (typeof score[0] === 'object' && score[0] !== null) {
    home = parseInt(score[0].score);
    away = parseInt(score[1].score);
  } else if (typeof score[0] === 'string' || typeof score[0] === 'number') {
    home = parseInt(score[0]);
    away = parseInt(score[1]);
  }
  if (isNaN(home) || isNaN(away)) return null;
  return { home, away };
}

async function reportGameResultIssues() {
  const allGames = await GameResult.findAll();
  let teamNameIssues = [], scoreIssues = [], statusResultIssues = [];
  for (const game of allGames) {
    // 1. 팀명 잘림/비표준
    if (!teamNamePattern.test(game.homeTeam) || !teamNamePattern.test(game.awayTeam)) {
      teamNameIssues.push({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam });
    }
    // 2. 스코어 포맷/누락
    let parsed = parseScore(game.score);
    if (game.status === 'finished' && (!game.score || !parsed)) {
      scoreIssues.push({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, score: game.score });
    }
    // 3. status/result 불일치
    if (game.status === 'finished' && game.result === 'pending' && parsed) {
      statusResultIssues.push({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, score: game.score, result: game.result });
    }
    if (game.status !== 'finished' && (game.result === 'home_win' || game.result === 'away_win' || game.result === 'draw')) {
      statusResultIssues.push({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, status: game.status, result: game.result });
    }
  }
  console.log(`\n[팀명 이슈] ${teamNameIssues.length}건`);
  console.log(teamNameIssues.slice(0, 10));
  console.log(`\n[스코어 이슈] ${scoreIssues.length}건`);
  console.log(scoreIssues.slice(0, 10));
  console.log(`\n[상태/결과 불일치] ${statusResultIssues.length}건`);
  console.log(statusResultIssues.slice(0, 10));
}

reportGameResultIssues().catch(e => { console.error(e); process.exit(1); }); 