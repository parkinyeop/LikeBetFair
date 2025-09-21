/**
 * 주어진 배당률 배열을 목표 환수율에 맞게 조정합니다. (내재 확률 기반 정교한 방식)
 * @param {number[]} odds - 원본 배당률 배열 (예: [1.93, 3.56, 4.71])
 * @param {number} targetPayout - 목표 환수율 (예: 0.95 for 95%)
 * @returns {number[]} 조정된 새로운 배당률 배열
 */
export function adjustOddsPayout(odds, targetPayout) {
  // odds 배열이 유효한지 확인
  if (!Array.isArray(odds) || odds.length === 0 || odds.some(o => typeof o !== 'number' || o <= 0)) {
    console.error('[adjustOddsPayout] 유효하지 않은 배당률 배열:', odds);
    return odds; // 원본 배열 그대로 반환
  }

  // 1. 각 배당률의 내재 확률 계산
  const impliedProbs = odds.map(odd => 1 / odd);

  // 2. 현재 환수율에 해당하는 확률 총합 계산
  const currentPayoutSum = impliedProbs.reduce((sum, prob) => sum + prob, 0);

  // 0으로 나누는 오류 방지
  if (currentPayoutSum === 0) {
    return odds;
  }

  // 3. 목표 환수율에 해당하는 확률 총합 설정
  const targetPayoutSum = 1 / targetPayout;

  // 4. 각 확률을 목표 비율에 맞게 조정
  const adjustedProbs = impliedProbs.map(prob => prob * (targetPayoutSum / currentPayoutSum));

  // 5. 조정된 확률을 다시 배당률로 변환
  const newOdds = adjustedProbs.map(prob => {
    if (prob === 0) {
      // 확률이 0이 되는 극단적인 경우 처리
      return Infinity;
    }
    const newOdd = 1 / prob;
    // 최종 배당률을 소수점 2자리로 반올림
    return Math.round(newOdd * 100) / 100;
  });

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
