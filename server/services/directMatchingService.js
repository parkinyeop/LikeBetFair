import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

/**
 * 개선된 메모이제이션(캐싱) 유틸리티 함수
 * 캐시 크기 제한과 TTL을 지원합니다.
 * @param {Function} fn - 메모이즈할 함수
 * @param {Object} options - 옵션 설정
 * @param {number} options.maxSize - 최대 캐시 크기 (기본값: 1000)
 * @param {number} options.ttl - TTL in milliseconds (기본값: 5분)
 * @returns {Function} 메모이즈된 함수
 */
const memoize = (fn, options = {}) => {
  const { maxSize = 1000, ttl = 5 * 60 * 1000 } = options;
  const cache = new Map();
  
  return function(...args) {
    const key = JSON.stringify(args);
    const now = Date.now();
    
    // 캐시에서 찾기
    if (cache.has(key)) {
      const { value, timestamp } = cache.get(key);
      if (now - timestamp < ttl) {
        return value;
      } else {
        // TTL 만료된 항목 제거
        cache.delete(key);
      }
    }
    
    // 캐시 크기 제한 확인
    if (cache.size >= maxSize) {
      // 가장 오래된 항목 제거 (LRU 방식)
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, { value: result, timestamp: now });
    return result;
  };
};

/**
 * 직접 매칭 서비스 - 유연한 매칭(Flexible Matching) 구현
 * 시간 오차 허용 + 팀명 유사도 기반 매칭
 */

/**
 * 매칭 설정 클래스
 * 다양한 매칭 시나리오에 대한 설정을 관리합니다.
 */
class MatchingConfig {
  constructor() {
    // 기본 설정
    this.similarityThreshold = 0.85; // 팀명 유사도 임계값
    this.timeWindowMs = 2 * 60 * 60 * 1000; // 기본 시간 범위 (±2시간)
    this.doubleHeaderTimeWindowMs = 24 * 60 * 60 * 1000; // 더블헤더 시간 범위 (±24시간)
    
    // 스포츠별 설정
    this.sportConfigs = {
      'soccer': { similarityThreshold: 0.85, timeWindowMs: 2 * 60 * 60 * 1000 },
      'basketball': { similarityThreshold: 0.85, timeWindowMs: 2 * 60 * 60 * 1000 },
      'american_football': { similarityThreshold: 0.90, timeWindowMs: 4 * 60 * 60 * 1000 },
      'baseball': { similarityThreshold: 0.80, timeWindowMs: 24 * 60 * 60 * 1000 } // 더블헤더 고려
    };
    
    // 로그 레벨 설정
    this.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  }
  
  getConfigForSport(sport) {
    return this.sportConfigs[sport] || {
      similarityThreshold: this.similarityThreshold,
      timeWindowMs: this.timeWindowMs
    };
  }
  
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }
}

class DirectMatchingService {

  constructor() {
    this.config = new MatchingConfig();
    
    // 성능 최적화를 위해 함수들을 메모이즈합니다.
    // 메모이제이션 설정: 캐시 크기 500, TTL 10분
    this.normalizeTeamName = memoize(this.normalizeTeamName.bind(this), { 
      maxSize: 500, 
      ttl: 10 * 60 * 1000 
    });
    this.calculateSimilarity = memoize(this.calculateSimilarity.bind(this), { 
      maxSize: 1000, 
      ttl: 15 * 60 * 1000 
    });
    
    // 로그 함수들
    this.logger = {
      debug: (message, ...args) => this.config.shouldLog('debug') && console.log(`[DEBUG] ${message}`, ...args),
      info: (message, ...args) => this.config.shouldLog('info') && console.log(`[INFO] ${message}`, ...args),
      warn: (message, ...args) => this.config.shouldLog('warn') && console.warn(`[WARN] ${message}`, ...args),
      error: (message, ...args) => this.config.shouldLog('error') && console.error(`[ERROR] ${message}`, ...args)
    };
  }

