/**
 * 부동 소수점 오차 방지를 위한 정밀 계산 유틸리티
 * Exchange 정산 시스템에서 금융 정확성을 보장합니다.
 */

// 정수 연산을 위한 승수 (소수점 둘째 자리까지 처리)
const DECIMAL_MULTIPLIER = 100;

class PrecisionCalculation {
  /**
   * 소수점 숫자를 정수로 변환
   * @param {number} value - 변환할 값
   * @returns {number} 정수로 변환된 값
   */
  static toInteger(value) {
    return Math.round(value * DECIMAL_MULTIPLIER);
  }

  /**
   * 정수를 소수점 숫자로 변환
   * @param {number} intValue - 정수 값
   * @returns {number} 소수점으로 변환된 값
   */
  static toDecimal(intValue) {
    return intValue / DECIMAL_MULTIPLIER;
  }

  /**
   * 정수 기반 덧셈
   * @param {number} a - 첫 번째 값
   * @param {number} b - 두 번째 값
   * @returns {number} 결과 (소수점 형태)
   */
  static add(a, b) {
    const aInt = this.toInteger(a);
    const bInt = this.toInteger(b);
    return this.toDecimal(aInt + bInt);
  }

  /**
   * 정수 기반 뺄셈
   * @param {number} a - 첫 번째 값
   * @param {number} b - 두 번째 값
   * @returns {number} 결과 (소수점 형태)
   */
  static subtract(a, b) {
    const aInt = this.toInteger(a);
    const bInt = this.toInteger(b);
    return this.toDecimal(aInt - bInt);
  }

  /**
   * 정수 기반 곱셈
   * @param {number} a - 첫 번째 값
   * @param {number} b - 두 번째 값
   * @returns {number} 결과 (소수점 형태)
   */
  static multiply(a, b) {
    const aInt = this.toInteger(a);
    const bInt = this.toInteger(b);
    return this.toDecimal(Math.round((aInt * bInt) / DECIMAL_MULTIPLIER));
  }

  /**
   * 정수 기반 나눗셈
   * @param {number} a - 분자
   * @param {number} b - 분모
   * @returns {number} 결과 (소수점 형태)
   */
  static divide(a, b) {
    if (b === 0) return 0;
    const aInt = this.toInteger(a);
    const bInt = this.toInteger(b);
    return this.toDecimal(Math.round((aInt * DECIMAL_MULTIPLIER) / bInt));
  }

  /**
   * Exchange 정산용 특수 계산: Lay 지분비율
   * @param {number} layStake - Lay 베팅금액
   * @param {number} backMatchAmount - Back 매치금액
   * @param {number} precision - 정밀도 (기본 1000)
   * @returns {number} 지분비율 (소수점 형태)
   */
  static calculateLayShareRatio(layStake, backMatchAmount, precision = 1000) {
    if (backMatchAmount <= 0) return 0;

    const layStakeInt = this.toInteger(layStake);
    const backMatchAmountInt = this.toInteger(backMatchAmount);

    const ratioInt = Math.round((layStakeInt * precision) / backMatchAmountInt);
    return ratioInt / precision;
  }

  /**
   * Exchange Back 매치금액 계산
   * @param {number} backStake - Back 베팅금액
   * @param {number} price - 배당률
   * @returns {number} 매치금액 (소수점 형태)
   */
  static calculateBackMatchAmount(backStake, price) {
    const backStakeInt = this.toInteger(backStake);
    const priceInt = this.toInteger(price);

    const matchAmountInt = Math.round(backStakeInt * (priceInt - DECIMAL_MULTIPLIER) / DECIMAL_MULTIPLIER);
    return this.toDecimal(matchAmountInt);
  }

  /**
   * Exchange Lay 승리 시 수익 계산
   * @param {number} layStake - Lay 베팅금액
   * @param {number} backStake - Back 베팅금액
   * @param {number} layShareRatio - Lay 지분비율
   * @returns {number} Lay 수익 (소수점 형태)
   */
  static calculateLayWinAmount(layStake, backStake, layShareRatio) {
    const layStakeInt = this.toInteger(layStake);
    const backStakeInt = this.toInteger(backStake);
    const shareRatioInt = Math.round(layShareRatio * 1000);

    const backerLossShareInt = Math.round((backStakeInt * shareRatioInt) / 1000);
    const layWinAmountInt = layStakeInt + backerLossShareInt;

    return this.toDecimal(layWinAmountInt);
  }

  /**
   * 계산 과정 로깅을 위한 디버그 정보
   * @param {string} operation - 연산명
   * @param {Object} values - 값들
   * @returns {Object} 디버그 정보
   */
  static getDebugInfo(operation, values) {
    const intValues = {};
    for (const [key, value] of Object.entries(values)) {
      intValues[`${key}_int`] = this.toInteger(value);
    }

    return {
      operation,
      original: values,
      integers: intValues,
      multiplier: DECIMAL_MULTIPLIER
    };
  }

  /**
   * 승수 상수 반환
   * @returns {number} DECIMAL_MULTIPLIER
   */
  static get MULTIPLIER() {
    return DECIMAL_MULTIPLIER;
  }
}

export default PrecisionCalculation;