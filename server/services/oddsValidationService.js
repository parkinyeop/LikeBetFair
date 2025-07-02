import OddsCache from '../models/oddsCacheModel.js';
import oddsHistoryService from './oddsHistoryService.js';
import { Op } from 'sequelize';
import { BETTING_CONFIG } from '../config/centralizedConfig.js';

class OddsValidationService {
  constructor() {
    // 배당율 검증 허용 오차 (예: 5% 차이까지 허용)
    this.ODDS_TOLERANCE = 0.05;
    // 시장 조작 탐지 임계값
    this.MARKET_MANIPULATION_THRESHOLD = 0.30; // 30% 이상 급격한 변화
    // 배당율 히스토리 보존 기간 (시간)
    this.ODDS_HISTORY_RETENTION_HOURS = 24;
  }

  /**
   * 베팅 요청 시 배당율 유효성 검증
   * @param {Object} selection - 베팅 선택 정보
   * @returns {Object} - 검증 결과 { isValid, reason, currentOdds }
   */
  async validateBetOdds(selection) {
    try {
      console.log(`[OddsValidation] 베팅 배당율 검증 시작: ${selection.desc}`);
      
      // 1. 기본 배당율 범위 검증
      const rangeValidation = this.validateOddsRange(selection.odds);
      if (!rangeValidation.isValid) {
        console.log(`[OddsValidation] 범위 검증 실패: ${rangeValidation.reason}`);
        return rangeValidation;
      }

      // 2. 현재 시장 배당율과 비교 검증
      const marketValidation = await this.validateAgainstMarket(selection);
      if (!marketValidation.isValid) {
        console.log(`[OddsValidation] 시장 검증 실패: ${marketValidation.reason}`);
        return marketValidation;
      }

      console.log(`[OddsValidation] 배당율 검증 성공: ${selection.odds} (시장: ${marketValidation.currentOdds})`);
      return {
        isValid: true,
        reason: 'Valid odds',
        currentOdds: marketValidation.currentOdds,
        confidence: 'high'
      };

    } catch (error) {
      console.error('[OddsValidation] 배당율 검증 중 오류:', error);
      return {
        isValid: false,
        reason: 'Odds validation service error',
        currentOdds: null
      };
    }
  }

  /**
   * 정산 시점 배당율 유효성 재검증
   * @param {Object} bet - 베팅 정보
   * @returns {Object} - 검증 결과
   */
  async validateSettlementOdds(bet) {
    console.log(`[OddsValidation] 정산 배당율 검증 시작: bet ${bet.id}`);
    const validationResults = [];
    
    for (const selection of bet.selections) {
      // 베팅 시점 배당율 유효성 검증
      const settlementValidation = await this.validateBetTimeOdds(selection, bet.createdAt);
      validationResults.push({
        selection: selection.desc,
        team: selection.team,
        odds: selection.odds,
        ...settlementValidation
      });
    }

    const hasInvalidOdds = validationResults.some(result => !result.isValid);
    const suspiciousOdds = validationResults.filter(result => result.suspicious);
    
    let action = 'proceed';
    if (hasInvalidOdds) {
      action = 'refund';
    } else if (suspiciousOdds.length > 0) {
      action = 'manual_review';
    }

    console.log(`[OddsValidation] 정산 검증 완료: ${action} (무효: ${hasInvalidOdds}, 의심: ${suspiciousOdds.length})`);
    
    return {
      isValid: !hasInvalidOdds,
      validationResults,
      action,
      suspiciousCount: suspiciousOdds.length
    };
  }

  /**
   * 기본 배당율 범위 검증
   */
  validateOddsRange(odds) {
    if (!odds || typeof odds !== 'number') {
      return {
        isValid: false,
        reason: 'Invalid odds format',
        code: 'INVALID_FORMAT'
      };
    }

    if (odds < BETTING_CONFIG.MIN_ODDS) {
      return {
        isValid: false,
        reason: `Odds too low (min: ${BETTING_CONFIG.MIN_ODDS})`,
        code: 'ODDS_TOO_LOW'
      };
    }

    if (odds > BETTING_CONFIG.MAX_ODDS) {
      return {
        isValid: false,
        reason: `Odds too high (max: ${BETTING_CONFIG.MAX_ODDS})`,
        code: 'ODDS_TOO_HIGH'
      };
    }

    return { isValid: true };
  }

