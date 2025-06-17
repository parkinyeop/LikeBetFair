const axios = require('axios');
const OddsCache = require('../models/oddsCacheModel');
const sportsConfig = require('../config/sportsConfig');

class OddsApiService {
  constructor() {
    this.apiKey = process.env.ODDS_API_KEY;
    this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
  }

  async fetchAndCacheOdds() {
    try {
      console.log('Starting to fetch odds data...');
      console.log('API Key:', this.apiKey);
      console.log('Base URL:', this.baseUrl);
      
      // 각 스포츠별로 개별 리그 데이터 가져오기
      const leagues = [
        // 축구 리그
        { key: 'soccer_usa_mls', category: 'football', subCategory: 'mls', title: 'MLS' },
        { key: 'soccer_italy_serie_a', category: 'football', subCategory: 'serie-a', title: 'Serie A' },
        { key: 'soccer_spain_segunda_division', category: 'football', subCategory: 'la-liga', title: 'La Liga 2' },
        { key: 'soccer_japan_j_league', category: 'football', subCategory: 'j-league', title: 'J League' },
        { key: 'soccer_korea_kleague1', category: 'football', subCategory: 'k-league', title: 'K League 1' },
        { key: 'soccer_brazil_campeonato', category: 'football', subCategory: 'brazil', title: 'Brazil Série A' },
        { key: 'soccer_argentina_primera_division', category: 'football', subCategory: 'argentina', title: 'Argentina Primera' },
        { key: 'soccer_china_superleague', category: 'football', subCategory: 'china', title: 'China Super League' },
        { key: 'soccer_sweden_allsvenskan', category: 'football', subCategory: 'sweden', title: 'Sweden Allsvenskan' },
        
        // 농구 리그
        { key: 'basketball_nba', category: 'basketball', subCategory: 'nba', title: 'NBA' },
        { key: 'basketball_wnba', category: 'basketball', subCategory: 'wnba', title: 'WNBA' },
        
        // 야구 리그
        { key: 'baseball_mlb', category: 'baseball', subCategory: 'mlb', title: 'MLB' },
        { key: 'baseball_kbo', category: 'baseball', subCategory: 'kbo', title: 'KBO' },
        { key: 'baseball_ncaa', category: 'baseball', subCategory: 'ncaa', title: 'NCAA Baseball' },
        
        // 아이스하키
        { key: 'icehockey_nhl', category: 'icehockey', subCategory: 'nhl', title: 'NHL' },
        
        // 미식축구
        { key: 'americanfootball_nfl', category: 'americanfootball', subCategory: 'nfl', title: 'NFL' },
        { key: 'americanfootball_nfl_preseason', category: 'americanfootball', subCategory: 'nfl-preseason', title: 'NFL Preseason' },
        { key: 'americanfootball_ncaaf', category: 'americanfootball', subCategory: 'ncaaf', title: 'NCAA Football' },
        { key: 'americanfootball_cfl', category: 'americanfootball', subCategory: 'cfl', title: 'CFL' }
      ];

      for (const league of leagues) {
        try {
          console.log(`\nFetching odds for ${league.title} (${league.key})...`);
          
          const response = await axios.get(`${this.baseUrl}/${league.key}/odds`, {
            params: {
              apiKey: this.apiKey,
              regions: 'uk',
              markets: 'h2h,spreads,totals',
              oddsFormat: 'decimal'
            }
          });

          console.log(`Received ${response.data.length} games for ${league.title}`);

          // 기존 데이터 삭제
          await OddsCache.destroy({
            where: { sportKey: league.key }
          });

          // 새로운 데이터 저장
          for (const game of response.data) {
            if (game.bookmakers && game.bookmakers.length > 0) {
              const hasValidOdds = game.bookmakers.some(bookmaker => 
                bookmaker.markets && 
                bookmaker.markets.some(market => 
                  market.outcomes && 
                  market.outcomes.length > 0
                )
              );

              if (hasValidOdds) {
                try {
                  await OddsCache.create({
                    mainCategory: league.category,
                    subCategory: league.subCategory,
                    sportKey: league.key,
                    sportTitle: league.title,
                    commenceTime: new Date(game.commence_time),
                    homeTeam: game.home_team,
                    awayTeam: game.away_team,
                    bookmakers: game.bookmakers,
                    lastUpdated: new Date()
                  });
                  console.log(`Cached ${league.title} game: ${game.home_team} vs ${game.away_team}`);
                } catch (dbError) {
                  console.error(`Error caching ${league.title} game ${game.home_team} vs ${game.away_team}:`, dbError);
                }
              }
            }
          }
        } catch (leagueError) {
          console.error(`Error fetching odds for ${league.title}:`, leagueError.message);
          if (leagueError.response) {
            console.error('API Response:', leagueError.response.data);
          }
        }
      }

      console.log('\nOdds data caching completed');
    } catch (error) {
      console.error('Error in fetchAndCacheOdds:', error);
      if (error.response) {
        console.error('API Response:', error.response.data);
      }
      throw error;
    }
  }

  determineSubCategory(game, subcategories) {
    // 경기 정보에서 리그/토너먼트 정보 추출
    const gameInfo = game.sport_title.toLowerCase();
    
    // 가장 적합한 서브카테고리 찾기
    for (const [key, value] of Object.entries(subcategories)) {
      if (gameInfo.includes(key) || gameInfo.includes(value.toLowerCase())) {
        return key;
      }
    }
    
    // 기본값으로 'other' 반환
    return 'other';
  }

  async getCachedOdds(sportKey = null, subCategory = null, limit = 100) {
    try {
      const whereClause = {};
      if (sportKey) {
        whereClause.sportKey = sportKey;
      }
      if (subCategory) {
        whereClause.subCategory = subCategory;
      }

      console.log('Fetching cached odds with whereClause:', whereClause);

      const odds = await OddsCache.findAll({
        where: whereClause,
        order: [['commenceTime', 'ASC']],
        limit
      });

      console.log(`Found ${odds.length} cached odds`);

      // 데이터베이스 결과를 클라이언트 형식에 맞게 변환
      return odds.map(odd => ({
        id: odd.id,
        sport_key: odd.sportKey,
        sport_title: odd.sportTitle,
        commence_time: odd.commenceTime.toISOString(),
        home_team: odd.homeTeam,
        away_team: odd.awayTeam,
        bookmakers: odd.bookmakers
      }));
    } catch (error) {
      console.error('Error fetching cached odds:', error);
      throw error;
    }
  }

  async getCategories() {
    return sportsConfig;
  }
}

module.exports = new OddsApiService(); 