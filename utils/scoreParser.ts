/**
 * 스코어 파싱 유틸리티
 * 
 * 모든 스코어 관련 로직을 중앙화하여 관리합니다.
 * - 다양한 형식의 스코어 데이터를 안전하게 파싱
 * - Null/Undefined 처리
 * - 팀명 기반 매칭 (3단계 폴백)
 * - 일관된 출력 포맷
 */

import { 
  ScoreData, 
  ParsedScore, 
  ScoreArray, 
  ScoreObject,
  ScoreFormat 
} from '@/types/gameResult';

/**
 * 🎯 중앙화된 스코어 파싱 함수
 * 
 * @param scoreData - 백엔드에서 받은 score 데이터 (JSONB)
 * @param homeTeam - 홈팀 이름 (팀명 매칭용, optional)
 * @param awayTeam - 어웨이팀 이름 (팀명 매칭용, optional)
 * @returns ParsedScore - 정규화된 스코어 객체
 * 
 * @example
 * // 객체 형식
 * parseScore({home: 10, away: 9}) // {home: "10", away: "9", isValid: true}
 * 
 * // 배열 형식
 * parseScore([{name: "팀A", score: "5"}, {name: "팀B", score: "2"}], "팀A", "팀B")
 * 
 * // 문자열 형식
 * parseScore("5-2") // {home: "5", away: "2", isValid: true}
 * 
 * // Null 처리
 * parseScore(null) // {home: "-", away: "-", isValid: false}
 */
export function parseScore(
  scoreData: ScoreData,
  homeTeam?: string,
  awayTeam?: string
): ParsedScore {
  // ✅ 1단계: Null/Undefined 체크
  if (!scoreData) {
    return { home: '-', away: '-', isValid: false };
  }

  // ✅ 2단계: 문자열 형식 처리
  if (typeof scoreData === 'string') {
    return parseStringScore(scoreData, homeTeam, awayTeam);
  }

  // ✅ 3단계: 객체 형식 처리 {"home": 10, "away": 9}
  if (isScoreObject(scoreData)) {
    return parseObjectScore(scoreData);
  }

  // ✅ 4단계: 배열 형식 처리 [{"name":"팀명","score":"점수"}]
  if (Array.isArray(scoreData) && scoreData.length >= 2) {
    return parseScoreArray(scoreData, homeTeam, awayTeam);
  }

  // ✅ 폴백: 파싱 실패
  return { home: '-', away: '-', isValid: false };
}

/**
 * 🔒 문자열 형식 스코어 파싱
 * - "5-2" 형식
 * - JSON 문자열 형식
 */
function parseStringScore(
  scoreString: string,
  homeTeam?: string,
  awayTeam?: string
): ParsedScore {
  // "5-2" 형식 체크
  if (/^\d+-\d+$/.test(scoreString)) {
    const [home, away] = scoreString.split('-');
    return { home, away, isValid: true };
  }

  // JSON 문자열 파싱 시도
  try {
    const parsed = JSON.parse(scoreString);
    return parseScore(parsed, homeTeam, awayTeam); // 재귀 호출
  } catch {
    // 파싱 실패 시 원본 문자열 그대로 반환 (일부 엣지 케이스 대응)
    return { home: scoreString, away: '', isValid: false };
  }
}

/**
 * 🔒 객체 형식 스코어 파싱
 * {"home": 10, "away": 9}
 */
function parseObjectScore(scoreObj: ScoreObject): ParsedScore {
  const home = scoreObj.home !== undefined && scoreObj.home !== null 
    ? String(scoreObj.home) 
    : '-';
  const away = scoreObj.away !== undefined && scoreObj.away !== null 
    ? String(scoreObj.away) 
    : '-';
  
  return {
    home,
    away,
    isValid: scoreObj.home !== undefined && scoreObj.away !== undefined
  };
}

/**
 * 🔒 배열 형식 스코어 파싱 (팀명 매칭 로직 개선)
 * [{"name":"팀명","score":"점수"}]
 * 
 * 3단계 매칭 전략:
 * 1. 정확한 팀명 매칭
 * 2. 부분 매칭 (긴 매칭 우선)
 * 3. 순서 기반 폴백 (Home=첫번째, Away=두번째)
 */
