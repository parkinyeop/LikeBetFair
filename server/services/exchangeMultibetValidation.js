const { BETTING_CONFIG } = require('../config/centralizedConfig.js');

/**
 * 익스체인지 멀티배팅 검증 서비스
 * 스포츠북의 멀티배팅 규칙을 익스체인지에 적용
 */
class ExchangeMultibetValidationService {
  
  /**
   * 멀티배팅 기본 검증
   * @param {Array} selections - 선택된 베팅들
   * @param {number} stake - 베팅 금액
   * @returns {Object} 검증 결과
   */
  static validateMultibet(selections, stake) {
    const errors = [];
    const warnings = [];

    try {
      // 1. 기본 데이터 검증
      if (!Array.isArray(selections) || selections.length === 0) {
        throw new Error('선택된 베팅이 없습니다.');
      }

      if (!stake || stake <= 0) {
        throw new Error('베팅 금액이 유효하지 않습니다.');
      }

      // 2. 선택 개수 제한 (2-10개)
      if (selections.length < 2) {
        throw new Error('멀티배팅은 최소 2개 이상의 선택이 필요합니다.');
      }

      if (selections.length > BETTING_CONFIG.MAX_SELECTIONS) {
        throw new Error(`멀티배팅은 최대 ${BETTING_CONFIG.MAX_SELECTIONS}개까지 선택 가능합니다.`);
      }

      // 3. 베팅 금액 제한
      if (stake < BETTING_CONFIG.MIN_BET_AMOUNT) {
        throw new Error(`최소 베팅 금액은 ${BETTING_CONFIG.MIN_BET_AMOUNT.toLocaleString()}원입니다.`);
      }

      if (stake > BETTING_CONFIG.MAX_BET_AMOUNT) {
        throw new Error(`최대 베팅 금액은 ${BETTING_CONFIG.MAX_BET_AMOUNT.toLocaleString()}원입니다.`);
      }

      // 4. 개별 선택사항 검증
      const validationResults = selections.map((selection, index) => 
        this.validateSelection(selection, index)
      );

      // 5. 전체적인 제한사항 검증
      this.validateOverallRestrictions(selections);

      // 6. 배당률 검증
      const totalOdds = this.calculateTotalOdds(selections);
      this.validateTotalOdds(totalOdds);

      // 7. 시간 제한 검증
      this.validateTimeRestrictions(selections);

      return {
        isValid: true,
        totalOdds,
        potentialWinnings: Math.round(stake * totalOdds),
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        warnings
      };
    }
  }

