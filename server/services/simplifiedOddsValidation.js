import OddsCache from '../models/oddsCacheModel.js';
import { BETTING_CONFIG } from '../config/centralizedConfig.js';

class SimplifiedOddsValidation {
  constructor() {
    // 배당율 허용 오차 (부동소수점 오차 등을 위한 최소한의 여유)
    this.ODDS_TOLERANCE = 0.001; // 0.1%
  }

  /**
   * 베팅 요청 시 현재 제공 중인 배당율과 일치하는지 검증
   * @param {Object} selection - 베팅 선택 정보
   * @returns {Object} - 검증 결과
   */
  async validateBetOdds(selection) {
    try {
      console.log(`[SimplifiedValidation] 배당율 검증: ${selection.desc}, 요청 배당율: ${selection.odds}`);
      
      // 1. 기본 범위 검증
      if (selection.odds < BETTING_CONFIG.MIN_ODDS || selection.odds > BETTING_CONFIG.MAX_ODDS) {
        return {
          isValid: false,
          reason: `배당율 범위 초과 (허용: ${BETTING_CONFIG.MIN_ODDS}-${BETTING_CONFIG.MAX_ODDS})`,
          code: 'ODDS_OUT_OF_RANGE'
        };
      }

      // 2. 현재 우리가 제공하는 배당율과 일치하는지 확인
      const currentOdds = await this.getCurrentOfferedOdds(selection);
      
      if (!currentOdds) {
        return {
          isValid: false,
          reason: '현재 해당 배당율을 제공하지 않습니다',
          code: 'ODDS_NOT_AVAILABLE'
        };
      }

      // 3. 배당율 일치 검증 (최소한의 오차 허용)
      const deviation = Math.abs(selection.odds - currentOdds.odds) / currentOdds.odds;
      
      if (deviation > this.ODDS_TOLERANCE) {
        return {
          isValid: false,
          reason: `배당율 불일치 - 현재 제공: ${currentOdds.odds}, 요청: ${selection.odds}`,
          code: 'ODDS_MISMATCH',
          currentOdds: currentOdds.odds,
          requestedOdds: selection.odds
        };
      }

      // 4. 검증 성공 - 베팅 시점 배당율 기록
      const betSnapshot = await this.saveBetSnapshot(selection, currentOdds);

      return {
        isValid: true,
        reason: '배당율 검증 성공',
        offeredOdds: currentOdds.odds,
        snapshotId: betSnapshot.id
      };

    } catch (error) {
      console.error('[SimplifiedValidation] 검증 중 오류:', error);
      return {
        isValid: false,
        reason: '배당율 검증 서비스 오류',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * 정산 시점에 베팅 시점 배당율과 일치하는지 검증
   * @param {Object} bet - 베팅 정보
   * @returns {Object} - 검증 결과
   */
  async validateSettlementOdds(bet) {
    try {
      console.log(`[SimplifiedValidation] 정산 검증 시작: bet ${bet.id}`);
      
      const validationResults = [];
      
      for (const selection of bet.selections) {
        // 베팅 시점에 저장된 스냅샷과 비교
        const snapshot = await this.getBetSnapshot(selection, bet.createdAt);
        
        if (!snapshot) {
          validationResults.push({
            selection: selection.desc,
            isValid: false,
            reason: '베팅 시점 배당율 기록을 찾을 수 없습니다',
            code: 'SNAPSHOT_NOT_FOUND'
          });
          continue;
        }

        // 베팅 시점 배당율과 현재 베팅의 배당율 비교
        const deviation = Math.abs(selection.odds - snapshot.offeredOdds) / snapshot.offeredOdds;
        
        if (deviation > this.ODDS_TOLERANCE) {
          validationResults.push({
            selection: selection.desc,
            isValid: false,
            reason: `베팅 시점 배당율 불일치 - 기록: ${snapshot.offeredOdds}, 베팅: ${selection.odds}`,
            code: 'SNAPSHOT_MISMATCH',
            expectedOdds: snapshot.offeredOdds,
            actualOdds: selection.odds
          });
        } else {
          validationResults.push({
            selection: selection.desc,
            isValid: true,
            reason: '베팅 시점 배당율 일치 확인',
            offeredOdds: snapshot.offeredOdds
          });
        }
      }

      const hasInvalid = validationResults.some(result => !result.isValid);
      
      return {
        isValid: !hasInvalid,
        action: hasInvalid ? 'refund' : 'proceed',
        validationResults
      };

    } catch (error) {
      console.error('[SimplifiedValidation] 정산 검증 중 오류:', error);
      return {
        isValid: false,
        action: 'refund',
        reason: '정산 검증 서비스 오류'
      };
    }
  }

  /**
   * 현재 제공 중인 배당율 조회
   * @param {Object} selection - 베팅 선택 정보
   * @returns {Object|null} - 현재 배당율 정보
   */
  async getCurrentOfferedOdds(selection) {
    try {
      // commence_time 기준으로 해당 경기 찾기
      const commenceTime = new Date(selection.commence_time);
      const timeRange = 30 * 60 * 1000; // 30분 범위
      
      const oddsCache = await OddsCache.findOne({
        where: {
          commenceTime: {
            [require('sequelize').Op.between]: [
              new Date(commenceTime.getTime() - timeRange),
              new Date(commenceTime.getTime() + timeRange)
            ]
          }
        },
        order: [['lastUpdated', 'DESC']],
        limit: 1
      });

      if (!oddsCache) {
        console.log(`[SimplifiedValidation] 경기를 찾을 수 없음: ${selection.desc}`);
        return null;
      }

      // 북메이커 데이터에서 해당 선택의 배당율 찾기
      const marketKey = this.getMarketKey(selection.market);
      
      for (const bookmaker of oddsCache.bookmakers || []) {
        const market = bookmaker.markets?.find(m => m.key === marketKey);
        if (!market) continue;

        for (const outcome of market.outcomes || []) {
          if (this.matchesSelection(outcome, selection)) {
            return {
              odds: outcome.price,
              bookmaker: bookmaker.title,
              lastUpdate: bookmaker.last_update,
              gameId: oddsCache.id
            };
          }
        }
      }

      console.log(`[SimplifiedValidation] 해당 선택의 배당율을 찾을 수 없음: ${selection.team || selection.option}`);
      return null;

    } catch (error) {
      console.error('[SimplifiedValidation] 현재 배당율 조회 중 오류:', error);
      return null;
    }
  }

  /**
   * 베팅 시점 배당율 스냅샷 저장
   * @param {Object} selection - 베팅 선택 정보
   * @param {Object} currentOdds - 현재 배당율 정보
   * @returns {Object} - 저장된 스냅샷 정보
   */
  async saveBetSnapshot(selection, currentOdds) {
    try {
      // 간단한 스냅샷 저장 (JSON 형태로 selection에 추가)
      const snapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        betTime: new Date().toISOString(),
        offeredOdds: currentOdds.odds,
        bookmaker: currentOdds.bookmaker,
        gameId: currentOdds.gameId,
        selection: {
          team: selection.team,
          market: selection.market,
          option: selection.option,
          point: selection.point
        }
      };

      // selection 객체에 스냅샷 정보 추가
      selection._oddsSnapshot = snapshot;
      
      console.log(`[SimplifiedValidation] 배당율 스냅샷 저장: ${snapshot.id}`);
      return snapshot;

    } catch (error) {
      console.error('[SimplifiedValidation] 스냅샷 저장 중 오류:', error);
      return { id: 'error', offeredOdds: selection.odds };
    }
  }

  /**
   * 베팅 시점 스냅샷 조회
   * @param {Object} selection - 베팅 선택 정보
   * @param {Date} betTime - 베팅 시간
   * @returns {Object|null} - 스냅샷 정보
   */
  async getBetSnapshot(selection, betTime) {
    try {
      // selection에서 스냅샷 정보 추출
      if (selection._oddsSnapshot) {
        return selection._oddsSnapshot;
      }
      
      // 스냅샷이 없는 경우 (기존 베팅의 경우)
      console.log(`[SimplifiedValidation] 스냅샷이 없는 베팅: ${selection.desc}`);
      return {
        offeredOdds: selection.odds, // 기존 베팅은 베팅 배당율을 그대로 사용
        betTime: betTime,
        source: 'legacy'
      };

    } catch (error) {
      console.error('[SimplifiedValidation] 스냅샷 조회 중 오류:', error);
      return null;
    }
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
   * 선택과 결과가 일치하는지 확인
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
        // 포인트도 일치하는지 확인
        if (selection.point !== undefined && outcome.point !== undefined) {
          return Math.abs(selection.point - outcome.point) < 0.001;
        }
        return true;
      }
    }

    return false;
  }
}

export default new SimplifiedOddsValidation();
