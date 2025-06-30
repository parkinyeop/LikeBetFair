// 게임 데이터 처리를 위한 최적화된 커스텀 훅
import { useMemo } from 'react';
import { groupGamesByTime, getBettingStatus, getGameTimeStatus } from '../utils/timeUtils';

interface Game {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: any[];
}

export interface ProcessedGame extends Game {
  displayName: string;
  isBettable: boolean;
  status: 'upcoming' | 'live' | 'finished';
  bettingStatus: ReturnType<typeof getBettingStatus>;
  gameTimeStatus: ReturnType<typeof getGameTimeStatus>;
}

/**
 * 게임 데이터를 최적화된 방식으로 처리하는 훅
 */
export function useOptimizedGameData(games: Game[]) {
  
  // 게임 데이터 전처리 (메모화)
  const processedGames = useMemo(() => {
    return games.map(game => {
      const bettingStatus = getBettingStatus(game.commence_time);
      const gameTimeStatus = getGameTimeStatus(game.commence_time);
      
      return {
        ...game,
        displayName: `${game.home_team} vs ${game.away_team}`,
        isBettable: bettingStatus.isBettingAllowed,
        status: gameTimeStatus.status,
        bettingStatus,
        gameTimeStatus
      } as ProcessedGame;
    });
  }, [games]);

  // 시간대별 그룹핑 (메모화)
  const gamesByTime = useMemo(() => {
    return groupGamesByTime(processedGames);
  }, [processedGames]);

  // 통계 정보 (메모화)
  const statistics = useMemo(() => {
    const total = processedGames.length;
    const bettable = processedGames.filter(g => g.isBettable).length;
    const live = processedGames.filter(g => g.status === 'live').length;
    const upcoming = processedGames.filter(g => g.status === 'upcoming').length;
    const finished = processedGames.filter(g => g.status === 'finished').length;

    return {
      total,
      bettable,
      live,
      upcoming,
      finished,
      bettablePercentage: total > 0 ? Math.round((bettable / total) * 100) : 0
    };
  }, [processedGames]);

  // 필터링된 게임들 (메모화)
  const filteredGames = useMemo(() => ({
    all: processedGames,
    bettable: processedGames.filter(g => g.isBettable),
    live: processedGames.filter(g => g.status === 'live'),
    upcoming: processedGames.filter(g => g.status === 'upcoming'),
    finished: processedGames.filter(g => g.status === 'finished')
  }), [processedGames]);

  // 정렬된 게임들 (메모화)
  const sortedGames = useMemo(() => ({
    byTime: [...processedGames].sort((a, b) => 
      new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    ),
    byStatus: [...processedGames].sort((a, b) => {
      const statusOrder = { live: 0, upcoming: 1, finished: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    })
  }), [processedGames]);

  return {
    processedGames,
    gamesByTime,
    statistics,
    filteredGames,
    sortedGames
  };
}

/**
 * 배당률 정보를 최적화된 방식으로 처리하는 훅
 */
export function useOptimizedOddsData(bookmakers: any[]) {
  
  // 최고 배당률 추출 (메모화)
  const bestOdds = useMemo(() => {
    if (!bookmakers || bookmakers.length === 0) return null;

    const h2hMarkets = bookmakers
      .map(bm => bm.markets?.find((m: any) => m.key === 'h2h'))
      .filter(Boolean);

    if (h2hMarkets.length === 0) return null;

    // 모든 outcomes 수집
    const allOutcomes: any[] = [];
    h2hMarkets.forEach(market => {
      market.outcomes?.forEach((outcome: any) => {
        allOutcomes.push(outcome);
      });
    });

    // 팀별 최고 배당률 추출
    const teamOdds: Record<string, number> = {};
    allOutcomes.forEach(outcome => {
      const team = outcome.name;
      if (!teamOdds[team] || outcome.price > teamOdds[team]) {
        teamOdds[team] = outcome.price;
      }
    });

    return teamOdds;
  }, [bookmakers]);

  // 마켓별 배당률 정보 (메모화)
  const marketOdds = useMemo(() => {
    if (!bookmakers || bookmakers.length === 0) return {};

    const markets: Record<string, any> = {};
    
    bookmakers.forEach(bookmaker => {
      bookmaker.markets?.forEach((market: any) => {
        if (!markets[market.key]) {
          markets[market.key] = [];
        }
        markets[market.key].push({
          bookmaker: bookmaker.title,
          outcomes: market.outcomes || []
        });
      });
    });

    return markets;
  }, [bookmakers]);

  return {
    bestOdds,
    marketOdds,
    hasOdds: Boolean(bestOdds && Object.keys(bestOdds).length > 0)
  };
}

/**
 * 성능 최적화를 위한 컴포넌트 렌더링 조건 체크 훅
 */
export function useRenderOptimization(
  data: any, 
  dependencies: any[] = []
) {
  
  // 렌더링 조건 체크 (메모화)
  const shouldRender = useMemo(() => {
    if (!data) return false;
    if (Array.isArray(data) && data.length === 0) return false;
    if (typeof data === 'object' && Object.keys(data).length === 0) return false;
    return true;
  }, [data, ...dependencies]);

  // 로딩 상태 체크 (메모화)
  const isLoading = useMemo(() => {
    return data === null || data === undefined;
  }, [data]);

  return {
    shouldRender,
    isLoading,
    isEmpty: !shouldRender && !isLoading
  };
} 