  /**
   * 개별 선택사항 검증
   * @param {Object} selection - 선택사항
   * @param {number} index - 인덱스
   * @returns {Object} 검증 결과
   */
  static validateSelection(selection, index) {
    const errors = [];

    // 필수 필드 검증
    if (!selection.gameId) {
      errors.push(`선택 ${index + 1}: 경기 ID가 없습니다.`);
    }

    if (!selection.market) {
      errors.push(`선택 ${index + 1}: 마켓 타입이 없습니다.`);
    }

    if (!selection.selection) {
      errors.push(`선택 ${index + 1}: 선택한 결과가 없습니다.`);
    }

    if (!selection.odds || selection.odds <= 1) {
      errors.push(`선택 ${index + 1}: 배당률이 유효하지 않습니다.`);
    }

    if (!selection.commenceTime) {
      errors.push(`선택 ${index + 1}: 경기 시작 시간이 없습니다.`);
    }

    // 배당률 범위 검증
    if (selection.odds < BETTING_CONFIG.MIN_ODDS || selection.odds > BETTING_CONFIG.MAX_ODDS) {
      errors.push(`선택 ${index + 1}: 배당률은 ${BETTING_CONFIG.MIN_ODDS} - ${BETTING_CONFIG.MAX_ODDS} 범위여야 합니다.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 전체적인 제한사항 검증
   * @param {Array} selections - 선택된 베팅들
   */
  static validateOverallRestrictions(selections) {
    // 1. 같은 경기 제한 (최대 3개)
    const gameCounts = {};
    selections.forEach(selection => {
      gameCounts[selection.gameId] = (gameCounts[selection.gameId] || 0) + 1;
      if (gameCounts[selection.gameId] > BETTING_CONFIG.MAX_SAME_GAME_BETS) {
        throw new Error(`같은 경기에는 최대 ${BETTING_CONFIG.MAX_SAME_GAME_BETS}개까지 베팅 가능합니다.`);
      }
    });

    // 2. 승패 + 핸디캡 동시 배팅 금지
    selections.forEach(selection => {
      const sameGameSelections = selections.filter(s => s.gameId === selection.gameId);
      const hasWinLoss = sameGameSelections.some(s => s.market === 'h2h');
      const hasHandicap = sameGameSelections.some(s => s.market === 'spreads');
      
      if (hasWinLoss && hasHandicap) {
        throw new Error('같은 경기에서 승패와 핸디캡을 동시에 베팅할 수 없습니다.');
      }
    });

    // 3. 승패 + 언더오버 동시 배팅 금지
    selections.forEach(selection => {
      const sameGameSelections = selections.filter(s => s.gameId === selection.gameId);
      const hasWinLoss = sameGameSelections.some(s => s.market === 'h2h');
      const hasTotals = sameGameSelections.some(s => s.market === 'totals');
      
      if (hasWinLoss && hasTotals) {
        throw new Error('같은 경기에서 승패와 언더오버를 동시에 베팅할 수 없습니다.');
      }
    });

    // 4. 핸디캡 + 언더오버는 허용 (상관관계가 낮음)
    // 추가 제한사항이 있다면 여기에 구현
  }

  /**
   * 총 배당률 검증
   * @param {number} totalOdds - 총 배당률
   */
  static validateTotalOdds(totalOdds) {
    if (totalOdds < BETTING_CONFIG.MIN_ODDS) {
      throw new Error(`총 배당률은 최소 ${BETTING_CONFIG.MIN_ODDS} 이상이어야 합니다.`);
    }

    if (totalOdds > BETTING_CONFIG.MAX_ODDS) {
      throw new Error(`총 배당률은 최대 ${BETTING_CONFIG.MAX_ODDS} 이하여야 합니다.`);
    }
  }

  /**
   * 시간 제한 검증
   * @param {Array} selections - 선택된 베팅들
   */
  static validateTimeRestrictions(selections) {
    const now = new Date();
    const marginMinutes = 10; // 경기 시작 10분 전 마감
    const maxDays = 7; // 최대 7일 후 경기까지

    selections.forEach(selection => {
      if (!selection.commenceTime) {
        throw new Error(`경기 시작 시간이 없는 경기가 포함되어 있습니다.`);
      }

      const gameTime = new Date(selection.commenceTime);
      
      // 경기 시작 10분 전 마감
      if (gameTime <= new Date(now.getTime() + marginMinutes * 60000)) {
        throw new Error(`베팅 마감된 경기가 포함되어 있습니다: ${selection.homeTeam || '홈팀'} vs ${selection.awayTeam || '어웨이팀'}`);
      }

      // 최대 7일 후 경기까지
      if (gameTime > new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)) {
        throw new Error(`너무 먼 미래의 경기가 포함되어 있습니다: ${selection.homeTeam || '홈팀'} vs ${selection.awayTeam || '어웨이팀'}`);
      }
    });
  }

  /**
   * 총 배당률 계산
   * @param {Array} selections - 선택된 베팅들
   * @returns {number} 총 배당률
   */
  static calculateTotalOdds(selections) {
    return Math.round(
      selections.reduce((acc, selection) => acc * parseFloat(selection.odds), 1) * 10000
    ) / 10000;
  }

  /**
   * 스포츠별 추가 제한사항 검증
   * @param {Array} selections - 선택된 베팅들
   */
  static validateSportSpecificRestrictions(selections) {
    // 축구 특별 규칙
    const soccerSelections = selections.filter(s => s.sportKey?.startsWith('soccer'));
    if (soccerSelections.length > 0) {
      // 축구는 무승부가 있으므로 추가 검증 로직
      this.validateSoccerRestrictions(soccerSelections);
    }

    // 농구 특별 규칙
    const basketballSelections = selections.filter(s => s.sportKey?.includes('basketball'));
    if (basketballSelections.length > 0) {
      // 농구는 무승부가 없으므로 추가 검증 로직
      this.validateBasketballRestrictions(basketballSelections);
    }

    // 야구 특별 규칙
    const baseballSelections = selections.filter(s => s.sportKey?.includes('baseball'));
    if (baseballSelections.length > 0) {
      // 야구는 무승부가 있을 수 있으므로 추가 검증 로직
      this.validateBaseballRestrictions(baseballSelections);
    }
  }

  /**
   * 축구 특별 제한사항 검증
   * @param {Array} soccerSelections - 축구 선택사항들
   */
  static validateSoccerRestrictions(soccerSelections) {
    // 축구는 무승부가 있으므로 승패 마켓에서 무승부 선택 가능
    // 추가 제한사항이 있다면 여기에 구현
  }

  /**
   * 농구 특별 제한사항 검증
   * @param {Array} basketballSelections - 농구 선택사항들
   */
  static validateBasketballRestrictions(basketballSelections) {
    // 농구는 무승부가 없으므로 승패 마켓에서 무승부 선택 불가
    basketballSelections.forEach(selection => {
      if (selection.market === 'h2h' && selection.selection === '무승부') {
        throw new Error('농구 경기에서는 무승부를 선택할 수 없습니다.');
      }
    });
  }

  /**
   * 야구 특별 제한사항 검증
   * @param {Array} baseballSelections - 야구 선택사항들
   */
  static validateBaseballRestrictions(baseballSelections) {
    // 야구는 무승부가 있을 수 있으므로 추가 검증 로직
    // 추가 제한사항이 있다면 여기에 구현
  }
}

module.exports = { ExchangeMultibetValidationService };