  /**
   * 현재 시장 배당율과 비교 검증
   */
  async validateAgainstMarket(selection) {
    try {
      // 동일 경기의 현재 배당율 조회
      const currentOddsData = await this.getCurrentMarketOdds(selection);
      
      if (!currentOddsData) {
        console.log(`[OddsValidation] 현재 시장 데이터 없음: ${selection.desc}`);
        // 시장 데이터가 없는 경우 관대하게 처리 (경고만)
        return {
          isValid: true,
          reason: 'No current market data available - proceeding with caution',
          code: 'NO_MARKET_DATA',
          currentOdds: selection.odds,
          warning: true
        };
      }

      const currentOdds = currentOddsData.odds;
      const oddsDifference = Math.abs(selection.odds - currentOdds) / currentOdds;

      if (oddsDifference > this.ODDS_TOLERANCE) {
        return {
          isValid: false,
          reason: `Odds deviation too high: ${(oddsDifference * 100).toFixed(1)}% (limit: ${(this.ODDS_TOLERANCE * 100).toFixed(1)}%)`,
          code: 'ODDS_DEVIATION',
          currentOdds,
          requestedOdds: selection.odds,
          deviation: oddsDifference
        };
      }

      return {
        isValid: true,
        currentOdds,
        deviation: oddsDifference,
        bookmaker: currentOddsData.bookmaker
      };

    } catch (error) {
      console.error('[OddsValidation] 시장 배당율 검증 오류:', error);
      return {
        isValid: true, // 오류 시 관대하게 처리
        reason: 'Market validation error - proceeding',
        code: 'MARKET_ERROR',
        warning: true
      };
    }
  }

  /**
   * 베팅 시점 배당율 유효성 검증 (정산 시)
   */
  async validateBetTimeOdds(selection, betTimestamp) {
    try {
      // 베팅 시점의 시장 상황 재구성
      const betTime = new Date(betTimestamp);
      
      // 🔥 히스토리 서비스를 통한 베팅 시점 배당율 검증
      const historicalOdds = await oddsHistoryService.getValidationHistory(selection, betTime);
      
      if (!historicalOdds) {
        console.log(`[OddsValidation] 베팅 시점 히스토리 없음: ${selection.desc}`);
        return {
          isValid: true, // 데이터 부족 시 관대하게 처리
          reason: 'No historical odds data for bet time validation',
          suspicious: false
        };
      }

      // 베팅 배당율과 당시 실제 배당율 비교
      const deviation = Math.abs(selection.odds - historicalOdds.odds) / historicalOdds.odds;
      const timeDiffMinutes = historicalOdds.timeDifference / (1000 * 60);
      
      console.log(`[OddsValidation] 베팅 시점 검증: 요청=${selection.odds}, 히스토리=${historicalOdds.odds}, 편차=${(deviation*100).toFixed(1)}%, 시간차=${timeDiffMinutes.toFixed(1)}분`);
      
      if (deviation > this.ODDS_TOLERANCE * 2) { // 정산 시에는 더 관대한 기준
        return {
          isValid: false,
          reason: `Bet-time odds deviation: ${(deviation * 100).toFixed(1)}% (historical: ${historicalOdds.odds}, bet: ${selection.odds})`,
          code: 'BET_TIME_DEVIATION',
          expectedOdds: historicalOdds.odds,
          actualOdds: selection.odds,
          timeDifference: timeDiffMinutes
        };
      }

      if (deviation > this.ODDS_TOLERANCE) {
        return {
          isValid: true,
          reason: 'Odds within acceptable range but flagged for review',
          suspicious: true,
          deviation,
          historicalOdds: historicalOdds.odds,
          timeDifference: timeDiffMinutes
        };
      }

      return {
        isValid: true,
        reason: 'Bet-time odds validated successfully',
        suspicious: false,
        deviation,
        historicalOdds: historicalOdds.odds,
        timeDifference: timeDiffMinutes
      };

    } catch (error) {
      console.error('[OddsValidation] 베팅 시점 검증 오류:', error);
      return {
        isValid: true,
        reason: 'Bet-time validation error - proceeding',
        suspicious: false
      };
    }
  }

  /**
   * 현재 시장 배당율 조회
   */
  async getCurrentMarketOdds(selection) {
    try {
      // 경기 시간으로 OddsCache 검색
      const commenceTime = new Date(selection.commence_time);
      const timeRange = 2 * 60 * 60 * 1000; // 2시간 범위
      
      const oddsData = await OddsCache.findOne({
        where: {
          commenceTime: {
            [Op.between]: [
              new Date(commenceTime.getTime() - timeRange),
              new Date(commenceTime.getTime() + timeRange)
            ]
          }
        },
        order: [['lastUpdated', 'DESC']],
        limit: 1
      });

      if (!oddsData) {
        console.log(`[OddsValidation] OddsCache에서 경기 찾을 수 없음: ${selection.desc}`);
        return null;
      }

      // 북메이커 데이터에서 해당 팀/옵션의 배당율 추출
      const marketKey = this.getMarketKey(selection.market);
      const targetOdds = this.extractOddsFromBookmakers(oddsData.bookmakers, marketKey, selection);

      if (!targetOdds) {
        console.log(`[OddsValidation] 해당 선택의 배당율 찾을 수 없음: ${selection.team || selection.option}`);
        return null;
      }

      return targetOdds;
    } catch (error) {
      console.error('[OddsValidation] 현재 배당율 조회 오류:', error);
      return null;
    }
  }

