// 클라이언트 시간대 기반 시간 처리 유틸리티
// 백엔드 UTC 데이터를 클라이언트의 로컬 시간대로 자동 변환

import { TIME_CONFIG } from '../config/apiConfig';

export interface TimeDisplayOptions {
  format: 'full' | 'date_time' | 'date_only' | 'time_only' | 'relative';
  forceTimezone?: string; // 특정 시간대 강제 지정 (예: 'Asia/Seoul')
  showRelative?: boolean;
  showTimezone?: boolean;
}

/**
 * 클라이언트의 현재 시간대 감지
 */
export function getClientTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * 클라이언트의 시간대 오프셋 (분 단위, UTC 기준)
 */
export function getClientTimezoneOffset(): number {
  return new Date().getTimezoneOffset(); // 음수면 UTC보다 앞섬
}

/**
 * 클라이언트 시간대 정보 반환
 */
export function getClientTimezoneInfo() {
  const timezone = getClientTimezone();
  const offset = getClientTimezoneOffset();
  const offsetHours = Math.abs(offset) / 60;
  const offsetSign = offset <= 0 ? '+' : '-';
  
  return {
    timezone,
    offset,
    offsetHours,
    displayName: `UTC${offsetSign}${offsetHours}`,
    isKST: timezone === 'Asia/Seoul'
  };
}

/**
 * UTC 시간을 클라이언트 로컬 시간으로 변환
 */
export function convertUtcToLocal(utcTime: string | Date): Date {
  let utcDate: Date;
  if (typeof utcTime === 'string') {
    // 데이터베이스의 시간은 UTC이므로 명시적으로 UTC로 해석
    // Z가 없으면 UTC로 간주하고 추가
    if (utcTime.endsWith('Z')) {
      utcDate = new Date(utcTime);
    } else {
      // 이미 UTC 시간이므로 Z를 추가하여 명시적으로 UTC로 표시
      utcDate = new Date(utcTime + 'Z');
    }
  } else {
    utcDate = new Date(utcTime.getTime());
  }
  
  // JavaScript Date는 자동으로 클라이언트 시간대로 표시됨
  // UTC 09:30 → KST 18:30 (9시간 차이)
  return utcDate;
}

/**
 * 로컬 시간을 UTC로 변환 (백엔드 전송용)
 */
export function convertLocalToUtc(localTime: string | Date): Date {
  const date = typeof localTime === 'string' ? new Date(localTime) : localTime;
  // 로컬 시간대 오프셋을 빼서 UTC로 변환
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60 * 1000));
}

/**
 * 현재 클라이언트 로컬 시간 반환
 */
export function getCurrentLocalTime(): Date {
  return new Date();
}

/**
 * 시간대 인식 포맷팅 (클라이언트 시간대 기준)
 */
export function formatTimeWithTimezone(
  time: string | Date, 
  options: TimeDisplayOptions = { format: 'date_time' }
): string {
  const { format, forceTimezone, showRelative = false, showTimezone = false } = options;
  
  // UTC 데이터를 클라이언트 로컬 시간으로 변환
  const localTime = convertUtcToLocal(time);
  
  // 상대 시간 표시
  if (showRelative) {
    const relative = getRelativeTime(localTime);
    if (relative) return relative;
  }
  
  // 강제 시간대 지정이 있으면 해당 시간대로 포맷팅
  const timeZone = forceTimezone || getClientTimezone();
  
  // 절대 시간 포맷팅
  let formatted: string;
  switch (format) {
    case 'full':
      formatted = localTime.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      });
      break;
      
    case 'date_time':
      formatted = localTime.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      });
      break;
      
    case 'date_only':
      formatted = localTime.toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        timeZone
      });
      break;
      
    case 'time_only':
      formatted = localTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      });
      break;
      
    case 'relative':
      return getRelativeTime(localTime) || formatTimeWithTimezone(time, { format: 'date_time', forceTimezone });
      
    default:
      formatted = localTime.toLocaleString('ko-KR', { timeZone });
  }
  
  // 시간대 표시 추가
  if (showTimezone) {
    const tzInfo = getClientTimezoneInfo();
    formatted += ` (${tzInfo.displayName})`;
  }
  
  return formatted;
}

