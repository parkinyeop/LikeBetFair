import { SEASON_SCHEDULES } from '../config/sportsMapping.js';
import GameResult from '../models/gameResultModel.js';
import OddsCache from '../models/oddsCacheModel.js';
import { Op } from 'sequelize';
import axios from 'axios';

class SeasonValidationService {
  
  constructor() {
    this.theSportsDbApiKey = '3'; // TheSportsDB 무료 API 키 사용
    this.sportsDbBaseUrl = 'https://www.thesportsdb.com/api/v1/json';
  }

  /**
   * sportKey를 TheSportsDB 리그 ID로 변환
   */
  getTheSportsDbId(sportKey) {
    const mapping = {
      'soccer_korea_kleague1': '4689',
      'soccer_japan_j_league': '4414', 
      'soccer_italy_serie_a': '4332',
      'soccer_brazil_campeonato': '4351',
      'soccer_usa_mls': '4346',
      'soccer_argentina_primera_division': '4406',
      'soccer_china_superleague': '4359',
      'soccer_spain_primera_division': '4335',
      'soccer_germany_bundesliga': '4331',
      'soccer_england_premier_league': '4328',
      'basketball_nba': '4387',
      'basketball_kbl': '5124',
      'baseball_mlb': '4424',
      'baseball_kbo': '4578',
      'americanfootball_nfl': '4391'
    };
    
    return mapping[sportKey];
  }

  /**
   * 특정 스포츠의 최근 odds 데이터 존재 여부 확인
   * @param {string} sportKey - 스포츠 키
   * @returns {Object} odds 데이터 존재 여부와 개수
   */
  async checkRecentOddsData(sportKey) {
    try {
      // 30일 전부터 조회 (더 넓은 범위)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oddsCount = await OddsCache.count({
        where: {
          sportKey: sportKey,
          commenceTime: {
            [Op.gte]: thirtyDaysAgo
          }
        }
      });
      
