import oddsApiService from './services/oddsApiService.js';
import fs from 'fs';
import path from 'path';

// OddsAPI의 올바른 스포츠 키 매핑
const SPORTS_MAPPING = {
  'baseball_mlb': 'baseball',
  'baseball_kbo': 'baseball', 
  'basketball_nba': 'basketball',
  'americanfootball_nfl': 'american_football',
  'soccer_epl': 'soccer',
  'soccer_usa_mls': 'soccer',
  'soccer_korea_kleague1': 'soccer',
  'soccer_japan_j_league': 'soccer',
  'soccer_italy_serie_a': 'soccer',
  'soccer_brazil_campeonato': 'soccer',
  'soccer_argentina_primera_division': 'soccer',
  'soccer_china_superleague': 'soccer',
  'soccer_spain_la_liga': 'soccer',
  'soccer_germany_bundesliga': 'soccer'
};

// 우리 시스템의 서브카테고리 매핑
const SUB_CATEGORY_MAPPING = {
  'baseball_mlb': 'MLB',
  'baseball_kbo': 'KBO',
  'basketball_nba': 'NBA',
  'americanfootball_nfl': 'NFL',
  'soccer_epl': '프리미어리그',
  'soccer_usa_mls': 'MLS',
  'soccer_korea_kleague1': 'KLEAGUE',
  'soccer_japan_j_league': 'JLEAGUE',
  'soccer_italy_serie_a': 'SERIEA',
  'soccer_brazil_campeonato': 'BRASILEIRAO',
  'soccer_argentina_primera_division': 'ARGENTINA_PRIMERA',
  'soccer_china_superleague': 'CSL',
  'soccer_spain_la_liga': 'LALIGA',
  'soccer_germany_bundesliga': 'BUNDESLIGA'
};

// OddsAPI에서 사용 가능한 스포츠 키들
const ODDS_API_SPORTS = [
  'baseball_mlb',
  'basketball_nba', 
  'americanfootball_nfl',
  'soccer_england_premier_league',
  'soccer_usa_mls',
  'soccer_korea_kleague1',
  'soccer_japan_j_league',
  'soccer_italy_serie_a',
  'soccer_brazil_campeonato',
  'soccer_argentina_primera_division',
  'soccer_china_superleague',
  'soccer_spain_la_liga',
  'soccer_germany_bundesliga'
];

async function fetchTodayOdds() {
  console.log('🚀 [ODDS_FETCH] Starting today\'s odds fetch...');
  
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const allOdds = [];
  
  try {
    // 각 스포츠별로 오늘자 배당율 가져오기
    for (const sportKey of ODDS_API_SPORTS) {
      const mainCategory = SPORTS_MAPPING[sportKey];
      const subCategory = SUB_CATEGORY_MAPPING[sportKey];
      
      console.log(`📊 [ODDS_FETCH] Fetching odds for ${sportKey} (${subCategory})...`);
      
      try {
        const odds = await oddsApiService.fetchOdds(sportKey, {
          regions: 'us',
          markets: 'h2h,spreads,totals',
          dateFormat: 'iso',
          oddsFormat: 'decimal'
        });
        
        if (odds && Array.isArray(odds)) {
          console.log(`✅ [ODDS_FETCH] Found ${odds.length} games for ${sportKey}`);
          
          // 우리 시스템 형식으로 변환
          const convertedOdds = odds.map(game => ({
            sport_key: sportKey,
            sport_title: game.sport_title,
            main_category: mainCategory,
            sub_category: subCategory,
            home_team: game.home_team,
            away_team: game.away_team,
            commence_time: game.commence_time,
            bookmakers: game.bookmakers?.map(bookmaker => ({
              key: bookmaker.key,
              title: bookmaker.title,
              markets: bookmaker.markets?.map(market => ({
                key: market.key,
                outcomes: market.outcomes?.map(outcome => ({
                  name: outcome.name,
                  price: outcome.price
                }))
              }))
            })) || [],
            last_update: game.last_update
          }));
          
          allOdds.push(...convertedOdds);
        } else {
          console.log(`⚠️ [ODDS_FETCH] No odds data for ${sportKey}`);
        }
        
        // API 호출 간격 조절 (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ [ODDS_FETCH] Error fetching odds for ${sportKey}:`, error.message);
      }
    }
    
    // 결과를 JSON 파일로 저장
    const outputDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `today_odds_${dateStr}.json`;
    const filepath = path.join(outputDir, filename);
    
    const outputData = {
      fetch_date: dateStr,
      fetch_time: new Date().toISOString(),
      total_games: allOdds.length,
      sports_breakdown: {},
      odds_data: allOdds
    };
    
    // 스포츠별 통계 계산
    allOdds.forEach(game => {
      const subCategory = game.sub_category;
      if (!outputData.sports_breakdown[subCategory]) {
        outputData.sports_breakdown[subCategory] = 0;
      }
      outputData.sports_breakdown[subCategory]++;
    });
    
    fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
    
    console.log('✅ [ODDS_FETCH] Today\'s odds saved successfully!');
    console.log(`📁 [ODDS_FETCH] File: ${filepath}`);
    console.log(`📊 [ODDS_FETCH] Total games: ${allOdds.length}`);
    console.log('📈 [ODDS_FETCH] Sports breakdown:', outputData.sports_breakdown);
    
    return outputData;
    
  } catch (error) {
    console.error('❌ [ODDS_FETCH] Fatal error:', error.message);
    throw error;
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTodayOdds()
    .then(() => {
      console.log('🎉 [ODDS_FETCH] Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 [ODDS_FETCH] Script failed:', error.message);
      process.exit(1);
    });
}

export { fetchTodayOdds }; 