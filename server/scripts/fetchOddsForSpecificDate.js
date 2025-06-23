import oddsApiService from '../services/oddsApiService.js';

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

const TARGET_DATE = '2025-06-21'; // YYYY-MM-DD

async function main() {
  const categories = Object.keys(clientSportKeyMap);
  for (const category of categories) {
    try {
      const oddsList = await oddsApiService.fetchRecentOdds(category);
      const filtered = oddsList.filter(game => game.commence_time && game.commence_time.startsWith(TARGET_DATE));
      if (filtered.length > 0) {
        console.log(`\n[${category}] ${filtered.length}건`);
        filtered.forEach(game => {
          console.log(`- ${game.home_team} vs ${game.away_team} | ${game.commence_time}`);
        });
      }
    } catch (err) {
      console.error(`[${category}] 에러:`, err.message);
    }
  }
  console.log('\n완료.');
}

main(); 