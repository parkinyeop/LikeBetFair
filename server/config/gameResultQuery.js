/**
 * 경기 결과 조회 중앙화 설정
 * 모든 위치에서 일관된 설정으로 GameResult 조회
 */

export const GAME_RESULT_QUERY_CONFIG = {
  // 시간 범위 설정
  DEFAULT_TIME_RANGE: 24,     // 기본 시간 범위 (시간)
  MAX_TIME_RANGE: 72,         // 최대 시간 범위 (시간)
  MIN_TIME_RANGE: 0,          // 최소 시간 범위 (시간)
  
  // 캐시 설정
  CACHE_TTL: 300,             // 캐시 유효시간 (초)
  CACHE_ENABLED: true,         // 캐시 활성화 여부
  
  // 재시도 및 타임아웃
  RETRY_ATTEMPTS: 3,          // 재시도 횟수
  RETRY_DELAY: 1000,          // 재시도 간격 (ms)
  QUERY_TIMEOUT: 5000,        // 쿼리 타임아웃 (ms)
  
  // 데이터 검증
  ENABLE_VALIDATION: true,     // 데이터 검증 활성화
  VALIDATION_STRICT_MODE: false, // 엄격한 검증 모드
  
  // 팀명 매칭 설정
  ENABLE_PARTIAL_MATCH: true,  // 부분 매칭 활성화
  ENABLE_REVERSE_MATCH: true,  // 역방향 매칭 활성화 (홈/어웨이 바뀐 경우)
  
  // 로깅 설정
  LOG_LEVEL: 'info',          // 로그 레벨 (debug, info, warn, error)
  LOG_PERFORMANCE: true,       // 성능 로깅 활성화
  LOG_MATCHING_DETAILS: true, // 매칭 상세 로깅 활성화
  
  // 알림 설정
  ENABLE_ALERTS: true,         // 알림 활성화
  ALERT_ON_FAILURE: true,      // 실패 시 알림
  ALERT_ON_SLOW_QUERY: true,   // 느린 쿼리 시 알림
  SLOW_QUERY_THRESHOLD: 2000,  // 느린 쿼리 임계값 (ms)
  
  // 성능 모니터링
  ENABLE_METRICS: true,        // 메트릭 수집 활성화
  METRICS_RETENTION_DAYS: 30,  // 메트릭 보관 기간 (일)
  
  // Feature Flags (점진적 마이그레이션용)
  FEATURE_FLAGS: {
    USE_CENTRALIZED_QUERY: true,   // 중앙화된 쿼리 사용 여부 (개발 환경에서 활성화)
    ENABLE_CACHING: false,         // 캐싱 활성화 여부 (아직 구현 안됨)
    ENABLE_METRICS: true,          // 메트릭 수집 활성화 여부
    ENABLE_ALERTS: true            // 알림 활성화 여부
  }
};

/**
 * 위치별 기본 설정
 */
export const LOCATION_CONFIGS = {
  betController: {
    usePartialMatch: true,
    timeRange: 24,
    statusFilter: null,
    orderBy: 'createdAt',
    orderDirection: 'DESC',
    enableValidation: true,
    enableCaching: false
  },
  
  multibetSettlement: {
    usePartialMatch: true,  // ✅ false → true (부분 매칭 활성화)
    useNormalizeUtils: true,  // ✅ 추가 (팀명 정규화 활성화)
    timeRange: 24,
    statusFilter: 'finished',
    orderBy: null,
    orderDirection: null,
    enableValidation: true,
    enableCaching: false,
    twoStageQuery: true  // 2단계 조회 사용
  },
  
  exchangeSettlement: {
    usePartialMatch: false,
    timeRange: 0,
    statusFilter: null,
    orderBy: 'createdAt',
    orderDirection: 'DESC',
    enableValidation: false,
    enableCaching: false
  },
  
  exchangeRoutes: {
    usePartialMatch: false,
    useNormalizeUtils: true,  // ✅ 팀명 정규화 활성화 (스코어 표시를 위해)
    timeRange: 0,
    statusFilter: null,
    orderBy: null,
    orderDirection: null,
    enableValidation: false,
    enableCaching: true
  }
};

/**
 * 환경별 설정 오버라이드
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    LOG_LEVEL: 'debug',
    ENABLE_METRICS: true,
    ENABLE_ALERTS: false,
    CACHE_ENABLED: false
  },
  
  production: {
    LOG_LEVEL: 'info',
    ENABLE_METRICS: true,
    ENABLE_ALERTS: true,
    CACHE_ENABLED: true,
    QUERY_TIMEOUT: 3000
  },
  
  test: {
    LOG_LEVEL: 'error',
    ENABLE_METRICS: false,
    ENABLE_ALERTS: false,
    CACHE_ENABLED: false,
    RETRY_ATTEMPTS: 1
  }
};

/**
 * 현재 환경에 맞는 설정 반환
 */
export function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envConfig = ENVIRONMENT_CONFIGS[env] || ENVIRONMENT_CONFIGS.development;
  
  return {
    ...GAME_RESULT_QUERY_CONFIG,
    ...envConfig
  };
}

/**
 * 특정 위치의 설정 반환
 */
export function getLocationConfig(location) {
  const baseConfig = getConfig();
  const locationConfig = LOCATION_CONFIGS[location] || LOCATION_CONFIGS.betController;
  
  return {
    ...baseConfig,
    ...locationConfig
  };
}

export default {
  GAME_RESULT_QUERY_CONFIG,
  LOCATION_CONFIGS,
  ENVIRONMENT_CONFIGS,
  getConfig,
  getLocationConfig
};
