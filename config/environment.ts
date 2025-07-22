// 환경별 설정 중앙화 파일

export interface EnvironmentConfig {
  // API 설정
  apiUrl: string;
  apiTimeout: number;
  apiRetryCount: number;
  
  // 데이터베이스 설정
  databaseUrl: string;
  
  // 로깅 설정
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // 기능 설정
  autoRefreshInterval: number;
  bettingCutoffMinutes: number;
  
  // 외부 API 설정
  oddsApiKey: string;
  sportsDbApiKey: string;
}

// 개발환경 설정
const developmentConfig: EnvironmentConfig = {
  apiUrl: 'http://localhost:5050',
  apiTimeout: 5000,
  apiRetryCount: 1,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/likebetfair_dev',
  debugMode: true,
  logLevel: 'debug',
  autoRefreshInterval: 30 * 1000, // 30초
  bettingCutoffMinutes: 10,
  oddsApiKey: process.env.ODDS_API_KEY || '',
  sportsDbApiKey: process.env.SPORTSDB_API_KEY || ''
};

// 프로덕션 환경 설정
const productionConfig: EnvironmentConfig = {
  apiUrl: 'https://likebetfair.onrender.com',
  apiTimeout: 15000,
  apiRetryCount: 3,
  databaseUrl: process.env.DATABASE_URL || '',
  debugMode: false,
  logLevel: 'error',
  autoRefreshInterval: 10 * 60 * 1000, // 10분
  bettingCutoffMinutes: 10,
  oddsApiKey: process.env.ODDS_API_KEY || '',
  sportsDbApiKey: process.env.SPORTSDB_API_KEY || ''
};

// 테스트 환경 설정
const testConfig: EnvironmentConfig = {
  apiUrl: 'http://localhost:5050',
  apiTimeout: 3000,
  apiRetryCount: 0,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/likebetfair_test',
  debugMode: false,
  logLevel: 'error',
  autoRefreshInterval: 5 * 1000, // 5초
  bettingCutoffMinutes: 10,
  oddsApiKey: process.env.ODDS_API_KEY || '',
  sportsDbApiKey: process.env.SPORTSDB_API_KEY || ''
};

// 환경 감지
export const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
};

// 환경별 설정 반환
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    default:
      return developmentConfig;
  }
};

// 현재 환경 정보 출력
export const logEnvironmentInfo = () => {
  const env = getEnvironment();
  const config = getEnvironmentConfig();
  
  console.log(`[환경 설정] 현재 환경: ${env}`);
  console.log(`[환경 설정] API URL: ${config.apiUrl}`);
  console.log(`[환경 설정] 디버그 모드: ${config.debugMode}`);
  console.log(`[환경 설정] 로그 레벨: ${config.logLevel}`);
};

// 환경별 유틸리티 함수들
export const isDevelopment = () => getEnvironment() === 'development';
export const isProduction = () => getEnvironment() === 'production';
export const isTest = () => getEnvironment() === 'test';
export const isLocalhost = () => typeof window !== 'undefined' && window.location.hostname === 'localhost'; 