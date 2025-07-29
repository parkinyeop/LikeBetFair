import OddsCache from '../models/oddsCacheModel.js';
import OddsHistory from '../models/oddsHistoryModel.js';
import { Op } from 'sequelize';
import { BETTING_CONFIG } from '../config/centralizedConfig.js';
import { normalizeTeamNameForComparison, normalizeOption } from '../normalizeUtils.js';
import oddsHistoryService from './oddsHistoryService.js';

class SimplifiedOddsValidation {
  constructor() {
    this.ODDS_TOLERANCE = 0.01; // 1% 허용 오차로 조정 (더 관대하게)
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
        // 경기를 찾을 수 없는 경우 범위 검증만 수행 (관대한 정책)
        console.log(`[SimplifiedValidation] 경기 미발견으로 범위 검증만 수행: ${selection.desc}`);
        return {
          isValid: true,
          reason: '경기 미발견으로 범위 검증만 수행됨 (허용)',
          code: 'ODDS_RANGE_ONLY',
          warning: true
        };
      }

      // 3. 배당율 일치 검증 (최소한의 오차 허용)
      const deviation = Math.abs(selection.odds - currentOdds.odds) / currentOdds.odds;
      
      console.log(`[SimplifiedValidation] 배당율 비교: 요청=${selection.odds}, 현재=${currentOdds.odds}, 오차=${(deviation * 100).toFixed(2)}%, 허용=${(this.ODDS_TOLERANCE * 100).toFixed(2)}%`);
      
