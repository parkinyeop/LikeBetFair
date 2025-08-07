// 프론트엔드 API 설정
export const API_CONFIG = {
  // API 기본 URL
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050',
  
  // 환경 설정
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  
  // API 엔드포인트
  ENDPOINTS: {
    ODDS: '/api/odds',
    BET: '/api/bet',
    AUTH: '/api/auth',
    EXCHANGE: '/api/exchange',
    GAME_RESULTS: '/api/game-results',
    ADMIN: '/api/admin'
  },
  
  // 요청 설정
  REQUEST_CONFIG: {
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  }
};

// 전체 API URL 생성 함수
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// API 엔드포인트 URL들
export const API_URLS = {
  ODDS: getApiUrl(API_CONFIG.ENDPOINTS.ODDS),
  BET: getApiUrl(API_CONFIG.ENDPOINTS.BET),
  AUTH: getApiUrl(API_CONFIG.ENDPOINTS.AUTH),
  EXCHANGE: getApiUrl(API_CONFIG.ENDPOINTS.EXCHANGE),
  GAME_RESULTS: getApiUrl(API_CONFIG.ENDPOINTS.GAME_RESULTS),
  ADMIN: getApiUrl(API_CONFIG.ENDPOINTS.ADMIN)
};

// API 요청 헬퍼 함수
export const apiRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    timeout: API_CONFIG.REQUEST_CONFIG.TIMEOUT
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};
