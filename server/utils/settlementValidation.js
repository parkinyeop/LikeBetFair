/**
 * 정산 시스템용 데이터 검증 유틸리티
 * GameResult 데이터의 무결성을 보장하고 정산 오류를 방지합니다.
 */

class ValidationError extends Error {
  constructor(message, code = 'VALIDATION_ERROR', betId = null) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.betId = betId;
  }
}

class SettlementValidation {
  constructor() {
    this.validationMetrics = {
      dailyFailures: 0,
      failuresByType: {},
      affectedBets: [],
      lastReset: new Date().toDateString()
    };

    // 알림 스팸 방지용 캐시
    this.recentAlerts = new Map();
  }

  /**
   * GameResult 데이터 종합 검증
   * @param {Object} gameResult - 검증할 GameResult 객체
   * @param {Object} bet - 관련 베팅 정보
   * @param {Object} options - 검증 옵션
   * @returns {Object} 검증 결과 및 파싱된 스코어
   */
  async validateGameResult(gameResult, bet, options = {}) {
    const validationResult = {
      isValid: true,
      issues: [],
      score: null,
      warnings: []
    };

    try {
      // 1. 기본 존재성 검증
      if (!gameResult) {
        validationResult.issues.push('GameResult not found');
        validationResult.isValid = false;
        await this.recordValidationFailure(bet.id, 'GAME_RESULT_NOT_FOUND');
        return validationResult;
      }

      // 2. 상태 검증
      if (!this.validateGameStatus(gameResult, validationResult)) {
        validationResult.isValid = false;
      }

      // 3. 시간 검증
      if (!this.validateGameTime(gameResult, validationResult)) {
        validationResult.isValid = false;
      }

      // 4. 스코어 데이터 검증 및 파싱
      const scoreValidation = this.validateAndParseScore(gameResult, validationResult);
      if (!scoreValidation.isValid) {
        validationResult.isValid = false;
      } else {
        validationResult.score = scoreValidation.score;
      }

      // 5. 팀명 일관성 검증 (옵션)
      if (options.validateTeamNames && bet.selections) {
        this.validateTeamNameConsistency(gameResult, bet, validationResult);
      }

      // 6. 검증 결과 로깅 및 메트릭스 기록
      await this.logValidationResult(bet.id, validationResult);

      return validationResult;

    } catch (error) {
      console.error(`[VALIDATION_ERROR] Bet ${bet.id} validation failed:`, error);
      validationResult.isValid = false;
      validationResult.issues.push(`Validation process error: ${error.message}`);
      await this.recordValidationFailure(bet.id, 'VALIDATION_PROCESS_ERROR');
      return validationResult;
    }
  }

  /**
   * 게임 상태 검증
   */
  validateGameStatus(gameResult, validationResult) {
    const validStatuses = ['finished'];

    if (!gameResult.status) {
      validationResult.issues.push('Game status is missing');
      return false;
    }

    if (!validStatuses.includes(gameResult.status)) {
      validationResult.issues.push(`Invalid game status: ${gameResult.status} (expected: ${validStatuses.join(', ')})`);
      return false;
    }

    return true;
  }

