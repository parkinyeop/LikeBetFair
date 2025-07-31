import OddsCache from '../models/oddsCacheModel.js';
import OddsApiService from '../services/oddsApiService.js';
import { Op } from 'sequelize';

const oddsController = {
  getOdds: async (req, res) => {
    try {
      const { sport } = req.params;
      const { limit } = req.query; // limit 파라미터 추가
      
      // sportKey 매핑 (여러 형태의 키를 처리)
      const sportKeyMapping = {
        // 야구
        'baseball_mlb': ['baseball_mlb', 'MLB'],
        'MLB': ['baseball_mlb'], // MLB로 요청이 오면 baseball_mlb 데이터만 반환
        'baseball_kbo': ['baseball_kbo', 'KBO'],
        'KBO': ['baseball_kbo'], // KBO로 요청이 오면 baseball_kbo 데이터만 반환
        'baseball': ['baseball_mlb', 'MLB', 'baseball_kbo', 'KBO'],
        // 미식축구
        'americanfootball_nfl': ['americanfootball_nfl', 'NFL'],
        'NFL': ['americanfootball_nfl'], // NFL로 요청이 오면 americanfootball_nfl 데이터만 반환
        'americanfootball': ['americanfootball_nfl', 'NFL'],
        // 농구
        'basketball_nba': ['basketball_nba', 'NBA'],
        'NBA': ['basketball_nba'], // NBA로 요청이 오면 basketball_nba 데이터만 반환
        'basketball_kbl': ['basketball_kbl', 'KBL'],
        'KBL': ['basketball_kbl'], // KBL로 요청이 오면 basketball_kbl 데이터만 반환
        'basketball': ['basketball_nba', 'NBA', 'basketball_kbl', 'KBL'],
        // 축구 (영문/한글/코드 모두 포함)
        'soccer_usa_mls': ['soccer_usa_mls', 'MLS'],
        'MLS': ['soccer_usa_mls'], // MLS로 요청이 오면 soccer_usa_mls 데이터만 반환
        'soccer_korea_kleague1': ['soccer_korea_kleague1', 'K리그'],
        'K리그': ['soccer_korea_kleague1'], // K리그로 요청이 오면 soccer_korea_kleague1 데이터만 반환
        'soccer_japan_j_league': ['soccer_japan_j_league', 'J리그'],
        'J리그': ['soccer_japan_j_league'], // J리그로 요청이 오면 soccer_japan_j_league 데이터만 반환
        'soccer_italy_serie_a': ['soccer_italy_serie_a', '세리에 A', 'SERIE_A'],
        '세리에A': ['soccer_italy_serie_a'], // 세리에A로 요청이 오면 soccer_italy_serie_a 데이터만 반환
        'SERIE_A': ['soccer_italy_serie_a'], // SERIE_A로 요청이 오면 soccer_italy_serie_a 데이터만 반환
        'soccer_brazil_campeonato': ['soccer_brazil_campeonato', '브라질 세리에 A', 'BRASILEIRAO'],
        '브라질 세리에 A': ['soccer_brazil_campeonato'], // 브라질 세리에 A로 요청이 오면 soccer_brazil_campeonato 데이터만 반환
        'BRASILEIRAO': ['soccer_brazil_campeonato'], // BRASILEIRAO로 요청이 오면 soccer_brazil_campeonato 데이터만 반환
        'soccer_argentina_primera_division': ['soccer_argentina_primera_division', '아르헨티나 프리메라', 'ARGENTINA_PRIMERA'],
        '아르헨티나 프리메라': ['soccer_argentina_primera_division'], // 아르헨티나 프리메라로 요청이 오면 soccer_argentina_primera_division 데이터만 반환
        'ARGENTINA_PRIMERA': ['soccer_argentina_primera_division'], // ARGENTINA_PRIMERA로 요청이 오면 soccer_argentina_primera_division 데이터만 반환
        'soccer_china_superleague': ['soccer_china_superleague', '중국 슈퍼리그'],
        '중국 슈퍼리그': ['soccer_china_superleague'], // 중국 슈퍼리그로 요청이 오면 soccer_china_superleague 데이터만 반환
        'soccer_spain_primera_division': ['soccer_spain_primera_division', '라리가'],
        '라리가': ['soccer_spain_primera_division'], // 라리가로 요청이 오면 soccer_spain_primera_division 데이터만 반환
        'soccer_germany_bundesliga': ['soccer_germany_bundesliga', '분데스리가'],
        '분데스리가': ['soccer_germany_bundesliga'], // 분데스리가로 요청이 오면 soccer_germany_bundesliga 데이터만 반환
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
      
      // 현재 시간부터 30일 후까지 범위 계산 (미래 경기 중심)
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 디버깅을 위해 현재 시간과 필터링 범위 출력
      console.log(`[oddsController] 현재 시간 (UTC): ${now.toISOString()}`);
      console.log(`[oddsController] 필터링 범위: ${now.toISOString()} ~ ${thirtyDaysLater.toISOString()}`);

      console.log(`[oddsController] 필터링 조건:`, {
        sport,
        possibleKeys,
        now: now.toISOString(),
        thirtyDaysLater: thirtyDaysLater.toISOString()
      });
      
      const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      console.log(`[oddsController] 현재부터 30일 후 필터링:`, {
          currentTimeUTC: now.toISOString(),
          currentTimeKorea: koreaTime.toISOString().replace('Z', ' KST'),
          now: now.toISOString(),
          thirtyDaysLater: thirtyDaysLater.toISOString(),
          sport: sport
        });
      
      // limit 설정 (기본값: 제한없음, limit 파라미터가 있으면 해당 값 사용)
      const limitValue = limit ? parseInt(limit) : null;
      
      const cachedData = await OddsCache.findAll({
        where: {
          sportKey: { [Op.in]: possibleKeys },
          commenceTime: {
            [Op.gte]: now,              // 현재 시간부터
            [Op.lt]: thirtyDaysLater    // 30일 후까지
          }
        },
        order: [['commenceTime', 'ASC']],
        ...(limitValue && { limit: limitValue })
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

      // 필터링 조건을 만족하지 않는 데이터가 있는지 확인 (수정된 로직)
      const invalidData = cachedData.filter(game => {
        const gameTime = new Date(game.commenceTime);
        return gameTime < now || gameTime >= thirtyDaysLater;
      });
      
      if (invalidData.length > 0) {
        console.log(`[oddsController] ⚠️ 필터링 조건을 만족하지 않는 데이터 ${invalidData.length}개 발견:`);
        invalidData.slice(0, 3).forEach((game, i) => {
          console.log(`  ${i+1}. ${game.homeTeam} vs ${game.awayTeam} - ${game.commenceTime}`);
        });
      }

      // 동일 경기 중복 제거 (최신 odds만) - 개선된 로직
      const uniqueGames = [];
      const seen = new Set();
      for (const game of cachedData) {
        // commenceTime을 분 단위까지만 비교 (sportKey 제외)
        const date = new Date(game.commenceTime);
        const key = `${game.homeTeam}_${game.awayTeam}_${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}T${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')}`;
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