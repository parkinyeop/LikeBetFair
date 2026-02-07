/**
 * 경기 결과 및 스코어 관련 타입 정의
 * 
 * 이 파일은 백엔드 JSONB 응답과 프론트엔드 표시를 위한
 * 모든 스코어 관련 타입을 중앙화하여 관리합니다.
 */

// 🔥 스코어 데이터 형식 (백엔드 JSONB 응답)

/**
 * 객체 형식 스코어: {"home": 10, "away": 9}
 */
export type ScoreObject = { 
  home: number | string; 
  away: number | string; 
};

/**
 * 배열 형식 스코어 아이템: {"name": "팀명", "score": "점수"}
 */
export type ScoreArrayItem = { 
  name: string; 
  score: string | number; 
};

/**
 * 배열 형식 스코어: [{"name":"팀명","score":"점수"}]
 */
export type ScoreArray = ScoreArrayItem[];

/**
 * 백엔드에서 받을 수 있는 모든 스코어 데이터 형식
 * - ScoreObject: {"home": 10, "away": 9}
 * - ScoreArray: [{"name":"팀명","score":"점수"}]
 * - string: "5-2" 또는 JSON 문자열
 * - null/undefined: 스코어 없음
 */
export type ScoreData = 
  | ScoreObject 
  | ScoreArray 
  | string 
  | null 
  | undefined;

// 🔥 파싱된 스코어 (안전하게 정규화된 결과)

/**
 * 파싱 후 정규화된 스코어 객체
 * 모든 스코어 파싱 함수는 이 형식으로 반환합니다.
 */
export interface ParsedScore {
  /** 홈팀 스코어 (문자열, 파싱 실패 시 '-') */
  home: string;
  /** 어웨이팀 스코어 (문자열, 파싱 실패 시 '-') */
  away: string;
  /** 파싱 성공 여부 */
  isValid: boolean;
}

// 🔥 경기 결과 전체 타입

/**
 * 경기 상태
 */
export type GameStatus = 
  | 'scheduled'  // 예정
  | 'live'       // 진행 중
  | 'finished'   // 완료
  | 'cancelled'  // 취소
  | 'postponed'; // 연기

/**
 * 경기 결과 전체 객체
 */
export interface GameResult {
  /** 홈팀 이름 */
  homeTeam: string;
  /** 어웨이팀 이름 */
  awayTeam: string;
  /** 경기 상태 */
  status: GameStatus;
  /** 스코어 데이터 (다양한 형식 가능) */
  score: ScoreData;
  /** 레거시 호환성: 홈팀 스코어 (개별 필드) */
  homeScore?: number;
  /** 레거시 호환성: 어웨이팀 스코어 (개별 필드) */
  awayScore?: number;
  /** 경기 시작 시간 */
  commenceTime?: Date | string;
  /** 스포츠 키 */
  sportKey?: string;
}

// 🔥 스코어 포맷 옵션

/**
 * 스코어 출력 형식
 */
export type ScoreFormat = 
  | 'colon'   // "10 : 9"
  | 'dash'    // "10-9"
  | 'labeled'; // "스코어: 10 - 9"