  /**
   * 팀명 자연어 처리 - 정규화
   * @param {string} teamName 
   * @returns {string} 정규화된 팀명
   */
  normalizeTeamName(teamName) {
    if (!teamName) return '';
    
    return teamName
      // 공통 접미사 제거
      .replace(/\s+(FC|CF|United|City|Town|Athletic|Athletics|Club)$/gi, '')
      // 공통 접두사 제거  
      .replace(/^(The\s+|FC\s+|CF\s+)/gi, '')
      // 특수문자 제거
      .replace(/[^\w\s]/g, '')
      // 여러 공백을 하나로
      .replace(/\s+/g, ' ')
      // 소문자로 변환 후 trim
      .toLowerCase()
      .trim();
  }

  /**
   * 팀명 유사도 계산 (자연어 처리 + Levenshtein distance 혼합)
   * @param {string} norm1 정규화된 첫 번째 팀명
   * @param {string} norm2 정규화된 두 번째 팀명
   * @returns {number} 0-1 사이의 유사도 점수
   */
  calculateSimilarity(norm1, norm2) {
    if (!norm1 || !norm2) return 0;
    
    if (norm1 === norm2) return 1.0;
    
    // 완전 포함 관계 확인
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return 0.9;
    }
    
    // 단어 단위 매칭
    const words1 = norm1.split(' ');
    const words2 = norm2.split(' ');
    
