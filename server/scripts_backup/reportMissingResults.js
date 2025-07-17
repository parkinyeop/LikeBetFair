import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';

const minDate = '2025-06-12';
const today = new Date().toISOString().slice(0, 10);

function normalizeTeam(name) {
  return name.replace(/\s+/g, '').toLowerCase();
}

(async () => {
  // 1. Bet 테이블에서 기간 내 모든 베팅 경기 추출
  const bets = await Bet.findAll({
    where: {},
    attributes: ['selections', 'createdAt'],
  });
  // 2. GameResults DB에서 모든 경기 추출
  const gameResults = await GameResult.findAll({
    attributes: ['homeTeam', 'awayTeam', 'commenceTime'],
    raw: true
  });
  const missing = [];
  for (const bet of bets) {
    const date = bet.createdAt.toISOString().slice(0, 10);
    if (date < minDate || date > today) continue;
    const selections = Array.isArray(bet.selections) ? bet.selections : [bet.selections];
    for (const sel of selections) {
      const home = sel.home_team || sel.homeTeam || sel.team1 || sel.team;
      const away = sel.away_team || sel.awayTeam || sel.team2 || sel.opponent;
      if (!home || !away) continue;
      // 3. GameResults DB와 매칭
      let found = false;
      for (const game of gameResults) {
        const gameDate = game.commenceTime.toISOString().slice(0, 10);
        if (
          gameDate === date &&
          ((normalizeTeam(game.homeTeam) === normalizeTeam(home) && normalizeTeam(game.awayTeam) === normalizeTeam(away)) ||
           (normalizeTeam(game.homeTeam) === normalizeTeam(away) && normalizeTeam(game.awayTeam) === normalizeTeam(home)))
        ) {
          found = true;
          break;
        }
      }
      if (!found) {
        missing.push({ date, home, away });
      }
    }
  }
  console.log(`\n누락된 경기 ${missing.length}건:`);
  console.log(missing.slice(0, 10)); // 샘플 10개만 출력
})(); 