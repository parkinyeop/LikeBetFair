import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../config/apiConfig';

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
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (category) {
        params.append('category', category);
      }

      const url = buildApiUrl('/api/exchange/games', Object.fromEntries(params as any));
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`게임 목록 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎮 Exchange 게임 목록 조회 성공:', data.games.length, '개');
      
      setGames(data.games);
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