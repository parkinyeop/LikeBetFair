import OddsCache from '../models/oddsCacheModel.js';
import OddsApiService from '../services/oddsApiService.js';
import { Op } from 'sequelize';

const oddsController = {
  getOdds: async (req, res) => {
    try {
      const { sport } = req.params;
      
      // sportKey 매핑 (여러 형태의 키를 처리)
      const sportKeyMapping = {
        'soccer_korea_kleague1': ['soccer_korea_kleague1', 'K리그'],
        'soccer_japan_j_league': ['soccer_japan_j_league', 'J리그'],
        'soccer_italy_serie_a': ['soccer_italy_serie_a', '세리에 A'],
        'soccer_brazil_campeonato': ['soccer_brazil_campeonato', '브라질 세리에 A'],
        'soccer_usa_mls': ['soccer_usa_mls', 'MLS'],
        'soccer_argentina_primera_division': ['soccer_argentina_primera_division', '아르헨티나 프리메라'],
        'soccer_china_superleague': ['soccer_china_superleague', '중국 슈퍼리그'],
        'soccer_spain_primera_division': ['soccer_spain_primera_division', '라리가'],
        'soccer_germany_bundesliga': ['soccer_germany_bundesliga', '분데스리가'],
        'basketball_nba': ['basketball_nba', 'NBA'],
        'basketball_kbl': ['basketball_kbl', 'KBL'],
        'baseball_mlb': ['baseball_mlb', 'MLB'],
        'baseball_kbo': ['baseball_kbo', 'KBO'],
        'americanfootball_nfl': ['americanfootball_nfl', 'americansoccer_nfl', 'americansoccer', 'NFL']
      };
      
      const possibleKeys = sportKeyMapping[sport] || [sport];
      
      // 오늘~7일 후까지 범위 계산 (UTC 기준)
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const weekLater = new Date(today);
      weekLater.setUTCDate(today.getUTCDate() + 7);

      // DB에서 오늘~7일 후까지 경기만 조회 (여러 sportKey 포함)
      const cachedData = await OddsCache.findAll({
        where: {
          sportKey: { [Op.in]: possibleKeys },
          commenceTime: { [Op.gte]: today, [Op.lt]: weekLater }
        },
        order: [['commenceTime', 'DESC']]
      });

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
          odds: game.odds,
          bookmakers: game.bookmakers
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