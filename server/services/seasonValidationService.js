import { SEASON_SCHEDULES } from '../config/sportsMapping.js';
import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

class SeasonValidationService {
  
  /**
   * 특정 스포츠의 시즌 상태를 체크
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
      
      // 최근 7일간 경기 결과 확인
      const recentResults = await this.getRecentGameResults(sportKey, 7);
      
      // 향후 3일간 예정 경기 확인  
      const upcomingGames = await this.getUpcomingGames(sportKey, 3);
      
      // 디버그 로그 추가
      console.log(`🔍 [SeasonValidation] ${sportKey} 시즌 상태 체크:`, {
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
      
      return {
        isActive: realStatus.status === 'active',
        status: realStatus.status,
        reason: realStatus.reason,
        recentGamesCount: recentResults.length,
        upcomingGamesCount: upcomingGames.length,
        seasonInfo: seasonInfo
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
    
    // 베팅 허용 상태: active, break(일부), preseason(일부)
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
    
    const isEligible = allowedStatuses.includes(seasonStatus.status);
    
    // 디버그 로그 추가
    console.log(`🔍 [SeasonValidation] ${sportKey} 베팅 가능 여부:`, {
      status: seasonStatus.status,
      isEligible,
      reason: seasonStatus.reason,
      recentGamesCount: seasonStatus.recentGamesCount,
      upcomingGamesCount: seasonStatus.upcomingGamesCount
    });
    
    return {
      isEligible: isEligible,
      status: seasonStatus.status,
      reason: isEligible 
        ? '정상 시즌 진행 중으로 베팅 가능' 
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