// 백엔드 DB 표준화에 맞춘 통합 스포츠 매핑 설정
// 모든 프론트엔드 컴포넌트에서 이 파일을 import하여 사용

export interface SportCategory {
  displayName: string;      // 프론트엔드 표시명 (한글)
  sportKey: string;        // API 요청용 키
  backendCategory: string; // 백엔드 DB 카테고리명 (영어)
  sportTitle: string;      // 백엔드 DB sportTitle (영어)
}

// 백엔드 DB와 완전히 일치하는 매핑
export const SPORT_CATEGORIES: Record<string, SportCategory> = {
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
    backendCategory: "KLEAGUE1",
    sportTitle: "K-League"
  },
  "J리그": {
    displayName: "J리그",
    sportKey: "soccer_japan_j_league",
    backendCategory: "J_LEAGUE", 
    sportTitle: "J-League"
  },
  "세리에 A": {
    displayName: "세리에 A",
    sportKey: "soccer_italy_serie_a",
    backendCategory: "SERIE_A",
    sportTitle: "Serie A"
  },
  "브라질 세리에 A": {
    displayName: "브라질 세리에 A", 
    sportKey: "soccer_brazil_campeonato",
    backendCategory: "BRASILEIRAO",
    sportTitle: "Brasileirao"
  },
  "MLS": {
    displayName: "MLS",
    sportKey: "soccer_usa_mls",
    backendCategory: "MLS", 
    sportTitle: "MLS"
  },
  "아르헨티나 프리메라": {
    displayName: "아르헨티나 프리메라",
    sportKey: "soccer_argentina_primera_division",
    backendCategory: "ARGENTINA_PRIMERA",
    sportTitle: "Argentina Primera"
  },
  "중국 슈퍼리그": {
    displayName: "중국 슈퍼리그", 
    sportKey: "soccer_china_superleague",
    backendCategory: "CSL",
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
  
  // 농구 추가
  "KBL": {
    displayName: "KBL",
    sportKey: "basketball_kbl",
    backendCategory: "KBL",
    sportTitle: "KBL"
  }
};

// 프론트엔드 카테고리 트리 구조
export const SPORTS_TREE = {
  축구: [
    "K리그",
    "J리그", 
    "세리에 A",
    "브라질 세리에 A",
    "MLS",
    "아르헨티나 프리메라",
    "중국 슈퍼리그",
    "라리가",
    "분데스리가"
  ],
  농구: ["NBA", "KBL"],
  야구: ["MLB", "KBO"], 
  미식축구: ["NFL"]
};

// 유틸리티 함수들
export const getSportKey = (displayName: string): string => {
  return SPORT_CATEGORIES[displayName]?.sportKey || "";
};

export const getBackendCategory = (displayName: string): string => {
  return SPORT_CATEGORIES[displayName]?.backendCategory || "";
};

export const getSportTitle = (displayName: string): string => {
  return SPORT_CATEGORIES[displayName]?.sportTitle || "";
};

// sportKey로 displayName 찾기 (역방향 조회)
export const getDisplayNameFromSportKey = (sportKey: string): string => {
  const entry = Object.entries(SPORT_CATEGORIES).find(([_, config]) => config.sportKey === sportKey);
  return entry ? entry[0] : "";
};

// 모든 지원 스포츠 키 목록
export const getAllSportKeys = (): string[] => {
  return Object.values(SPORT_CATEGORIES).map(config => config.sportKey);
};

// 카테고리별 플랫 리스트 (사이드바용)
export const getAllCategories = (): string[] => {
  return Object.entries(SPORTS_TREE).flatMap(([main, subs]) => [
    main,
    ...subs.map((sub) => `${main} > ${sub}`)
  ]);
};

// 시즌 일정 정보 (2025년 기준)
export interface SeasonInfo {
  name: string;
  status: 'active' | 'offseason' | 'break';
  currentSeason: string;
  seasonStart?: string;
  seasonEnd?: string;
  nextSeasonStart?: string;
  breakPeriod?: { start: string; end: string };
  description: string;
}