      return {
        hasOdds: oddsCount > 0,
        oddsCount: oddsCount
      };
    } catch (error) {
      console.error(`[SeasonValidation] ${sportKey} odds 데이터 확인 오류:`, error);
      return { hasOdds: false, oddsCount: 0 };
    }
  }

  /**
   * TheSportsDB API를 통한 시즌 상태 확인
   * @param {string} sportKey - 스포츠 키
   * @returns {Object} TheSportsDB 기반 시즌 상태
   */
  async checkSeasonStatusWithSportsDB(sportKey) {
    try {
      const leagueId = this.getTheSportsDbId(sportKey);
      if (!leagueId) {
        console.log(`⚠️ [SportsDB] ${sportKey}에 대한 TheSportsDB ID를 찾을 수 없습니다`);
        return { status: 'unknown', reason: 'TheSportsDB ID 없음' };
      }

      // 개선: 리그별 시즌 문자열(currentSeason) 사용
      const seasonInfo = SEASON_SCHEDULES[sportKey];
      const seasonParam = (seasonInfo && seasonInfo.currentSeason) ? seasonInfo.currentSeason : new Date().getFullYear();

      // 실제 호출 URL 로그로 남김
      const apiUrl = `${this.sportsDbBaseUrl}/${this.theSportsDbApiKey}/eventsseason.php`;
      console.log(`🔍 [SportsDB] ${sportKey} 시즌 데이터 조회 중... (리그 ID: ${leagueId}, 시즌: ${seasonParam})`);
      console.log(`[SportsDB] API 호출 URL: ${apiUrl}?id=${leagueId}&s=${seasonParam}`);
      
      const response = await axios.get(
        apiUrl,
        {
          params: {
            id: leagueId,
            s: seasonParam
          },
          timeout: 10000
        }
      );

      if (!response.data?.events) {
        console.log(`⚠️ [SportsDB] ${sportKey} 시즌 데이터가 없습니다`);
        return { status: 'unknown', reason: 'TheSportsDB 시즌 데이터 없음' };
      }

      const events = response.data.events;
      console.log(`✅ [SportsDB] ${sportKey}: ${events.length}개 경기 데이터 수신`);

      // 최근 30일 완료된 경기
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentFinished = events.filter(event => {
        const gameDate = new Date(event.dateEvent);
        return gameDate >= thirtyDaysAgo && 
               (event.strStatus === 'FT' || event.strStatus === 'Match Finished' || event.intHomeScore !== null);
      });

      // 향후 30일 예정된 경기
      const now = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      
      const upcomingScheduled = events.filter(event => {
        const gameDate = new Date(event.dateEvent);
        return gameDate >= now && 
               gameDate <= thirtyDaysLater &&
               event.strStatus !== 'FT' && 
               event.strStatus !== 'Match Finished';
      });

      console.log(`📊 [SportsDB] ${sportKey} 분석 결과:`, {
        totalGames: events.length,
        recentFinished: recentFinished.length,
        upcomingScheduled: upcomingScheduled.length
      });

      // odds 데이터 존재 여부 확인
      const oddsData = await this.checkRecentOddsData(sportKey);
      console.log(`📊 [SportsDB] ${sportKey} odds 데이터 확인:`, oddsData);

      // 시즌 상태 판단 (odds 데이터 고려)
      if (recentFinished.length > 0 && upcomingScheduled.length > 0) {
        return {
          status: 'active',
          reason: `TheSportsDB: 정상 시즌 진행 중 (최근 ${recentFinished.length}경기 완료, ${upcomingScheduled.length}경기 예정)`,
          recentGamesCount: recentFinished.length,
          upcomingGamesCount: upcomingScheduled.length,
          dataSource: 'TheSportsDB'
        };
      } else if (recentFinished.length > 0 && upcomingScheduled.length === 0) {
        return {
          status: 'break',
          reason: `TheSportsDB: 시즌 중 휴식기 (최근 ${recentFinished.length}경기 완료, 예정 경기 없음)`,
          recentGamesCount: recentFinished.length,
          upcomingGamesCount: 0,
          dataSource: 'TheSportsDB'
        };
      } else if (recentFinished.length === 0 && upcomingScheduled.length > 0) {
        return {
          status: 'preseason',
          reason: `TheSportsDB: 시즌 시작 전 (${upcomingScheduled.length}경기 예정)`,
          recentGamesCount: 0,
          upcomingGamesCount: upcomingScheduled.length,
          dataSource: 'TheSportsDB'
        };
      } else {
        // 최근/예정 경기가 없지만 odds 데이터가 있는 경우 active로 간주
        if (oddsData.hasOdds) {
          return {
            status: 'active',
            reason: `TheSportsDB: 경기 일정은 없지만 최근 ${oddsData.oddsCount}개 odds 데이터가 있어 active로 간주`,
            recentGamesCount: 0,
            upcomingGamesCount: 0,
            oddsCount: oddsData.oddsCount,
            dataSource: 'TheSportsDB + Odds'
          };
        } else {
          return {
            status: 'offseason',
            reason: 'TheSportsDB: 시즌오프 (최근 경기 없음, 예정 경기 없음, odds 데이터도 없음)',
            recentGamesCount: 0,
            upcomingGamesCount: 0,
            dataSource: 'TheSportsDB'
          };
        }
      }

    } catch (error) {
      console.error(`❌ [SportsDB] ${sportKey} API 호출 실패:`, error.message);
      return { 
        status: 'error', 
        reason: `TheSportsDB API 오류: ${error.message}`,
        dataSource: 'TheSportsDB'
      };
    }
  }
  
  /**
   * 특정 스포츠의 시즌 상태를 체크 (하이브리드 접근법)
   * @param {string} sportKey - 스포츠 키 (예: soccer_japan_j_league)
   * @returns {Object} 시즌 상태 정보
   */
  async checkSeasonStatus(sportKey) {
    try {
      const seasonInfo = SEASON_SCHEDULES[sportKey];
      
      if (!seasonInfo) {
        return {
          isActive: false,
          status: 'unknown',
          reason: '지원하지 않는 리그입니다'
        };
      }

      console.log(`🔍 [SeasonValidation] ${sportKey} 시즌 상태 체크 시작...`);
      
      // 1단계: TheSportsDB API 시도
      const sportsDbStatus = await this.checkSeasonStatusWithSportsDB(sportKey);
      
      if (sportsDbStatus.status !== 'unknown' && sportsDbStatus.status !== 'error') {
        console.log(`✅ [SeasonValidation] ${sportKey} TheSportsDB API 성공:`, sportsDbStatus);
        
        return {
          isActive: sportsDbStatus.status === 'active',
          status: sportsDbStatus.status,
          reason: sportsDbStatus.reason,
          recentGamesCount: sportsDbStatus.recentGamesCount || 0,
          upcomingGamesCount: sportsDbStatus.upcomingGamesCount || 0,
          oddsCount: sportsDbStatus.oddsCount || 0,
          seasonInfo: seasonInfo,
          dataSource: 'TheSportsDB'
        };
      }

      // 2단계: 로컬 GameResult 데이터로 폴백
      console.log(`🔄 [SeasonValidation] ${sportKey} TheSportsDB 실패, 로컬 데이터로 폴백...`);
      
      const recentResults = await this.getRecentGameResults(sportKey, 7);
      const upcomingGames = await this.getUpcomingGames(sportKey, 3);
      
      // 디버그 로그 추가
      console.log(`🔍 [SeasonValidation] ${sportKey} 로컬 데이터 체크:`, {
        configuredStatus: seasonInfo.status,
        recentResultsCount: recentResults.length,
        upcomingGamesCount: upcomingGames.length,
        recentResults: recentResults.map(r => ({
          homeTeam: r.homeTeam,
          awayTeam: r.awayTeam,
          commenceTime: r.commenceTime,
          status: r.status,
          result: r.result
        })),
        upcomingGames: upcomingGames.map(g => ({
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          commenceTime: g.commenceTime,
          status: g.status
        }))
      });
      
      // 실제 데이터 기반 시즌 상태 판단
      const realStatus = this.determineRealSeasonStatus(seasonInfo, recentResults, upcomingGames);
      
      // odds 데이터 확인
      const oddsData = await this.checkRecentOddsData(sportKey);
      
      return {
        isActive: realStatus.status === 'active',
        status: realStatus.status,
        reason: realStatus.reason,
        recentGamesCount: recentResults.length,
        upcomingGamesCount: upcomingGames.length,
        oddsCount: oddsData.oddsCount || 0,
        seasonInfo: seasonInfo,
        dataSource: 'Local'
      };
      
    } catch (error) {
      console.error(`[SeasonValidation] 시즌 상태 체크 오류 (${sportKey}):`, error);
      return {
        isActive: false,
        status: 'error',
        reason: '시즌 상태 확인 중 오류 발생'
      };
    }
  }
  
  /**
   * 최근 경기 결과 조회
   * @param {string} sportKey - 스포츠 키
   * @param {number} days - 조회할 일수
   * @returns {Array} 경기 결과 배열
   */
  async getRecentGameResults(sportKey, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // sportKey를 기반으로 subCategory 매핑
    const subCategoryMap = {
      'soccer_japan_j_league': 'J_LEAGUE',
      'soccer_korea_kleague1': 'KLEAGUE1',
      'soccer_italy_serie_a': 'SERIE_A',
      'basketball_nba': 'NBA',
      'basketball_kbl': 'KBL',
      'baseball_kbo': 'KBO',
      'baseball_mlb': 'MLB',
      'americanfootball_nfl': 'NFL',
      'soccer_usa_mls': 'MLS',
      'soccer_brazil_campeonato': 'BRASILEIRAO',
      'soccer_argentina_primera_division': 'ARGENTINA_PRIMERA',
      'soccer_china_superleague': 'CSL',
      'soccer_spain_primera_division': 'LALIGA',
      'soccer_germany_bundesliga': 'BUNDESLIGA'
    };
    
    const subCategory = subCategoryMap[sportKey];
    if (!subCategory) return [];
    
    return await GameResult.findAll({
      where: {
        subCategory: subCategory,
        commenceTime: {
          [Op.gte]: startDate
        },
        status: {
          [Op.in]: ['finished']
        },
        result: {
          [Op.notIn]: ['pending']
        }
      },
      order: [['commenceTime', 'DESC']],
      limit: 50
    });
  }
  
  /**
   * 향후 예정 경기 조회
   * @param {string} sportKey - 스포츠 키
   * @param {number} days - 조회할 일수
   * @returns {Array} 예정 경기 배열
   */
  async getUpcomingGames(sportKey, days) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    // sportKey를 기반으로 subCategory 매핑
    const subCategoryMap = {
      'soccer_japan_j_league': 'J_LEAGUE',
      'soccer_korea_kleague1': 'KLEAGUE1',
      'soccer_italy_serie_a': 'SERIE_A',
      'basketball_nba': 'NBA',
      'basketball_kbl': 'KBL',
      'baseball_kbo': 'KBO',
      'baseball_mlb': 'MLB',
      'americanfootball_nfl': 'NFL',
      'soccer_usa_mls': 'MLS',
      'soccer_brazil_campeonato': 'BRASILEIRAO',
      'soccer_argentina_primera_division': 'ARGENTINA_PRIMERA',
      'soccer_china_superleague': 'CSL',
      'soccer_spain_primera_division': 'LALIGA',
      'soccer_germany_bundesliga': 'BUNDESLIGA'
    };
    
    const subCategory = subCategoryMap[sportKey];
    if (!subCategory) return [];
    
    return await GameResult.findAll({
      where: {
        subCategory: subCategory,
        commenceTime: {
          [Op.gte]: new Date(),
          [Op.lte]: endDate
        },
        status: 'scheduled'
      },
      order: [['commenceTime', 'ASC']],
      limit: 50
    });
  }
  
  /**
   * 실제 데이터 기반 시즌 상태 판단
   * @param {Object} seasonInfo - 설정된 시즌 정보
   * @param {Array} recentResults - 최근 경기 결과
   * @param {Array} upcomingGames - 예정 경기
   * @returns {Object} 실제 시즌 상태
   */
  determineRealSeasonStatus(seasonInfo, recentResults, upcomingGames) {
    const hasRecentGames = recentResults.length > 0;
    const hasUpcomingGames = upcomingGames.length > 0;
    
    // 실제 데이터 기반 판단
    if (hasRecentGames && hasUpcomingGames) {
      return {
        status: 'active',
        reason: `정상 시즌 진행 중 (최근 ${recentResults.length}경기, 예정 ${upcomingGames.length}경기)`
      };
    }
    
    if (hasRecentGames && !hasUpcomingGames) {
      return {
        status: 'break',
        reason: `시즌 중 휴식기 (최근 ${recentResults.length}경기 완료, 예정 경기 없음)`
      };
    }
    
    if (!hasRecentGames && hasUpcomingGames) {
      return {
        status: 'preseason',
        reason: `시즌 시작 전 (예정 ${upcomingGames.length}경기)`
      };
    }
    
    // 최근 경기도 없고 예정 경기도 없는 경우, 설정된 시즌 상태를 우선 사용
    if (seasonInfo.status === 'active') {
      return {
        status: 'active',
        reason: `설정된 시즌 상태가 active이므로 베팅 허용 (실제 데이터 부족)`
      };
    }
    
    // 최근 경기도 없고 예정 경기도 없음
    return {
      status: 'offseason',
      reason: '시즌오프 (최근 경기 없음, 예정 경기 없음)'
    };
  }
  
  /**
   * 베팅 가능 여부 검증
   * @param {string} sportKey - 스포츠 키
   * @returns {Object} 베팅 가능 여부
   */
  async validateBettingEligibility(sportKey) {
    const seasonStatus = await this.checkSeasonStatus(sportKey);
    
    // 베팅 허용 상태: active, break(예정 경기 있으면), preseason(예정 경기 있으면)
    const allowedStatuses = ['active'];
    
    // break나 preseason의 경우 예정 경기가 있어야 베팅 허용
    if (['break', 'preseason'].includes(seasonStatus.status)) {
      const isEligible = seasonStatus.upcomingGamesCount > 0;
      return {
        isEligible: isEligible,
        status: seasonStatus.status,
        reason: isEligible 
          ? `${seasonStatus.status === 'break' ? '휴식기' : '시즌 시작 전'}이지만 예정 경기가 있어 베팅 가능`
          : `${seasonStatus.status === 'break' ? '휴식기' : '시즌 시작 전'}이며 예정 경기가 없어 베팅 불가`,
        seasonStatus: seasonStatus
      };
    }
    
    // active 상태이거나 odds 데이터가 있는 경우 베팅 허용
    const isEligible = allowedStatuses.includes(seasonStatus.status) || 
                      (seasonStatus.oddsCount && seasonStatus.oddsCount > 0);
    
    // 디버그 로그 추가
    console.log(`🔍 [SeasonValidation] ${sportKey} 베팅 가능 여부:`, {
      status: seasonStatus.status,
      isEligible,
      reason: seasonStatus.reason,
      recentGamesCount: seasonStatus.recentGamesCount,
      upcomingGamesCount: seasonStatus.upcomingGamesCount,
      oddsCount: seasonStatus.oddsCount,
      dataSource: seasonStatus.dataSource
    });
    
    return {
      isEligible: isEligible,
      status: seasonStatus.status,
      reason: isEligible 
        ? (allowedStatuses.includes(seasonStatus.status) 
           ? '정상 시즌 진행 중으로 베팅 가능' 
           : 'odds 데이터가 있어 베팅 가능')
        : `${seasonStatus.reason}으로 베팅 불가`,
      seasonStatus: seasonStatus
    };
  }
  
  /**
   * 모든 리그의 베팅 가능 상태 체크
   * @returns {Object} 전체 리그 베팅 가능 상태
   */
  async checkAllLeaguesBettingStatus() {
    const allSportKeys = Object.keys(SEASON_SCHEDULES);
    const results = {};
    
    for (const sportKey of allSportKeys) {
      try {
        results[sportKey] = await this.validateBettingEligibility(sportKey);
      } catch (error) {
        console.error(`[SeasonValidation] ${sportKey} 체크 오류:`, error);
        results[sportKey] = {
          isEligible: false,
          status: 'error',
          reason: '체크 중 오류 발생'
        };
      }
    }
    
    return results;
  }
}

export default new SeasonValidationService(); 