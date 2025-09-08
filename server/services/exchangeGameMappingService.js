import GameResult from '../models/gameResultModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import OddsCache from '../models/oddsCacheModel.js';
import { Op } from 'sequelize';

/**
 * Exchange Orders와 GameResults 매핑 서비스
 * - 게임 데이터 연동
 * - 자동 정산을 위한 매핑 관리
 */
class ExchangeGameMappingService {
  constructor() {
    this.sportKeyMap = {
      'soccer_korea_kleague1': 'K리그',
      'soccer_japan_j_league': 'J리그',
      'soccer_italy_serie_a': '세리에 A',
      'soccer_brazil_campeonato': '브라질 세리에 A',
      'soccer_usa_mls': 'MLS',
      'soccer_argentina_primera_division': '아르헨티나 프리메라',
      'soccer_china_superleague': '중국 슈퍼리그',
      'soccer_spain_primera_division': '라리가',
      'soccer_germany_bundesliga': '분데스리가',
      'basketball_nba': 'NBA',
      'basketball_kbl': 'KBL',
      'baseball_mlb': 'MLB',
      'baseball_kbo': 'KBO',
      'americanfootball_nfl': 'NFL'
    };
  }

  /**
   * OddsCache에서 Exchange 가능한 게임 목록 조회 (플레이북 데이터 활용)
   * @param {Object} filters - 필터 옵션
   * @returns {Array} 게임 목록
   */
  async getAvailableGames(filters = {}) {
    console.log('🎮 Exchange 게임 조회 필터:', filters);
    
    // 오늘~7일 후까지 범위 계산 (UTC 기준)
    const now = new Date();
    // UTC 기준으로 오늘 날짜 계산 (9시간 연산 제거)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekLater = new Date(today);
    weekLater.setUTCDate(today.getUTCDate() + 7);

    const whereCondition = {
      commenceTime: { [Op.gte]: today, [Op.lt]: weekLater }
    };

    // 스포츠키 필터 적용
    if (filters.sportKey) {
      // 스포츠키 매핑 (여러 형태 지원)
      const sportKeyMapping = {
        'baseball_kbo': ['baseball_kbo', 'KBO'],
        'baseball_mlb': ['baseball_mlb', 'MLB'],
        'basketball_nba': ['basketball_nba', 'NBA'],
        'basketball_kbl': ['basketball_kbl', 'KBL'],
        'soccer_korea_kleague1': ['soccer_korea_kleague1', 'K리그', 'KOREA_KLEAGUE1'],
        'soccer_japan_j_league': ['soccer_japan_j_league', 'J리그', 'JAPAN_J_LEAGUE'],
        'soccer_usa_mls': ['soccer_usa_mls', 'MLS', 'USA_MLS'],
        'soccer_brazil_campeonato': ['soccer_brazil_campeonato', '브라질 세리에 A', 'BRASIL_CAMPEONATO'],
        'soccer_argentina_primera_division': ['soccer_argentina_primera_division', '아르헨티나 프리메라', 'ARGENTINA_PRIMERA_DIVISION'],
        'soccer_china_superleague': ['soccer_china_superleague', '중국 슈퍼리그', 'CHINA_SUPERLEAGUE'],
        'soccer_italy_serie_a': ['soccer_italy_serie_a', '세리에 A', 'ITALY_SERIE_A'],
        'soccer_spain_primera_division': ['soccer_spain_primera_division', '라리가', 'SPAIN_PRIMERA_DIVISION'],
        'soccer_germany_bundesliga': ['soccer_germany_bundesliga', '분데스리가', 'GERMANY_BUNDESLIGA'],
        'americanfootball_nfl': ['americanfootball_nfl', 'NFL', 'AMERICANFOOTBALL_NFL']
      };
      
      const possibleKeys = sportKeyMapping[filters.sportKey] || [filters.sportKey];
      whereCondition.sportKey = { [Op.in]: possibleKeys };
      console.log('🔍 스포츠키 매핑:', { requested: filters.sportKey, mapped: possibleKeys });
    }

    const games = await OddsCache.findAll({
      where: whereCondition,
      order: [['commenceTime', 'ASC']],
      limit: filters.limit || 50
    });

    console.log(`📊 OddsCache에서 조회된 게임 수: ${games.length}개`);

    // 동일 경기 중복 제거 (최신 odds만)
    const uniqueGames = [];
    const seen = new Set();
    for (const game of games) {
      const date = new Date(game.commenceTime);
      const key = `${game.sportKey}_${game.homeTeam}_${game.awayTeam}_${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}T${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')}`;
      if (!seen.has(key)) {
        uniqueGames.push(game);
        seen.add(key);
      }
    }

    console.log(`📊 중복 제거 후 게임 수: ${uniqueGames.length}개`);

    return uniqueGames.map(game => this.formatOddsCacheForExchange(game));
  }