/**
 * 상대 시간 계산 (예: "2시간 후", "30분 전")
 */
export function getRelativeTime(targetTime: Date, baseTime?: Date): string | null {
  const base = baseTime || getCurrentLocalTime();
  const target = targetTime;
  
  const diffMs = target.getTime() - base.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // 과거 시간
  if (diffMs < 0) {
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);
    
    if (absDiffMinutes < 1) return '방금 전';
    if (absDiffMinutes < 60) return `${absDiffMinutes}분 전`;
    if (absDiffHours < 24) return `${absDiffHours}시간 전`;
    if (absDiffDays < 7) return `${absDiffDays}일 전`;
    return null; // 7일 이상은 절대 시간 표시
  }
  
  // 미래 시간
  if (diffMinutes < 1) return '곧 시작';
  if (diffMinutes < 60) return `${diffMinutes}분 후`;
  if (diffHours < 24) return `${diffHours}시간 후`;
  if (diffDays < 7) return `${diffDays}일 후`;
  return null; // 7일 이상은 절대 시간 표시
}

/**
 * 상대 시간과 절대 시간을 함께 표시 (정보 전달력 향상)
 * 예: "30분 후 (14:30)", "2시간 전 (12/25 10:00)"
 */
export function getEnhancedTimeDisplay(targetTime: Date | string, baseTime?: Date): string {
  const target = convertUtcToLocal(targetTime);
  const base = baseTime || getCurrentLocalTime();
  
  const relativeTime = getRelativeTime(target, base);
  
  // 절대 시간 포맷팅
  const now = getCurrentLocalTime();
  const isToday = target.toDateString() === now.toDateString();
  const isTomorrow = target.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  const isYesterday = target.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
  
  let absoluteTime: string;
  
  if (isToday) {
    // 오늘: 시간만 표시
    absoluteTime = target.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (isTomorrow) {
    // 내일: "내일 HH:MM"
    absoluteTime = `내일 ${target.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  } else if (isYesterday) {
    // 어제: "어제 HH:MM"
    absoluteTime = `어제 ${target.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  } else {
    // 다른 날: "MM/DD HH:MM"
    absoluteTime = target.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 상대 시간이 있으면 조합, 없으면 절대 시간만
  if (relativeTime) {
    return `${relativeTime} (${absoluteTime})`;
  } else {
    return absoluteTime;
  }
}

/**
 * 경기 시간 상태에 따른 표시 최적화
 */
export function getGameTimeDisplay(commenceTime: Date | string): {
  primary: string;    // 주요 표시 (상대시간 + 절대시간)
  secondary?: string; // 보조 표시 (필요시)
  status: 'upcoming' | 'soon' | 'live' | 'finished';
  urgent?: boolean;   // 베팅 마감 임박 (10분 이내)
} {
  const gameTime = convertUtcToLocal(commenceTime);
  const now = getCurrentLocalTime();
  const diffMs = gameTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // 경기 상태 판단
  let status: 'upcoming' | 'soon' | 'live' | 'finished';
  let urgent = false;
  
  if (diffMs < -3 * 60 * 60 * 1000) { // 3시간 전
    status = 'finished';
  } else if (diffMs < 0) { // 시작됨
    status = 'live';
  } else if (diffMinutes <= 10) { // 10분 이내
    status = 'soon';
    urgent = true;
  } else {
    status = 'upcoming';
  }
  
  const primary = getEnhancedTimeDisplay(gameTime);
  
  // 베팅 마감 임박 시 추가 정보
  let secondary: string | undefined;
  if (urgent && diffMinutes > 0) {
    secondary = `베팅 마감 ${diffMinutes}분 전`;
  } else if (status === 'live') {
    secondary = '진행 중';
  } else if (status === 'finished') {
    secondary = '종료';
  }
  
  return {
    primary,
    secondary,
    status,
    urgent
  };
}

/**
 * 베팅 가능 상태 체크 (클라이언트 시간대 고려)
 */
export function getBettingStatus(commenceTime: string | Date): {
  isBettingAllowed: boolean;
  status: 'available' | 'closing_soon' | 'closed' | 'too_far';
  message: string;
  timeUntilCutoff?: number; // 마감까지 남은 밀리초
} {
  const now = getCurrentLocalTime();
  const gameTime = convertUtcToLocal(commenceTime);
  
  // 베팅 마감 시간 (경기 시작 10분 전)
  const cutoffTime = new Date(gameTime.getTime() - TIME_CONFIG.BETTING_CUTOFF_MINUTES * 60 * 1000);
  
  // 최대 베팅 가능 시간 (7일 후)
  const maxTime = new Date(now.getTime() + TIME_CONFIG.BETTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  
  const timeUntilCutoff = cutoffTime.getTime() - now.getTime();
  
  // 이미 마감된 경기
  if (now >= cutoffTime) {
    return {
      isBettingAllowed: false,
      status: 'closed',
      message: '베팅 마감'
    };
  }
  
  // 너무 먼 미래 경기
  if (gameTime > maxTime) {
    return {
      isBettingAllowed: false,
      status: 'too_far',
      message: '베팅 오픈 예정'
    };
  }
  
  // 마감 임박 (30분 이내)
  if (timeUntilCutoff <= 30 * 60 * 1000) {
    return {
      isBettingAllowed: true,
      status: 'closing_soon',
      message: `곧 마감 (${Math.floor(timeUntilCutoff / (60 * 1000))}분 후)`,
      timeUntilCutoff
    };
  }
  
  // 베팅 가능
  return {
    isBettingAllowed: true,
    status: 'available',
    message: '베팅 가능',
    timeUntilCutoff
  };
}

/**
 * 경기 시간 상태 표시
 */
export function getGameTimeStatus(commenceTime: string | Date): {
  status: 'upcoming' | 'live' | 'finished';
  display: string;
  color: 'blue' | 'green' | 'red' | 'gray';
} {
  const now = getCurrentLocalTime();
  const gameTime = convertUtcToLocal(commenceTime);
  
  // 경기 종료 추정 (3시간 후)
  const estimatedEndTime = new Date(gameTime.getTime() + 3 * 60 * 60 * 1000);
  
  if (now < gameTime) {
    // 아직 시작 안함
    return {
      status: 'upcoming',
      display: formatTimeWithTimezone(gameTime, { format: 'relative', showRelative: true }),
      color: 'blue'
    };
  } else if (now >= gameTime && now < estimatedEndTime) {
    // 진행 중으로 추정
    return {
      status: 'live',
      display: '경기 중',
      color: 'green'
    };
  } else {
    // 종료로 추정
    return {
      status: 'finished',
      display: '경기 종료',
      color: 'gray'
    };
  }
}

/**
 * 시간대별 경기 그룹핑 (클라이언트 시간대 기준)
 */
export function groupGamesByTime(games: any[]): Record<string, any[]> {
  const now = getCurrentLocalTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
  
  const groups: Record<string, any[]> = {
    '오늘': [],
    '내일': [],
    '모레': [],
    '이후': []
  };
  
  games.forEach(game => {
    const gameTime = convertUtcToLocal(game.commence_time);
    const gameDate = new Date(gameTime.getFullYear(), gameTime.getMonth(), gameTime.getDate());
    
    if (gameDate.getTime() === today.getTime()) {
      groups['오늘'].push(game);
    } else if (gameDate.getTime() === tomorrow.getTime()) {
      groups['내일'].push(game);
    } else if (gameDate.getTime() === dayAfterTomorrow.getTime()) {
      groups['모레'].push(game);
    } else {
      groups['이후'].push(game);
    }
  });
  
  // 빈 그룹 제거
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
}

/**
 * 베팅 내역 시간 포맷팅 (클라이언트 시간대, 한국어 친화적)
 */
export function formatBetHistoryTime(createdAt: string): string {
  const localTime = convertUtcToLocal(createdAt);
  const now = getCurrentLocalTime();
  
  // 오늘인지 확인
  const isToday = localTime.toDateString() === now.toDateString();
  
  if (isToday) {
    return `오늘 ${localTime.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit'
    })}`;
  }
  
  // 어제인지 확인
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const isYesterday = localTime.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return `어제 ${localTime.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit'
    })}`;
  }
  
  // 일주일 이내
  const diffDays = Math.floor((now.getTime() - localTime.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 7) {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${weekdays[localTime.getDay()]}요일 ${localTime.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit'
    })}`;
  }
  
  // 그 외 (전체 날짜 표시)
  return localTime.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 디버그용: 시간대 정보 표시
 */
export function getTimezoneDebugInfo(time: string | Date) {
  const original = typeof time === 'string' ? new Date(time) : time;
  const local = convertUtcToLocal(original);
  const clientInfo = getClientTimezoneInfo();
  
  return {
    input: original.toISOString(),
    inputLocal: original.toLocaleString('ko-KR'),
    converted: local.toISOString(),
    convertedLocal: local.toLocaleString('ko-KR'),
    clientTimezone: clientInfo.timezone,
    clientOffset: clientInfo.displayName,
    isKST: clientInfo.isKST
  };
} 

/**
 * UTC 시간을 KST(한국 시간)로 변환
 * @param utcTime UTC 시간 (Date 객체 또는 ISO 문자열)
 * @returns KST 시간 문자열
 */
export function convertUTCToKST(utcTime: Date | string): string {
  const date = new Date(utcTime);
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * UTC 시간을 KST로 변환하여 상대적 시간 표시 (예: "3시간 후", "1일 전")
 * @param utcTime UTC 시간 (Date 객체 또는 ISO 문자열)
 * @returns 상대적 시간 문자열
 */
export function getRelativeTimeKST(utcTime: Date | string): string {
  const utcDate = new Date(utcTime);
  const now = new Date();
  const diffMs = utcDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // 과거 시간
    if (diffDays < -1) return `${Math.abs(diffDays)}일 전`;
    if (diffHours < -1) return `${Math.abs(diffHours)}시간 전`;
    return '방금 전';
  } else {
    // 미래 시간
    if (diffDays > 1) return `${diffDays}일 후`;
    if (diffHours > 1) return `${diffHours}시간 후`;
    return '곧 시작';
  }
}

/**
 * UTC 시간을 KST로 변환하여 경기 시작까지 남은 시간 계산
 * @param utcTime UTC 시간 (Date 객체 또는 ISO 문자열)
 * @returns 남은 시간 정보 객체
 */
export function getTimeUntilGameKST(utcTime: Date | string): {
  isStarted: boolean;
  isFinished: boolean;
  remainingTime: string;
  status: string;
} {
  const utcDate = new Date(utcTime);
  const now = new Date();
  const diffMs = utcDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs < -7200000) { // 2시간 전
    return {
      isStarted: true,
      isFinished: true,
      remainingTime: '경기 종료',
      status: 'finished'
    };
  } else if (diffMs < 0) { // 경기 시작 후
    return {
      isStarted: true,
      isFinished: false,
      remainingTime: '경기 진행중',
      status: 'in-progress'
    };
  } else if (diffMs < 300000) { // 5분 전
    return {
      isStarted: false,
      isFinished: false,
      remainingTime: '곧 시작',
      status: 'starting-soon'
    };
  } else if (diffHours > 0) {
    return {
      isStarted: false,
      isFinished: false,
      remainingTime: `${diffHours}시간 ${diffMinutes}분 후`,
      status: 'upcoming'
    };
  } else {
    return {
      isStarted: false,
      isFinished: false,
      remainingTime: `${diffMinutes}분 후`,
      status: 'upcoming'
    };
  }
} 