import OddsCache from '../models/oddsCacheModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

const all = await OddsCache.findAll();
const seen = new Map();
const dups = [];
all.forEach(odds => {
  const key = `${normalizeTeamName(odds.homeTeam)}_${normalizeTeamName(odds.awayTeam)}_${odds.commenceTime.toISOString().slice(0,10)}`;
  if (seen.has(key)) {
    dups.push({
      homeTeam: odds.homeTeam,
      awayTeam: odds.awayTeam,
      commenceTime: odds.commenceTime,
      market: odds.market,
      sportKey: odds.sportKey,
      bookmakers: odds.bookmakers,
      id: odds.id
    });
  } else {
    seen.set(key, odds);
  }
});
console.log('중복된 배당률:', dups.length, '건');
if (dups.length) console.log(JSON.stringify(dups, null, 2)); 