  /**
   * OddsCache에서 경기 정보 및 배당율 조회 (GameResult 의존성 제거)
   * @param {string} gameId - 게임 ID
   * @param {string} selection - 선택한 팀명
   * @param {string} side - 주문 타입 (back/lay)
   * @returns {Object} - { homeTeam, awayTeam, commenceTime, mainCategory, subCategory, backOdds, layOdds, oddsSource }
   */
  async getOddsCacheData(gameId, selection, side = 'back') {
    try {
      // 1. OddsCache에서 경기 정보 조회 (gameId로 직접 검색)
      const oddsCache = await OddsCache.findOne({
        where: {
          [Op.or]: [
            { id: gameId },
            { sportKey: gameId }
          ]
        },
        order: [['lastUpdated', 'DESC']]
      });

      // 2. gameId로 직접 찾지 못하면, GameResult에서 경기 정보를 가져와서 OddsCache 검색
      if (!oddsCache) {
        const gameResult = await GameResult.findOne({
          where: {
            [Op.or]: [
              { id: gameId },
              { eventId: gameId }
            ]
          }
        });

        if (gameResult) {
          // GameResult 정보로 OddsCache 검색
          const foundOddsCache = await OddsCache.findOne({
            where: {
              mainCategory: gameResult.mainCategory,
              subCategory: gameResult.subCategory,
              homeTeam: gameResult.homeTeam,
              awayTeam: gameResult.awayTeam,
              commenceTime: {
                [Op.between]: [
                  new Date(gameResult.commenceTime.getTime() - 12 * 60 * 60 * 1000), // 12시간 전
                  new Date(gameResult.commenceTime.getTime() + 12 * 60 * 60 * 1000)  // 12시간 후
                ]
              }
            },
            order: [['lastUpdated', 'DESC']]
          });

          if (foundOddsCache) {
            // OddsCache에서 경기 정보 반환
            return {
              homeTeam: foundOddsCache.homeTeam,
              awayTeam: foundOddsCache.awayTeam,
              commenceTime: foundOddsCache.commenceTime,
              mainCategory: foundOddsCache.mainCategory,
              subCategory: foundOddsCache.subCategory,
              gameResultId: gameResult.id,
              ...await this.extractOddsFromCache(foundOddsCache, selection, side)
            };
          }
        }

        console.log('⚠️ OddsCache에서 경기 정보를 찾을 수 없음:', gameId);
        return { 
          homeTeam: null, 
          awayTeam: null, 
          commenceTime: null, 
          mainCategory: null, 
          subCategory: null,
          backOdds: null, 
          layOdds: null, 
          oddsSource: null 
        };
      }

      // 3. OddsCache에서 경기 정보 및 배당율 추출
      const oddsData = await this.extractOddsFromCache(oddsCache, selection, side);
      
      return {
        homeTeam: oddsCache.homeTeam,
        awayTeam: oddsCache.awayTeam,
        commenceTime: oddsCache.commenceTime,
        mainCategory: oddsCache.mainCategory,
        subCategory: oddsCache.subCategory,
        gameResultId: null, // OddsCache에서 직접 가져온 경우
        ...oddsData
      };

    } catch (error) {
      console.error('❌ OddsCache 데이터 조회 중 오류:', error);
      return { 
        homeTeam: null, 
        awayTeam: null, 
        commenceTime: null, 
        mainCategory: null, 
        subCategory: null,
        backOdds: null, 
        layOdds: null, 
        oddsSource: null 
      };
    }
  }

