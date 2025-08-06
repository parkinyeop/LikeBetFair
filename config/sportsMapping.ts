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
  "K League": {
    displayName: "K League",
    sportKey: "soccer_korea_kleague1", 
    backendCategory: "KOREA_KLEAGUE1",
    sportTitle: "K-League"
  },
  "J League": {
    displayName: "J League",
    sportKey: "soccer_japan_j_league",
    backendCategory: "JAPAN_J_LEAGUE", 
    sportTitle: "J-League"
  },
  "Serie A": {
    displayName: "Serie A",
    sportKey: "soccer_italy_serie_a",
    backendCategory: "ITALY_SERIE_A",
    sportTitle: "Serie A"
  },
  "Brasileirao": {
    displayName: "Brasileirao", 
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
  "Argentina Primera": {
    displayName: "Argentina Primera",
    sportKey: "soccer_argentina_primera_division",
    backendCategory: "ARGENTINA_PRIMERA_DIVISION",
    sportTitle: "Argentina Primera"
  },
  "Chinese Super League": {
    displayName: "Chinese Super League", 
    sportKey: "soccer_china_superleague",
    backendCategory: "CHINA_SUPERLEAGUE",
    sportTitle: "Chinese Super League"
  },
  "La Liga": {
    displayName: "La Liga",
    sportKey: "soccer_spain_primera_division",
    backendCategory: "LALIGA",
    sportTitle: "La Liga"
  },
  "Bundesliga": {
    displayName: "Bundesliga",
    sportKey: "soccer_germany_bundesliga", 
    backendCategory: "BUNDESLIGA",
    sportTitle: "Bundesliga"
  },
  "Premier League": {
    displayName: "Premier League",
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

// 프론트엔드 카테고리 트리 구조
export const SPORTS_TREE = {
  Soccer: [
    "K League",
    "J League", 
    "Serie A",
    "Brasileirao",
    "MLS",
    "Argentina Primera",
    "Chinese Super League",
    "La Liga",
    "Bundesliga",
    "Premier League"
  ],
  Basketball: ["NBA", "KBL"],
  Baseball: ["MLB", "KBO"], 
  "American Football": ["NFL"]
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
    name: 'K League',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025 Season in progress (Auto-detected: Odds available (1 game))'
  },
    'soccer_japan_j_league': {
    name: 'J League',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025 Season in progress (Auto-detected: Odds available (10 games))'
  },
  'soccer_italy_serie_a': {
    name: 'Serie A',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: 'Season Off (Auto-detected: Season starting soon, early odds available)'
  },
  'soccer_brazil_campeonato': {
    name: 'Brasileirao',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025 Season in progress (Auto-detected: Odds available (24 games))'
  },
  'soccer_usa_mls': {
    name: 'MLS',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025 Season in progress (Auto-detected: Odds available (15 games), 43 games completed in last 30 days)'
  },
  'soccer_argentina_primera_division': {
    name: 'Argentina Primera',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025 Season in progress (Auto-detected: Odds available (20 games))'
  },
    'soccer_china_superleague': {
    name: 'Chinese Super League',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025 Season in progress (Auto-detected: Odds available (4 games))'
  },
  'soccer_spain_primera_division': {
    name: 'La Liga',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-05-25',
    nextSeasonStart: '2025-08-17',
    description: 'Season Off (Auto-detected: No recent games, no scheduled games, no odds available)'
  },
  'soccer_germany_bundesliga': {
    name: 'Bundesliga',
    status: 'offseason',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: 'Season Off (Auto-detected: Season starting soon, early odds available)'
  },
  'soccer_england_premier_league': {
    name: 'Premier League',
    status: 'offseason',
    currentSeason: '2025-26',
    seasonStart: '2025-08-15',
    seasonEnd: '2026-05-25',
    nextSeasonStart: '2026-08-15',
    description: '2025-26 Season starting August 15th'
  },

  // 농구
  'basketball_nba': {
    name: 'NBA',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-06-19',
    nextSeasonStart: '2025-10-15',
    description: 'Season Off (Auto-detected: No recent games, no scheduled games, no odds available)'
  },
  'basketball_kbl': {
    name: 'KBL',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-04-26',
    nextSeasonStart: '2025-10-05',
    description: 'Season Off (Auto-detected: No recent games, no scheduled games, no odds available)'
  },

  // 야구
      'baseball_kbo': {
    name: 'KBO',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025 Season in progress (Auto-detected: Odds available (5 games))'
  },
  'baseball_mlb': {
    name: 'MLB',
    status: 'active',
    currentSeason: '2025',
    seasonStart: '2025-03-27',
    seasonEnd: '2025-10-30',
    description: '2025 Season in progress'
  },

  // 미식축구
  'americanfootball_nfl': {
    name: 'NFL',
    status: 'offseason',
    currentSeason: '2025',
    seasonEnd: '2025-02-09',
    nextSeasonStart: '2025-09-05',
    description: 'Season Off (Auto-detected: Season starting soon (65 days), early odds available)'
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