    let matchingWords = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word1 === word2 || word1.includes(word2) || word2.includes(word1))) {
        matchingWords++;
      }
    }
    
    const wordSimilarity = matchingWords / Math.max(words1.length, words2.length);
    
    // Levenshtein distance
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const levenshteinSimilarity = maxLen > 0 ? 1 - (distance / maxLen) : 0;
    
    // 단어 매칭과 레벤슈타인 거리의 가중 평균
    return (wordSimilarity * 0.7) + (levenshteinSimilarity * 0.3);
  }

  /**
   * Levenshtein Distance 계산
   * @param {string} str1 
   * @param {string} str2 
   * @returns {number}
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 유연한 매칭(Flexible Matching) - GameResult 직접 매칭 (더블헤더 처리 강화)
   * @param {Object} selection - 멀티벳 선택 정보
   * @param {string} selection.homeTeam
   * @param {string} selection.awayTeam  
   * @param {string} selection.commenceTime
   * @param {string} selection.sport - 스포츠 종목 (선택사항)
   * @returns {Object|null} 매칭된 GameResult 또는 null
   */
  async findMatchingGameResult(selection) {
    this.logger.info(`유연한 매칭 시작: ${selection.homeTeam} vs ${selection.awayTeam}`);
    
    if (!selection.homeTeam || !selection.awayTeam || !selection.commenceTime) {
      this.logger.error('필수 정보 누락', { homeTeam: !!selection.homeTeam, awayTeam: !!selection.awayTeam, commenceTime: !!selection.commenceTime });
      return null;
    }

    const selectionTime = new Date(selection.commenceTime);
    const sport = selection.sport || 'soccer';
    const config = this.config.getConfigForSport(sport);
    
    this.logger.debug(`선택 경기 시간: ${selectionTime.toISOString()}, 스포츠: ${sport}, 설정:`, config);

    try {
      // 1. 최적화된 데이터베이스 쿼리 (필요한 컬럼만 조회)
      const candidateGames = await GameResult.findAll({
        attributes: ['id', 'homeTeam', 'awayTeam', 'commenceTime', 'status', 'result', 'score'],
        where: {
          commenceTime: {
            [Op.between]: [
              new Date(selectionTime.getTime() - config.timeWindowMs),
              new Date(selectionTime.getTime() + config.timeWindowMs),
            ],
          },
          status: 'finished'
        },
        order: [['commenceTime', 'ASC']],
        limit: 50 // 성능을 위해 후보 경기 수 제한
      });

      if (!candidateGames || candidateGames.length === 0) {
        this.logger.warn(`시간 범위 내 후보 경기 없음: ${selection.homeTeam} vs ${selection.awayTeam}`);
        return null;
      }

      this.logger.debug(`시간 범위 내 후보 경기 ${candidateGames.length}개 발견`);

      // 2. 유사도 점수가 임계값을 넘는 모든 잠재적 후보 경기를 찾습니다.
      const potentialMatches = [];
      for (const game of candidateGames) {
        try {
          // 팀명 정규화 (메모이즈된 메서드 사용)
          const selectionHome = this.normalizeTeamName(selection.homeTeam);
          const selectionAway = this.normalizeTeamName(selection.awayTeam);
          const gameHome = this.normalizeTeamName(game.homeTeam);
          const gameAway = this.normalizeTeamName(game.awayTeam);

          // 팀명 유사도 점수 계산 (메모이즈된 메서드 사용)
          const homeSimilarity = this.calculateSimilarity(selectionHome, gameHome);
          const awaySimilarity = this.calculateSimilarity(selectionAway, gameAway);
          const totalScore = (homeSimilarity + awaySimilarity) / 2;

          this.logger.debug(`매칭 시도: "${gameHome}" vs "${gameAway}" (유사도: ${totalScore.toFixed(3)})`);

          if (totalScore >= config.similarityThreshold) {
            potentialMatches.push({
              game,
              score: totalScore,
              timeDiff: Math.abs(new Date(game.commenceTime).getTime() - selectionTime.getTime())
            });
          }
        } catch (gameError) {
          this.logger.warn(`개별 경기 매칭 중 오류:`, gameError.message);
          continue; // 개별 경기 오류는 무시하고 계속 진행
        }
      }

      if (potentialMatches.length === 0) {
        this.logger.warn(`매칭 실패: ${selection.homeTeam} vs ${selection.awayTeam} (모든 후보 경기가 유사도 임계값 미달)`);
        return null;
      }

      // 3. 후보 경기를 정렬합니다.
      //    - 기본: 유사도 점수가 높은 순서
      //    - 더블헤더 처리: 점수가 같으면, 시간 차이가 적은 순서로 정렬
      potentialMatches.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.timeDiff - b.timeDiff;
      });

      // 4. 가장 가능성이 높은 경기(정렬 후 첫 번째 항목)를 최종 선택합니다.
      const bestMatch = potentialMatches[0];

      this.logger.info(`매칭 성공: "${selection.homeTeam}" vs "${selection.awayTeam}" => "${bestMatch.game.homeTeam}" vs "${bestMatch.game.awayTeam}" (점수: ${bestMatch.score.toFixed(3)}, 시간차: ${bestMatch.timeDiff / 1000}초)`);
      return bestMatch.game;

    } catch (error) {
      this.logger.error('유연한 매칭 중 오류:', error.message, error.stack);
      return null;
    }
  }

  /**
   * 멀티벳 주문의 모든 선택에 대해 매칭 수행
   * @param {Object} multibetOrder - 멀티벳 주문
   * @returns {Array} 매칭 결과 배열
   */
  async matchAllSelections(multibetOrder) {
    if (!multibetOrder.selectionDetails?.selections) {
      this.logger.error('selectionDetails.selections 없음', { orderId: multibetOrder.id });
      return [];
    }

    const selections = multibetOrder.selectionDetails.selections;
    this.logger.info(`멀티벳 주문 ${multibetOrder.id} 매칭 시작`, { selectionCount: selections.length });

    const results = [];
    const startTime = Date.now();
    
    // 병렬 처리로 성능 향상 (최대 5개 동시 처리)
    const batchSize = 5;
    for (let i = 0; i < selections.length; i += batchSize) {
      const batch = selections.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (selection, batchIndex) => {
        const index = i + batchIndex;
        this.logger.debug(`선택 ${index + 1}/${selections.length} 처리 시작`);
        
        try {
          const gameResult = await this.findMatchingGameResult(selection);
          return {
            selection,
            gameResult,
            matched: !!gameResult,
            index
          };
        } catch (error) {
          this.logger.error(`선택 ${index + 1} 매칭 중 오류:`, error.message);
          return {
            selection,
            gameResult: null,
            matched: false,
            index,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const matchedCount = results.filter(r => r.matched).length;
    const duration = Date.now() - startTime;
    
    this.logger.info(`멀티벳 매칭 완료: ${matchedCount}/${results.length} 성공`, { 
      orderId: multibetOrder.id, 
      duration: `${duration}ms`,
      successRate: `${((matchedCount / results.length) * 100).toFixed(1)}%`
    });

    return results.sort((a, b) => a.index - b.index); // 원래 순서로 정렬
  }
}

export default new DirectMatchingService();