  /**
   * OddsCache에서 배당율 추출
   * @param {Object} oddsCache - OddsCache 객체
   * @param {string} selection - 선택한 팀명
   * @param {string} side - 주문 타입 (back/lay)
   * @returns {Object} - { backOdds, layOdds, oddsSource }
   */
  async extractOddsFromCache(oddsCache, selection, side = 'back') {
    try {
      if (!oddsCache || !oddsCache.bookmakers) {
        console.log('⚠️ OddsCache에 북메이커 데이터 없음');
        return { backOdds: null, layOdds: null, oddsSource: null };
      }

      // 첫 번째 북메이커 사용
      const bookmaker = oddsCache.bookmakers[0];
      if (!bookmaker || !bookmaker.markets) {
        console.log('⚠️ 북메이커 마켓 데이터 없음');
        return { backOdds: null, layOdds: null, oddsSource: null };
      }

      // h2h 마켓에서 배당율 찾기
      const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
      if (!h2hMarket || !h2hMarket.outcomes) {
        console.log('⚠️ h2h 마켓 데이터 없음');
        return { backOdds: null, layOdds: null, oddsSource: null };
      }

      // 선택한 팀의 배당율 찾기
      const selectedOutcome = h2hMarket.outcomes.find(outcome => 
        outcome.name === selection || 
        outcome.name.includes(selection) || 
        selection.includes(outcome.name)
      );

      if (!selectedOutcome) {
        console.log('⚠️ 선택한 팀의 배당율을 찾을 수 없음:', { selection, outcomes: h2hMarket.outcomes.map(o => o.name) });
        return { backOdds: null, layOdds: null, oddsSource: null };
      }

      // 상대팀 outcome 찾기
      const opposingOutcome = h2hMarket.outcomes.find(outcome => outcome.name !== selectedOutcome.name);
      
      let backOdds, layOdds;
      
      if (side === 'lay') {
        // Lay 주문: 선택한 팀을 Lay, 상대팀을 Back
        backOdds = opposingOutcome ? opposingOutcome.price : null;
        layOdds = selectedOutcome.price;
      } else {
        // Back 주문: 선택한 팀을 Back, 상대팀을 Lay
        backOdds = selectedOutcome.price;
        layOdds = opposingOutcome ? opposingOutcome.price : null;
      }

      console.log('✅ OddsCache에서 배당율 추출 성공:', {
        selection,
        side,
        backOdds,
        layOdds,
        oddsSource: bookmaker.title
      });

      return {
        backOdds: backOdds !== null ? parseFloat(backOdds.toFixed(2)) : null,
        layOdds: layOdds !== null ? parseFloat(layOdds.toFixed(2)) : null,
        oddsSource: bookmaker.title
      };

    } catch (error) {
      console.error('❌ 배당율 추출 중 오류:', error);
      return { backOdds: null, layOdds: null, oddsSource: null };
    }
  }

