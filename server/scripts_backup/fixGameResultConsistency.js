import GameResult from '../models/gameResultModel.js';

function parseScore(score) {
  // 다양한 포맷 지원: [{team, score}], ['1','2'], [1,2], null 등
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

async function fixGameResultConsistency() {
  let updated = 0;
  const allGames = await GameResult.findAll();
  for (const game of allGames) {
    let changed = false;
    // 1. 스코어 없는 finished → result 'pending'
    if (game.status === 'finished' && (!game.score || game.score === '' || game.score === '[null, null]' || game.score === null)) {
      if (game.result !== 'pending') {
        await game.update({ result: 'pending' });
        changed = true;
        console.log(`[PENDING] ${game.homeTeam} vs ${game.awayTeam} (id=${game.id})`);
      }
      continue;
    }
    // 2. 스코어 포맷 통일 (가능한 경우)
    let parsed = parseScore(game.score);
    if (parsed) {
      // 3. status/result 동기화
      let newResult = game.result;
      if (game.status === 'finished') {
        if (parsed.home > parsed.away) newResult = 'home_win';
        else if (parsed.home < parsed.away) newResult = 'away_win';
        else newResult = 'draw';
      }
      if (newResult !== game.result) {
        await game.update({ result: newResult });
        changed = true;
        console.log(`[RESULT] ${game.homeTeam} vs ${game.awayTeam} (id=${game.id}): ${parsed.home}-${parsed.away} → ${newResult}`);
      }
    } else if (game.status === 'finished' && game.result !== 'pending') {
      // 스코어 파싱 불가 finished → pending
      await game.update({ result: 'pending' });
      changed = true;
      console.log(`[INVALID SCORE→PENDING] ${game.homeTeam} vs ${game.awayTeam} (id=${game.id})`);
    }
    if (changed) updated++;
  }
  console.log(`총 ${updated}건의 GameResults가 동기화/보정되었습니다.`);
}

fixGameResultConsistency().catch(e => { console.error(e); process.exit(1); }); 