function parseScoreArray(
  scoreArray: ScoreArray,
  homeTeam?: string,
  awayTeam?: string
): ParsedScore {
  let homeScore: string | undefined;
  let awayScore: string | undefined;

  // ✅ 1차: 정확한 팀명 매칭
  if (homeTeam && awayTeam) {
    homeScore = scoreArray.find(s => s.name === homeTeam)?.score?.toString();
    awayScore = scoreArray.find(s => s.name === awayTeam)?.score?.toString();
  }

  // ✅ 2차: 부분 매칭 (긴 매칭 우선 - "FC 서울" vs "서울 시티 FC" 문제 해결)
  if ((!homeScore || !awayScore) && homeTeam && awayTeam) {
    const homeLower = homeTeam.toLowerCase();
    const awayLower = awayTeam.toLowerCase();

    // 🔥 개선: 매칭 점수 계산 (긴 매칭 우선)
    const homeMatches = scoreArray
      .map(s => ({
        score: s.score,
        matchLength: getMatchLength(s.name.toLowerCase(), homeLower)
      }))
      .filter(m => m.matchLength > 0)
      .sort((a, b) => b.matchLength - a.matchLength);

    const awayMatches = scoreArray
      .map(s => ({
        score: s.score,
        matchLength: getMatchLength(s.name.toLowerCase(), awayLower)
      }))
      .filter(m => m.matchLength > 0)
      .sort((a, b) => b.matchLength - a.matchLength);

    if (homeMatches.length > 0 && !homeScore) {
      homeScore = homeMatches[0].score?.toString();
    }
    if (awayMatches.length > 0 && !awayScore) {
      awayScore = awayMatches[0].score?.toString();
    }
  }

  // ✅ 3차: 순서 기반 폴백 (가장 안전)
  if (!homeScore || !awayScore) {
    homeScore = scoreArray[0]?.score?.toString();
    awayScore = scoreArray[1]?.score?.toString();
  }

  return {
    home: homeScore ?? '-',
    away: awayScore ?? '-',
    isValid: !!homeScore && !!awayScore
  };
}

/**
 * 🔥 팀명 매칭 길이 계산
 * 
 * "FC 서울" vs "서울 시티 FC" 같은 경우 더 긴 매칭을 우선
 * 
 * @param scoreName - 스코어 데이터의 팀명
 * @param teamName - 비교할 팀명
 * @returns 매칭 길이 (0 = 매칭 없음)
 */
function getMatchLength(scoreName: string, teamName: string): number {
  if (scoreName === teamName) return teamName.length; // 완전 일치
  if (scoreName.includes(teamName)) return teamName.length;
  if (teamName.includes(scoreName)) return scoreName.length;
  return 0; // 매칭 없음
}

/**
 * 🔒 타입 가드: ScoreObject 여부 확인
 */
function isScoreObject(data: any): data is ScoreObject {
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    ('home' in data || 'away' in data)
  );
}

/**
 * 🎨 스코어 포맷팅 (출력 형식 통일)
 * 
 * @param parsed - 파싱된 스코어 객체
 * @param format - 출력 형식 ('colon' | 'dash' | 'labeled')
 * @returns 포맷팅된 스코어 문자열
 * 
 * @example
 * formatScore({home: "10", away: "9", isValid: true}, 'colon') // "10 : 9"
 * formatScore({home: "10", away: "9", isValid: true}, 'dash') // "10-9"
 * formatScore({home: "10", away: "9", isValid: true}, 'labeled') // "스코어: 10 - 9"
 */
export function formatScore(
  parsed: ParsedScore,
  format: ScoreFormat = 'colon'
): string {
  if (!parsed.isValid) return 'N/A';

  switch (format) {
    case 'colon':
      return `${parsed.home} : ${parsed.away}`; // 10 : 9
    case 'dash':
      return `${parsed.home}-${parsed.away}`; // 10-9
    case 'labeled':
      return `스코어: ${parsed.home} - ${parsed.away}`; // 스코어: 10 - 9
    default:
      return `${parsed.home} : ${parsed.away}`;
  }
}

/**
 * 🧮 총 스코어 계산 (Over/Under 베팅용)
 * 
 * @param scoreData - 스코어 데이터
 * @returns 홈 + 어웨이 총점
 * 
 * @example
 * calculateTotalScore({home: 10, away: 9}) // 19
 * calculateTotalScore("5-2") // 7
 * calculateTotalScore(null) // 0
 */
export function calculateTotalScore(scoreData: ScoreData): number {
  const parsed = parseScore(scoreData);
  if (!parsed.isValid) return 0;

  const homeNum = parseFloat(parsed.home) || 0;
  const awayNum = parseFloat(parsed.away) || 0;
  return homeNum + awayNum;
}

/**
 * 🎯 스코어 표시용 헬퍼 (React 컴포넌트에서 바로 사용)
 * 
 * @param scoreData - 스코어 데이터
 * @param homeTeam - 홈팀 이름
 * @param awayTeam - 어웨이팀 이름
 * @param format - 출력 형식
 * @returns 포맷팅된 스코어 문자열
 * 
 * @example
 * getScoreDisplay(gameResult.score, "팀A", "팀B") // "10 : 9"
 * getScoreDisplay(gameResult.score, "팀A", "팀B", 'dash') // "10-9"
 */
export function getScoreDisplay(
  scoreData: ScoreData,
  homeTeam?: string,
  awayTeam?: string,
  format: ScoreFormat = 'colon'
): string {
  const parsed = parseScore(scoreData, homeTeam, awayTeam);
  return formatScore(parsed, format);
}
