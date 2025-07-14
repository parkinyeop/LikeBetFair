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