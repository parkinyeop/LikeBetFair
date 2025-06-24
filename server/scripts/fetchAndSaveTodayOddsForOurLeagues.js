import oddsApiService from '../services/oddsApiService.js';
import { normalizeCategoryPair } from '../normalizeUtils.js';
import OddsCache from '../models/oddsCacheModel.js';
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

async function fetchAndSaveTodayOddsForOurLeagues() {
  let totalSaved = 0;
  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(cat);
      if (cat === 'MLB') {
        console.log('[MLB oddsList 전체]', JSON.stringify(oddsList, null, 2));
      }
      // 오늘 날짜만 필터링
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate()+1);
      if (cat === 'MLB') {
        console.log(`[MLB today 기준] today: ${today.toISOString()}, tomorrow: ${tomorrow.toISOString()}`);
      }
      const todayOdds = oddsList.filter(o => {
        const dt = new Date(o.commence_time);
        if (cat === 'MLB') {
          console.log(`[MLB 경기] commence_time: ${o.commence_time}, dt: ${dt.toISOString()}, today: ${today.toISOString()}, tomorrow: ${tomorrow.toISOString()}, 포함여부: ${dt >= today && dt < tomorrow}`);
        }
        return dt >= today && dt < tomorrow;
      });
      for (const o of todayOdds) {
        // 우리 DB 포맷으로 변환
        const { mainCategory, subCategory } = normalizeCategoryPair(cat, cat);
        const saveData = {
          mainCategory,
          subCategory,
          sportKey,
          sportTitle: cat,
          homeTeam: o.home_team,
          awayTeam: o.away_team,
          commenceTime: new Date(o.commence_time),
          bookmakers: o.bookmakers,
          lastUpdated: new Date()
        };
        if (cat === 'MLB') {
          console.log('[MLB 저장 직전 데이터]', JSON.stringify(saveData, null, 2));
        }
        await OddsCache.upsert(saveData);
        totalSaved++;
      }
      console.log(`[${cat}] 오늘 저장된 경기수: ${todayOdds.length}`);
    } catch (e) {
      console.error(`[${cat}] (${sportKey}) 에러:`, e.message);
    }
  }
  console.log(`총 저장된 odds row: ${totalSaved}`);
  process.exit(0);
}

async function fetchTodayOddsKSTToJson() {
  const result = {};
  const now = new Date();
  const kstOffset = 9 * 60; // KST는 UTC+9
  const todayKST = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
  todayKST.setHours(0, 0, 0, 0);
  const tomorrowKST = new Date(todayKST);
  tomorrowKST.setDate(todayKST.getDate() + 1);

  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(cat);
      const todayOdds = oddsList.filter(o => {
        const dt = new Date(o.commence_time);
        const dtKST = new Date(dt.getTime() + 9 * 60 * 60000);
        return dtKST >= todayKST && dtKST < tomorrowKST;
      });
      result[cat] = todayOdds;
      console.log(`[${cat}] 오늘(KST) 경기수: ${todayOdds.length}`);
    } catch (e) {
      console.error(`[${cat}] (${sportKey}) 에러:`, e.message);
      result[cat] = [];
    }
  }
  fs.writeFileSync('today_odds_dump_kst.json', JSON.stringify(result, null, 2));
  console.log('오늘자(KST) oddsAPI 데이터가 today_odds_dump_kst.json에 저장되었습니다.');
  process.exit(0);
}

async function fetchNext7DaysOddsKSTToJson() {
  const result = {};
  const now = new Date();
  const kstOffset = 9 * 60; // KST는 UTC+9
  const todayKST = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
  todayKST.setHours(0, 0, 0, 0);
  const sevenDaysLaterKST = new Date(todayKST);
  sevenDaysLaterKST.setDate(todayKST.getDate() + 7);

  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(cat);
      const odds7days = oddsList.filter(o => {
        const dt = new Date(o.commence_time);
        const dtKST = new Date(dt.getTime() + 9 * 60 * 60000);
        return dtKST >= todayKST && dtKST < sevenDaysLaterKST;
      });
      result[cat] = odds7days;
      console.log(`[${cat}] 7일간(KST) 경기수: ${odds7days.length}`);
    } catch (e) {
      console.error(`[${cat}] (${sportKey}) 에러:`, e.message);
      result[cat] = [];
    }
  }
  fs.writeFileSync('today_odds_dump_kst_7days.json', JSON.stringify(result, null, 2));
  console.log('7일간(KST) oddsAPI 데이터가 today_odds_dump_kst_7days.json에 저장되었습니다.');
  process.exit(0);
}

// fetchAndSaveTodayOddsForOurLeagues();
// fetchTodayOddsKSTToJson();
fetchNext7DaysOddsKSTToJson(); 