  /**
   * 특정 시점의 시장 스냅샷 조회
   */
  async getMarketSnapshotAtTime(selection, targetTime) {
    try {
      // 베팅 시점 ±30분 내의 OddsCache 데이터 조회
      const timeRange = 30 * 60 * 1000; // 30분
      const startTime = new Date(targetTime.getTime() - timeRange);
      const endTime = new Date(targetTime.getTime() + timeRange);

      const oddsHistory = await OddsCache.findAll({
        where: {
          lastUpdated: {
            [Op.between]: [startTime, endTime]
          }
        },
        order: [['lastUpdated', 'DESC']],
        limit: 10
      });

      if (!oddsHistory || oddsHistory.length === 0) {
        return null;
      }

      // 해당 시점의 평균 배당율 계산
      const marketKey = this.getMarketKey(selection.market);
      const oddsValues = [];

      for (const odds of oddsHistory) {
        const extractedOdds = this.extractOddsFromBookmakers(odds.bookmakers, marketKey, selection);
        if (extractedOdds) {
          oddsValues.push(extractedOdds.odds);
        }
      }

      if (oddsValues.length === 0) {
        return null;
      }

      const averageOdds = oddsValues.reduce((sum, odds) => sum + odds, 0) / oddsValues.length;
      const minOdds = Math.min(...oddsValues);
      const maxOdds = Math.max(...oddsValues);

      return {
        averageOdds,
        minOdds,
        maxOdds,
        sampleSize: oddsValues.length,
        timeRange: { startTime, endTime }
      };

    } catch (error) {
      console.error('[OddsValidation] 시장 스냅샷 조회 오류:', error);
      return null;
    }
  }

  /**
   * 북메이커 데이터에서 특정 선택의 배당율 추출
   */
  extractOddsFromBookmakers(bookmakers, marketKey, selection) {
    for (const bookmaker of bookmakers || []) {
      const market = bookmaker.markets?.find(m => m.key === marketKey);
      if (!market) continue;

      for (const outcome of market.outcomes || []) {
        if (this.matchesSelection(outcome, selection)) {
          return {
            odds: outcome.price,
            bookmaker: bookmaker.title,
            lastUpdate: bookmaker.last_update,
            outcome: outcome.name
          };
        }
      }
    }
    return null;
  }

  /**
   * 배당율 결과가 선택과 일치하는지 확인
   */
  matchesSelection(outcome, selection) {
    // 1. 팀명 매칭
    if (selection.team && outcome.name) {
      if (outcome.name.toLowerCase().includes(selection.team.toLowerCase()) ||
          selection.team.toLowerCase().includes(outcome.name.toLowerCase())) {
        return true;
      }
    }

    // 2. 옵션 매칭 (Over/Under 등)
    if (selection.option && outcome.name) {
      if (outcome.name.toLowerCase().includes(selection.option.toLowerCase())) {
        return true;
      }
    }

    // 3. 포인트 매칭
    if (selection.point !== undefined && outcome.point !== undefined) {
      if (Math.abs(selection.point - outcome.point) < 0.001) { // 부동소수점 오차 고려
        return true;
      }
    }

    return false;
  }

  /**
   * 마켓 키 변환
   */
  getMarketKey(market) {
    const marketMapping = {
      '승/패': 'h2h',
      '언더/오버': 'totals',
      '핸디캡': 'spreads'
    };
    return marketMapping[market] || market || 'h2h';
  }

  /**
   * 수상한 배당율 패턴 탐지
   */
  async detectSuspiciousPatterns(bet) {
    const suspiciousFlags = [];

    // 1. 모든 선택이 매우 높은 배당율
    const avgOdds = bet.selections.reduce((sum, sel) => sum + sel.odds, 0) / bet.selections.length;
    if (avgOdds > 10.0) {
      suspiciousFlags.push('HIGH_AVERAGE_ODDS');
    }

    // 2. 단일 베팅 내 배당율 편차가 매우 큼
    const oddsValues = bet.selections.map(sel => sel.odds);
    const minOdds = Math.min(...oddsValues);
    const maxOdds = Math.max(...oddsValues);
    if (maxOdds / minOdds > 20) {
      suspiciousFlags.push('EXTREME_ODDS_VARIANCE');
    }

    // 3. 비현실적인 총 배당율
    if (bet.totalOdds > 1000) {
      suspiciousFlags.push('UNREALISTIC_TOTAL_ODDS');
    }

    return suspiciousFlags;
  }
}

export default new OddsValidationService(); 