/**
 * 배당률 계산 유틸리티 함수들
 */

/**
 * 배당률 배열에 환수율을 적용하는 정교한 함수 (Proportional Margin Application)
 * @param oddsArray - 원본 배당률 배열
 * @param targetPayout - 목표 환수율 (예: 0.95 = 95%)
 * @returns 조정된 배당률 배열
 */
export const adjustOddsSophisticated = (oddsArray: number[], targetPayout: number): number[] => {
  if (!oddsArray || oddsArray.length === 0) {
    return oddsArray;
  }

  // 1. 각 배당률의 내재 확률 계산
  const impliedProbs = oddsArray.map(odd => 1 / odd);
  
  // 2. 현재 환수율 (내재 확률의 총합) 계산
  const currentPayoutSum = impliedProbs.reduce((sum, prob) => sum + prob, 0);
  
  // 3. 목표 환수율에 맞게 확률을 조정
  // targetPayout이 높을수록 (예: 0.99) 확률의 총합이 낮아져야 함 (더 높은 배당률)
  const targetPayoutSum = 1 / targetPayout;
  
  // 4. 각 확률을 조정
  const adjustedProbs = impliedProbs.map(prob => prob * (targetPayoutSum / currentPayoutSum));
  
  // 5. 조정된 확률을 다시 배당률로 변환
  const newOdds = adjustedProbs.map(prob => 1 / prob);
  
  return newOdds;
};

/**
 * 익스체인지 환수율을 적용하는 함수 (백엔드 adjustOddsPayout()와 동일한 로직)
 * @param odds - 원본 배당률
 * @param oddsArray - 전체 배당률 배열 (내재 확률 기반 계산용)
 * @param returnRate - 환수율 (기본값: 0.95)
 * @returns 환수율이 적용된 배당률
 */
export const applyExchangeReturnRate = (odds: number, oddsArray?: number[], returnRate: number = 0.95): number => {
  if (!odds || odds <= 0) {
    return odds;
  }
  
  // oddsArray가 제공되지 않았거나 비어있으면 단순 계산
  if (!oddsArray || oddsArray.length === 0) {
    return odds / returnRate;
  }
  
  // 백엔드의 adjustOddsPayout()과 동일한 로직 사용
  // 1. 각 배당률의 내재 확률 계산
  const impliedProbs = oddsArray.map(odd => 1 / odd);
  
  // 2. 현재 확률 총합 계산
  const currentPayoutSum = impliedProbs.reduce((sum, prob) => sum + prob, 0);
  
  if (currentPayoutSum === 0) {
    return odds;
  }
  
  // 3. 목표 확률 총합 설정
  const targetPayoutSum = 1 / returnRate;
  
  // 4. 현재 배당률의 내재 확률
  const currentOddImpliedProb = 1 / odds;
  
  // 5. 조정된 확률 계산
  const adjustedProb = currentOddImpliedProb * (targetPayoutSum / currentPayoutSum);
  
  // 6. 조정된 배당률로 변환
  if (adjustedProb === 0) {
    return Infinity;
  }
  
  const newOdd = 1 / adjustedProb;
  
  // 7. 소수점 3자리로 floor 처리
  return Math.floor(newOdd * 1000) / 1000;
};

/**
 * 단일 배당률에 환수율을 적용하는 함수 (호환성 유지)
 * @param originalOdds - 원본 배당률
 * @param targetPayout - 목표 환수율
 * @returns 조정된 배당률
 */
export const adjustSingleOdds = (originalOdds: number, targetPayout: number): number => {
  if (!originalOdds || originalOdds <= 0) {
    return originalOdds;
  }
  
  return originalOdds / targetPayout;
};

