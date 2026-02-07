// 백엔드 DB 표준화에 맞춘 통합 스포츠 매핑 설정 (JavaScript 버전)
// 서버에서 사용하는 스포츠 매핑 정보

// 백엔드 DB와 완전히 일치하는 매핑
export const SPORT_CATEGORIES = {
  // 야구
  "KBO": {
    displayName: "KBO",
    sportKey: "baseball_kbo",
    backendCategory: "KBO", 
    sportTitle: "KBO"
  },
  "MLB": {
    displayName: "MLB",
    sportKey: "baseball_mlb", 
    backendCategory: "MLB",
    sportTitle: "MLB"
  },
  
  // 농구
  "NBA": {
    displayName: "NBA",
    sportKey: "basketball_nba",
    backendCategory: "NBA",
    sportTitle: "NBA" 
  },
  
  // 미식축구
  "NFL": {
    displayName: "NFL", 
    sportKey: "americanfootball_nfl",
    backendCategory: "NFL",
    sportTitle: "NFL"
  },
  
  // 축구
  "K리그": {
    displayName: "K리그",
    sportKey: "soccer_korea_kleague1", 
    backendCategory: "KOREA_KLEAGUE1",
    sportTitle: "K-League"
  },
  "J리그": {
    displayName: "J리그",
    sportKey: "soccer_japan_j_league",
    backendCategory: "JAPAN_J_LEAGUE", 
    sportTitle: "J-League"
  },
  "세리에 A": {
    displayName: "세리에 A",
    sportKey: "soccer_italy_serie_a",
    backendCategory: "ITALY_SERIE_A",
    sportTitle: "Serie A"
  },
  "브라질 세리에 A": {
    displayName: "브라질 세리에 A", 
    sportKey: "soccer_brazil_campeonato",
    backendCategory: "BRAZIL_CAMPEONATO",
    sportTitle: "Brasileirao"
  },
  "MLS": {
    displayName: "MLS",
    sportKey: "soccer_usa_mls",
    backendCategory: "USA_MLS", 
    sportTitle: "MLS"
  },
  "아르헨티나 프리메라": {
    displayName: "아르헨티나 프리메라",
    sportKey: "soccer_argentina_primera_division",
    backendCategory: "ARGENTINA_PRIMERA_DIVISION",
    sportTitle: "Argentina Primera"
  },
  "중국 슈퍼리그": {
    displayName: "중국 슈퍼리그", 
    sportKey: "soccer_china_superleague",
    backendCategory: "CHINA_SUPERLEAGUE",
    sportTitle: "Chinese Super League"
  },
  "라리가": {
    displayName: "라리가",
    sportKey: "soccer_spain_primera_division",
    backendCategory: "LALIGA",
    sportTitle: "La Liga"
  },
  "분데스리가": {
    displayName: "분데스리가",
    sportKey: "soccer_germany_bundesliga", 
    backendCategory: "BUNDESLIGA",
    sportTitle: "Bundesliga"
  },
  "프리미어리그": {
    displayName: "프리미어리그",
    sportKey: "soccer_england_premier_league",
    backendCategory: "EPL",
    sportTitle: "English Premier League"
  },
  
  // 농구 추가
  "KBL": {
    displayName: "KBL",
    sportKey: "basketball_kbl",
    backendCategory: "KBL",
    sportTitle: "KBL"
  }
};

// ✅ 시즌 일정 정보 (JSON 파일에서 동적 로드)
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * seasonSchedules.json 파일에서 시즌 정보를 로드
 * - 캐시 무효화 지원 (서버 재시작 없이 변경사항 반영 가능)
 */
function loadSeasonSchedules() {
  try {
    const configPath = join(__dirname, 'seasonSchedules.json');
    const content = readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ seasonSchedules.json 로드 실패:', error.message);
    return {}; // 빈 객체 반환 (fallback)
  }
}

// 초기 로드
let _seasonSchedulesCache = loadSeasonSchedules();

// Export: 기본 시즌 정보 객체
export const SEASON_SCHEDULES = new Proxy(_seasonSchedulesCache, {
  get(target, prop) {
    // _metadata는 내부 관리용이므로 제외
    if (prop === '_metadata' || prop === 'reload') {
      return undefined;
    }
    return target[prop];
  }
});

/**
 * seasonSchedules.json 리로드 함수
 * - 서버 재시작 없이 변경사항 반영
 * - 관리자 페이지나 스케줄러에서 호출 가능
 */
export function reloadSeasonSchedules() {
  console.log('🔄 seasonSchedules.json 리로드 중...');
  const fresh = loadSeasonSchedules();
  
  // 기존 객체 속성 모두 제거
  Object.keys(_seasonSchedulesCache).forEach(key => {
    delete _seasonSchedulesCache[key];
  });
  
  // 새로운 속성 복사
  Object.assign(_seasonSchedulesCache, fresh);
  
  console.log(`✅ seasonSchedules.json 리로드 완료: ${Object.keys(fresh).length - 1}개 리그`); // -1: _metadata 제외
  return _seasonSchedulesCache;
}

// 유틸리티 함수들
export const getSportKey = (displayName) => {
  return SPORT_CATEGORIES[displayName]?.sportKey || "";
};

export const getBackendCategory = (displayName) => {
  return SPORT_CATEGORIES[displayName]?.backendCategory || "";
};

export const getSportTitle = (displayName) => {
  return SPORT_CATEGORIES[displayName]?.sportTitle || "";
};

// sportKey로 displayName 찾기 (역방향 조회)
export const getDisplayNameFromSportKey = (sportKey) => {
  const entry = Object.entries(SPORT_CATEGORIES).find(([_, config]) => config.sportKey === sportKey);
  return entry ? entry[0] : "";
};

// 모든 지원 스포츠 키 목록
export const getAllSportKeys = () => {
  return Object.values(SPORT_CATEGORIES).map(config => config.sportKey);
};

// 시즌 정보 가져오기
export const getSeasonInfo = (sportKey) => {
  return SEASON_SCHEDULES[sportKey] || null;
}; 