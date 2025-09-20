import oddsApiService from '../services/oddsApiService.js';
import { normalizeCategoryPair } from '../normalizeUtils.js';
import OddsCache from '../models/oddsCacheModel.js';
import Bet from '../models/betModel.js';
import fs from 'fs';
import path from 'path';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

// 우리가 배당률을 제공하는 리그만 명시 (올바른 스포츠 키 사용)
const activeCategories = ['soccer_korea_kleague1', 'baseball_mlb', 'basketball_nba']; // 필요시 확장

async function fetchAndSaveTodayOddsForOurLeagues() {
  let totalSaved = 0;
  // 로그 파일 경로 생성
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const logFile = path.join(logDir, `odds_update_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.log.json`);

  // 1. Bet 테이블에서 모든 selections 추출 (중복 제거)
  const allBets = await Bet.findAll({ attributes: ['selections'] });
  const uniqueGames = new Map();
  allBets.forEach(bet => {
    bet.selections.forEach(sel => {
      const key = `${sel.category}_${sel.homeTeam}_${sel.awayTeam}_${sel.commence_time}`;
      if (!uniqueGames.has(key)) uniqueGames.set(key, sel);
    });
  });

  // 2. activeCategories의 모든 경기(오늘/미래 경기) odds API에서 받아오기 (중복 제거)
  for (const category of activeCategories) {
    try {
      const oddsList = await oddsApiService.fetchOdds(category);
      for (const o of oddsList) {
        // 오늘/미래 경기만
        if (new Date(o.commence_time + 'Z') > new Date()) {
          const key = `${category}_${o.home_team}_${o.away_team}_${o.commence_time}`;
          if (!uniqueGames.has(key)) {
            uniqueGames.set(key, {
              category,
              homeTeam: o.home_team,
              awayTeam: o.away_team,
              commence_time: o.commence_time
            });
          }
        }
      }
    } catch (e) {
      console.error(`[${category}] odds API fetch error:`, e.message);
    }
  }

  // 3. 중복 없는 모든 경기 odds 저장
  for (const sel of uniqueGames.values()) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(sel.category);
      console.log(`[DEBUG] [${sel.category}] oddsList.length:`, oddsList.length, 'sel:', sel);
      const targetOdds = oddsList.find(o => {
        return (
          o.home_team === sel.homeTeam &&
          o.away_team === sel.awayTeam &&
          new Date(o.commence_time + 'Z').getTime() === new Date(sel.commence_time + 'Z').getTime() &&
          new Date(o.commence_time + 'Z') > new Date() // 미래 경기만
        );
      });
      if (!targetOdds) {
        console.log(`[DEBUG] [${sel.category}] targetOdds not found for`, sel.homeTeam, sel.awayTeam, sel.commence_time);
        continue;
      }
      const { mainCategory, subCategory } = normalizeCategoryPair(sel.category, sel.category);
      const saveData = {
        mainCategory,
        subCategory,
        sportKey: sel.category,
        sportTitle: sel.category,
        homeTeam: sel.homeTeam,
        awayTeam: sel.awayTeam,
        commenceTime: new Date(sel.commence_time + 'Z').toISOString(),
        bookmakers: targetOdds.bookmakers,
        lastUpdated: new Date()
      };
      console.log('[DEBUG] saveData:', saveData);
      await OddsCache.upsert(saveData);
      totalSaved++;
      const logObj = {
        timestamp: new Date().toISOString(),
        type: 'odds_update',
        league: sel.category,
        homeTeam: sel.homeTeam,
        awayTeam: sel.awayTeam,
        commenceTime: sel.commence_time,
        status: 'success',
        message: 'Odds upserted',
        data: {
          odds: targetOdds.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.price,
          bookmaker: targetOdds.bookmakers?.[0]?.title
        }
      };
      fs.appendFileSync(logFile, JSON.stringify(logObj) + '\n');
    } catch (e) {
      console.error(`[${sel.category}] odds fetch/save error:`, e.message);
    }
  }
  console.log(`총 저장된 odds row: ${totalSaved}`);
  
  // 데이터베이스 연결 종료
  await sequelize.close();
  process.exit(0);
}

async function fetchTodayOddsUTCToJson() {
  const result = {};
  const now = new Date();
  // UTC 기준으로 오늘 날짜 설정
  const todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const tomorrowUTC = new Date(todayUTC);
  tomorrowUTC.setUTCDate(todayUTC.getUTCDate() + 1);

  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(cat);
      const todayOdds = oddsList.filter(o => {
        const dt = new Date(o.commence_time + 'Z');
        // API에서 받은 시간은 UTC 기준
        return dt >= todayUTC && dt < tomorrowUTC;
      });
      result[cat] = todayOdds;
      console.log(`[${cat}] 오늘(UTC) 경기수: ${todayOdds.length}`);
    } catch (e) {
      console.error(`[${cat}] (${sportKey}) 에러:`, e.message);
      result[cat] = [];
    }
  }
  fs.writeFileSync('today_odds_dump_utc.json', JSON.stringify(result, null, 2));
  console.log('오늘자(UTC) oddsAPI 데이터가 today_odds_dump_utc.json에 저장되었습니다.');
  process.exit(0);
}

async function fetchNext7DaysOddsUTCToJson() {
  const result = {};
  const now = new Date();
  // UTC 기준으로 오늘 날짜 설정
  const todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const sevenDaysLaterUTC = new Date(todayUTC);
  sevenDaysLaterUTC.setUTCDate(todayUTC.getUTCDate() + 7);

  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(cat);
      const odds7days = oddsList.filter(o => {
        const dt = new Date(o.commence_time + 'Z');
        // API에서 받은 시간은 UTC 기준
        return dt >= todayUTC && dt < sevenDaysLaterUTC;
      });
      result[cat] = odds7days;
      console.log(`[${cat}] 7일간(UTC) 경기수: ${odds7days.length}`);
    } catch (e) {
      console.error(`[${cat}] (${sportKey}) 에러:`, e.message);
      result[cat] = [];
    }
  }
  fs.writeFileSync('today_odds_dump_utc_7days.json', JSON.stringify(result, null, 2));
  console.log('7일간(UTC) oddsAPI 데이터가 today_odds_dump_utc_7days.json에 저장되었습니다.');
  process.exit(0);
}

fetchAndSaveTodayOddsForOurLeagues(); 