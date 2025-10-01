// utils/handicapUtils.ts

import { GroupedSpreads, HandicapData, OddsData, OddsPair } from '../types/odds';

/**
 * 핸디캡 데이터를 절대값 기준으로 홈/원정 쌍으로 그룹화
 * 반대 부호를 가진 쌍만 매칭 (홈팀 -1.5 ↔ 원정팀 +1.5)
 * @param spreadsOdds 스프레드 배당률 데이터
 * @param homeTeam 홈팀 이름
 * @param awayTeam 원정팀 이름
 * @returns 그룹화된 핸디캡 데이터
 */
export const groupHandicapsByPoint = (
  spreadsOdds: Record<string, OddsData>,
  homeTeam: string,
  awayTeam: string
): GroupedSpreads => {
  const groupedSpreads: GroupedSpreads = {};

  // 임시 저장소: 각 팀의 모든 핸디캡 수집
  const homeHandicaps: { [absPoint: string]: HandicapData[] } = {};
  const awayHandicaps: { [absPoint: string]: HandicapData[] } = {};

  Object.entries(spreadsOdds).forEach(([outcomeName, oddsData]) => {
    // "Team Point" 형식에서 팀명과 핸디캡 분리
    const parts = outcomeName.split(' ');
    if (parts.length < 2) return;

    const point = parts[parts.length - 1];
    const teamName = parts.slice(0, -1).join(' ');
    const handicapValue = parseFloat(point);

    if (isNaN(handicapValue)) return;

    const absPoint = Math.abs(handicapValue).toString();
    const handicapInfo: HandicapData = {
      oddsData,
      handicap: handicapValue  // 원본 값 유지 (-1.5, +1.5)
    };

    if (teamName === homeTeam) {
      if (!homeHandicaps[absPoint]) homeHandicaps[absPoint] = [];
      homeHandicaps[absPoint].push(handicapInfo);
    } else if (teamName === awayTeam) {
      if (!awayHandicaps[absPoint]) awayHandicaps[absPoint] = [];
      awayHandicaps[absPoint].push(handicapInfo);
    }
  });

  // 반대 부호 쌍 매칭
  Object.keys(homeHandicaps).forEach(absPoint => {
    const homeOptions = homeHandicaps[absPoint];
    const awayOptions = awayHandicaps[absPoint] || [];

    if (homeOptions.length === 0 || awayOptions.length === 0) return;

    // 반대 부호를 가진 쌍 찾기
    let bestHomePick: HandicapData | undefined;
    let bestAwayPick: HandicapData | undefined;

    for (const homeOpt of homeOptions) {
      for (const awayOpt of awayOptions) {
        // 부호가 반대인 경우만 매칭
        if ((homeOpt.handicap > 0 && awayOpt.handicap < 0) || 
            (homeOpt.handicap < 0 && awayOpt.handicap > 0)) {
          // 배당률이 낮은 쪽을 우선 선택 (일반적으로 유리한 쪽)
          if (!bestHomePick || homeOpt.oddsData.averagePrice < bestHomePick.oddsData.averagePrice) {
            bestHomePick = homeOpt;
            bestAwayPick = awayOpt;
          }
        }
      }
    }

    if (bestHomePick && bestAwayPick) {
      groupedSpreads[absPoint] = {
        home: bestHomePick,
        away: bestAwayPick
      };
    }
  });

  return groupedSpreads;
};

/**
 * 0.5 단위 핸디캡만 필터링
 * @param groupedSpreads 그룹화된 핸디캡 데이터
 * @returns 필터링된 배열
 */
export const filterHalfPointHandicaps = (
  groupedSpreads: GroupedSpreads
): [string, OddsPair][] => {
  return Object.entries(groupedSpreads)
    .filter(([absPoint]) => {
      const pointValue = parseFloat(absPoint);
      return pointValue % 0.5 === 0;
    });
};

/**
 * 핸디캡 값을 표시용 문자열로 변환
 * @param handicap 핸디캡 값
 * @returns "+1.5" 또는 "-1.5" 형식
 */
export const formatHandicap = (handicap: number): string => {
  return handicap > 0 ? `+${handicap}` : `${handicap}`;
};

