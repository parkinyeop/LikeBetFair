import { BETTING_CONFIG } from '../config/centralizedConfig.js';
import BettingAmountSettingsService from './bettingAmountSettingsService.js';

/**
 * 익스체인지 멀티배팅 검증 서비스
 * 스포츠북의 멀티배팅 규칙을 익스체인지에 적용
 */
class ExchangeMultibetValidationService {
  
  /**
   * 🎯 전체 멀티배팅 검증 (메인 진입점)
   */
  static async validateMultibet(userId, selections, stake, totalOdds) {
    try {
      console.log('🔍 [MultibetValidation] 멀티배팅 검증 시작:', {
        userId,
        selectionCount: selections.length,
        stake,
        totalOdds
      });

      // 1. 기본 데이터 검증
      if (!selections || !Array.isArray(selections)) {
        return { isValid: false, reason: '선택 항목이 올바르지 않습니다.' };
      }

      if (!stake || stake <= 0) {
        return { isValid: false, reason: '베팅 금액이 올바르지 않습니다.' };
      }

      if (!totalOdds || totalOdds <= 1) {
        return { isValid: false, reason: '총 배당율이 올바르지 않습니다.' };
      }

      // 2. 선택 개수 검증 (스포츠북과 동일: 최소 1개)
      if (selections.length < BETTING_CONFIG.MIN_SELECTIONS) {
        return { 
          isValid: false, 
          reason: `멀티배팅은 최소 ${BETTING_CONFIG.MIN_SELECTIONS}개 이상의 선택이 필요합니다.` 
        };
      }

      if (selections.length > BETTING_CONFIG.MAX_SELECTIONS) {
        return { 
          isValid: false, 
          reason: `멀티배팅은 최대 ${BETTING_CONFIG.MAX_SELECTIONS}개까지 선택할 수 있습니다.` 
        };
      }

      // 3. 베팅 금액 검증 (동적 설정 사용)
      try {
        const bettingSettings = await BettingAmountSettingsService.getPlatformBettingSettings('exchange');
        
        if (bettingSettings.minBetAmount && stake < bettingSettings.minBetAmount) {
          return { 
            isValid: false, 
            reason: `최소 베팅 금액은 ${bettingSettings.minBetAmount.toLocaleString()}원입니다.` 
          };
        }
        
        if (bettingSettings.maxBetAmount && stake > bettingSettings.maxBetAmount) {
          return { 
            isValid: false, 
            reason: `최대 베팅 금액은 ${bettingSettings.maxBetAmount.toLocaleString()}원입니다.` 
          };
        }
      } catch (settingsError) {
        console.error('❌ [ExchangeMultibetValidation] 베팅 설정 조회 오류:', settingsError);
        // 설정 조회 실패 시 기본값 사용
        if (stake < BETTING_CONFIG.MIN_BET_AMOUNT) {
          return { 
            isValid: false, 
            reason: `최소 베팅 금액은 ${BETTING_CONFIG.MIN_BET_AMOUNT.toLocaleString()}원입니다.` 
          };
        }
      }

      // 4. 개별 선택 검증
      for (const selection of selections) {
        const selectionValidation = await this.validateSelection(selection);
        if (!selectionValidation.isValid) {
          return selectionValidation;
        }
      }

      // 5. 전체 제한 검증
      const overallValidation = await this.validateOverallRestrictions(selections);
      if (!overallValidation.isValid) {
        return overallValidation;
      }

      // 6. 총 배당율 검증
      const oddsValidation = this.validateTotalOdds(totalOdds);
      if (!oddsValidation.isValid) {
        return oddsValidation;
      }

      // 7. 시간 제한 검증
      const timeValidation = this.validateTimeRestrictions(selections);
      if (!timeValidation.isValid) {
        return timeValidation;
      }

      console.log('✅ [MultibetValidation] 멀티배팅 검증 성공');
      return { isValid: true };

    } catch (error) {
      console.error('❌ [MultibetValidation] 검증 중 오류:', error);
      return { isValid: false, reason: '검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 개별 선택사항 검증
   */
  static async validateSelection(selection) {
    try {
      // 필수 필드 검증
      if (!selection.gameId) {
        return { isValid: false, reason: '경기 ID가 없습니다.' };
      }

      if (!selection.market) {
        return { isValid: false, reason: '마켓 타입이 없습니다.' };
      }

      if (!selection.selection) {
        return { isValid: false, reason: '선택한 결과가 없습니다.' };
      }

      if (!selection.odds || selection.odds <= 1) {
        return { isValid: false, reason: '배당률이 유효하지 않습니다.' };
      }

      if (!selection.commenceTime) {
        return { isValid: false, reason: '경기 시작 시간이 없습니다.' };
      }

      return { isValid: true };

    } catch (error) {
      return { isValid: false, reason: '선택 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 전체적인 제한사항 검증
   */
  static async validateOverallRestrictions(selections) {
    try {
      // 1. 같은 경기 제한 (최대 3개)
      const gameCounts = {};
      for (const selection of selections) {
        gameCounts[selection.gameId] = (gameCounts[selection.gameId] || 0) + 1;
        if (gameCounts[selection.gameId] > BETTING_CONFIG.MAX_SAME_GAME_BETS) {
          return { 
            isValid: false, 
            reason: `같은 경기에는 최대 ${BETTING_CONFIG.MAX_SAME_GAME_BETS}개까지 베팅 가능합니다.` 
          };
        }
      }

      // 2. 승패 + 핸디캡 동시 배팅 금지 (스포츠북과 동일)
      for (const selection of selections) {
        const sameGameSelections = selections.filter(s => s.gameId === selection.gameId);
        const hasWinLoss = sameGameSelections.some(s => s.market === '승패' || s.market === 'h2h');
        const hasHandicap = sameGameSelections.some(s => s.market === '핸디캡' || s.market === 'spreads');
        
        if (hasWinLoss && hasHandicap) {
          return { isValid: false, reason: '같은 경기에서 승패와 핸디캡을 동시에 베팅할 수 없습니다.' };
        }
      }

      // 3. 승패 + 언더오버, 핸디캡 + 언더오버는 허용 (스포츠북과 동일)

      return { isValid: true };

    } catch (error) {
      return { isValid: false, reason: '전체 제한 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 총 배당률 검증
   */
  static validateTotalOdds(totalOdds) {
    if (totalOdds > BETTING_CONFIG.MAX_TOTAL_ODDS) {
      return { 
        isValid: false, 
        reason: `총 배당률은 최대 ${BETTING_CONFIG.MAX_TOTAL_ODDS}배 이하여야 합니다.` 
      };
    }

    return { isValid: true };
  }

  /**
   * 시간 제한 검증
   */
  static validateTimeRestrictions(selections) {
    try {
      const now = new Date();
      const marginMinutes = BETTING_CONFIG.MIN_BEFORE_GAME_MINUTES;
      const maxDays = BETTING_CONFIG.MAX_FUTURE_DAYS;

      for (const selection of selections) {
        if (!selection.commenceTime) {
          return { isValid: false, reason: '경기 시작 시간이 없는 경기가 포함되어 있습니다.' };
        }

        const gameTime = new Date(selection.commenceTime);
        
        // 경기 시작 10분 전 마감
        if (gameTime <= new Date(now.getTime() + marginMinutes * 60000)) {
          return { 
            isValid: false, 
            reason: `베팅 마감된 경기가 포함되어 있습니다: ${selection.homeTeam || '홈팀'} vs ${selection.awayTeam || '어웨이팀'}` 
          };
        }

        // 최대 7일 후 경기까지
        if (gameTime > new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)) {
          return { 
            isValid: false, 
            reason: `너무 먼 미래의 경기가 포함되어 있습니다: ${selection.homeTeam || '홈팀'} vs ${selection.awayTeam || '어웨이팀'}` 
          };
        }
      }

      return { isValid: true };

    } catch (error) {
      return { isValid: false, reason: '시간 제한 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 총 배당률 계산
   */
  static calculateTotalOdds(selections) {
    return Math.round(
      selections.reduce((acc, selection) => acc * parseFloat(selection.odds), 1) * 10000
    ) / 10000;
  }

  /**
   * 스포츠별 추가 제한사항 검증
   */
  static validateSportSpecificRestrictions(selections) {
    try {
      // 축구 특별 규칙
      const soccerSelections = selections.filter(s => s.sportKey?.startsWith('soccer'));
      if (soccerSelections.length > 0) {
        const soccerValidation = this.validateSoccerRestrictions(soccerSelections);
        if (!soccerValidation.isValid) return soccerValidation;
      }

      // 농구 특별 규칙
      const basketballSelections = selections.filter(s => s.sportKey?.includes('basketball'));
      if (basketballSelections.length > 0) {
        const basketballValidation = this.validateBasketballRestrictions(basketballSelections);
        if (!basketballValidation.isValid) return basketballValidation;
      }

      // 야구 특별 규칙
      const baseballSelections = selections.filter(s => s.sportKey?.includes('baseball'));
      if (baseballSelections.length > 0) {
        const baseballValidation = this.validateBaseballRestrictions(baseballSelections);
        if (!baseballValidation.isValid) return baseballValidation;
      }

      return { isValid: true };

    } catch (error) {
      return { isValid: false, reason: '스포츠별 제한 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 축구 특별 제한사항 검증
   */
  static validateSoccerRestrictions(soccerSelections) {
    // 축구는 무승부가 있으므로 승패 마켓에서 무승부 선택 가능
    return { isValid: true };
  }

  /**
   * 농구 특별 제한사항 검증
   */
  static validateBasketballRestrictions(basketballSelections) {
    // 농구는 무승부가 없으므로 승패 마켓에서 무승부 선택 불가
    for (const selection of basketballSelections) {
      if (selection.market === '승패' && selection.selection === '무승부') {
        return { isValid: false, reason: '농구 경기에서는 무승부를 선택할 수 없습니다.' };
      }
    }
    return { isValid: true };
  }

  /**
   * 야구 특별 제한사항 검증
   */
  static validateBaseballRestrictions(baseballSelections) {
    // 야구는 무승부가 있을 수 있으므로 추가 검증 로직
    return { isValid: true };
  }
}

export { ExchangeMultibetValidationService };
