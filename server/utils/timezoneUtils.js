/**
 * 국제 표준 시간대 처리 유틸리티
 * 
 * 원칙:
 * 1. 모든 데이터는 UTC로 저장
 * 2. 클라이언트에서 로컬 시간대로 변환
 * 3. 서버는 시간대 변환 최소화
 */

/**
 * 클라이언트 로컬 시간을 UTC로 변환
 * @param {string|Date} localTime - 클라이언트 로컬 시간
 * @param {string} timezone - 시간대 (예: 'Asia/Seoul')
 * @returns {Date} UTC 시간
 */
function convertLocalToUTC(localTime, timezone = 'Asia/Seoul') {
  const date = new Date(localTime);
  
  // 로컬 시간을 UTC로 변환
  const utcTime = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localTimeInUTC = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  const offset = utcTime.getTime() - localTimeInUTC.getTime();
  return new Date(date.getTime() + offset);
}

/**
 * UTC 시간을 클라이언트 로컬 시간으로 변환
 * @param {string|Date} utcTime - UTC 시간
 * @param {string} timezone - 시간대 (예: 'Asia/Seoul')
 * @returns {Date} 로컬 시간
 */
function convertUTCToLocal(utcTime, timezone = 'Asia/Seoul') {
  const date = new Date(utcTime);
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * 시간대 정보를 포함한 시간 문자열 생성
 * @param {Date} date - 날짜 객체
 * @param {string} timezone - 시간대 (예: 'Asia/Seoul')
 * @returns {string} 포맷된 시간 문자열
 */
function formatTimeWithTimezone(date, timezone = 'Asia/Seoul') {
  const options = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };
  
  return date.toLocaleString('ko-KR', options);
}

/**
 * 베팅 시간 정규화 (클라이언트 시간을 UTC로 저장)
 * @param {string|Date} clientTime - 클라이언트에서 받은 시간
 * @param {string} clientTimezone - 클라이언트 시간대
 * @returns {Date} 정규화된 UTC 시간
 */
function normalizeBettingTime(clientTime, clientTimezone = 'Asia/Seoul') {
  const date = new Date(clientTime);
  
  // 이미 UTC인 경우 그대로 반환
  if (clientTime.toString().includes('Z') || clientTime.toString().includes('+')) {
    return date;
  }
  
  // 로컬 시간으로 간주하여 UTC로 변환
  return convertLocalToUTC(date, clientTimezone);
}

/**
 * 경기 시간 매칭을 위한 유연한 시간 범위 생성
 * @param {Date} targetTime - 목표 시간
 * @param {number} hourRange - 시간 범위 (기본 48시간)
 * @returns {Object} {start, end} 시간 범위
 */
function createFlexibleTimeRange(targetTime, hourRange = 48) {
  const start = new Date(targetTime.getTime() - hourRange * 60 * 60 * 1000);
  const end = new Date(targetTime.getTime() + hourRange * 60 * 60 * 1000);
  
  return { start, end };
}

/**
 * 두 시간 사이의 차이 계산 (시간 단위)
 * @param {Date} time1 
 * @param {Date} time2 
 * @returns {number} 시간 차이 (절댓값)
 */
function calculateTimeDifferenceInHours(time1, time2) {
  return Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60 * 60);
}

module.exports = {
  convertLocalToUTC,
  convertUTCToLocal,
  formatTimeWithTimezone,
  normalizeBettingTime,
  createFlexibleTimeRange,
  calculateTimeDifferenceInHours
}; 