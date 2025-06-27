/**
 * 국제 표준 시간대 처리 유틸리티
 * 
 * 원칙:
 * 1. 모든 데이터는 UTC로 저장
 * 2. 클라이언트에서 로컬 시간대로 변환
 * 3. 서버는 시간대 변환 최소화
 */

export class TimezoneUtils {
  /**
   * 현재 UTC 시간 반환
   */
  static getCurrentUTC() {
    return new Date();
  }

  /**
   * 임의의 날짜를 UTC로 정규화
   * @param {Date|string} dateInput - 입력 날짜
   * @returns {Date} UTC 날짜
   */
  static normalizeToUTC(dateInput) {
    if (!dateInput) return null;
    
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ 잘못된 날짜 형식: ${dateInput}`);
      return null;
    }
    
    return date; // JavaScript Date는 기본적으로 UTC 기준
  }

  /**
   * 특정 지역 시간을 UTC로 변환
   * @param {string} dateTimeString - 지역 시간 문자열 (예: "2025-06-25 18:30")
   * @param {string} timezone - 시간대 (예: "Asia/Seoul", "America/New_York")
   * @returns {Date} UTC 날짜
   */
  static localToUTC(dateTimeString, timezone = 'UTC') {
    try {
      // 지역 시간대를 고려한 Date 객체 생성
      const localDate = new Date(dateTimeString);
      
      if (timezone === 'UTC') {
        return localDate;
      }
      
      // 시간대 오프셋 계산
      const utcTime = localDate.getTime();
      const localOffset = localDate.getTimezoneOffset() * 60000; // 분을 밀리초로
      
      // 특정 시간대의 오프셋 계산 (예시: KST는 +9시간)
      const timezoneOffsets = {
        'Asia/Seoul': 9 * 60 * 60 * 1000,
        'America/New_York': -5 * 60 * 60 * 1000, // EST
        'Europe/London': 0,
        'Asia/Tokyo': 9 * 60 * 60 * 1000
      };
      
      const targetOffset = timezoneOffsets[timezone] || 0;
      return new Date(utcTime - targetOffset);
      
    } catch (error) {
      console.error('시간대 변환 오류:', error);
      return new Date(dateTimeString); // 기본값 반환
    }
  }

  /**
   * UTC 시간을 특정 지역 시간으로 변환 (클라이언트용)
   * @param {Date} utcDate - UTC 날짜
   * @param {string} timezone - 대상 시간대
   * @returns {string} 지역 시간 문자열
   */
  static utcToLocal(utcDate, timezone = 'Asia/Seoul') {
    if (!utcDate || isNaN(utcDate.getTime())) {
      return null;
    }
    
    try {
      return utcDate.toLocaleString('ko-KR', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('지역 시간 변환 오류:', error);
      return utcDate.toISOString();
    }
  }

  /**
   * 오늘 날짜 범위를 UTC로 반환
   * @param {string} timezone - 기준 시간대 (클라이언트에서 전달)
   * @returns {Object} {start: Date, end: Date} UTC 범위
   */
  static getTodayRangeUTC(timezone = 'UTC') {
    const now = new Date();
    
    if (timezone === 'UTC') {
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(0, 0, 0, 0);
      
      const endOfDay = new Date(now);
      endOfDay.setUTCHours(23, 59, 59, 999);
      
      return { start: startOfDay, end: endOfDay };
    }
    
    // 클라이언트 시간대 기준으로 오늘 범위 계산
    const timezoneOffsets = {
      'Asia/Seoul': 9,
      'America/New_York': -5,
      'Europe/London': 0,
      'Asia/Tokyo': 9
    };
    
    const offset = timezoneOffsets[timezone] || 0;
    const localNow = new Date(now.getTime() + (offset * 60 * 60 * 1000));
    
    const startOfDay = new Date(localNow);
    startOfDay.setUTCHours(0 - offset, 0, 0, 0);
    
    const endOfDay = new Date(localNow);
    endOfDay.setUTCHours(23 - offset, 59, 59, 999);
    
    return { start: startOfDay, end: endOfDay };
  }

  /**
   * 스포츠별 표준 경기 시간을 UTC로 변환
   * @param {string} sport - 스포츠 종류
   * @param {string} league - 리그명
   * @param {string} date - 경기 날짜 (YYYY-MM-DD)
   * @returns {Date} UTC 경기 시간
   */
  static getStandardGameTimeUTC(sport, league, date) {
    // 스포츠/리그별 표준 시작 시간 (현지 시간)
    const standardTimes = {
      'baseball': {
        'KBO': { hour: 18, minute: 30, timezone: 'Asia/Seoul' },
        'MLB': { hour: 19, minute: 0, timezone: 'America/New_York' },
        'NPB': { hour: 18, minute: 0, timezone: 'Asia/Tokyo' }
      },
      'soccer': {
        'K리그': { hour: 19, minute: 30, timezone: 'Asia/Seoul' },
        'EPL': { hour: 15, minute: 0, timezone: 'Europe/London' },
        'MLS': { hour: 19, minute: 30, timezone: 'America/New_York' }
      },
      'basketball': {
        'NBA': { hour: 19, minute: 0, timezone: 'America/New_York' },
        'KBL': { hour: 19, minute: 0, timezone: 'Asia/Seoul' }
      }
    };

    const gameTime = standardTimes[sport]?.[league];
    if (!gameTime) {
      // 기본값: 19:00 UTC
      return new Date(`${date}T19:00:00.000Z`);
    }

    // 현지 시간을 UTC로 변환
    const localDateTime = `${date}T${String(gameTime.hour).padStart(2, '0')}:${String(gameTime.minute).padStart(2, '0')}:00`;
    return this.localToUTC(localDateTime, gameTime.timezone);
  }

  /**
   * 클라이언트에서 보낸 시간대 정보를 파싱
   * @param {string} clientTimezone - 클라이언트 시간대 (예: "Asia/Seoul")
   * @returns {Object} 시간대 정보
   */
  static parseClientTimezone(clientTimezone) {
    const validTimezones = [
      'Asia/Seoul', 'Asia/Tokyo', 'Asia/Shanghai',
      'America/New_York', 'America/Los_Angeles', 'America/Chicago',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin',
      'UTC'
    ];

    if (!clientTimezone || !validTimezones.includes(clientTimezone)) {
      return { timezone: 'UTC', isValid: false };
    }

    return { timezone: clientTimezone, isValid: true };
  }

  /**
   * 디버깅용: 시간대 정보 출력
   * @param {Date} date - 확인할 날짜
   */
  static debugTimezone(date) {
    if (!date || isNaN(date.getTime())) {
      console.log('❌ 잘못된 날짜');
      return;
    }

    console.log('🕐 시간대 디버그 정보:');
    console.log(`  UTC: ${date.toISOString()}`);
    console.log(`  KST: ${this.utcToLocal(date, 'Asia/Seoul')}`);
    console.log(`  EST: ${this.utcToLocal(date, 'America/New_York')}`);
    console.log(`  JST: ${this.utcToLocal(date, 'Asia/Tokyo')}`);
  }
}

export default TimezoneUtils; 