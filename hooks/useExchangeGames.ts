import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../config/apiConfig';
import { getSportKey } from '../config/sportsMapping';
import { adjustOddsSophisticated } from '../utils/oddsCalculator';

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
  const [payoutRateSettings, setPayoutRateSettings] = useState({ returnRate: 0.99, enabled: true });

  // 환수율 설정 로드 함수
  const loadPayoutRateSettings = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/public-settings/exchange-odds-return-rate'));
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPayoutRateSettings(data.data);
          console.log('🎯 환수율 설정 로드됨:', data.data);
        }
      }
    } catch (error) {
      console.error('환수율 설정 로드 오류:', error);
    }
  }, []);

  const fetchGames = useCallback(async () => {
    try {
      console.log('🔄 fetchGames 호출됨, category:', category);
      setLoading(true);
      setError(null);

      // 환수율 설정 먼저 로드
      await loadPayoutRateSettings();

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
        
        // 1. 원본 officialOdds를 깊은 복사하여 수정 준비
        const adjustedOfficialOdds = JSON.parse(JSON.stringify(game.officialOdds || {}));
        
        // ========================= [ 디버깅 로그 추가 시작 ] =========================
        console.log(`[환수율 디버깅] 경기: ${game.home_team} vs ${game.away_team}`);
        console.log('원본 officialOdds:', game.officialOdds);
        // ========================= [  디버깅 로그 추가 끝  ] =========================
        
        // 2. 환수율 설정이 활성화된 경우에만 모든 마켓을 조정
        if (payoutRateSettings.enabled && adjustedOfficialOdds) {
          
          // 2-1. 승/패 (h2h) 마켓 조정
          const h2hOddsData = adjustedOfficialOdds.h2h;
          if (h2hOddsData) {
            const h2hOutcomes = Object.values(h2hOddsData) as { averagePrice?: number }[];
            const h2hPrices = h2hOutcomes.map(o => o.averagePrice).filter(p => p != null) as number[];
            
            if (h2hPrices.length > 1) {
              const adjustedPrices = adjustOddsSophisticated(h2hPrices, payoutRateSettings.returnRate);
              let priceIndex = 0;
              // 순서가 보장된 키를 통해 값을 다시 할당
              Object.keys(h2hOddsData).forEach(key => {
                if (h2hOddsData[key].averagePrice != null) {
                  h2hOddsData[key].averagePrice = adjustedPrices[priceIndex++];
                }
              });
            }
          }
          
          // 2-2. 언더/오버 (totals) 마켓 조정
          const totalsOddsData = adjustedOfficialOdds.totals;
          if (totalsOddsData) {
            console.log('[환수율 디버깅] Totals 원본 데이터:', totalsOddsData);
            // 기준점(point)별로 그룹화
            const points = new Set(Object.keys(totalsOddsData).map(key => key.split(' ')[1]));
            console.log('[환수율 디버깅] Totals 기준점들:', Array.from(points));
            points.forEach(point => {
              const overKey = `Over ${point}`;
              const underKey = `Under ${point}`;
              const overOdds = totalsOddsData[overKey];
              const underOdds = totalsOddsData[underKey];
              
              console.log(`[환수율 디버깅] 기준점 ${point}: Over=${overOdds?.averagePrice}, Under=${underOdds?.averagePrice}`);
              
              // Over와 Under 배당률이 모두 존재할 때만 조정
              if (overOdds?.averagePrice && underOdds?.averagePrice) {
                const prices = [overOdds.averagePrice, underOdds.averagePrice];
                const adjustedPrices = adjustOddsSophisticated(prices, payoutRateSettings.returnRate);
                overOdds.averagePrice = adjustedPrices[0];
                underOdds.averagePrice = adjustedPrices[1];
                console.log(`[환수율 디버깅] 기준점 ${point} 조정 완료: [${prices.join(', ')}] → [${adjustedPrices.join(', ')}]`);
              }
            });
            // ========================= [ 디버깅 로그 추가 시작 ] =========================
            console.log('[환수율 디버깅] Totals 마켓 조정 후:', totalsOddsData);
            // ========================= [  디버깅 로그 추가 끝  ] =========================
          }
          
          // 2-3. 핸디캡 (spreads) 마켓 조정
          const spreadsOddsData = adjustedOfficialOdds.spreads;
          if (spreadsOddsData) {
            console.log('[환수율 디버깅] Spreads 원본 데이터:', spreadsOddsData);
            console.log('[환수율 디버깅] 홈팀:', game.home_team, '어웨이팀:', game.away_team);
            // 핸디캡 기준점(point)의 절댓값으로 그룹화
            const points = new Set(
              Object.keys(spreadsOddsData).map(key => {
                const parts = key.split(' ');
                return Math.abs(parseFloat(parts[parts.length - 1])).toString();
              })
            );
            console.log('[환수율 디버깅] Spreads 기준점들:', Array.from(points));
            
            points.forEach(point => {
              // 같은 기준점을 가진 홈팀과 어웨이팀의 핸디캡 배당률을 찾음
              const homeKey = Object.keys(spreadsOddsData).find(k => k.startsWith(game.home_team) && k.includes(point));
              const awayKey = Object.keys(spreadsOddsData).find(k => k.startsWith(game.away_team) && k.includes(point));
              
              console.log(`[환수율 디버깅] 기준점 ${point}: 홈키="${homeKey}", 어웨이키="${awayKey}"`);
              
              if (homeKey && awayKey && spreadsOddsData[homeKey]?.averagePrice && spreadsOddsData[awayKey]?.averagePrice) {
                const prices = [spreadsOddsData[homeKey].averagePrice, spreadsOddsData[awayKey].averagePrice];
                const adjustedPrices = adjustOddsSophisticated(prices, payoutRateSettings.returnRate);
                spreadsOddsData[homeKey].averagePrice = adjustedPrices[0];
                spreadsOddsData[awayKey].averagePrice = adjustedPrices[1];
                console.log(`[환수율 디버깅] 기준점 ${point} 조정 완료: [${prices.join(', ')}] → [${adjustedPrices.join(', ')}]`);
              }
            });
            // ========================= [ 디버깅 로그 추가 시작 ] =========================
            console.log('[환수율 디버깅] Spreads 마켓 조정 후:', spreadsOddsData);
            // ========================= [  디버깅 로그 추가 끝  ] =========================
          }
        }
        
        // 3. 최종적으로 조정된 배당률 객체를 반환
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
          // 조정된 데이터에서 값을 가져오도록 보장
          homeTeamOdds: adjustedOfficialOdds.h2h?.[game.home_team]?.averagePrice || null,
          awayTeamOdds: adjustedOfficialOdds.h2h?.[game.away_team]?.averagePrice || null,
          drawOdds: adjustedOfficialOdds.h2h?.Draw?.averagePrice || null,
          officialOdds: adjustedOfficialOdds, // 완전히 조정된 객체로 교체
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
  }, [category]); // payoutRateSettings 제거

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // 환수율 설정이 변경될 때만 새로고침
  useEffect(() => {
    if (payoutRateSettings.returnRate !== 0.99 || payoutRateSettings.enabled !== true) {
      console.log('🔄 환수율 설정 변경 감지, 게임 데이터 새로고침');
      fetchGames();
    }
  }, [payoutRateSettings.returnRate, payoutRateSettings.enabled, fetchGames]);

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
    // 환수율 설정 새로고침 함수 추가
    refreshPayoutRateSettings: loadPayoutRateSettings,
    payoutRateSettings,
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