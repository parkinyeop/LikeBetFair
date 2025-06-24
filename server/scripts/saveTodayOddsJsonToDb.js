import fs from 'fs';
import OddsCache from '../models/oddsCacheModel.js';
import { normalizeCategoryPair } from '../normalizeUtils.js';

const clientSportKeyMap = {
  'K리그': 'soccer_korea_kleague1',
  'J리그': 'soccer_japan_j_league',
  '세리에 A': 'soccer_italy_serie_a',
  '브라질 세리에 A': 'soccer_brazil_campeonato',
  'MLS': 'soccer_usa_mls',
  '아르헨티나 프리메라': 'soccer_argentina_primera_division',
  '중국 슈퍼리그': 'soccer_china_superleague',
  '스페인 2부': 'soccer_spain_segunda_division',
  '스웨덴 알스벤스칸': 'soccer_sweden_allsvenskan',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'KBO': 'baseball_kbo',
  'NHL': 'icehockey_nhl'
};

async function saveTodayOddsJsonToDb() {
  const raw = fs.readFileSync('today_odds_dump.json', 'utf-8');
  const data = JSON.parse(raw);
  let totalSaved = 0;
  for (const [cat, oddsList] of Object.entries(data)) {
    if (!oddsList || oddsList.length === 0) continue;
    const sportKey = clientSportKeyMap[cat];
    for (const o of oddsList) {
      const { mainCategory, subCategory } = normalizeCategoryPair(sportKey, sportKey);
      console.log(`[${cat}] sportKey=${sportKey} → mainCategory=${mainCategory}, subCategory=${subCategory}`);
      await OddsCache.upsert({
        mainCategory,
        subCategory,
        sportKey,
        sportTitle: cat,
        homeTeam: o.home_team,
        awayTeam: o.away_team,
        commenceTime: new Date(o.commence_time),
        bookmakers: o.bookmakers,
        lastUpdated: new Date()
      });
      totalSaved++;
    }
    console.log(`[${cat}] 저장된 경기수: ${oddsList.length}`);
  }
  console.log(`총 저장된 odds row: ${totalSaved}`);
  process.exit(0);
}

saveTodayOddsJsonToDb(); 