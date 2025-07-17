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

// 시즌 일정 정보 (2025년 기준)
export const SEASON_SCHEDULES = {
  // 축구
  'soccer_korea_kleague1': {
    name: 'K리그',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (1경기))'
  },
  'soccer_japan_j_league': {
    name: 'J리그',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (10경기))'
  },
  'soccer_italy_serie_a': {
    name: '세리에 A',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },
  'soccer_brazil_campeonato': {
    name: '브라질 세리에 A',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },
  'soccer_usa_mls': {
    name: 'MLS',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (1경기))'
  },
  'soccer_argentina_primera_division': {
    name: '아르헨티나 프리메라',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },
  'soccer_china_superleague': {
    name: '중국 슈퍼리그',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (1경기))'
  },
  'soccer_spain_primera_division': {
    name: '라리가',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },
  'soccer_germany_bundesliga': {
    name: '분데스리가',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },
  'soccer_england_premier_league': {
    name: '프리미어리그',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },
  
  // 농구
  'basketball_nba': {
    name: 'NBA',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-10-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },
  'basketball_kbl': {
    name: 'KBL',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-10-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (1경기))'
  },
  
  // 야구
  'baseball_mlb': {
    name: 'MLB',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (1경기))'
  },
  'baseball_kbo': {
    name: 'KBO',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (1경기))'
  },
  
  // 미식축구
  'americanfootball_nfl': {
    name: 'NFL',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-09-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (1경기))'
  }
};

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