      if (deviation > this.ODDS_TOLERANCE) {
        console.log(`[SimplifiedValidation] 배당율 변경 감지: ${selection.desc} - ${selection.odds} → ${currentOdds.odds}`);
        return {
          isValid: false,
          reason: '배당율이 변경되었습니다',
          code: 'ODDS_CHANGED',
          currentOdds: currentOdds.odds,
          requestedOdds: selection.odds,
          message: `배당율이 ${selection.odds}에서 ${currentOdds.odds}로 변경되었습니다. 새로운 배당율로 베팅하시겠습니까?`,
          newBettingData: {
            ...selection,
            odds: currentOdds.odds,
            bookmaker: currentOdds.bookmaker,
            lastUpdate: currentOdds.lastUpdate
          }
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
      console.log(`[SimplifiedValidation] 배당율 조회 시작: ${selection.desc}, 시작시간: ${selection.commence_time}`);
      
      // commence_time 기준으로 해당 경기 찾기
      const commenceTime = new Date(selection.commence_time);
      const timeRange = 30 * 60 * 1000; // 30분 범위
      
      // 팀명으로 경기 찾기 (시간 + 팀명 모두 고려)
      const homeAwayTeams = selection.desc.split(' vs ');
      if (homeAwayTeams.length !== 2) {
        console.log(`[SimplifiedValidation] desc 형식 오류: ${selection.desc}`);
        return null;
      }
      
      const normalizedHomeTeam = normalizeTeamNameForComparison(homeAwayTeams[0]);
      const normalizedAwayTeam = normalizeTeamNameForComparison(homeAwayTeams[1]);
      const normalizedSelectionTeam = normalizeTeamNameForComparison(selection.team);
      
      console.log(`[SimplifiedValidation] 경기 정보: ${normalizedHomeTeam} vs ${normalizedAwayTeam}, 선택팀: ${normalizedSelectionTeam}`);
      
      const oddsCache = await OddsCache.findOne({
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

      if (!oddsCache) {
        console.log(`[SimplifiedValidation] 시간 범위내 경기를 찾을 수 없음: ${selection.desc}`);
        return null;
      }
      
      console.log(`[SimplifiedValidation] 찾은 경기: ${oddsCache.homeTeam} vs ${oddsCache.awayTeam}`);

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
   * 베팅 시점 스냅샷 조회 (OddsHistory 활용)
   * @param {Object} selection - 베팅 선택 정보
   * @param {Date} betTime - 베팅 시간
   * @returns {Object|null} - 스냅샷 정보
   */
  async getBetSnapshot(selection, betTime) {
    try {
      console.log(`[SimplifiedValidation] 정산 검증용 히스토리 조회: ${selection.desc}, 베팅시간: ${betTime}`);
      
      // 1. selection에서 임시 스냅샷 정보 추출 (현재 베팅)
      if (selection._oddsSnapshot) {
        console.log(`[SimplifiedValidation] 임시 스냅샷 사용: ${selection._oddsSnapshot.offeredOdds}`);
        return selection._oddsSnapshot;
      }
      
      // 2. OddsHistory에서 베팅 시점 배당율 조회 (기존 베팅)
      const historicalOdds = await oddsHistoryService.getValidationHistory(selection, betTime);
      
      if (historicalOdds) {
        console.log(`[SimplifiedValidation] OddsHistory에서 발견: ${historicalOdds.odds} (${historicalOdds.timestamp})`);
        return {
          offeredOdds: historicalOdds.odds,
          betTime: historicalOdds.timestamp,
          bookmaker: historicalOdds.bookmaker,
          source: 'database'
        };
      }
      
      // 3. 히스토리를 찾을 수 없는 경우 - 베팅 배당율 그대로 사용 (관대한 정책)
      console.log(`[SimplifiedValidation] 히스토리 미발견으로 베팅 배당율 사용: ${selection.odds}`);
      return {
        offeredOdds: selection.odds,
        betTime: betTime,
        source: 'fallback',
        warning: '히스토리 기록 없음'
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
   * 선택과 결과가 일치하는지 확인 (개선된 버전)
   */
  matchesSelection(outcome, selection) {
    console.log(`[SimplifiedValidation] 매칭 검사: outcome="${outcome.name}" vs selection="${selection.team || selection.option}"`);
    
    // 1. 팀명 매칭 (정규화 함수 활용)
    if (selection.team && outcome.name) {
      const normalizedOutcome = normalizeTeamNameForComparison(outcome.name);
      const normalizedSelection = normalizeTeamNameForComparison(selection.team);
      
      console.log(`[SimplifiedValidation] 팀명 정규화: "${normalizedOutcome}" vs "${normalizedSelection}"`);
      
      // 정확한 일치
      if (normalizedOutcome === normalizedSelection) {
        console.log(`[SimplifiedValidation] 팀명 정확 매칭 성공`);
        return true;
      }
      
      // 부분 일치 (한쪽이 다른 쪽을 포함)
      if (normalizedOutcome.includes(normalizedSelection) || 
          normalizedSelection.includes(normalizedOutcome)) {
        console.log(`[SimplifiedValidation] 팀명 부분 매칭 성공`);
        return true;
      }
    }

    // 2. 옵션 매칭 (Over/Under 등)
    if (selection.option && outcome.name) {
      const normalizedOutcomeOption = normalizeOption(outcome.name);
      const normalizedSelectionOption = normalizeOption(selection.option);
      
      console.log(`[SimplifiedValidation] 옵션 정규화: "${normalizedOutcomeOption}" vs "${normalizedSelectionOption}"`);
      
      if (normalizedOutcomeOption.toLowerCase() === normalizedSelectionOption.toLowerCase()) {
        // 포인트도 일치하는지 확인
        if (selection.point !== undefined && outcome.point !== undefined) {
          const pointMatch = Math.abs(selection.point - outcome.point) < 0.001;
          console.log(`[SimplifiedValidation] 포인트 매칭: ${selection.point} vs ${outcome.point} = ${pointMatch}`);
          return pointMatch;
        }
        console.log(`[SimplifiedValidation] 옵션 매칭 성공`);
        return true;
      }
    }

    console.log(`[SimplifiedValidation] 매칭 실패`);
    return false;
  }
}

export default new SimplifiedOddsValidation();
