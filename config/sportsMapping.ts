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
  seasonEnd?: string;
  nextSeasonStart?: string;
  breakPeriod?: { start: string; end: string };
  description: string;
}

export const SEASON_SCHEDULES: Record<string, SeasonInfo> = {
  // 축구
  'soccer_korea_kleague1': {
    name: 'K리그',
    status: 'offseason',
    currentSeason: '2024',
    seasonEnd: '2024-12-01',
    nextSeasonStart: '2025-02-22',
    description: '2024시즌 종료, 2025시즌은 2월 22일 개막 예정'
  },
  'soccer_japan_j_league': {
    name: 'J리그',
    status: 'break',
    currentSeason: '2025',
    breakPeriod: { start: '2025-06-08', end: '2025-07-12' },
    description: '2025시즌 중반 휴식기, 7월 12일 재개 예정'
  },
  'soccer_italy_serie_a': {
    name: '세리에 A',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-05-25',
    nextSeasonStart: '2025-08-24',
    description: '2024-25시즌 종료, 2025-26시즌은 8월 24일 개막 예정'
  },
  'soccer_brazil_campeonato': {
    name: '브라질 세리에 A',
    status: 'offseason',
    currentSeason: '2024',
    seasonEnd: '2024-12-08',
    nextSeasonStart: '2025-07-12',
    description: '2024시즌 종료, 2025시즌은 7월 12일 개막 예정'
  },
  'soccer_usa_mls': {
    name: 'MLS',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-02-22',
    description: '2025시즌 진행 중 (2월 22일 개막)'
  },
  'soccer_argentina_primera_division': {
    name: '아르헨티나 프리메라',
    status: 'offseason',
    currentSeason: '2024',
    seasonEnd: '2024-12-15',
    nextSeasonStart: '2025-07-12',
    description: '2024시즌 종료, 2025시즌은 7월 12일 개막 예정'
  },
  'soccer_china_superleague': {
    name: '중국 슈퍼리그',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-01',
    description: '2025시즌 진행 중 (3월 1일 개막)'
  },
  'soccer_spain_primera_division': {
    name: '라리가',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-05-25',
    nextSeasonStart: '2025-08-17',
    description: '2024-25시즌 종료, 2025-26시즌은 8월 17일 개막 예정'
  },
  'soccer_germany_bundesliga': {
    name: '분데스리가',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-05-24',
    nextSeasonStart: '2025-08-23',
    description: '2024-25시즌 종료, 2025-26시즌은 8월 23일 개막 예정'
  },

  // 농구
  'basketball_nba': {
    name: 'NBA',
    status: 'offseason',
    currentSeason: '2024-25',
    seasonEnd: '2025-06-19',
    nextSeasonStart: '2025-10-15',
    description: '2024-25시즌 종료, 2025-26시즌은 10월 15일 개막 예정'
  },
  'basketball_kbl': {
    name: 'KBL',
    status: 'active',
    currentSeason: '2024-25',
    nextSeasonStart: '2024-10-05',
    description: '2024-25시즌 진행 중 (10월 5일 개막)'
  },

  // 야구
  'baseball_mlb': {
    name: 'MLB',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-28',
    description: '2025시즌 진행 중 (3월 28일 개막)'
  },
  'baseball_kbo': {
    name: 'KBO',
    status: 'active',
    currentSeason: '2025',
    nextSeasonStart: '2025-03-23',
    description: '2025시즌 진행 중 (3월 23일 개막)'
  },

  // 미식축구
  'americanfootball_nfl': {
    name: 'NFL',
    status: 'active',
    currentSeason: '2024-25',
    nextSeasonStart: '2024-09-05',
    description: '2024-25시즌 진행 중 (9월 5일 개막)'
  }
};

// 시즌 정보 조회 유틸리티 함수
export const getSeasonInfo = (sportKey: string): SeasonInfo | null => {
  return SEASON_SCHEDULES[sportKey] || null;
};

// 상태별 스타일 클래스 반환
export const getSeasonStatusStyle = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-50 border-green-200 hover:bg-green-100";
    case "break":
      return "bg-yellow-50 border-yellow-200 hover:bg-yellow-100";
    case "offseason":
      return "bg-gray-50 border-gray-200 hover:bg-gray-100";
    default:
      return "bg-white border-gray-200 hover:bg-gray-50";
  }
};

// 상태별 배지 반환
export const getSeasonStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return { text: "진행중", className: "bg-green-100 text-green-800" };
    case "break":
      return { text: "휴식기", className: "bg-yellow-100 text-yellow-800" };
    case "offseason":
      return { text: "시즌오프", className: "bg-gray-100 text-gray-600" };
    default:
      return { text: "알수없음", className: "bg-gray-100 text-gray-600" };
  }
}; 