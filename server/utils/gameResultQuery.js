/**
 * 경기 결과 조회 중앙화 유틸리티 (보완 버전)
 * 모든 위치에서 일관된 로직으로 GameResult 조회
 * 
 * 주요 기능:
 * - 통합된 쿼리 로직
 * - 성능 모니터링
 * - 에러 처리 및 재시도
 * - 데이터 검증
 * - 캐싱 지원
 * - 점진적 마이그레이션 지원
 */

import { Op } from 'sequelize';
import { getLocationConfig } from '../config/gameResultQuery.js';
import gameResultQueryMetrics from './gameResultQueryMetrics.js';
import { normalizeTeamNameForComparison } from '../normalizeUtils.js';

class GameResultQuery {
  
  /**
   * 팀명과 시간으로 경기 결과 조회 (메인 메서드)
   * @param {string} homeTeam - 홈팀명
   * @param {string} awayTeam - 어웨이팀명  
   * @param {string|Date} commenceTime - 경기 시작 시간
   * @param {string} location - 호출 위치 (betController, multibetSettlement 등)
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object|null>} GameResult 또는 null
   */
  static async findByTeamsAndTime(homeTeam, awayTeam, commenceTime, location, options = {}) {
    const config = getLocationConfig(location);
    const mergedOptions = { ...config, ...options };
    
    // 성능 모니터링 시작
    const timer = gameResultQueryMetrics.startQueryTimer(
      'findByTeamsAndTime',
      location,
      { homeTeam, awayTeam },
      mergedOptions.timeRange
    );

    try {
      // Feature Flag 확인
      if (!mergedOptions.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
        console.log(`[GameResultQuery] Feature flag disabled for ${location}, using legacy logic`);
        return await this.legacyQuery(homeTeam, awayTeam, commenceTime, location, mergedOptions);
      }

      // 입력 검증
      const validationResult = this.validateInputs(homeTeam, awayTeam, commenceTime);
      if (!validationResult.valid) {
        throw new Error(`Invalid inputs: ${validationResult.errors.join(', ')}`);
      }

      // 시간 정규화
      const normalizedTime = this.normalizeTime(commenceTime);
      
      // 팀명 정규화
      const normalizedTeams = this.normalizeTeams(homeTeam, awayTeam, mergedOptions);
      
      // 캐시 확인
      if (mergedOptions.enableCaching) {
        const cachedResult = await this.getCachedResult(normalizedTeams, normalizedTime);
        if (cachedResult) {
          gameResultQueryMetrics.endQueryTimer(timer, cachedResult);
          return cachedResult;
        }
      }

      // 쿼리 실행
      let gameResult = null;
      
      if (mergedOptions.twoStageQuery) {
        // 2단계 조회 (multibetSettlement 방식)
        gameResult = await this.executeTwoStageQuery(normalizedTeams, normalizedTime, mergedOptions);
      } else {
        // 단일 쿼리
        gameResult = await this.executeSingleQuery(normalizedTeams, normalizedTime, mergedOptions);
      }

      // 데이터 검증
      if (gameResult && mergedOptions.enableValidation) {
        gameResult = await this.validateGameResult(gameResult, location);
      }

      // 캐시 저장
      if (gameResult && mergedOptions.enableCaching) {
        await this.setCachedResult(normalizedTeams, normalizedTime, gameResult);
      }

      // 매칭 정확도 추적
      if (gameResult) {
        gameResultQueryMetrics.trackMatchingAccuracy(
          { homeTeam, awayTeam },
          { homeTeam: gameResult.homeTeam, awayTeam: gameResult.awayTeam },
          location,
          mergedOptions.usePartialMatch ? 'partial' : 'exact'
        );
      }

      // 성능 모니터링 완료
      gameResultQueryMetrics.endQueryTimer(timer, gameResult);
      
      return gameResult;

    } catch (error) {
      // 에러 처리 및 재시도
      const retryResult = await this.handleErrorWithRetry(error, homeTeam, awayTeam, commenceTime, location, mergedOptions, timer);
      return retryResult;
    }
  }