  /**
   * Exchange Order 생성 시 게임 정보 자동 매핑 (OddsCache 우선)
   * @param {Object} orderData - 주문 데이터
   * @returns {Object} 매핑된 주문 데이터
   */
  async mapGameDataToOrder(orderData) {
    try {
      // 1. OddsCache에서 경기 정보 및 배당율 조회 (GameResult 의존성 제거)
      const mappedData = { ...orderData };
      
      console.log('🔍 mapGameDataToOrder 시작:', {
        gameId: orderData.gameId,
        selection: orderData.selection,
        side: orderData.side,
        originalCommenceTime: orderData.commenceTime,
        originalCommenceTimeType: typeof orderData.commenceTime
      });
      
      if (orderData.gameId && orderData.selection) {
        const oddsCacheData = await this.getOddsCacheData(orderData.gameId, orderData.selection, orderData.side);
        
        // OddsCache에서 경기 정보 매핑
        if (oddsCacheData.homeTeam && oddsCacheData.awayTeam) {
          mappedData.homeTeam = oddsCacheData.homeTeam;
          mappedData.awayTeam = oddsCacheData.awayTeam;
          mappedData.commenceTime = oddsCacheData.commenceTime;
          // ❌ DEPRECATED: gameResultId 매핑 제거 (경기 식별자 방식으로 대체)
          // mappedData.gameResultId = oddsCacheData.gameResultId;
          mappedData.sportKey = this.getSportKeyFromCategories(
            oddsCacheData.mainCategory, 
            oddsCacheData.subCategory
          );
          
          // 🆕 디버깅: commenceTime 매핑 결과 확인
          console.log('🔍 commenceTime 매핑 결과:', {
            gameId: orderData.gameId,
            originalCommenceTime: orderData.commenceTime,
            oddsCacheCommenceTime: oddsCacheData.commenceTime,
            mappedCommenceTime: mappedData.commenceTime,
            mappedCommenceTimeType: typeof mappedData.commenceTime,
            mappedCommenceTimeISO: mappedData.commenceTime?.toISOString()
          });
          
          // 배당율 설정
          mappedData.backOdds = oddsCacheData.backOdds;
          mappedData.layOdds = oddsCacheData.layOdds;
          mappedData.oddsSource = oddsCacheData.oddsSource;
          mappedData.oddsUpdatedAt = new Date();

          console.log('✅ OddsCache 기반 게임 매핑 성공:', {
            gameId: orderData.gameId,
            homeTeam: mappedData.homeTeam,
            awayTeam: mappedData.awayTeam,
            sportKey: mappedData.sportKey,
            selection: orderData.selection,
            side: orderData.side,
            backOdds: mappedData.backOdds,
            layOdds: mappedData.layOdds,
            oddsSource: mappedData.oddsSource,
            commenceTime: mappedData.commenceTime
          });
        } else {
          console.log('⚠️ OddsCache에서 경기 정보를 찾을 수 없음:', orderData.gameId);
        }
      }

      // 2. selectionDetails 구조화
      mappedData.selectionDetails = this.createSelectionDetails(mappedData);

      // 🆕 디버깅: 최종 매핑 결과 확인
      console.log('🔍 최종 매핑 결과:', {
        gameId: orderData.gameId,
        homeTeam: mappedData.homeTeam,
        awayTeam: mappedData.awayTeam,
        commenceTime: mappedData.commenceTime,
        commenceTimeType: typeof mappedData.commenceTime,
        commenceTimeISO: mappedData.commenceTime?.toISOString()
      });

      return mappedData;

    } catch (error) {
      console.error('게임 데이터 매핑 중 오류:', error);
      return orderData; // 원본 데이터 반환
    }
  }

  /**
   * 베팅 선택 상세 정보 구조화
   * @param {Object} orderData - 주문 데이터
   * @returns {Object} 구조화된 선택 정보
   */
  createSelectionDetails(orderData) {
    const details = {
      marketType: orderData.market,
      side: orderData.side,
      line: orderData.line,
      price: orderData.price,
      teamSelection: null,
      outcome: null
    };

    // market별 상세 정보 설정
    switch (orderData.market) {
      case 'h2h':
        // 승패 베팅
        if (orderData.selection) {
          details.teamSelection = orderData.selection;
          details.outcome = orderData.selection === orderData.homeTeam ? 'home_win' : 'away_win';
        }
        break;

      case 'spreads':
        // 핸디캡 베팅
        details.handicap = orderData.line;
        if (orderData.selection) {
          details.teamSelection = orderData.selection;
          const isHome = orderData.selection.includes(orderData.homeTeam);
          details.outcome = isHome ? 'home_cover' : 'away_cover';
        }
        break;

      case 'totals':
        // 토탈 베팅
        details.totalLine = orderData.line;
        if (orderData.selection) {
          details.outcome = orderData.selection.toLowerCase().includes('over') ? 'over' : 'under';
        }
        break;

      default:
        details.customMarket = orderData.market;
    }

    return details;
  }

