/**
 * 주어진 배당률 배열을 목표 환수율에 맞게 조정합니다.
 * @param {number[]} odds - 원본 배당률 배열 (예: [1.93, 3.56, 4.71])
 * @param {number} targetPayout - 목표 환수율 (예: 0.95 for 95%)
 * @returns {number[]} 조정된 새로운 배당률 배열
 */
export function adjustOddsPayout(odds, targetPayout) {
  // 1. 현재 환수율 계산
  const sumOfReciprocals = odds.reduce((sum, odd) => sum + (1 / odd), 0);
  const currentPayout = 1 / sumOfReciprocals;

  // 2. 조정 비율 계산
  const adjustmentFactor = targetPayout / currentPayout;

  // 3. 새로운 배당률 계산 및 반올림
  const newOdds = odds.map(odd => {
    const newOdd = odd * adjustmentFactor;
    return Math.round(newOdd * 100) / 100;
  });

  // 4. 결과 반환
  return newOdds;
}

// --- 테스트 예시 ---
const originalOdds = [1.93, 3.56, 4.71];
const target = 0.95;
const adjusted = adjustOddsPayout(originalOdds, target);

console.log('원본 배당률:', originalOdds);
console.log('목표 환수율:', target);
console.log('조정된 배당률:', adjusted);
console.log('기대 결과: [1.85, 3.42, 4.52]');