export const SEASON_SCHEDULES: Record<string, SeasonInfo> = {
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
    status: 'offseason',
    currentSeason: '2025',
    seasonEnd: '2025-07-06',
    nextSeasonStart: 'TBD',
    description: '시즌오프 (자동 감지: 최근 경기 없음, 예정 경기 없음, 배당율 미제공)'
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
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (24경기))'
  },
  'soccer_usa_mls': {
    name: 'MLS',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (15경기), 최근 30일 43경기 완료)'
  },
  'soccer_argentina_primera_division': {
    name: '아르헨티나 프리메라',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (20경기))'
  },
    'soccer_china_superleague': {
    name: '중국 슈퍼리그',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (자동 감지: 배당율 제공 중 (4경기))'
  },
  'soccer_spain_primera_division': {
    name: '라리가',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-05-25',
    nextSeasonStart: '2025-08-17',
    description: '시즌오프 (자동 감지: 최근 경기 없음, 예정 경기 없음, 배당율 미제공)'
  },
  'soccer_germany_bundesliga': {
    name: '분데스리가',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '시즌오프 (자동 감지: 시즌 시작 예정, 배당율 조기 제공 중)'
  },

  // 농구
  'basketball_nba': {
    name: 'NBA',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-06-19',
    nextSeasonStart: '2025-10-15',
    description: '시즌오프 (자동 감지: 최근 경기 없음, 예정 경기 없음, 배당율 미제공)'
  },
  'basketball_kbl': {
    name: 'KBL',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-04-26',
    nextSeasonStart: '2025-10-05',
    description: '시즌오프 (자동 감지: 최근 경기 없음, 예정 경기 없음, 배당율 미제공)'
  },

  // 야구
    'baseball_kbo': {
    name: 'KBO',
    status: 'offseason',
    currentSeason: '2025',
    seasonEnd: '2025-07-11',
    nextSeasonStart: 'TBD',
    description: '시즌오프 (자동 감지: 최근 경기 없음, 예정 경기 없음, 배당율 미제공)'
  },
  'baseball_mlb': {
    name: 'MLB',
    status: 'active',
    currentSeason: '2025',
    seasonStart: '2025-03-27',
    seasonEnd: '2025-10-30',
    description: '2025 시즌 진행 중'
  },

  // 미식축구
  'americanfootball_nfl': {
    name: 'NFL',
    status: 'offseason',
    currentSeason: '2025',
    seasonEnd: '2025-02-09',
    nextSeasonStart: '2025-09-05',
    description: '시즌오프 (자동 감지: 시즌 시작 예정 (65일 후), 배당율 조기 제공 중)'
  }
};

// 유틸리티 함수들
export const getSeasonInfo = (sportKey: string): SeasonInfo | null => {
  return SEASON_SCHEDULES[sportKey] || null;
};

export const getSeasonStatusStyle = (status: string) => {
  switch (status) {
    case 'active': return { color: '#10B981', backgroundColor: '#D1FAE5' };
    case 'offseason': return { color: '#6B7280', backgroundColor: '#F3F4F6' };
    case 'break': return { color: '#F59E0B', backgroundColor: '#FEF3C7' };
    default: return { color: '#6B7280', backgroundColor: '#F3F4F6' };
  }
};

export const getSeasonStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return '진행중';
    case 'offseason': return '시즌오프';
    case 'break': return '휴식기';
    default: return '알 수 없음';
  }
};

// 게임 ID를 실제 경기 정보로 매핑
export const GAME_INFO_MAP: Record<string, {
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  sport: string;
  displayName: string;
}> = {
  // 실제 데이터
  '8818fb84-7b44-4cfa-a406-83f8bf1457d1': {
    homeTeam: 'Unknown Home',
    awayTeam: 'Unknown Away', 
    gameDate: '2025-07-08 16:20:00',
    sport: 'NBA',
    displayName: '미확인 경기 (레거시 데이터)'
  },
  
  // 새로운 현실적인 NBA 데이터
  'nba_lakers_warriors_20250714': {
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Golden State Warriors',
    gameDate: '2025-07-14 12:30:00',
    sport: 'NBA',
    displayName: 'Lakers vs Warriors'
  },
  
  'nba_celtics_heat_20250714': {
    homeTeam: 'Boston Celtics', 
    awayTeam: 'Miami Heat',
    gameDate: '2025-07-14 15:00:00',
    sport: 'NBA',
    displayName: 'Celtics vs Heat'
  },
  
  'nba_bulls_knicks_20250715': {
    homeTeam: 'Chicago Bulls',
    awayTeam: 'New York Knicks', 
    gameDate: '2025-07-15 16:30:00',
    sport: 'NBA',
    displayName: 'Bulls vs Knicks'
  }
};

// 게임 정보 조회 함수
export const getGameInfo = (gameId: string) => {
  return GAME_INFO_MAP[gameId] || {
    homeTeam: 'Unknown',
    awayTeam: 'Unknown',
    gameDate: 'Unknown',
    sport: 'Unknown',
    displayName: `Unknown Game (${gameId.substring(0, 8)}...)`
  };
}; 