  /**
   * sportKey를 mainCategory, subCategory로 매핑
   * @param {string} sportKey 
   * @returns {Object} 매핑 정보
   */
  getSportKeyMapping(sportKey) {
    const mappings = {
      'baseball_kbo': { mainCategory: 'baseball', subCategory: 'KBO' },
      'baseball_mlb': { mainCategory: 'baseball', subCategory: 'MLB' },
      'soccer_k_league': { mainCategory: 'soccer', subCategory: 'KLEAGUE1' },
      'soccer_j_league': { mainCategory: 'soccer', subCategory: 'J리그' },
      'soccer_epl': { mainCategory: 'soccer', subCategory: 'EPL' },
      'soccer_laliga': { mainCategory: 'soccer', subCategory: 'LALIGA' },
      'soccer_bundesliga': { mainCategory: 'soccer', subCategory: 'BUNDESLIGA' },
      'soccer_serie_a': { mainCategory: 'soccer', subCategory: '세리에A' },
      'soccer_mls': { mainCategory: 'soccer', subCategory: 'MLS' },
      'soccer_brasileirao': { mainCategory: 'soccer', subCategory: 'BRASILEIRAO' },
      'soccer_argentina_primera': { mainCategory: 'soccer', subCategory: 'ARGENTINA_PRIMERA' },
      'soccer_chinese_super_league': { mainCategory: 'soccer', subCategory: 'CSL' },
      'basketball_nba': { mainCategory: 'basketball', subCategory: 'NBA' },
      'basketball_kbl': { mainCategory: 'basketball', subCategory: 'KBL' },
      'americanfootball_nfl': { mainCategory: 'american_football', subCategory: 'NFL' }
    };

    return mappings[sportKey] || null;
  }

  /**
   * mainCategory, subCategory를 sportKey로 변환
   * @param {string} mainCategory 
   * @param {string} subCategory 
   * @returns {string} sportKey
   */
  getSportKeyFromCategories(mainCategory, subCategory) {
    // 대소문자 일치를 위해 소문자로 변환
    const mainCat = mainCategory?.toLowerCase() || '';
    const subCat = subCategory?.toLowerCase() || '';
    
    const mappings = {
      'baseball_kbo': 'baseball_kbo',
      'baseball_mlb': 'baseball_mlb',
      'soccer_kleague1': 'soccer_k_league',
      'soccer_k리그': 'soccer_k_league',
      'soccer_j_league': 'soccer_j_league',
      'soccer_j리그': 'soccer_j_league',
      'soccer_epl': 'soccer_epl',
      'soccer_laliga': 'soccer_laliga',
      'soccer_라리가': 'soccer_laliga',
      'soccer_bundesliga': 'soccer_bundesliga',
      'soccer_분데스리가': 'soccer_bundesliga',
      'soccer_serie_a': 'soccer_serie_a',
      'soccer_세리에 a': 'soccer_serie_a',
      'soccer_mls': 'soccer_mls',
      'soccer_brasileirao': 'soccer_brazil_campeonato',
      'soccer_브라질 세리에 a': 'soccer_brazil_campeonato',
      'soccer_brazil_campeonato': 'soccer_brazil_campeonato',
      'soccer_argentina_primera': 'soccer_argentina_primera',
      'soccer_아르헨티나 프리메라': 'soccer_argentina_primera',
      'soccer_csl': 'soccer_chinese_super_league',
      'soccer_중국 슈퍼리그': 'soccer_chinese_super_league',
      'basketball_nba': 'basketball_nba',
      'basketball_kbl': 'basketball_kbl',
      'american_football_nfl': 'americanfootball_nfl'
    };

    const key = `${mainCat}_${subCat}`;
    return mappings[key] || `${mainCat}_${subCat}`;
  }

