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
  
  // 3. 목표 환수율 (목표 확률의 총합) 설정
  const targetPayoutSum = 1 / targetPayout;
  
  // 4. 각 확률을 조정
  const adjustedProbs = impliedProbs.map(prob => prob * (targetPayoutSum / currentPayoutSum));
  
  // 5. 조정된 확률을 다시 배당률로 변환
  const newOdds = adjustedProbs.map(prob => 1 / prob);
  
  return newOdds;
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
  
  return originalOdds * targetPayout;
};