  /**
   * 입력 검증
   */
  static validateInputs(homeTeam, awayTeam, commenceTime) {
    const errors = [];
    
    if (!homeTeam || typeof homeTeam !== 'string') {
      errors.push('homeTeam must be a non-empty string');
    }
    
    if (!awayTeam || typeof awayTeam !== 'string') {
      errors.push('awayTeam must be a non-empty string');
    }
    
    if (!commenceTime) {
      errors.push('commenceTime is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 시간 정규화
   */
  static normalizeTime(commenceTime) {
    if (commenceTime instanceof Date) {
      return commenceTime;
    }
    
    const timeStr = commenceTime.toString();
    
    // UTC 형식이 아니면 'Z' 추가
    if (!timeStr.includes('Z') && !timeStr.includes('+') && !timeStr.includes('-', 10)) {
      return new Date(timeStr + 'Z');
    }
    
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }
    
    return date;
  }

  /**
   * 팀명 정규화
   */
  static normalizeTeams(homeTeam, awayTeam, options) {
    const normalized = {
      home: homeTeam.trim(),
      away: awayTeam.trim()
    };

    // normalizeUtils.js와 통합
    if (options.useNormalizeUtils) {
      normalized.home = normalizeTeamNameForComparison(homeTeam);
      normalized.away = normalizeTeamNameForComparison(awayTeam);
    }

    return normalized;
  }

  /**
   * 단일 쿼리 실행
   */
  static async executeSingleQuery(teams, time, options) {
    const GameResult = (await import('../models/gameResultModel.js')).default;
    
    // 팀명 조건 구성
    const teamConditions = this.buildTeamConditions(teams, options);
    
    // 시간 조건 구성
    const timeConditions = this.buildTimeConditions(time, options.timeRange);
    
    // 상태 조건 구성
    const statusConditions = this.buildStatusConditions(options.statusFilter);
    
    // 정렬 조건 구성
    const orderConditions = this.buildOrderConditions(options.orderBy, options.orderDirection);
    
    // 쿼리 실행
    const gameResult = await GameResult.findOne({
      where: {
        ...teamConditions,
        ...timeConditions,
        ...statusConditions
      },
      order: orderConditions
    });

    return gameResult;
  }

  /**
   * 2단계 쿼리 실행 (multibetSettlement 방식) - 관리자 페이지 방식 적용 + 시간 조건 추가
   */
  static async executeTwoStageQuery(teams, time, options) {
    const GameResult = (await import('../models/gameResultModel.js')).default;
    const { normalizeTeamNameForComparison } = await import('../normalizeUtils.js');
    
    console.log(`🔍 [executeTwoStageQuery] 더블헤더 고려한 시간 조건 매칭 시작`);
    console.log(`🔍 [executeTwoStageQuery] 팀명:`, teams);
    console.log(`🔍 [executeTwoStageQuery] 시간:`, time);
    
    // 🆕 시간 조건 추가 (더블헤더 고려)
    const timeBuffer = options.timeBuffer || 2; // 2시간 버퍼 (더블헤더 대응)
    const timeConditions = {
      commenceTime: {
        [Op.between]: [
          new Date(new Date(time).getTime() - timeBuffer * 60 * 60 * 1000),
          new Date(new Date(time).getTime() + timeBuffer * 60 * 60 * 1000)
        ]
      }
    };
    
    // 시간 조건 + 상태 조건으로 조회
    const allGameResults = await GameResult.findAll({
      where: {
        ...timeConditions,
        ...this.buildStatusConditions(options.statusFilter)
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`🔍 [executeTwoStageQuery] 시간 범위 내 경기 결과 조회: ${allGameResults.length}개`);
    
    // 정규화된 팀명으로 정확한 매칭 (관리자 페이지 방식)
    const normalizedHomeTeam = normalizeTeamNameForComparison(teams.home);
    const normalizedAwayTeam = normalizeTeamNameForComparison(teams.away);
    
    console.log(`🔍 [executeTwoStageQuery] 정규화된 팀명: ${normalizedHomeTeam} vs ${normalizedAwayTeam}`);
    
    // 🆕 더블헤더 처리: 모든 매칭되는 경기 찾기
    const matchingResults = allGameResults.filter(gr => {
      const grHomeNorm = normalizeTeamNameForComparison(gr.homeTeam);
      const grAwayNorm = normalizeTeamNameForComparison(gr.awayTeam);
      
      const forwardMatch = grHomeNorm === normalizedHomeTeam && grAwayNorm === normalizedAwayTeam;
      const reverseMatch = grHomeNorm === normalizedAwayTeam && grAwayNorm === normalizedHomeTeam;
      
      return forwardMatch || reverseMatch;
    });
    
    if (matchingResults.length === 0) {
      console.log(`❌ [executeTwoStageQuery] 매칭되는 경기 결과 없음`);
      return null;
    }
    
    // 🆕 더블헤더 처리: 가장 가까운 시간의 경기 선택
    const gameResult = matchingResults.reduce((closest, current) => {
      const closestTimeDiff = Math.abs(new Date(closest.commenceTime) - new Date(time));
      const currentTimeDiff = Math.abs(new Date(current.commenceTime) - new Date(time));
      return currentTimeDiff < closestTimeDiff ? current : closest;
    });
    
    console.log(`🎯 [executeTwoStageQuery] 매칭 성공: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
    console.log(`🎯 [executeTwoStageQuery] 선택된 경기 시간: ${gameResult.commenceTime}`);
    console.log(`✅ [executeTwoStageQuery] 상태: ${gameResult.status}, 스코어:`, gameResult.score);
    
    return gameResult;
  }

  /**
   * 팀명 조건 구성
   */
  static buildTeamConditions(teams, options) {
    console.log(`🔍 [buildTeamConditions] 팀명:`, teams);
    console.log(`🔍 [buildTeamConditions] 옵션:`, { usePartialMatch: options.usePartialMatch, enableReverseMatch: options.enableReverseMatch, useNormalizeUtils: options.useNormalizeUtils });
    
    if (options.usePartialMatch) {
      const conditions = [];
      
      // 정규화된 팀명을 받았을 때 검색어 추출
      const getSearchTerm = (teamName) => {
        if (!options.useNormalizeUtils) {
          return teamName;
        }
        
        // 짧은 팀명 (10글자 이하): 전체 사용
        if (teamName.length <= 10) {
          return teamName;
        }
        
        // 긴 팀명: 전체 길이의 80% 사용 (최소 10글자)
        // 예: 'atleticomineiro' (14글자) → 'atleticomine' (12글자)
        //     'sportrecife' (11글자) → 'sportrecif' (10글자)
        const minLength = Math.max(10, Math.floor(teamName.length * 0.8));
        return teamName.substring(0, minLength);
      };
      
      const homeSearch = getSearchTerm(teams.home);
      const awaySearch = getSearchTerm(teams.away);
      
      console.log(`🔍 [buildTeamConditions] 검색어: home='${homeSearch}', away='${awaySearch}'`);
      
      // 정방향 매칭
      conditions.push({
        homeTeam: { [Op.iLike]: `%${homeSearch}%` },
        awayTeam: { [Op.iLike]: `%${awaySearch}%` }
      });
      
      // 역방향 매칭 (홈/어웨이 바뀐 경우) - 기본적으로 활성화
      const enableReverse = options.enableReverseMatch !== false; // undefined도 true로 처리
      if (enableReverse) {
        conditions.push({
          homeTeam: { [Op.iLike]: `%${awaySearch}%` },
          awayTeam: { [Op.iLike]: `%${homeSearch}%` }
        });
      }
      
      const result = { [Op.or]: conditions };
      console.log(`🔍 [buildTeamConditions] 생성된 조건 (${conditions.length}개):`, conditions);
      return result;
    } else {
      const result = {
        homeTeam: teams.home,
        awayTeam: teams.away
      };
      console.log(`🔍 [buildTeamConditions] 정확한 매칭 조건:`, result);
      return result;
    }
  }

  /**
   * 시간 조건 구성
   */
  static buildTimeConditions(normalizedTime, timeRange) {
    if (timeRange === 0) {
      return { commenceTime: normalizedTime };
    }
    
    const rangeMs = timeRange * 60 * 60 * 1000; // 시간을 밀리초로 변환
    return {
      commenceTime: {
        [Op.between]: [
          new Date(normalizedTime.getTime() - rangeMs),
          new Date(normalizedTime.getTime() + rangeMs)
        ]
      }
    };
  }

  /**
   * 상태 조건 구성
   */
  static buildStatusConditions(statusFilter) {
    if (!statusFilter) return {};
    return { status: statusFilter };
  }

  /**
   * 정렬 조건 구성
   */
  static buildOrderConditions(orderBy, orderDirection) {
    if (!orderBy) return [];
    return [[orderBy, orderDirection]];
  }

  /**
   * 게임 결과 데이터 검증
   */
  static async validateGameResult(gameResult, location) {
    try {
      const settlementValidation = (await import('./settlementValidation.js')).default;
      
      const validationResult = await settlementValidation.softValidateGameResult(
        gameResult,
        { id: `query-${location}-${gameResult.homeTeam}-${gameResult.awayTeam}` },
        { validateTeamNames: false }
      );
      
      if (validationResult.isSoftFail) {
        console.warn(`[GameResultQuery] Validation warning for ${location}: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
      }
      
      return {
        ...gameResult.toJSON(),
        validatedScore: validationResult.score
      };
    } catch (error) {
      console.error('[GameResultQuery] Validation error:', error);
      return gameResult;
    }
  }

  /**
   * 에러 처리 및 재시도
   */
  static async handleErrorWithRetry(error, homeTeam, awayTeam, commenceTime, location, options, timer) {
    console.error(`[GameResultQuery] Error in ${location}:`, error.message);
    
    // 재시도 로직
    for (let attempt = 1; attempt <= options.retryAttempts; attempt++) {
      try {
        console.log(`[GameResultQuery] Retry attempt ${attempt}/${options.retryAttempts} for ${location}`);
        
        // 재시도 간격 대기
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, options.retryDelay * attempt));
        }
        
        // 재시도 실행
        const result = await this.executeSingleQuery(
          this.normalizeTeams(homeTeam, awayTeam, options),
          this.normalizeTime(commenceTime),
          options
        );
        
        gameResultQueryMetrics.endQueryTimer(timer, result);
        return result;
        
      } catch (retryError) {
        console.error(`[GameResultQuery] Retry ${attempt} failed:`, retryError.message);
        
        if (attempt === options.retryAttempts) {
          gameResultQueryMetrics.endQueryTimer(timer, null, retryError);
          throw retryError;
        }
      }
    }
  }

