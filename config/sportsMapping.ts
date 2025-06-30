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
    "중국 슈퍼리그"
  ],
  농구: ["NBA"],
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