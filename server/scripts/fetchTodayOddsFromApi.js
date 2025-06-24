import axios from 'axios';
import oddsApiService from '../services/oddsApiService.js';

const apiKey = process.env.ODDS_API_KEY;
const baseUrl = 'https://api.the-odds-api.com/v4/sports';

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

async function fetchAllSportsFromOddsApi() {
  try {
    const res = await axios.get(`${baseUrl}?apiKey=${apiKey}`);
    const sports = res.data;
    console.log('=== oddsAPI에서 제공하는 전체 스포츠/리그 목록 ===');
    sports.forEach(s => {
      console.log(`- key: ${s.key}, group: ${s.group}, title: ${s.title}, active: ${s.active}`);
    });
    console.log('====================================');
  } catch (e) {
    console.error('oddsAPI 전체 스포츠 목록 조회 에러:', e.message);
  }
}

async function fetchTodayOddsFromApi() {
  // 1. oddsAPI에서 지원하는 전체 리그 목록 출력
  const categories = await oddsApiService.getCategories();
  console.log('=== oddsAPI에서 지원하는 전체 리그 목록 ===');
  categories.forEach(cat => {
    console.log(`- ${cat.clientCategory} (sportKey: ${cat.sportKey}, main: ${cat.mainCategory}, sub: ${cat.subCategory})`);
  });
  console.log('====================================');

  // 2. 오늘 경기 odds 조회
  for (const [cat, sportKey] of Object.entries(clientSportKeyMap)) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(cat);
      // 오늘 날짜만 필터링
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate()+1);
      const todayOdds = oddsList.filter(o => {
        const dt = new Date(o.commence_time);
        return dt >= today && dt < tomorrow;
      });
      console.log(`[${cat}] (${sportKey}) 오늘 경기수: ${todayOdds.length}`);
      todayOdds.forEach(o => {
        console.log(`  - ${o.home_team} vs ${o.away_team} @ ${o.commence_time}`);
      });
    } catch (e) {
      console.error(`[${cat}] (${sportKey}) 에러:`, e.message);
    }
  }
}

fetchAllSportsFromOddsApi();
fetchTodayOddsFromApi(); 