  /**
   * 캐시에서 결과 조회
   */
  static async getCachedResult(teams, time) {
    // TODO: Redis 또는 메모리 캐시 구현
    return null;
  }

  /**
   * 결과를 캐시에 저장
   */
  static async setCachedResult(teams, time, result) {
    // TODO: Redis 또는 메모리 캐시 구현
  }

  /**
   * 레거시 쿼리 실행 (Feature Flag가 비활성화된 경우)
   */
  static async legacyQuery(homeTeam, awayTeam, commenceTime, location, options) {
    // 각 위치의 기존 로직을 그대로 실행
    switch (location) {
      case 'betController':
        return await this.legacyBetControllerQuery(homeTeam, awayTeam, commenceTime);
      case 'multibetSettlement':
        return await this.legacyMultibetQuery(homeTeam, awayTeam, commenceTime);
      case 'exchangeSettlement':
        return await this.legacyExchangeSettlementQuery(homeTeam, awayTeam, commenceTime);
      case 'exchangeRoutes':
        return await this.legacyExchangeRoutesQuery(homeTeam, awayTeam, commenceTime);
      default:
        throw new Error(`Unknown location: ${location}`);
    }
  }

  /**
   * 레거시 쿼리 구현들 (기존 로직 복사)
   */
  static async legacyBetControllerQuery(homeTeam, awayTeam, commenceTime) {
    const GameResult = (await import('../models/gameResultModel.js')).default;
    const { Op } = require('sequelize');
    
    const normalizedTime = this.normalizeTime(commenceTime);
    
    return await GameResult.findOne({
      where: {
        homeTeam: { [Op.iLike]: `%${homeTeam}%` },
        awayTeam: { [Op.iLike]: `%${awayTeam}%` },
        commenceTime: {
          [Op.between]: [
            new Date(normalizedTime.getTime() - 24 * 60 * 60 * 1000),
            new Date(normalizedTime.getTime() + 24 * 60 * 60 * 1000)
          ]
        }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  static async legacyMultibetQuery(homeTeam, awayTeam, commenceTime) {
    const GameResult = (await import('../models/gameResultModel.js')).default;
    const { Op } = require('sequelize');
    
    // 정확한 시간으로 먼저 검색
    let gameResult = await GameResult.findOne({
      where: {
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: commenceTime,
        status: 'finished'
      }
    });

    // 시간 범위로 검색
    if (!gameResult) {
      const targetTime = new Date(commenceTime);
      const startTime = new Date(targetTime.getTime() - (24 * 60 * 60 * 1000));
      const endTime = new Date(targetTime.getTime() + (24 * 60 * 60 * 1000));
      
      gameResult = await GameResult.findOne({
        where: {
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          commenceTime: {
            [Op.between]: [startTime, endTime]
          },
          status: 'finished'
        }
      });
    }

    return gameResult;
  }

  static async legacyExchangeSettlementQuery(homeTeam, awayTeam, commenceTime) {
    const GameResult = (await import('../models/gameResultModel.js')).default;
    
    return await GameResult.findOne({
      where: {
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: commenceTime
      },
      order: [['createdAt', 'DESC']]
    });
  }

  static async legacyExchangeRoutesQuery(homeTeam, awayTeam, commenceTime) {
    const GameResult = (await import('../models/gameResultModel.js')).default;
    
    return await GameResult.findOne({
      where: {
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: new Date(commenceTime)
      }
    });
  }
}

export default GameResultQuery;




