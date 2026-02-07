export const ODDS_API_CONFIG = {
  // API 기본 설정
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  BATCH_SIZE: 10,
  
  // 속도 제한 설정
  RATE_LIMITS: {
    // 🚨 임시 설정 (디버깅용) - 나중에 원래 값으로 복구 필요
    DAILY: 999999,    // 원래: 500 (무료 플랜)
    MONTHLY: 999999,  // 원래: 10000 (무료 플랜)  
    HOURLY: 999999    // 원래: 100 (무료 플랜)
    
    // 🔧 원래 설정 (복구 시 주석 해제)
    // DAILY: 500,      // 일일 500회
    // MONTHLY: 10000,  // 월간 10,000회
    // HOURLY: 100      // 시간당 100회
  },
  
  // 데이터 정리 설정
  CLEANUP_DAYS: 7,
  
  // 성능 임계값
  PERFORMANCE_THRESHOLDS: {
    MAX_PROCESSING_TIME: 10000, // 10초
    WARNING_PROCESSING_TIME: 5000 // 5초
  },
  
  // 우선순위 설정
  PRIORITY_LEVELS: {
    HIGH: {
      TIME_WINDOW: 60 * 60 * 1000, // 1시간
      DESCRIPTION: '1시간 이내 시작 또는 진행 중인 경기'
    },
    MEDIUM: {
      TIME_WINDOW: 6 * 60 * 60 * 1000, // 6시간
      DESCRIPTION: '6시간 이내 시작 예정 경기'
    },
    LOW: {
      TIME_WINDOW: 24 * 60 * 60 * 1000, // 24시간
      DESCRIPTION: '24시간 이내 시작 예정 경기'
    }
  },
  
  // 에러 처리 설정
  ERROR_HANDLING: {
    RATE_LIMIT_RETRY_DELAY: 5000,
    AUTH_ERROR_RETRY_DELAY: 10000,
    MAX_RETRIES: 3
  }
};

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
}; 