  /**
   * OddsCache용 Exchange 게임 정보 포맷팅
   * @param {Object} oddsCache 
   * @returns {Object} 포맷된 게임 정보
   */
  formatOddsCacheForExchange(oddsCache) {
    // 스포츠키에서 카테고리 추출
    const categoryMapping = {
      'baseball_kbo': { category: 'baseball', league: 'KBO' },
      'baseball_mlb': { category: 'baseball', league: 'MLB' },
      'basketball_nba': { category: 'basketball', league: 'NBA' },
      'basketball_kbl': { category: 'basketball', league: 'KBL' },
      'soccer_korea_kleague1': { category: 'soccer', league: 'K리그' },
      'soccer_japan_j_league': { category: 'soccer', league: 'J리그' },
      'soccer_usa_mls': { category: 'soccer', league: 'MLS' },
      'soccer_brazil_campeonato': { category: 'soccer', league: '브라질 세리에 A' },
      'soccer_argentina_primera_division': { category: 'soccer', league: '아르헨티나 프리메라' },
      'soccer_china_superleague': { category: 'soccer', league: '중국 슈퍼리그' },
      'soccer_italy_serie_a': { category: 'soccer', league: '세리에 A' },
      'soccer_spain_primera_division': { category: 'soccer', league: '라리가' },
      'soccer_germany_bundesliga': { category: 'soccer', league: '분데스리가' },
      'americanfootball_nfl': { category: 'american_football', league: 'NFL' }
    };

    const mapping = categoryMapping[oddsCache.sportKey] || { category: 'unknown', league: oddsCache.sportKey };

    return {
      id: oddsCache.id,
      eventId: oddsCache.eventId,
      homeTeam: oddsCache.homeTeam,
      awayTeam: oddsCache.awayTeam,
      commenceTime: oddsCache.commenceTime,
      status: 'scheduled', // OddsCache는 모두 예정된 경기
      sportKey: oddsCache.sportKey,
      league: mapping.league,
      category: mapping.category,
      // Exchange용 마켓 정보 생성
      availableMarkets: this.generateAvailableMarketsFromOdds(oddsCache)
    };
  }

  /**
   * Exchange용 게임 정보 포맷팅 (GameResult 기반)
   * @param {Object} gameResult 
   * @returns {Object} 포맷된 게임 정보
   */
  formatGameForExchange(gameResult) {
    return {
      id: gameResult.id,
      eventId: gameResult.eventId,
      homeTeam: gameResult.homeTeam,
      awayTeam: gameResult.awayTeam,
      commenceTime: gameResult.commenceTime,
      status: gameResult.status,
      sportKey: this.getSportKeyFromCategories(gameResult.mainCategory, gameResult.subCategory),
      league: gameResult.subCategory,
      category: gameResult.mainCategory,
      // Exchange용 마켓 정보 생성
      availableMarkets: this.generateAvailableMarkets(gameResult)
    };
  }

  /**
   * OddsCache 데이터에서 이용 가능한 마켓 생성
   * @param {Object} oddsCache 
   * @returns {Array} 마켓 목록
   */
  generateAvailableMarketsFromOdds(oddsCache) {
    const markets = [
      {
        type: 'h2h',
        name: 'Moneyline',
        description: '승패',
        selections: [
          { name: oddsCache.homeTeam, type: 'home' },
          { name: oddsCache.awayTeam, type: 'away' }
        ]
      }
    ];

    // 스포츠별 추가 마켓 (일반적인 라인들)
    if (oddsCache.sportKey.includes('baseball')) {
      markets.push(
        {
          type: 'totals',
          name: 'Total Runs',
          description: '총 득점',
          lines: [8.5, 9.0, 9.5, 10.0, 10.5],
          selections: ['Over', 'Under']
        },
        {
          type: 'spreads',
          name: 'Run Line',
          description: '런라인',
          lines: [-1.5, -1.0, 1.0, 1.5],
          selections: [oddsCache.homeTeam, oddsCache.awayTeam]
        }
      );
    }

    if (oddsCache.sportKey.includes('soccer')) {
      markets.push(
        {
          type: 'totals',
          name: 'Total Goals',
          description: '총 골수',
          lines: [2.5, 3.0, 3.5, 4.0],
          selections: ['Over', 'Under']
        },
        {
          type: 'spreads',
          name: 'Asian Handicap',
          description: '아시안 핸디캡',
          lines: [-1.0, -0.5, 0.0, 0.5, 1.0],
          selections: [oddsCache.homeTeam, oddsCache.awayTeam]
        }
      );
    }

    if (oddsCache.sportKey.includes('basketball')) {
      markets.push(
        {
          type: 'totals',
          name: 'Total Points',
          description: '총 점수',
          lines: [220.5, 225.5, 230.5, 235.5, 240.5],
          selections: ['Over', 'Under']
        },
        {
          type: 'spreads',
          name: 'Point Spread',
          description: '점수차',
          lines: [-6.5, -3.5, 3.5, 6.5],
          selections: [oddsCache.homeTeam, oddsCache.awayTeam]
        }
      );
    }

    return markets;
  }

