/**
 * 정밀한 금액 계산 유틸리티
 * 부동소수점 연산 오차를 방지하기 위해 원 단위 정수 연산 사용
 */

/**
 * 원 단위로 정수 변환 (소수점 제거)
 * @param {number} value - 변환할 값 (원)
 * @returns {number} 정수로 변환된 값 (원 단위)
 */
function toInteger(value) {
  return Math.round(value);
}

/**
 * 정수를 다시 원 단위 값으로 변환
 * @param {number} integerValue - 정수 값 (원 단위)
 * @returns {number} 원 단위 값
 */
function fromInteger(integerValue) {
  return integerValue;
}

/**
 * 정밀한 곱셈 (부동소수점 오차 방지)
 * @param {number} a - 첫 번째 값 (원)
 * @param {number} b - 두 번째 값 (배당률 등)
 * @returns {number} 곱셈 결과 (원)
 */
export function preciseMultiply(a, b) {
  const intA = toInteger(a);
  const intB = Math.round(b * 1000); // 배당률을 1000배로 정수화
  const result = Math.round((intA * intB) / 1000);
  return fromInteger(result);
}

/**
 * 정밀한 나눗셈 (부동소수점 오차 방지)
 * @param {number} a - 피제수 (원)
 * @param {number} b - 제수 (배당률 등)
 * @returns {number} 나눗셈 결과 (원)
 */
export function preciseDivide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  const intA = toInteger(a);
  const intB = Math.round(b * 1000); // 배당률을 1000배로 정수화
  const result = Math.round((intA * 1000) / intB);
  return fromInteger(result);
}

/**
 * 정밀한 덧셈 (부동소수점 오차 방지)
 * @param {number} a - 첫 번째 값
 * @param {number} b - 두 번째 값
 * @returns {number} 덧셈 결과
 */
export function preciseAdd(a, b) {
  const intA = toInteger(a);
  const intB = toInteger(b);
  const result = intA + intB;
  return fromInteger(result);
}

/**
 * 정밀한 뺄셈 (부동소수점 오차 방지)
 * @param {number} a - 피감수
 * @param {number} b - 감수
 * @returns {number} 뺄셈 결과
 */
export function preciseSubtract(a, b) {
  const intA = toInteger(a);
  const intB = toInteger(b);
  const result = intA - intB;
  return fromInteger(result);
}

/**
 * 정밀한 반올림 (원 단위)
 * @param {number} value - 반올림할 값 (원)
 * @returns {number} 반올림된 값 (원)
 */
export function preciseRound(value) {
  return Math.round(value);
}

/**
 * 정밀한 절삭 (원 단위)
 * @param {number} value - 절삭할 값 (원)
 * @returns {number} 절삭된 값 (원)
 */
export function preciseFloor(value) {
  return Math.floor(value);
}

/**
 * 정밀한 올림 (원 단위)
 * @param {number} value - 올림할 값 (원)
 * @returns {number} 올림된 값 (원)
 */
export function preciseCeil(value) {
  return Math.ceil(value);
}

/**
 * 배당률 기반 예상 수익 계산 (정밀)
 * @param {number} stake - 스테이크 금액
 * @param {number} odds - 배당률
 * @returns {number} 예상 수익
 */
export function calculatePreciseWinnings(stake, odds) {
  // 배당률에서 1을 뺀 값에 스테이크를 곱함
  const profitRate = odds - 1;
  return preciseMultiply(stake, profitRate);
}

/**
 * 수수료 계산 (정밀)
 * @param {number} amount - 수수료 계산 대상 금액
 * @param {number} rate - 수수료율 (0.05 = 5%)
 * @param {boolean} useFloor - 절삭 사용 여부 (기본값: true)
 * @returns {number} 수수료 금액
 */
export function calculatePreciseCommission(amount, rate, useFloor = true) {
  const commission = preciseMultiply(amount, rate);
  return useFloor ? preciseFloor(commission) : preciseRound(commission);
}

/**
 * 최종 배팅 금액 계산 (정밀)
 * @param {number} stake - 스테이크 금액
 * @param {number} odds - 배당률
 * @param {number} commissionRate - 수수료율 (기본값: 0.05)
 * @returns {Object} 계산 결과
 */
export function calculatePreciseBettingAmount(stake, odds, commissionRate = 0.05) {
  const winnings = calculatePreciseWinnings(stake, odds);
  const commission = calculatePreciseCommission(winnings, commissionRate);
  const totalAmount = preciseAdd(stake, winnings);
  const finalAmount = preciseSubtract(totalAmount, commission);
  
  return {
    stake,
    odds,
    winnings,
    commission,
    totalAmount,
    finalAmount
  };
}

/**
 * 합산 배당률 계산 (정밀)
 * @param {number[]} oddsArray - 배당률 배열
 * @param {boolean} usePayoutRate - 환수율 고려 여부 (기본값: false)
 * @returns {number} 합산 배당률
 */
