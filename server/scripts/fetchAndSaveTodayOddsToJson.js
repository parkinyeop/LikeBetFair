import oddsApiService from '../services/oddsApiService.js';
import fs from 'fs';

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

function getTodayUtcRange() {
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const start = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0));
  const end = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0));
  return { start, end };
}

async function fetchAndSaveTodayOddsToJson() {
  const result = {};
  const { start, end } = getTodayUtcRange();
  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(cat);
      // 오늘(UTC) 날짜만 필터링
      const todayOdds = oddsList.filter(o => {
        const dt = new Date(o.commence_time);
        return dt >= start && dt < end;
      });
      result[cat] = todayOdds;
      console.log(`[${cat}] 오늘(UTC) 경기수: ${todayOdds.length}`);
    } catch (e) {
      console.error(`[${cat}] (${sportKey}) 에러:`, e.message);
      result[cat] = [];
    }
  }
  fs.writeFileSync('today_odds_dump.json', JSON.stringify(result, null, 2), 'utf-8');
  console.log('오늘(UTC) 경기 odds 데이터를 today_odds_dump.json 파일로 저장 완료!');
}

fetchAndSaveTodayOddsToJson(); 