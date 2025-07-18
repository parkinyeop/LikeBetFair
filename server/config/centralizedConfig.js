// DB 기준 중앙화된 설정 파일
// 모든 API 설정, 카테고리 매핑, 시간 설정 등을 한 곳에서 관리

import db from '../models/db.js';

// ===== API 설정 =====
export const API_CONFIG = {
  // 서버 설정
  BACKEND_PORT: process.env.PORT || 5050,
  FRONTEND_PORT: 3000,
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? process.env.PRODUCTION_URL 
    : 'http://localhost:5050',
  
  // API 엔드포인트
  ENDPOINTS: {
    ODDS: '/api/odds',
    BET: '/api/bet',
    AUTH: '/api/auth',
    GAME_RESULTS: '/api/game-results'
  },
  
  // 응답 설정
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  
  // 요청 제한
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15분
    MAX_REQUESTS: 100
  }
};

// ===== 시간 설정 =====
export const TIME_CONFIG = {
  // 시간대 설정
  DEFAULT_TIMEZONE: 'Asia/Seoul',
  UTC_OFFSET: 9, // KST = UTC+9
  
  // 베팅 관련 시간 설정
  BETTING_CUTOFF_MINUTES: 10,  // 경기 시작 10분 전 베팅 마감
  BETTING_WINDOW_DAYS: 7,      // 향후 7일 내 경기만 베팅 가능
  
  // 데이터 갱신 간격
  ODDS_UPDATE_INTERVAL: 5 * 60 * 1000,      // 5분
  RESULTS_UPDATE_INTERVAL: 30 * 60 * 1000,  // 30분
  BET_CHECK_INTERVAL: 30 * 1000,            // 30초
  
  // 날짜 형식
  DATE_FORMATS: {
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    DISPLAY: 'YYYY-MM-DD HH:mm',
    DATE_ONLY: 'YYYY-MM-DD'
  }
};

// ===== 데이터베이스 설정 =====
export const DB_CONFIG = {
  // 테이블명
      TABLES: {
      ODDS_CACHE: 'OddsCaches',
      GAME_RESULTS: 'GameResults', 
      BETS: 'Bets',
    USERS: 'users'
  },
  
  // 쿼리 제한
  MAX_QUERY_LIMIT: 1000,
  DEFAULT_PAGE_SIZE: 20,
  
  // 연결 설정
  CONNECTION_TIMEOUT: 10000,
  QUERY_TIMEOUT: 30000
};

// ===== 스포츠 카테고리 매핑 (DB 기준) =====
// DB에서 실제 데이터를 가져와서 동적으로 생성
let SPORTS_MAPPING = null;

/**
 * DB에서 스포츠 카테고리 매핑을 동적으로 생성
 */
export async function generateSportsMappingFromDB() {
  try {
    const query = `
      SELECT DISTINCT 
        "subCategory" as category,
        "sportTitle" as sport_title,
        "sportKey" as sport_key,
        COUNT(*) as game_count
      FROM "OddsCaches" 
      WHERE "updatedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "subCategory", "sportTitle", "sportKey"
      ORDER BY "subCategory", "sportTitle"
    `;
    
    const rows = await db.query(query);
    
    // DB 데이터를 기반으로 매핑 생성
    const mapping = {};
    const categoryGroups = {};
    
    rows.forEach(row => {
      const { category, sport_title, sport_key, game_count } = row;
      
      // 개별 매핑 정보
      mapping[sport_title] = {
        displayName: sport_title,
        category: category,
        sportKey: sport_key,
        gameCount: game_count,
        apiEndpoint: `/api/odds/${sport_key}`,
        isActive: game_count > 0
      };
      
      // 카테고리별 그룹핑
      const mainCategory = getMainCategoryFromSportKey(sport_key);
      if (!categoryGroups[mainCategory]) {
        categoryGroups[mainCategory] = [];
      }
      categoryGroups[mainCategory].push(sport_title);
    });
    
    SPORTS_MAPPING = {
      mapping,
      categoryGroups,
      lastUpdated: new Date().toISOString(),
      totalSports: rows.length
    };
    
    console.log(`[설정] DB 기준 스포츠 매핑 생성 완료: ${rows.length}개 스포츠`);
    return SPORTS_MAPPING;
    
  } catch (error) {
    console.error('[설정] DB 스포츠 매핑 생성 실패:', error);
    // 폴백: 기본 매핑 사용
    return getDefaultSportsMapping();
  }
}

/**
 * 기본 스포츠 매핑 (DB 접근 실패 시 폴백)
 */
function getDefaultSportsMapping() {
  return {
    mapping: {
      'KBO': { displayName: 'KBO', category: 'KBO', sportKey: 'baseball_kbo', isActive: true },
      'NBA': { displayName: 'NBA', category: 'NBA', sportKey: 'basketball_nba', isActive: true },
      'NFL': { displayName: 'NFL', category: 'NFL', sportKey: 'americanfootball_nfl', isActive: true },
      'MLB': { displayName: 'MLB', category: 'MLB', sportKey: 'baseball_mlb', isActive: true },
      'MLS': { displayName: 'MLS', category: 'MLS', sportKey: 'soccer_usa_mls', isActive: true }
    },
    categoryGroups: {
      '야구': ['KBO', 'MLB'],
      '농구': ['NBA'],
      '축구': ['MLS'],
      '미식축구': ['NFL']
    },
    lastUpdated: new Date().toISOString(),
    totalSports: 5,
    fallback: true
  };
}