export function calculatePreciseTotalOdds(oddsArray, usePayoutRate = false) {
  if (!Array.isArray(oddsArray) || oddsArray.length === 0) {
    return 1;
  }
  
  if (usePayoutRate) {
    // 환수율 고려 방식
    const payoutRates = oddsArray.map(odds => {
      if (odds <= 0) return 0;
      const impliedProb = preciseDivide(1, odds);
      return impliedProb;
    });
    
    // 0인 값이 있으면 단순 곱셈 방식으로 fallback
    if (payoutRates.some(rate => rate === 0)) {
      return oddsArray.reduce((total, odds) => {
        return preciseMultiply(total, odds);
      }, 1);
    }
    
    const totalPayoutRate = payoutRates.reduce((total, rate) => {
      return preciseMultiply(total, rate);
    }, 1);
    
    if (totalPayoutRate === 0) {
      return 1; // fallback
    }
    
    return preciseDivide(1, totalPayoutRate);
  } else {
    // 단순 곱셈 방식
    return oddsArray.reduce((total, odds) => {
      return preciseMultiply(total, odds);
    }, 1);
  }
}

/**
 * 멀티베팅 최종 금액 계산 (정밀)
 * @param {number} stake - 스테이크 금액
 * @param {number[]} oddsArray - 배당률 배열
 * @param {number} commissionRate - 수수료율 (기본값: 0.05)
 * @param {boolean} usePayoutRate - 환수율 고려 여부 (기본값: false)
 * @returns {Object} 계산 결과
 */
export function calculatePreciseMultibetAmount(stake, oddsArray, commissionRate = 0.05, usePayoutRate = false) {
  const totalOdds = calculatePreciseTotalOdds(oddsArray, usePayoutRate);
  const winnings = calculatePreciseWinnings(stake, totalOdds);
  const commission = calculatePreciseCommission(winnings, commissionRate);
  const totalAmount = preciseAdd(stake, winnings);
  const finalAmount = preciseSubtract(totalAmount, commission);
  
  return {
    stake,
    oddsArray,
    totalOdds,
    winnings,
    commission,
    totalAmount,
    finalAmount
  };
}

// 테스트 함수
export function testPreciseCalculation() {
  console.log('🧪 정밀 계산 테스트');
  
  const testCases = [
    { stake: 100000, odds: 1.999 },
    { stake: 50000, odds: 2.999 },
    { stake: 75000, odds: 1.499 },
    { stake: 125000, odds: 3.392 }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = calculatePreciseBettingAmount(testCase.stake, testCase.odds);
    console.log(`테스트 ${index + 1}:`);
    console.log(`  스테이크: ${result.stake}원`);
    console.log(`  배당률: ${result.odds}`);
    console.log(`  예상수익: ${result.winnings}원`);
    console.log(`  수수료: ${result.commission}원`);
    console.log(`  최종금액: ${result.finalAmount}원`);
    console.log('');
  });
}

// 멀티베팅 테스트 함수
export function testMultibetCalculation() {
  console.log('🧪 멀티베팅 정밀 계산 테스트');
  
  const testCases = [
    {
      stake: 100000,
      oddsArray: [1.50, 2.00, 1.80],
      name: '3경기 멀티베팅'
    },
    {
      stake: 50000,
      oddsArray: [1.20, 1.30, 1.40, 1.50],
      name: '4경기 멀티베팅'
    },
    {
      stake: 75000,
      oddsArray: [2.50, 3.00],
      name: '2경기 멀티베팅'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`);
    
    // 단순 곱셈 방식
    const simpleResult = calculatePreciseMultibetAmount(testCase.stake, testCase.oddsArray, 0.05, false);
    console.log(`  단순 곱셈 방식:`);
    console.log(`    합산 배당률: ${simpleResult.totalOdds}`);
    console.log(`    예상수익: ${simpleResult.winnings}원`);
    console.log(`    수수료: ${simpleResult.commission}원`);
    console.log(`    최종금액: ${simpleResult.finalAmount}원`);
    
    // 환수율 고려 방식
    const payoutResult = calculatePreciseMultibetAmount(testCase.stake, testCase.oddsArray, 0.05, true);
    console.log(`  환수율 고려 방식:`);
    console.log(`    합산 배당률: ${payoutResult.totalOdds}`);
    console.log(`    예상수익: ${payoutResult.winnings}원`);
    console.log(`    수수료: ${payoutResult.commission}원`);
    console.log(`    최종금액: ${payoutResult.finalAmount}원`);
  });
}

export default {
  preciseMultiply,
  preciseDivide,
  preciseAdd,
  preciseSubtract,
  preciseRound,
  preciseFloor,
  preciseCeil,
  calculatePreciseWinnings,
  calculatePreciseCommission,
  calculatePreciseBettingAmount,
  calculatePreciseTotalOdds,
  calculatePreciseMultibetAmount,
  testPreciseCalculation,
  testMultibetCalculation
};
