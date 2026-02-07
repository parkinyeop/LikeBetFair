/**
 * 정산 대기 시간 설정
 * 
 * 목적: API가 경기 중간 점수를 finished로 잘못 반환하는 경우 방지
 * 경기 시작 후 일정 시간 경과 확인 후 정산 실행
 */

// 스포츠별 정산 대기 시간 (시간 단위)
export const SETTLEMENT_WAIT_HOURS = {
  // ⚽ 축구: 90분 + 하프타임 15분 + 추가시간 10분 + 여유 30분 = 2.5시간
  soccer: 2.5,
  
  // ⚾ 야구: 평균 3시간 + 연장 가능성 + 여유 1시간 = 5시간
  baseball: 5,
  
  // 🏀 농구: 48분(NBA)/40분(국제) + 쿼터 브레이크 + 여유 = 3시간
  basketball: 3,
  
  // 🏈 미식축구: 60분 + 타임아웃 + 하프타임 + 여유 = 3.5시간
  americanfootball: 3.5,
  
  // 기타 스포츠: 기본 3시간
  default: 3
};

/**
 * sportKey로부터 스포츠 종류 추출
 * @param {string} sportKey - 예: 'soccer_epl', 'baseball_mlb', 'basketball_nba'
 * @returns {string} - 'soccer', 'baseball', 'basketball', 'americanfootball', 'default'
 */
export function getSportType(sportKey) {
  if (!sportKey || typeof sportKey !== 'string') {
    return 'default';
  }
  
  const lowerKey = sportKey.toLowerCase();
  
  if (lowerKey.includes('soccer')) return 'soccer';
  if (lowerKey.includes('baseball')) return 'baseball';
  if (lowerKey.includes('basketball')) return 'basketball';
  if (lowerKey.includes('americanfootball') || lowerKey.includes('nfl')) return 'americanfootball';
  
  return 'default';
}

/**
 * 정산 대기 시간 조회
 * @param {string} sportKey - 예: 'soccer_epl', 'baseball_mlb'
 * @returns {number} - 대기 시간 (시간 단위)
 */
export function getSettlementWaitHours(sportKey) {
  const sportType = getSportType(sportKey);
  return SETTLEMENT_WAIT_HOURS[sportType] || SETTLEMENT_WAIT_HOURS.default;
}

