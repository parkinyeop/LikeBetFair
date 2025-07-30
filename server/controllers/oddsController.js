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
        'KBO': ['baseball_kbo'], // KBO로 요청이 오면 baseball_kbo 데이터만 반환
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
      
      // 오늘부터 30일 후까지 범위 계산 (UTC 기준) - 미래 경기만 포함
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setUTCDate(today.getUTCDate() + 30);

      // 디버깅을 위해 현재 시간과 필터링 범위 출력
      console.log(`[oddsController] 현재 시간 (UTC): ${now.toISOString()}`);
      console.log(`[oddsController] 오늘 시작 (UTC): ${today.toISOString()}`);
      console.log(`[oddsController] 필터링 범위: ${today.toISOString()} ~ ${thirtyDaysLater.toISOString()}`);

      console.log(`[oddsController] 필터링 조건:`, {
        sport,
        possibleKeys,
        today: today.toISOString(),
        thirtyDaysLater: thirtyDaysLater.toISOString(),
        now: now.toISOString()
      });

      // 현재 시간 이후의 경기만 조회 (미래 경기)
      const cachedData = await OddsCache.findAll({
        where: {
          sportKey: { [Op.in]: possibleKeys },
          commenceTime: {
            [Op.gte]: now // 현재 시간 이후의 경기만
          }
        },
        order: [['commenceTime', 'ASC']]
      });

      console.log(`[oddsController] DB에서 조회된 데이터 수:`, cachedData.length);
      console.log(`[oddsController] 검색한 키:`, possibleKeys);
      
      if (cachedData.length === 0) {
        console.log(`[oddsController] ⚠️ 데이터베이스에서 ${sport} 관련 데이터를 찾을 수 없습니다.`);
        console.log(`[oddsController] 검색한 키:`, possibleKeys);
        
        // 전체 데이터베이스에서 sportKey 확인
        const allSportKeys = await OddsCache.findAll({
          attributes: ['sportKey'],
          group: ['sportKey']
        });
        console.log(`[oddsController] 데이터베이스에 있는 모든 sportKey:`, allSportKeys.map(item => item.sportKey));
        
        return res.status(404).json({ message: 'No odds data found for this sport' });
      }

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

      // 성공적으로 필터링된 데이터 로그
      console.log(`[oddsController] ✅ 현재 시간 이후 경기만 필터링됨: ${cachedData.length}개`);
      if (cachedData.length > 0) {
        const firstGame = cachedData[0];
        const lastGame = cachedData[cachedData.length - 1];
        console.log(`[oddsController] 첫 경기: ${firstGame.homeTeam} vs ${firstGame.awayTeam} - ${firstGame.commenceTime}`);
        console.log(`[oddsController] 마지막 경기: ${lastGame.homeTeam} vs ${lastGame.awayTeam} - ${lastGame.commenceTime}`);
      }

      // 동일 경기 중복 제거 (덜 제한적인 로직) - 같은 날 같은 팀끼리만 중복으로 처리
      const uniqueGames = [];
      const seen = new Set();
      for (const game of cachedData) {
        // 날짜만 비교하여 중복 제거 (시간은 무시)
        const date = new Date(game.commenceTime);
        const dateOnly = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
        const key = `${game.homeTeam}_${game.awayTeam}_${dateOnly}`;
        if (!seen.has(key)) {
          uniqueGames.push(game);
          seen.add(key);
        } else {
          // 같은 키가 있으면 더 최신 데이터를 선택 (updatedAt 기준)
          const existingIndex = uniqueGames.findIndex(g => {
            const existingDate = new Date(g.commenceTime);
            const existingDateOnly = `${existingDate.getUTCFullYear()}-${String(existingDate.getUTCMonth()+1).padStart(2,'0')}-${String(existingDate.getUTCDate()).padStart(2,'0')}`;
            return `${g.homeTeam}_${g.awayTeam}_${existingDateOnly}` === key;
          });
          if (existingIndex !== -1 && new Date(game.updatedAt) > new Date(uniqueGames[existingIndex].updatedAt)) {
            uniqueGames[existingIndex] = game; // 더 최신 데이터로 교체
          }
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

      // 🔧 수정된 데이터 포맷 변환
      const formattedData = uniqueGames.map(game => {
        // 🔧 게임의 실제 sportKey를 사용하여 제목 매핑
        const actualSportKey = game.sportKey;
        const sportTitle = sportTitleMapping[actualSportKey] || game.sportTitle || actualSportKey;
        
        console.log(`[oddsController] 게임 포맷팅:`, {
          actualSportKey,
          sportTitle,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          hasOfficialOdds: !!game.officialOdds,
          hasBookmakers: !!game.bookmakers
        });
        
        return {
          id: game.id,
          sportKey: game.sportKey,
          sportTitle: sportTitle,
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          commence_time: game.commenceTime,
          // 🔧 배당률 데이터 처리 개선
          odds: game.officialOdds ? 
            (typeof game.officialOdds === 'string' ? JSON.parse(game.officialOdds) : game.officialOdds) : 
            null,
          bookmakers: game.bookmakers ? 
            (typeof game.bookmakers === 'string' ? JSON.parse(game.bookmakers) : game.bookmakers) : 
            null,
          officialOdds: game.officialOdds ? 
            (typeof game.officialOdds === 'string' ? JSON.parse(game.officialOdds) : game.officialOdds) : 
            null
        };
      });

      console.log(`[oddsController] 중복 제거 전: ${cachedData.length}개`);
      console.log(`[oddsController] 중복 제거 후: ${uniqueGames.length}개`);
      console.log(`[oddsController] 최종 반환 데이터 수:`, formattedData.length);
      if (formattedData.length > 0) {
        console.log(`[oddsController] 첫 번째 게임 샘플:`, {
          id: formattedData[0].id,
          sportTitle: formattedData[0].sportTitle,
          home_team: formattedData[0].home_team,
          away_team: formattedData[0].away_team,
          hasOdds: !!formattedData[0].odds,
          hasBookmakers: !!formattedData[0].bookmakers
        });
      }

      res.json(formattedData);
    } catch (err) {
      console.error('Error fetching odds from database:', err);
      res.status(500).json({ 
        message: 'Failed to fetch odds from database',
        error: err.message 
      });
    }
  },

  updateOdds: async (req, res) => {
    try {
      console.log('[DEBUG] updateOdds API 호출됨');
      
      const startTime = Date.now();
      const result = await OddsApiService.fetchAndCacheOdds();
      const processingTime = Date.now() - startTime;
      
      console.log(`[DEBUG] updateOdds 완료 - 처리시간: ${processingTime}ms`, result);
      
      res.json({
        success: true,
        message: 'Odds updated successfully',
        result,
        processingTime
      });
    } catch (err) {
      console.error('[DEBUG] Error updating odds:', err);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update odds',
        error: err.message 
      });
    }
  }
};

export { oddsController }; 