  /**
   * 게임 시간 검증
   */
  validateGameTime(gameResult, validationResult) {
    if (!gameResult.commenceTime) {
      validationResult.warnings.push('Game commence time is missing');
      return true; // 경고만 출력, 검증은 통과
    }

    try {
      const gameTime = new Date(gameResult.commenceTime);
      const now = new Date();

      if (isNaN(gameTime.getTime())) {
        validationResult.issues.push('Invalid game commence time format');
        return false;
      }

      // 미래 경기는 아직 결과가 없어야 함
      if (gameTime > now) {
        validationResult.issues.push(`Game is scheduled for future: ${gameTime.toISOString()}`);
        return false;
      }

      // 너무 오래된 경기 (30일 이상) 경고
      const daysSinceGame = (now - gameTime) / (1000 * 60 * 60 * 24);
      if (daysSinceGame > 30) {
        validationResult.warnings.push(`Game is very old: ${daysSinceGame.toFixed(1)} days ago`);
      }

      return true;
    } catch (error) {
      validationResult.issues.push(`Game time validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * 스코어 데이터 검증 및 파싱
   */
  validateAndParseScore(gameResult, validationResult) {
    const result = { isValid: true, score: null };

    if (!gameResult.score) {
      validationResult.issues.push('Score data is missing');
      result.isValid = false;
      return result;
    }

    try {
      // 스코어 파싱 (문자열이면 JSON 파싱, 객체면 그대로 사용)
      let score;
      if (typeof gameResult.score === 'string') {
        score = JSON.parse(gameResult.score);
      } else {
        score = gameResult.score;
      }

      // 배열 형태 스코어 검증
      if (Array.isArray(score)) {
        if (score.length === 0) {
          validationResult.issues.push('Score array is empty');
          result.isValid = false;
          return result;
        }

        // 첫 번째 스코어 요소 검증
        const firstScore = score[0];
        if (!firstScore || typeof firstScore !== 'object') {
          validationResult.issues.push('Invalid score array element format');
          result.isValid = false;
          return result;
        }

        // home, away 스코어 검증
        if (typeof firstScore.home !== 'number' || typeof firstScore.away !== 'number') {
          validationResult.issues.push('Score home/away values must be numbers');
          result.isValid = false;
          return result;
        }

        // 음수 스코어 검증
        if (firstScore.home < 0 || firstScore.away < 0) {
          validationResult.issues.push(`Invalid negative scores: home=${firstScore.home}, away=${firstScore.away}`);
          result.isValid = false;
          return result;
        }

        result.score = firstScore;
      }
      // 객체 형태 스코어 검증
      else if (typeof score === 'object' && score !== null) {
        if (typeof score.home !== 'number' || typeof score.away !== 'number') {
          validationResult.issues.push('Score object must have numeric home/away properties');
          result.isValid = false;
          return result;
        }

        if (score.home < 0 || score.away < 0) {
          validationResult.issues.push(`Invalid negative scores: home=${score.home}, away=${score.away}`);
          result.isValid = false;
          return result;
        }

        result.score = score;
      } else {
        validationResult.issues.push('Score must be an array or object');
        result.isValid = false;
        return result;
      }

      return result;

    } catch (error) {
      validationResult.issues.push(`Score parsing error: ${error.message}`);
      result.isValid = false;
      return result;
    }
  }

  /**
   * 팀명 일관성 검증 (옵션)
   */
  validateTeamNameConsistency(gameResult, bet, validationResult) {
    // 향후 확장 가능한 팀명 매칭 검증 로직
    // 현재는 경고만 출력
    if (bet.selections && bet.selections.length > 0) {
      const selection = bet.selections[0];
      if (selection.desc) {
        validationResult.warnings.push('Team name consistency check available');
      }
    }
  }

  /**
   * 검증 실패 기록
   */
  async recordValidationFailure(betId, failureType) {
    // 일일 통계 리셋 체크
    const today = new Date().toDateString();
    if (this.validationMetrics.lastReset !== today) {
      this.validationMetrics.dailyFailures = 0;
      this.validationMetrics.failuresByType = {};
      this.validationMetrics.affectedBets = [];
      this.validationMetrics.lastReset = today;
    }

    this.validationMetrics.dailyFailures++;
    this.validationMetrics.failuresByType[failureType] = (this.validationMetrics.failuresByType[failureType] || 0) + 1;
    this.validationMetrics.affectedBets.push(betId);

    // 임계값 기반 관리자 알림
    await this.checkAndSendAlert(failureType);
  }

  /**
   * 검증 결과 로깅
   */
  async logValidationResult(betId, validationResult) {
    if (!validationResult.isValid) {
      console.warn(`[SETTLEMENT_VALIDATION] Bet ${betId} validation failed:`, {
        issues: validationResult.issues,
        warnings: validationResult.warnings
      });
    } else if (validationResult.warnings.length > 0) {
      console.info(`[SETTLEMENT_VALIDATION] Bet ${betId} validation passed with warnings:`, validationResult.warnings);
    }
  }

  /**
   * 임계값 기반 관리자 알림
   */
  async checkAndSendAlert(failureType) {
    const criticalThreshold = 50; // 하루 50건 이상 실패 시 알림
    const typeThreshold = 20; // 특정 유형 20건 이상 시 알림

    // 스팸 방지: 동일 유형 알림 5분 제한
    const alertKey = `${failureType}_${new Date().toDateString()}_${Math.floor(Date.now() / (5 * 60 * 1000))}`;
    if (this.recentAlerts.has(alertKey)) {
      return;
    }

    let shouldAlert = false;
    let alertMessage = '';

    // 전체 실패 수 임계값 체크
    if (this.validationMetrics.dailyFailures >= criticalThreshold) {
      shouldAlert = true;
      alertMessage = `🚨 Settlement validation critical: ${this.validationMetrics.dailyFailures} failures today`;
    }

    // 특정 유형 실패 수 임계값 체크
    if (this.validationMetrics.failuresByType[failureType] >= typeThreshold) {
      shouldAlert = true;
      alertMessage = `⚠️ Settlement validation warning: ${this.validationMetrics.failuresByType[failureType]} ${failureType} failures today`;
    }

    if (shouldAlert) {
      this.recentAlerts.set(alertKey, true);
      console.error(alertMessage, {
        totalFailures: this.validationMetrics.dailyFailures,
        failuresByType: this.validationMetrics.failuresByType,
        recentBets: this.validationMetrics.affectedBets.slice(-10)
      });

      // 향후 Slack/이메일 알림 시스템 통합 지점
      // await notificationService.sendAlert(alertMessage);
    }
  }

  /**
   * 검증 통계 조회
   */
  getValidationStats() {
    return {
      ...this.validationMetrics,
      alertCacheSize: this.recentAlerts.size
    };
  }

  /**
   * Soft validation 모드 (경고만 출력, 처리 계속)
   */
  async softValidateGameResult(gameResult, bet, options = {}) {
    const result = await this.validateGameResult(gameResult, bet, options);

    if (!result.isValid) {
      console.warn(`[SOFT_VALIDATION] Bet ${bet.id} has validation issues but processing continues:`, result.issues);
      // 메트릭스는 기록하되 처리는 계속
    }

    return {
      ...result,
      isValid: true, // soft 모드에서는 항상 true 반환
      isSoftFail: !result.isValid
    };
  }
}

// 싱글톤 인스턴스 생성
const settlementValidation = new SettlementValidation();

export { ValidationError, settlementValidation };
export default settlementValidation;