import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../config/apiConfig';
import { getSportKey } from '../config/sportsMapping';

export interface ExchangeGame {
  id: string;
  eventId?: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  sportKey: string;
  league: string;
  category: string;
  availableMarkets: Market[];
  // 배당률 필드 추가
  homeTeamOdds?: number;
  awayTeamOdds?: number;
  drawOdds?: number;
  officialOdds?: any;
}

interface Market {
  type: string;
  name: string;
  description: string;
  selections?: any[];
  lines?: number[];
}

export function useExchangeGames(category?: string) {
  const [games, setGames] = useState<ExchangeGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      console.log('🔄 fetchGames 호출됨, category:', category);
      setLoading(true);
      setError(null);

      // 카테고리에서 스포츠 키 추출
      let sportKey = '';
      if (category) {
        if (category.includes(" > ")) {
          const subCategory = category.split(" > ")[1];
          sportKey = getSportKey(subCategory) || '';
        } else {
          sportKey = getSportKey(category) || '';
        }
      }

      if (!sportKey) {
        console.log('❌ 스포츠 키를 찾을 수 없음:', category);
        setGames([]);
        return;
      }

      // /api/odds/{sport} API 사용 (익스체인지 홈과 동일한 데이터 소스)
      const url = buildApiUrl(`/api/odds/${sportKey}`);
      console.log('⏱️ API 요청 시작:', url);
      const startTime = Date.now();
      const response = await fetch(url);
      const endTime = Date.now();
      console.log('⏱️ API 응답 완료:', endTime - startTime, 'ms');
      
      if (!response.ok) {
        throw new Error(`게임 목록 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎮 Exchange 게임 목록 조회 성공:', data.length, '개');
      console.log('🔍 첫 번째 게임 데이터 구조:', data[0]);
      
      // 데이터 변환 시작 시간
      const transformStartTime = Date.now();
      
      // ExchangeGame 형태로 변환
      const exchangeGames: ExchangeGame[] = data.map((game: any) => {
        // sportKey를 직접 설정 (API 응답에서 가져오지 않고 현재 요청한 sportKey 사용)
        const gameSportKey = sportKey;
        console.log('🔍 게임 변환:', {
          originalSportKey: game.sport_key,
          usingSportKey: gameSportKey,
          homeTeam: game.home_team,
          awayTeam: game.away_team
        });
        
        return {
          id: game.id || '',
          eventId: game.id || '',
          homeTeam: game.home_team || '',
          awayTeam: game.away_team || '',
          commenceTime: game.commence_time || '',
          status: 'upcoming',
          sportKey: gameSportKey,
          league: gameSportKey ? gameSportKey.split('_').pop() || '' : '',
          category: category || '',
          availableMarkets: game.bookmakers?.[0]?.markets || [],
          // 실제 배당률 추출 (officialOdds 사용)
          homeTeamOdds: game.officialOdds?.h2h?.[game.home_team]?.averagePrice || null,
          awayTeamOdds: game.officialOdds?.h2h?.[game.away_team]?.averagePrice || null,
          drawOdds: game.officialOdds?.h2h?.Draw?.averagePrice || null,
          officialOdds: game.officialOdds || null
        };
      });
      
      const transformEndTime = Date.now();
      console.log('⏱️ 데이터 변환 완료:', transformEndTime - transformStartTime, 'ms');
      
      setGames(exchangeGames);
    } catch (err) {
      console.error('❌ Exchange 게임 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '게임 목록 조회 중 오류 발생');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // 카테고리별 게임 필터링
  const getGamesByCategory = useCallback((filterCategory: string) => {
    if (!filterCategory) return games;
    
    return games.filter(game => {
      // 카테고리가 "축구 > K리그" 형태인 경우 처리
      if (filterCategory.includes(' > ')) {
        const [mainCat, subCat] = filterCategory.split(' > ');
        return game.category.toLowerCase().includes(mainCat.toLowerCase()) ||
               game.league.toLowerCase().includes(subCat.toLowerCase());
      }
      
      // 단일 카테고리인 경우
      return game.category.toLowerCase().includes(filterCategory.toLowerCase()) ||
             game.league.toLowerCase().includes(filterCategory.toLowerCase()) ||
             game.sportKey.toLowerCase().includes(filterCategory.toLowerCase());
    });
  }, [games]);

  // 스포츠별 게임 필터링
  const getGamesBySport = useCallback((sport: string) => {
    return games.filter(game => game.sportKey === sport);
  }, [games]);

  return {
    games,
    loading,
    error,
    refetch: fetchGames,
    getGamesByCategory,
    getGamesBySport,
    // 통계 정보
    stats: {
      total: games.length,
      byCategory: games.reduce((acc, game) => {
        acc[game.category] = (acc[game.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  };
} 