export function isSameGame(exchangeGame: any, sportsbookGame: any, minuteTolerance = 2): boolean {
  // 팀명 표준화
  const normalize = (name: string) => name.trim().toLowerCase();
  const homeMatch = normalize(exchangeGame.homeTeam) === normalize(sportsbookGame.home_team);
  const awayMatch = normalize(exchangeGame.awayTeam) === normalize(sportsbookGame.away_team);

  // 시간 비교 (UTC 기준, ±minuteTolerance 분 허용)
  const exTime = new Date(exchangeGame.commenceTime).getTime();
  const sbTime = new Date(sportsbookGame.commence_time).getTime();
  const timeDiff = Math.abs(exTime - sbTime) / 1000 / 60; // 분 단위

  // 리그(스포츠키) 비교 (있을 경우)
  let leagueMatch = true;
  if (exchangeGame.sportKey && sportsbookGame.sport_key) {
    leagueMatch = normalize(exchangeGame.sportKey) === normalize(sportsbookGame.sport_key);
  }

  return homeMatch && awayMatch && timeDiff <= minuteTolerance && leagueMatch;
}

// 팀명 정규화: 영문/숫자/한글만 남기고, 공백 및 특수문자 제거, 소문자 변환
export function normalizeTeamNameForComparison(team: string): string {
  if (!team) return '';
  return team
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/\s+/g, '');
} 