/**
 * sportKey에서 메인 카테고리 추출
 */
function getMainCategoryFromSportKey(sportKey) {
  if (!sportKey || typeof sportKey !== 'string') return '기타';
  
  if (sportKey.includes('baseball')) return '야구';
  if (sportKey.includes('basketball')) return '농구';
  if (sportKey.includes('soccer')) return '축구';
  if (sportKey.includes('americanfootball')) return '미식축구';
  if (sportKey.includes('hockey')) return '아이스하키';
  return '기타';
}

/**
 * 현재 스포츠 매핑 반환 (캐시된 데이터)
 */
export function getCurrentSportsMapping() {
  return SPORTS_MAPPING;
}

/**
 * 특정 스포츠의 설정 정보 반환
 */
export function getSportConfig(sportTitle) {
  if (!SPORTS_MAPPING) return null;
  return SPORTS_MAPPING.mapping[sportTitle] || null;
}

/**
 * 카테고리별 스포츠 목록 반환
 */
export function getSportsByCategory(category) {
  if (!SPORTS_MAPPING) return [];
  return SPORTS_MAPPING.categoryGroups[category] || [];
}

/**
 * 활성화된 모든 스포츠 목록 반환
 */
export function getActiveSports() {
  if (!SPORTS_MAPPING) return [];
  return Object.values(SPORTS_MAPPING.mapping)
    .filter(sport => sport.isActive)
    .map(sport => sport.displayName);
}

// ===== 베팅 설정 =====
export const BETTING_CONFIG = {
  // 베팅 금액 제한
  MIN_BET_AMOUNT: 1000,      // 최소 1,000원
  MAX_BET_AMOUNT: 1000000,   // 최대 100만원
  MAX_DAILY_BET: 5000000,    // 일일 최대 500만원
  
  // 배당률 제한
  MIN_ODDS: 1.01,
  MAX_ODDS: 100.0,
  
  // 베팅 슬립 제한
  MAX_SELECTIONS: 10,        // 최대 10개 선택
  MAX_SAME_GAME_BETS: 3,     // 같은 경기 최대 3개 베팅
  
  // 결과 처리
  RESULT_PROCESSING_DELAY: 30 * 60 * 1000, // 경기 종료 30분 후 결과 확정
  AUTO_CANCEL_HOURS: 24,     // 24시간 후 자동 취소
  
  // 수수료
  COMMISSION_RATE: 0.05,     // 5% 수수료
  MINIMUM_COMMISSION: 50     // 최소 수수료 50원
};

// ===== 로깅 설정 =====
export const LOG_CONFIG = {
  // 로그 레벨
  LEVEL: process.env.LOG_LEVEL || 'info',
  
  // 로그 파일 설정
  MAX_FILE_SIZE: '10MB',
  MAX_FILES: 5,
  
  // 로그 보존 기간
  RETENTION_DAYS: 30,
  
  // 로그 카테고리
  CATEGORIES: {
    API: 'api',
    DB: 'database', 
    BET: 'betting',
    ODDS: 'odds',
    AUTH: 'authentication',
    ERROR: 'error'
  }
};

// ===== 환경별 설정 오버라이드 =====
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const envConfigs = {
    development: {
      LOG_LEVEL: 'debug',
      ODDS_UPDATE_INTERVAL: 10 * 60 * 1000, // 개발환경에서는 10분마다
      RATE_LIMIT: { WINDOW_MS: 15 * 60 * 1000, MAX_REQUESTS: 1000 }
    },
    production: {
      LOG_LEVEL: 'warn',
      ODDS_UPDATE_INTERVAL: 5 * 60 * 1000,   // 운영환경에서는 5분마다
      RATE_LIMIT: { WINDOW_MS: 15 * 60 * 1000, MAX_REQUESTS: 100 }
    },
    test: {
      LOG_LEVEL: 'error',
      ODDS_UPDATE_INTERVAL: 60 * 1000,       // 테스트환경에서는 1분마다
      RATE_LIMIT: { WINDOW_MS: 60 * 1000, MAX_REQUESTS: 10 }
    }
  };
  
  return envConfigs[env] || envConfigs.development;
}

// ===== 초기화 함수 =====
export async function initializeCentralizedConfig() {
  console.log('[설정] 중앙화된 설정 초기화 시작...');
  
  try {
    // DB 기준 스포츠 매핑 생성
    await generateSportsMappingFromDB();
    
    // 환경별 설정 적용
    const envConfig = getEnvironmentConfig();
    Object.assign(TIME_CONFIG, envConfig);
    Object.assign(API_CONFIG, envConfig);
    
    console.log('[설정] 중앙화된 설정 초기화 완료');
    console.log(`[설정] 환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[설정] 스포츠 매핑: ${SPORTS_MAPPING?.totalSports || 0}개`);
    
    return true;
  } catch (error) {
    console.error('[설정] 초기화 실패:', error);
    return false;
  }
}

// ===== 설정 새로고침 =====
export async function refreshConfig() {
  console.log('[설정] 설정 새로고침 시작...');
  await generateSportsMappingFromDB();
  console.log('[설정] 설정 새로고침 완료');
}

// 정기적인 설정 새로고침 (1시간마다)
setInterval(refreshConfig, 60 * 60 * 1000); 