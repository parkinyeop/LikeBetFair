import OddsCache from '../models/oddsCacheModel.js';
import OddsApiService from '../services/oddsApiService.js';
import { Op } from 'sequelize';

const oddsController = {
  getOdds: async (req, res) => {
    try {
      const { sport } = req.params;
      
      // sportKey 매핑 (여러 형태의 키를 처리)
      const sportKeyMapping = {
        // 야구
        'baseball_mlb': ['baseball_mlb', 'MLB'],
        'MLB': ['MLB', 'baseball_mlb'],
        'baseball_kbo': ['baseball_kbo', 'KBO'],
        'KBO': ['KBO', 'baseball_kbo'],
        'baseball': ['baseball_mlb', 'MLB', 'baseball_kbo', 'KBO'],
        // 미식축구
        'americanfootball_nfl': ['americanfootball_nfl', 'NFL'],
        'NFL': ['NFL', 'americanfootball_nfl'],
        'americanfootball': ['americanfootball_nfl', 'NFL'],
        // 농구
        'basketball_nba': ['basketball_nba', 'NBA'],
        'NBA': ['NBA', 'basketball_nba'],
        'basketball_kbl': ['basketball_kbl', 'KBL'],
        'KBL': ['KBL', 'basketball_kbl'],
        'basketball': ['basketball_nba', 'NBA', 'basketball_kbl', 'KBL'],
        // 축구 (영문/한글/코드 모두 포함)
        'soccer_usa_mls': ['soccer_usa_mls', 'MLS'],
        'MLS': ['MLS', 'soccer_usa_mls'],
        'soccer_korea_kleague1': ['soccer_korea_kleague1', 'K리그'],
        'K리그': ['K리그', 'soccer_korea_kleague1'],
        'soccer_japan_j_league': ['soccer_japan_j_league', 'J리그'],
        'J리그': ['J리그', 'soccer_japan_j_league'],
        'soccer_italy_serie_a': ['soccer_italy_serie_a', '세리에 A', 'SERIE_A'],
        '세리에A': ['세리에 A', 'SERIE_A', 'soccer_italy_serie_a'],
        'SERIE_A': ['SERIE_A', '세리에 A', 'soccer_italy_serie_a'],
        'soccer_brazil_campeonato': ['soccer_brazil_campeonato', '브라질 세리에 A', 'BRASILEIRAO'],
        '브라질 세리에 A': ['브라질 세리에 A', 'BRASILEIRAO', 'soccer_brazil_campeonato'],
        'BRASILEIRAO': ['BRASILEIRAO', '브라질 세리에 A', 'soccer_brazil_campeonato'],
        'soccer_argentina_primera_division': ['soccer_argentina_primera_division', '아르헨티나 프리메라', 'ARGENTINA_PRIMERA'],
        '아르헨티나 프리메라': ['아르헨티나 프리메라', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division'],
        'ARGENTINA_PRIMERA': ['ARGENTINA_PRIMERA', '아르헨티나 프리메라', 'soccer_argentina_primera_division'],
        'soccer_china_superleague': ['soccer_china_superleague', '중국 슈퍼리그'],
        '중국 슈퍼리그': ['중국 슈퍼리그', 'soccer_china_superleague'],
        'soccer_spain_primera_division': ['soccer_spain_primera_division', '라리가'],
        '라리가': ['라리가', 'soccer_spain_primera_division'],
        'soccer_germany_bundesliga': ['soccer_germany_bundesliga', '분데스리가'],
        '분데스리가': ['분데스리가', 'soccer_germany_bundesliga'],
        'soccer': [
          'soccer_usa_mls', 'MLS',
          'soccer_korea_kleague1', 'K리그',
          'soccer_japan_j_league', 'J리그',
          'soccer_italy_serie_a', '세리에 A', 'SERIE_A',
          'soccer_brazil_campeonato', '브라질 세리에 A', 'BRASILEIRAO',
          'soccer_argentina_primera_division', '아르헨티나 프리메라', 'ARGENTINA_PRIMERA',
          'soccer_china_superleague', '중국 슈퍼리그',
          'soccer_spain_primera_division', '라리가',
          'soccer_germany_bundesliga', '분데스리가'
        ]
      };
      
      const possibleKeys = sportKeyMapping[sport] || [sport];
      
      // 7일 전~7일 후까지 범위 계산 (UTC 기준)
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const weekAgo = new Date(today);
      weekAgo.setUTCDate(today.getUTCDate() - 7);
      const weekLater = new Date(today);
      weekLater.setUTCDate(today.getUTCDate() + 7);

      console.log(`[oddsController] 필터링 조건:`, {
        sport,
        possibleKeys,
        weekAgo: weekAgo.toISOString(),
        today: today.toISOString(),
        weekLater: weekLater.toISOString(),
        now: now.toISOString()
      });

      // DB에서 모든 데이터를 먼저 조회 (필터링 전)
      const allData = await OddsCache.findAll({
        where: {
          sportKey: { [Op.in]: possibleKeys }
        },
        order: [['commenceTime', 'ASC']]
      });

      console.log(`[oddsController] 필터링 전 전체 데이터 수:`, allData.length);

      // 필터링 적용
      const cachedData = allData.filter(game => {
        const gameTime = new Date(game.commenceTime);
        const isValid = gameTime >= weekAgo && gameTime < weekLater;
        if (!isValid) {
          console.log(`[oddsController] 필터링 제외: ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime} (${gameTime.toISOString()})`);
        }
        return isValid;
      });

      console.log(`[oddsController] 필터링 후 데이터 수:`, cachedData.length);

      if (cachedData.length > 0) {
        console.log(`[oddsController] 첫 번째 경기:`, {
          homeTeam: cachedData[0].homeTeam,
          awayTeam: cachedData[0].awayTeam,
          commenceTime: cachedData[0].commenceTime,
          sportKey: cachedData[0].sportKey
        });
        console.log(`[oddsController] 마지막 경기:`, {
          homeTeam: cachedData[cachedData.length-1].homeTeam,
          awayTeam: cachedData[cachedData.length-1].awayTeam,
          commenceTime: cachedData[cachedData.length-1].commenceTime,
          sportKey: cachedData[cachedData.length-1].sportKey
        });
      }

      // 필터링 조건을 만족하지 않는 데이터가 있는지 확인
      const invalidData = cachedData.filter(game => {
        const gameTime = new Date(game.commenceTime);
        return gameTime < weekAgo || gameTime >= weekLater;
      });
      
      if (invalidData.length > 0) {
        console.log(`[oddsController] ⚠️ 필터링 조건을 만족하지 않는 데이터 ${invalidData.length}개 발견:`);
        invalidData.slice(0, 3).forEach((game, i) => {
          console.log(`  ${i+1}. ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime}`);
        });
      }

      // 동일 경기 중복 제거 (최신 odds만)
      const uniqueGames = [];
      const seen = new Set();
      for (const game of cachedData) {
        // commenceTime을 분 단위까지만 비교
        const date = new Date(game.commenceTime);
        const key = `${game.sportKey}_${game.homeTeam}_${game.awayTeam}_${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}T${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')}`;
        if (!seen.has(key)) {
          uniqueGames.push(game);
          seen.add(key);
        }
      }

      if (!uniqueGames || uniqueGames.length === 0) {
        return res.status(404).json({ message: 'No odds data found for this sport' });
      }

      // 스포츠 제목 매핑
      const sportTitleMapping = {
        'soccer_korea_kleague1': 'K League 1',
        'soccer_japan_j_league': 'J League',
        'soccer_italy_serie_a': 'Serie A',
        'soccer_brazil_campeonato': 'Brasileirão',
        'soccer_usa_mls': 'Major League Soccer',
        'soccer_argentina_primera_division': 'Primera División',
        'soccer_china_superleague': 'Chinese Super League',
        'soccer_spain_primera_division': 'La Liga',
        'soccer_germany_bundesliga': 'Bundesliga',
        'basketball_nba': 'NBA',
        'basketball_kbl': 'KBL',
        'baseball_mlb': 'MLB',
        'baseball_kbo': 'KBO',
        'americanfootball_nfl': 'NFL'
      };

      // 데이터 포맷 변환
      const formattedData = uniqueGames.map(game => {
        const standardSportKey = sport;
        const sportTitle = sportTitleMapping[sport] || game.subCategory || sport;
        
        console.log(`[oddsController] sport: ${sport}, sportTitle: ${sportTitle}, game.subCategory: ${game.subCategory}`);
        
        return {
          id: game.id,
          sport_key: standardSportKey,
          sport_title: sportTitle,
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          commence_time: game.commenceTime,
          odds: game.officialOdds
        };
      });

      res.json(formattedData);
    } catch (err) {
      console.error('Error fetching odds from database:', err);
      res.status(500).json({ 
        message: 'Failed to fetch odds from database',
        error: err.message 
      });
    }
  }
};

export { oddsController }; 