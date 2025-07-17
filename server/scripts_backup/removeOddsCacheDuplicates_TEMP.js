import OddsCache from '../models/oddsCacheModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

const all = await OddsCache.findAll();
const seen = new Set();
let deleteCount = 0;
for (const odds of all) {
  const key = JSON.stringify({
    homeTeam: normalizeTeamName(odds.homeTeam),
    awayTeam: normalizeTeamName(odds.awayTeam),
    commenceTime: odds.commenceTime.toISOString().slice(0,10),
    sportKey: odds.sportKey,
    market: odds.market,
    bookmakers: odds.bookmakers
  });
  if (seen.has(key)) {
    await odds.destroy();
    deleteCount++;
    console.log(`[삭제] id=${odds.id}, 경기=${odds.homeTeam} vs ${odds.awayTeam}, 날짜=${odds.commenceTime}`);
  } else {
    seen.add(key);
  }
}
console.log(`완전 중복 OddsCache 데이터 ${deleteCount}건 삭제 완료.`); 