  /**
   * 게임별 이용 가능한 마켓 생성 (GameResult 기반)
   * @param {Object} gameResult 
   * @returns {Array} 마켓 목록
   */
  generateAvailableMarkets(gameResult) {
    const markets = [
      {
        type: 'h2h',
        name: 'Moneyline',
        description: '승패',
        selections: [
          { name: gameResult.homeTeam, type: 'home' },
          { name: gameResult.awayTeam, type: 'away' }
        ]
      }
    ];

    // 스포츠별 추가 마켓
    if (gameResult.mainCategory === 'baseball') {
      markets.push(
        {
          type: 'totals',
          name: 'Total Runs',
          description: '총 득점',
          lines: [8.5, 9.0, 9.5, 10.0, 10.5],
          selections: ['Over', 'Under']
        },
        {
          type: 'spreads',
          name: 'Run Line',
          description: '런라인',
          lines: [-1.5, -1.0, 1.0, 1.5],
          selections: [gameResult.homeTeam, gameResult.awayTeam]
        }
      );
    }

    if (gameResult.mainCategory === 'soccer') {
      markets.push(
        {
          type: 'totals',
          name: 'Total Goals',
          description: '총 골수',
          lines: [2.5, 3.0, 3.5, 4.0],
          selections: ['Over', 'Under']
        },
        {
          type: 'spreads',
          name: 'Asian Handicap',
          description: '아시안 핸디캡',
          lines: [-1.0, -0.5, 0.0, 0.5, 1.0],
          selections: [gameResult.homeTeam, gameResult.awayTeam]
        }
      );
    }

    return markets;
  }

  /**
   * 자동 정산을 위한 매칭된 주문 조회
   * @param {string} gameResultId 
   * @returns {Array} 정산 대상 주문들
   */
  async getOrdersForSettlement(gameResultId) {
    return await ExchangeOrder.findAll({
      where: {
        gameResultId: gameResultId,
        status: 'matched',
        autoSettlement: true
      },
      include: [{
        model: GameResult,
        as: 'gameResult'
      }]
    });
  }

  /**
   * 기존 Exchange Order에 게임 정보 업데이트
   * @param {number} orderId 
   * @returns {boolean} 성공 여부
   */
  async updateOrderGameMapping(orderId) {
    try {
      const order = await ExchangeOrder.findByPk(orderId);
      if (!order) return false;

      const mappedData = await this.mapGameDataToOrder(order.toJSON());
      
      await order.update({
        homeTeam: mappedData.homeTeam,
        awayTeam: mappedData.awayTeam,
        commenceTime: mappedData.commenceTime,
        sportKey: mappedData.sportKey,
        gameResultId: mappedData.gameResultId,
        selectionDetails: mappedData.selectionDetails
      });

      return true;
    } catch (error) {
      console.error('Order 게임 매핑 업데이트 실패:', error);
      return false;
    }
  }
}

export default new ExchangeGameMappingService(); 