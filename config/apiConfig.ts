// 프론트엔드용 API 설정 중앙화 파일
// 백엔드 centralizedConfig.js와 동기화

// ===== API 설정 =====
export const API_CONFIG = {
  // 기본 URL 설정
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5050'),
  
  // API 엔드포인트
  ENDPOINTS: {
    ODDS: '/api/odds',
    BET: '/api/bet',
    AUTH: '/api/auth',
    GAME_RESULTS: '/api/game-results',
    HISTORY: '/api/bet/history',
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register'
  },
  
  // 요청 설정
  TIMEOUT: 10000, // 10초
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1초
  
  // Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// ===== 시간 설정 (클라이언트 시간대 기반) =====
export const TIME_CONFIG = {
  // 시간대 설정 (클라이언트 자동 감지)
  FALLBACK_TIMEZONE: 'Asia/Seoul', // 감지 실패 시 기본값
  SUPPORTED_TIMEZONES: [
    'Asia/Seoul',      // KST (한국)
    'Asia/Tokyo',      // JST (일본)
    'Asia/Shanghai',   // CST (중국)
    'UTC',             // UTC
    'America/New_York', // EST/EDT (미국 동부)
    'America/Los_Angeles', // PST/PDT (미국 서부)
    'Europe/London'    // GMT/BST (영국)
  ],
  
  // 베팅 관련 시간 설정 (백엔드와 동일)
  BETTING_CUTOFF_MINUTES: 10,
  BETTING_WINDOW_DAYS: 7,
  
  // UI 갱신 간격
  ODDS_REFRESH_INTERVAL: 5 * 60 * 1000,     // 5분 (백엔드와 동일)
  BET_STATUS_CHECK_INTERVAL: 30 * 1000,     // 30초
  AUTO_REFRESH_INTERVAL: 10 * 60 * 1000,    // 10분
  
  // 날짜 표시 형식
  DISPLAY_FORMATS: {
    FULL: 'YYYY년 MM월 DD일 HH:mm',
    DATE_TIME: 'MM/DD HH:mm',
    DATE_ONLY: 'MM/DD',
    TIME_ONLY: 'HH:mm'
  }
};

// ===== UI 설정 =====
export const UI_CONFIG = {
  // 페이지네이션
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // 로딩 설정
  LOADING_DELAY: 300,        // 300ms 후 로딩 표시
  DEBOUNCE_DELAY: 500,       // 500ms 디바운스
  
  // 알림 설정
  TOAST_DURATION: 4000,      // 4초
  SUCCESS_DURATION: 3000,    // 3초
  ERROR_DURATION: 6000,      // 6초
  
  // 테마 설정
  THEME: {
    PRIMARY_COLOR: '#2563eb',    // blue-600
    SUCCESS_COLOR: '#16a34a',    // green-600  
    WARNING_COLOR: '#d97706',    // amber-600
    ERROR_COLOR: '#dc2626',      // red-600
    GRAY_COLOR: '#6b7280'        // gray-500
  }
};

// ===== 베팅 설정 (백엔드와 동일) =====
export const BETTING_CONFIG = {
  // 베팅 금액 제한
  MIN_BET_AMOUNT: 1000,
  MAX_BET_AMOUNT: 1000000,
  MAX_DAILY_BET: 5000000,
  
  // 배당률 제한
  MIN_ODDS: 1.01,
  MAX_ODDS: 100.0,
  
  // 베팅 슬립 제한
  MAX_SELECTIONS: 10,
  MAX_SAME_GAME_BETS: 3,
  
  // 입력 검증
  AMOUNT_STEP: 1000,         // 1000원 단위
  DEFAULT_AMOUNT: 10000,     // 기본 10,000원
  
  // 수수료 표시용
  COMMISSION_RATE: 0.05,
  MINIMUM_COMMISSION: 50
};

// ===== 로컬 스토리지 키 =====
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  BET_HISTORY: 'bet_history_cache',
  SETTINGS: 'user_settings',
  LAST_VISITED: 'last_visited_sport'
};

// ===== 환경별 설정 =====
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const envConfigs = {
    development: {
      DEBUG: true,
      AUTO_REFRESH_INTERVAL: 30 * 1000, // 개발환경에서는 30초마다
      RETRY_COUNT: 1,
      LOGGING_ENABLED: true
    },
    production: {
      DEBUG: false,
      AUTO_REFRESH_INTERVAL: 10 * 60 * 1000, // 운영환경에서는 10분마다
      RETRY_COUNT: 3,
      LOGGING_ENABLED: false
    },
    test: {
      DEBUG: false,
      AUTO_REFRESH_INTERVAL: 5 * 1000, // 테스트환경에서는 5초마다
      RETRY_COUNT: 0,
      LOGGING_ENABLED: false
    }
  };
  
  return envConfigs[env] || envConfigs.development;
}

// ===== 유틸리티 함수 =====

/**
 * API URL 생성
 */
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}

/**
 * 인증 헤더 생성
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  return {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(token && { 'x-auth-token': token })
  };
}

/**
 * 시간 포맷팅
 */
export function formatTime(date: Date | string, format: keyof typeof TIME_CONFIG.DISPLAY_FORMATS): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatStr = TIME_CONFIG.DISPLAY_FORMATS[format];
  
  // 실제 포맷팅 로직은 moment.js나 date-fns 등을 사용
  // 여기서는 기본 toLocaleString 사용
  switch (format) {
    case 'FULL':
      return d.toLocaleString('ko-KR');
    case 'DATE_TIME':
      return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    case 'DATE_ONLY':
      return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
    case 'TIME_ONLY':
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    default:
      return d.toLocaleString('ko-KR');
  }
}

/**
 * 베팅 가능 시간 체크
 */
export function isBettingAllowed(commenceTime: Date | string): boolean {
  const now = new Date();
  const gameTime = typeof commenceTime === 'string' ? new Date(commenceTime) : commenceTime;
  
  const cutoffTime = new Date(gameTime.getTime() - TIME_CONFIG.BETTING_CUTOFF_MINUTES * 60 * 1000);
  const maxTime = new Date(now.getTime() + TIME_CONFIG.BETTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  
  return now < cutoffTime && gameTime <= maxTime;
}

/**
 * 금액 포맷팅
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * 배당률 포맷팅
 */
export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

// ===== 초기화 =====
export function initializeConfig() {
  const envConfig = getEnvironmentConfig();
  
  // 환경별 설정 적용
  Object.assign(API_CONFIG, envConfig);
  Object.assign(TIME_CONFIG, envConfig);
  Object.assign(UI_CONFIG, envConfig);
  
  console.log(`[프론트엔드 설정] 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[프론트엔드 설정] API URL: ${API_CONFIG.BASE_URL}`);
  
  return true;
} 