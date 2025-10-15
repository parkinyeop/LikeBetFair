import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { SPORTS_TREE, getSportKey, getSeasonInfo, getSeasonStatusBadge, getSeasonStatusStyle, SPORT_CATEGORIES, getDisplayNameFromSportKey } from '../config/sportsMapping';
import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
import { normalizeTeamNameForComparison } from '../utils/matchSportsbookGame';
import { convertUtcToLocal, getCurrentLocalTime } from '../utils/timeUtils';
import { useExchangeContext } from '../contexts/ExchangeContext';
import { useExchange } from '../hooks/useExchange';
import { applyExchangeReturnRate as applyExchangeReturnRateUtil } from '../utils/oddsCalculator';

export default function Exchange() {
  const router = useRouter();
  const { 
    selectedBet, 
    setSelectedBet,
    // 🆕 멀티배팅 관련 상태와 함수들
    multiBetSelections,
    addMultiBetSelection,
    removeMultiBetSelection,
    clearMultiBet,
    isMultiBetSelected
  } = useExchangeContext();
  const [todayGames, setTodayGames] = useState<Record<string, any[]>>({});
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayFlatGames, setTodayFlatGames] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'today' | 'league'>('today');
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('Soccer');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentSportKey, setCurrentSportKey] = useState<string>('');
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🆕 마켓 체크박스 상태 추가
  const [todayGameMarkets, setTodayGameMarkets] = useState<{[gameId: string]: Set<string>}>({});
  const [leagueGameMarkets, setLeagueGameMarkets] = useState<{[gameId: string]: Set<string>}>({});
  
  // 🆕 Exchange 주문 데이터 상태 추가
  const [exchangeOrders, setExchangeOrders] = useState<any[]>([]);
  const [oddsReturnRateSettings, setOddsReturnRateSettings] = useState({ returnRate: 0.95, enabled: true });

  const { fetchAllOpenOrders } = useExchange();
  
  // 🆕 Exchange 주문 데이터 로드 함수
  const loadExchangeOrders = async () => {
    try {
      const orders = await fetchAllOpenOrders();
      setExchangeOrders(orders);
      console.log('🔍 Exchange 주문 데이터 로드:', orders.length, '개');
    } catch (error) {
      console.error('❌ Exchange 주문 데이터 로드 실패:', error);
    }
  };
  
  // 🆕 관리자 설정에서 환수율 설정 가져오기
  const loadOddsReturnRateSettings = async () => {
    try {
      console.log('🔍 Exchange 환수율 설정 로드 시도...');
      const response = await fetch(buildApiUrl('/api/admin/public-settings/exchange-odds-return-rate'), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('🔍 Exchange 환수율 설정 응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Exchange 환수율 설정 응답 데이터:', data);
        if (data.success) {
          setOddsReturnRateSettings(data.data);
          console.log('✅ Exchange 환수율 설정 로드 성공:', data.data);
        } else {
          console.log('❌ Exchange 환수율 설정 응답 실패:', data.error);
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Exchange 환수율 설정 HTTP 오류:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Exchange 환수율 설정 로드 실패:', error);
    }
  };
  
  // 🆕 Exchange 배당율에 환수율 적용 (단순 나누기 방식으로 통일)
  const applyExchangeReturnRate = (originalOdds: number, allOdds: number[] = [], returnRate?: number) => {
    if (!originalOdds || !oddsReturnRateSettings.enabled) return originalOdds;

    // 환수율 파라미터가 없으면 설정에서 가져오기
    const effectiveReturnRate = returnRate || oddsReturnRateSettings.returnRate;
    
    // utils 함수 사용
    return applyExchangeReturnRateUtil(originalOdds, allOdds, effectiveReturnRate);
  };
  
  // 🎯 버튼이 선택되었는지 확인하는 함수 - Exchange 기존 로직 유지
  const isButtonSelected = (gameId: string, buttonKey: string) => {
    // buttonKey에서 팀명과 마켓 추출 (예: "승패_New England Revolution" -> market: "승패", team: "New England Revolution")
    const [market, team] = buttonKey.split('_', 2);
    
    // 🆕 1. selectedBet 확인 (단일 베팅 선택)
    if (selectedBet && selectedBet.gameId === gameId && 
        selectedBet.market === market && selectedBet.team === team) {
      console.log('🎯 isButtonSelected: selectedBet으로 선택됨');
      return true;
    }
    
    // 🆕 2. 멀티배팅 선택 상태 확인
    const isMultiBet = isMultiBetSelected(gameId, market, team);
    if (isMultiBet) {
      console.log('🎯 isButtonSelected: 멀티배팅으로 선택됨');
      return true;
    }
    
    // console.log('🎯 isButtonSelected: 선택되지 않음', { 
    //   gameId, buttonKey, market, team, 
    //   selectedBet: selectedBet ? '있음' : '없음',
    //   isMultiBet
    // });
    return false;
  };

  // 🎯 버튼 클릭 핸들러 - 토글 기능 개선
  const handleButtonClick = (game: any, team: string, price: number, market: string = '승패') => {
    console.log('🎯 버튼 클릭됨:', { game, team, price, market });
    
    console.log('🎯 현재 selectedBet 상태:', selectedBet);
    console.log('🎯 game.id:', game.id, '타입:', typeof game.id);
    
    // 🆕 1. selectedBet에서 같은 베팅인지 확인
    const isSelectedBet = selectedBet && selectedBet.gameId === game.id && selectedBet.team === team && selectedBet.market === market;
    
    // 🆕 2. 멀티배팅에서 같은 베팅인지 확인
    const isMultiBetSelected = multiBetSelections.some(
      (mb) => mb.gameId === game.id && mb.team === team && mb.market === market
    );
    
    // 🆕 3. 토글 로직: 이미 선택된 베팅이면 해제, 아니면 선택
    if (isSelectedBet || isMultiBetSelected) {
      console.log('🎯 동일한 베팅 재클릭 - 선택 해제');
      
      // selectedBet에서 제거
      if (isSelectedBet) {
        setSelectedBet(null);
      }
      
      // 멀티배팅에서도 제거
      if (isMultiBetSelected) {
        removeMultiBetSelection(game.id, market, team);
      }
      
      console.log('🎯 베팅 선택 해제 완료');
    } else {
      console.log('🎯 새로운 베팅 선택');
      
      // 🆕 익스체인지에서 승패+핸디캡 조합 제한 (스포츠북과 동일)
      const isWinLoss = market === '승패';
      const isHandicap = market === '핸디캡';
      
      // 승패 선택 시: 같은 경기의 핸디캡 제거
      if (isWinLoss) {
        const handicapSelections = multiBetSelections.filter(mb => 
          mb.gameId === game.id && mb.market === '핸디캡'
        );
        handicapSelections.forEach(mb => {
          console.log('🎯 승패 선택으로 인한 핸디캡 제거:', mb.team);
          removeMultiBetSelection(mb.gameId, mb.market, mb.team);
        });
        
        // selectedBet에서도 핸디캡 제거
        if (selectedBet && selectedBet.gameId === game.id && selectedBet.market === '핸디캡') {
          console.log('🎯 승패 선택으로 인한 selectedBet 핸디캡 제거:', selectedBet.team);
          setSelectedBet(null);
        }
      }
      
      // 핸디캡 선택 시: 같은 경기의 승패 제거
      if (isHandicap) {
        const winLossSelections = multiBetSelections.filter(mb => 
          mb.gameId === game.id && mb.market === '승패'
        );
        winLossSelections.forEach(mb => {
          console.log('🎯 핸디캡 선택으로 인한 승패 제거:', mb.team);
          removeMultiBetSelection(mb.gameId, mb.market, mb.team);
        });
        
        // selectedBet에서도 승패 제거
        if (selectedBet && selectedBet.gameId === game.id && selectedBet.market === '승패') {
          console.log('🎯 핸디캡 선택으로 인한 selectedBet 승패 제거:', selectedBet.team);
          setSelectedBet(null);
        }
      }
      
      // 🆕 같은 마켓의 기존 선택 제거 (승패+총점, 총점+핸디캡은 허용)
      if (selectedBet && selectedBet.gameId === game.id && selectedBet.market === market) {
        console.log('🎯 같은 경기+같은 마켓의 기존 선택 제거:', selectedBet.team);
        setSelectedBet(null);
      }
      
      // 멀티배팅에서 같은 경기+같은 마켓 선택만 제거
      const sameGameMarketSelections = multiBetSelections.filter(mb => 
        mb.gameId === game.id && mb.market === market
      );
      sameGameMarketSelections.forEach(mb => {
        console.log('🎯 멀티배팅에서 같은 경기+같은 마켓 선택 제거:', mb.team);
        removeMultiBetSelection(mb.gameId, mb.market, mb.team);
      });
      
      // 새로운 베팅 선택
      const newSelectedBet = {
        team,
        price,
        type: 'back' as const,
        gameId: game.id,
        market: market,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString() // UTC로 변환
      };
      console.log('🎯 새 베팅 선택할 객체:', newSelectedBet);
      setSelectedBet(newSelectedBet);
      
      // 🆕 멀티배팅에도 자동 추가
      const multiBetSelection = {
        orderId: Date.now(), // 임시 ID
        gameId: game.id,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        market: market,
        selection: team,
        team: team, // 🆕 team 필드 추가
        side: 'back' as const,
        odds: price,
        price: price,
        amount: 0, // 사용자가 입력할 금액
        commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString(), // UTC로 변환
        sportKey: game.sport_key || 'soccer',
        desc: `${game.home_team} vs ${game.away_team}`, // 🆕 desc 필드 추가
        option: market === 'Over/Under' ? team : undefined, // 🆕 option 필드 추가
        point: market === 'Over/Under' ? (() => {
          // Over/Under의 경우 point 추출
          const match = team.match(/(\d+\.?\d*)/);
          return match ? match[1] : undefined;
        })() : undefined // 🆕 point 필드 추가
      };
      addMultiBetSelection(multiBetSelection);
      console.log('🎯 새 베팅 선택 완료 및 멀티배팅에 추가:', { team, price, market });
    }
  };

  // 🆕 초기 마켓 설정 함수 - 게임이 로드될 때마다 기본값 설정
  const initializeGameMarkets = (gameId: string, isToday: boolean = true) => {
    if (isToday) {
      setTodayGameMarkets(prev => {
        if (!prev[gameId]) {
          return { ...prev, [gameId]: new Set(['승패']) };
        }
        return prev;
      });
    } else {
      setLeagueGameMarkets(prev => {
        if (!prev[gameId]) {
          return { ...prev, [gameId]: new Set(['승패']) };
        }
        return prev;
      });
    }
  };





  // Today Betting 데이터 가져오기
  const fetchTodayGames = async () => {
    try {
      setTodayLoading(true);
      const activeLeagues = Object.entries(SPORT_CATEGORIES);
      const gamesData: Record<string, any[]> = {};
      
      for (const [displayName, config] of activeLeagues) {
        let apiUrl = '';
        try {
          apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${config.sportKey}`);
          console.log(`🔍 ${displayName} 데이터 요청:`, apiUrl);
          const response = await fetch(apiUrl);
          console.log(`📊 ${displayName} 응답 상태:`, response.status, response.statusText);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${displayName} 데이터 로드 성공:`, data.length, '개 경기');
            
            const now = getCurrentLocalTime();
            const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
            const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const bettingDeadlineMinutes = 10;
            
            const filteredGames = data.filter((game: any) => {
              const localGameTime = convertUtcToLocal(game.commence_time);
              return localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
            });
            
            const uniqueGamesMap = new Map();
            filteredGames.forEach((game: any) => {
              const key = `${game.home_team}|${game.away_team}|${game.commence_time}`;
              if (!uniqueGamesMap.has(key)) {
                uniqueGamesMap.set(key, game);
              } else {
                const prev = uniqueGamesMap.get(key);
                const prevBookmakersCount = Array.isArray(prev.bookmakers) ? prev.bookmakers.length : 0;
                const currBookmakersCount = Array.isArray(game.bookmakers) ? game.bookmakers.length : 0;
                if (currBookmakersCount > prevBookmakersCount) {
                  uniqueGamesMap.set(key, game);
                }
              }
            });
            const uniqueGames = Array.from(uniqueGamesMap.values());
            
            const categorizedGames = uniqueGames.map((game: any) => {
              const localGameTime = convertUtcToLocal(game.commence_time);
              const bettingDeadline = new Date(localGameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
              const isBettable = now < bettingDeadline;
              
              let officialOdds = game.officialOdds;
              if (!officialOdds && game.bookmakers && Array.isArray(game.bookmakers)) {
                officialOdds = {};
                
                // 🆕 모든 마켓 데이터 처리 (h2h, totals, spreads 등)
                const marketData: Record<string, Record<string, { count: number; totalPrice: number }>> = {};
                
                game.bookmakers.forEach((bookmaker: any) => {
                  if (bookmaker.markets && Array.isArray(bookmaker.markets)) {
                    bookmaker.markets.forEach((market: any) => {
                      if (!marketData[market.key]) {
                        marketData[market.key] = {};
                      }
                      
                      if (market.outcomes && Array.isArray(market.outcomes)) {
                        market.outcomes.forEach((outcome: any) => {
                          const outcomeKey = outcome.name || outcome.point || outcome.value;
                          if (outcomeKey !== undefined) {
                            if (!marketData[market.key][outcomeKey]) {
                              marketData[market.key][outcomeKey] = { count: 0, totalPrice: 0 };
                            }
                            marketData[market.key][outcomeKey].count++;
                            marketData[market.key][outcomeKey].totalPrice += outcome.price;
                          }
                        });
                      }
                    });
                  }
                });
                
                // 🆕 각 마켓별로 평균 배당율 계산
                Object.entries(marketData).forEach(([marketKey, outcomes]) => {
                  if (Object.keys(outcomes).length > 0) {
                    officialOdds[marketKey] = {};
                    Object.entries(outcomes).forEach(([outcomeKey, data]) => {
                      officialOdds[marketKey][outcomeKey] = {
                        count: data.count,
                        averagePrice: data.totalPrice / data.count
                      };
                    });
                  }
                });
              }
              
              return {
                ...game,
                sport_key: game.sport || config.sportKey,
                sportTitle: displayName,
                sport_title: displayName,
                officialOdds: officialOdds || game.officialOdds,
                isBettable,
                gameTime: localGameTime,
                bettingDeadline
              };
            });
            
            const sortedGames = categorizedGames.sort((a, b) => {
              const currentTime = now.getTime();
              const aTime = a.gameTime.getTime();
              const bTime = b.gameTime.getTime();
              
              const aIsFuture = aTime >= currentTime;
              const bIsFuture = bTime >= currentTime;
              
              if (aIsFuture && !bIsFuture) return -1;
              if (!aIsFuture && bIsFuture) return 1;
              
              if (aIsFuture && bIsFuture) {
                return aTime - bTime;
              }
              
              return bTime - aTime;
            });
            
            if (sortedGames.length > 0) {
              gamesData[displayName] = sortedGames;
            }
          }
        } catch (err) {
          console.error(`❌ ${displayName} 데이터 로드 실패:`, err);
          console.error(`🔍 ${displayName} API URL:`, apiUrl);
        }
      }
      
      setTodayGames(gamesData);
      
             const allGames = Object.values(gamesData).flat();
       const now = getCurrentLocalTime();
       const sortedAllGames = allGames.sort((a, b) => {
         const currentTime = now.getTime();
         const aTime = a.gameTime.getTime();
         const bTime = b.gameTime.getTime();
        
        const aIsFuture = aTime >= currentTime;
        const bIsFuture = bTime >= currentTime;
        
        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        
        if (aIsFuture && bIsFuture) {
          return aTime - bTime;
        }
        
        return bTime - aTime;
      });
      
      setTodayFlatGames(sortedAllGames);

      // 🆕 모든 게임에 대해 기본 마켓 설정
      sortedAllGames.forEach(game => {
        if (!todayGameMarkets[game.id]) {
          setTodayGameMarkets(prev => ({
            ...prev,
            [game.id]: new Set(['승패'])
          }));
        }
      });
      
      const bettableGames = sortedAllGames.filter(game => game.isBettable);
      const totalGames = sortedAllGames.length;
      
      console.log("=== Today Betting 전체 통계 ===");
      console.log("전체 경기 개수:", totalGames);
      console.log("베팅 가능한 경기 개수:", bettableGames.length);
      console.log("베팅 불가능한 경기 개수:", totalGames - bettableGames.length);
      
      const leagueDataCount: Record<string, number> = {};
      Object.entries(gamesData).forEach(([league, games]) => {
        leagueDataCount[league] = games.length;
      });
      console.log("리그별 배당율 데이터 개수:", leagueDataCount);
      
    } catch (error) {
      console.error('❌ Today Betting 데이터 로드 실패:', error);
    } finally {
      setTodayLoading(false);
    }
  };

  // League View 데이터 가져오기
  const fetchLeagueGames = async (category: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const sportKey = getSportKey(category);
      if (!sportKey) {
        setError('Invalid sport category');
        return;
      }
      
      setCurrentSportKey(sportKey);
      
      const apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${sportKey}`);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${category} data`);
      }
      
      const data = await response.json();
      
      const now = getCurrentLocalTime();
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const bettingDeadlineMinutes = 10;
      
      const filteredGames = data.filter((game: any) => {
        const localGameTime = convertUtcToLocal(game.commence_time);
        const isValid = localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
        return isValid;
      });
      
      const processedGames = filteredGames.map((game: any) => {
        const localGameTime = convertUtcToLocal(game.commence_time);
        const bettingDeadline = new Date(localGameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
        const isBettable = now < bettingDeadline;
        
        let officialOdds = game.officialOdds;
        if (!officialOdds && game.bookmakers && Array.isArray(game.bookmakers)) {
          officialOdds = {};
          
          // 🆕 모든 마켓 데이터 처리 (h2h, totals, spreads 등)
          const marketData: Record<string, Record<string, { count: number; totalPrice: number }>> = {};
          
          game.bookmakers.forEach((bookmaker: any) => {
            if (bookmaker.markets && Array.isArray(bookmaker.markets)) {
              bookmaker.markets.forEach((market: any) => {
                if (!marketData[market.key]) {
                  marketData[market.key] = {};
                }
                
                if (market.outcomes && Array.isArray(market.outcomes)) {
                  market.outcomes.forEach((outcome: any) => {
                    const outcomeKey = outcome.name || outcome.point || outcome.value;
                    if (outcomeKey !== undefined) {
                      if (!marketData[market.key][outcomeKey]) {
                        marketData[market.key][outcomeKey] = { count: 0, totalPrice: 0 };
                      }
                      marketData[market.key][outcomeKey].count++;
                      marketData[market.key][outcomeKey].totalPrice += outcome.price;
                    }
                  });
                }
              });
            }
          });
          
          // 🆕 각 마켓별로 평균 배당율 계산
          Object.entries(marketData).forEach(([marketKey, outcomes]) => {
            if (Object.keys(outcomes).length > 0) {
              officialOdds[marketKey] = {};
              Object.entries(outcomes).forEach(([outcomeKey, data]) => {
                officialOdds[marketKey][outcomeKey] = {
                  count: data.count,
                  averagePrice: data.totalPrice / data.count
                };
              });
            }
          });
        }
        
        return {
          ...game,
          sport_key: sportKey,
          sportTitle: category,
          officialOdds: officialOdds || game.officialOdds,
          isBettable,
          gameTime: localGameTime,
          bettingDeadline
        };
      });
      
      const sortedGames = processedGames.sort((a, b) => {
        const currentTime = now.getTime();
        const aTime = a.gameTime.getTime();
        const bTime = b.gameTime.getTime();
        
        const aIsFuture = aTime >= currentTime;
        const bIsFuture = bTime >= currentTime;
        
        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        
        if (aIsFuture && bIsFuture) {
          return aTime - bTime;
        }
        
        return bTime - aTime;
      });
      
      setGames(sortedGames);

      // 🆕 모든 게임에 대해 기본 마켓 설정
      sortedGames.forEach(game => {
        if (!leagueGameMarkets[game.id]) {
          setLeagueGameMarkets(prev => ({
            ...prev,
            [game.id]: new Set(['승패'])
          }));
        }
      });
      
    } catch (error) {
      console.error(`❌ ${category} 데이터 로드 실패:`, error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 마켓 체크박스 토글 함수들
  const toggleTodayGameMarket = (gameId: string, market: string) => {
    setTodayGameMarkets(prev => {
      const current = prev[gameId] || new Set();
      const newSet = new Set(current);
      
      if (newSet.has(market)) {
        newSet.delete(market);
      } else {
        newSet.add(market);
      }
      
      // 최소 하나는 선택되도록 보장
      if (newSet.size === 0) {
        newSet.add('승패');
      }
      
      return { ...prev, [gameId]: newSet };
    });
  };

  const toggleLeagueGameMarket = (gameId: string, market: string) => {
    setLeagueGameMarkets(prev => {
      const current = prev[gameId] || new Set();
      const newSet = new Set(current);
      
      if (newSet.has(market)) {
        newSet.delete(market);
      } else {
        newSet.add(market);
      }
      
      // 최소 하나는 선택되도록 보장
      if (newSet.size === 0) {
        newSet.add('승패');
      }
      
      return { ...prev, [gameId]: newSet };
    });
  };

  // 🆕 경기의 선택된 마켓들 가져오기
  const getTodaySelectedMarkets = (gameId: string) => {
    return todayGameMarkets[gameId] || new Set(['승패']);
  };

  const getLeagueSelectedMarkets = (gameId: string) => {
    return leagueGameMarkets[gameId] || new Set(['승패']);
  };

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);

    // 메인 카테고리인지 확인 (예: Soccer, Basketball 등)
    if (SPORTS_TREE[category as keyof typeof SPORTS_TREE]) {
      console.log(`📂 메인 카테고리 선택: ${category} - 하위 리그들 로딩 시작`);

      try {
        setLoading(true);
        setError(null);

        const leagues = SPORTS_TREE[category as keyof typeof SPORTS_TREE];
        const gamesData: Record<string, any[]> = {};
        const allGames: any[] = [];

        // 모든 하위 리그를 병렬로 처리
        const apiPromises = leagues.map(async (leagueName: string) => {
          const leagueConfig = SPORT_CATEGORIES[leagueName];
          if (!leagueConfig) return null;

          const apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${leagueConfig.sportKey}`);

          try {
            console.log(`🔄 ${leagueName} 데이터 로딩 중...`);
            const response = await fetch(apiUrl);

            if (!response.ok) {
              throw new Error(`Failed to fetch ${leagueName} data`);
            }

            const data = await response.json();

            const now = getCurrentLocalTime();
            const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
            const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const bettingDeadlineMinutes = 10;

            const filteredGames = data.filter((game: any) => {
              const localGameTime = convertUtcToLocal(game.commence_time);
              const isValid = localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
              return isValid;
            });

            const processedGames = filteredGames.map((game: any) => {
              const localGameTime = convertUtcToLocal(game.commence_time);
              const bettingDeadline = new Date(localGameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
              const isBettable = now < bettingDeadline;

              let officialOdds = game.officialOdds;
              if (!officialOdds && game.bookmakers && Array.isArray(game.bookmakers)) {
                officialOdds = {};

                const marketData: Record<string, Record<string, { count: number; totalPrice: number }>> = {};

                game.bookmakers.forEach((bookmaker: any) => {
                  if (bookmaker.markets && Array.isArray(bookmaker.markets)) {
                    bookmaker.markets.forEach((market: any) => {
                      if (!marketData[market.key]) {
                        marketData[market.key] = {};
                      }

                      if (market.outcomes && Array.isArray(market.outcomes)) {
                        market.outcomes.forEach((outcome: any) => {
                          const outcomeKey = outcome.name || outcome.point || outcome.value;
                          if (outcomeKey !== undefined) {
                            if (!marketData[market.key][outcomeKey]) {
                              marketData[market.key][outcomeKey] = { count: 0, totalPrice: 0 };
                            }
                            marketData[market.key][outcomeKey].count++;
                            marketData[market.key][outcomeKey].totalPrice += outcome.price;
                          }
                        });
                      }
                    });
                  }
                });

                Object.keys(marketData).forEach(marketKey => {
                  officialOdds[marketKey] = {};
                  Object.keys(marketData[marketKey]).forEach(outcomeKey => {
                    const { count, totalPrice } = marketData[marketKey][outcomeKey];
                    officialOdds[marketKey][outcomeKey] = (totalPrice / count).toFixed(3);
                  });
                });
              }

              return {
                ...game,
                id: `${game.home_team}-${game.away_team}-${game.commence_time}`,
                localGameTime: localGameTime,
                isBettable: isBettable,
                league: leagueName,
                sportKey: leagueConfig.sportKey,
                officialOdds: officialOdds || {}
              };
            });

            console.log(`✅ ${leagueName}: ${processedGames.length}개 경기 로드 완료`);

            gamesData[leagueName] = processedGames;
            allGames.push(...processedGames);

            return { leagueName, games: processedGames };
          } catch (error) {
            console.error(`❌ ${leagueName} 데이터 로딩 실패:`, error);
            return null;
          }
        });

        await Promise.all(apiPromises);

        // 시간순 정렬
        const sortedAllGames = allGames.sort((a, b) =>
          new Date(a.localGameTime).getTime() - new Date(b.localGameTime).getTime()
        );

        setGames(sortedAllGames);

        // 기본 마켓 설정
        sortedAllGames.forEach(game => {
          if (!leagueGameMarkets[game.id]) {
            setLeagueGameMarkets(prev => ({
              ...prev,
              [game.id]: new Set(['승패'])
            }));
          }
        });

        const bettableGames = sortedAllGames.filter(game => game.isBettable);
        const totalGames = sortedAllGames.length;

        console.log("=== League Category 전체 통계 ===");
        console.log("전체 경기 개수:", totalGames);
        console.log("베팅 가능한 경기 개수:", bettableGames.length);
        console.log("베팅 불가능한 경기 개수:", totalGames - bettableGames.length);

        const leagueDataCount: Record<string, number> = {};
        Object.entries(gamesData).forEach(([league, games]) => {
          leagueDataCount[league] = games.length;
        });
        console.log("리그별 배당율 데이터 개수:", leagueDataCount);

      } catch (error) {
        console.error(`❌ ${category} 메인 카테고리 데이터 로드 실패:`, error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    } else {
      // 단일 리그 처리 (기존 로직)
      fetchLeagueGames(category);
    }
  };

  // Today Betting View 컴포넌트
  const TodayBettingView = () => {
    if (todayLoading) return <div className="text-center py-8 text-white">Loading...</div>;
    if (todayFlatGames.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">📅 No Games Scheduled for Today</h3>
          <p className="text-gray-300 mb-4">No games found for today and tomorrow in active leagues.</p>
        </div>
      );
    }
    
    const bettableGames = todayFlatGames.filter(game => game.isBettable);
    const totalGames = todayFlatGames.length;
    
    return (
      <div className="space-y-4">
        {/* 배팅 가능한 경기 수 표시 */}
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">{bettableGames.length}</div>
                <div className="text-sm text-blue-200">Betting Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-300">{totalGames}</div>
                <div className="text-sm text-gray-200">Total Games</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-300">
                📅 {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
              <div className="text-xs text-gray-400">Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
        
        {todayFlatGames?.map((game: any) => {
          const gameTime = new Date(game.commence_time);
          const localGameTime = convertUtcToLocal(game.commence_time);
          const isBettable = game.isBettable !== undefined ? game.isBettable : true;
          
          const officialOdds = game.officialOdds || {};
          const h2hOdds = officialOdds.h2h || {};
          
                     // 축구의 경우 Draw 포함, 다른 스포츠는 홈/어웨이만
           let outcomes: any[] = [];

           if (game.sport_key?.includes('soccer')) {
             const homeOdds = h2hOdds[game.home_team];
             const awayOdds = h2hOdds[game.away_team];
             const drawOdds = Object.entries(h2hOdds).find(([name, _]) =>
               name.toLowerCase().includes('draw') || name === 'Draw' || name === 'Tie'
             );
             
             // 전체 배당율 배열 생성
             const allOdds = [
               (homeOdds as any)?.averagePrice,
               (drawOdds?.[1] as any)?.averagePrice,
               (awayOdds as any)?.averagePrice
             ].filter(odds => odds !== undefined);
             
             outcomes = [
               { 
                 name: game.home_team, 
                 price: applyExchangeReturnRate((homeOdds as any)?.averagePrice, allOdds, oddsReturnRateSettings.returnRate)
               },
               { 
                 name: 'Draw', 
                 price: applyExchangeReturnRate((drawOdds?.[1] as any)?.averagePrice, allOdds, oddsReturnRateSettings.returnRate)
               },
               { 
                 name: game.away_team, 
                 price: applyExchangeReturnRate((awayOdds as any)?.averagePrice, allOdds, oddsReturnRateSettings.returnRate)
               }
             ].filter(outcome => outcome.price !== undefined);
          } else {
            // 야구, 농구 등: Draw 없이 홈/어웨이만
            const h2hKeys = Object.keys(h2hOdds);
            const homeKey = h2hKeys.find(key => 
              normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.home_team)
            );
            const awayKey = h2hKeys.find(key => 
              normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.away_team)
            );
            
            // 전체 배당율 배열 생성
            const allOdds = [
              homeKey ? h2hOdds[homeKey]?.averagePrice : undefined,
              awayKey ? h2hOdds[awayKey]?.averagePrice : undefined
            ].filter(odds => odds !== undefined);
            
            outcomes = [
              { 
                name: game.home_team, 
                price: applyExchangeReturnRate(homeKey ? h2hOdds[homeKey]?.averagePrice : undefined, allOdds, oddsReturnRateSettings.returnRate)
              },
              { 
                name: game.away_team, 
                price: applyExchangeReturnRate(awayKey ? h2hOdds[awayKey]?.averagePrice : undefined, allOdds, oddsReturnRateSettings.returnRate)
              }
            ].filter(outcome => outcome.price !== undefined);
          }
          
          return (
            <div key={game.id} className={`bg-gray-800 rounded-lg shadow p-4 ${!isBettable ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex-1">
                  <span className="text-lg font-bold text-white">🏟️ {game.home_team} vs {game.away_team}</span>
                  <div className="text-sm text-gray-400 mt-1">
                    {(() => {
                      const leagueName = getDisplayNameFromSportKey(game.sport_key) || game.sportTitle || 'Unknown League';
                      
                      let sportIcon = '🏆';
                      if (game.sport_key?.includes('soccer')) sportIcon = '⚽';
                      else if (game.sport_key?.includes('basketball')) sportIcon = '🏀';
                      else if (game.sport_key?.includes('baseball')) sportIcon = '⚾';
                      else if (game.sport_key?.includes('americanfootball')) sportIcon = '🏈';
                      
                      return (
                        <span className="inline-flex items-center gap-2">
                          <span>{sportIcon}</span>
                          <span>{leagueName}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">
                    📅 {localGameTime.toLocaleDateString()} {localGameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {!isBettable && (
                    <div className="text-xs text-red-400 mt-1">
                      ⏰ Betting Closed (10 min before game)
                    </div>
                  )}
                </div>
              </div>
              
              {/* 🆕 마켓 체크박스 - 여러 마켓을 동시에 선택 가능 */}
              <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                <div className="text-sm font-medium text-white mb-2">📊 베팅 마켓 선택:</div>
                <div className="flex flex-wrap gap-4">
                  {['승패', '총점', '핸디캡'].map(market => {
                    const isSelected = getTodaySelectedMarkets(game.id).has(market);
                    return (
                      <label key={market} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTodayGameMarket(game.id, market)}
                          className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                          {market === '승패' ? '승/패' : 
                           market === '총점' ? '언더/오버' : '핸디캡'}
                        </span>
                      </label>
                    );
                  })}
                </div>
                
                {/* 🆕 디버깅: 사용 가능한 마켓 정보 표시 */}
                <div className="mt-2 text-xs text-gray-400">
                  <details>
                    <summary className="cursor-pointer">🔍 사용 가능한 마켓 정보</summary>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(game.officialOdds, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
              
              {/* 🆕 승패 마켓 - 선택된 경우에만 표시 */}
              {getTodaySelectedMarkets(game.id).has('승패') && outcomes.length > 0 && (
                <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">🏆 승/패 (Win/Loss)</div>
                  <div className="flex items-center gap-2">
                    {outcomes.map((outcome, idx) => {
                      let label = outcome.name;
                      if (outcome.name.toLowerCase() === 'draw') label = 'Draw';
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            // 🎯 버튼 선택 상태 토글
                            const wasSelected = isButtonSelected(game.id, `승패_${outcome.name}`);
                            handleButtonClick(game, outcome.name, outcome.price, '승패');
                            
                            // 선택 해제된 경우가 아니라면 사이드바로 이동
                            if (!wasSelected && isBettable && outcome.price) {
                              const gameInfo = {
                                gameId: game.id,
                                homeTeam: game.home_team,
                                awayTeam: game.away_team,
                                sportKey: game.sport_key,
                                market: '승패',
                                selection: outcome.name,
                                odds: outcome.price,
                                commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                              };
                              localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                  detail: { tab: 'order' }
                                }));
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                    detail: { tab: 'order' }
                                  }));
                                }, 200);
                              }, 100);

                              console.log('🎯 배당율 카드 클릭됨:', gameInfo);
                            }
                          }}
                          className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                            isButtonSelected(game.id, `승패_${outcome.name}`)
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : isBettable && outcome.price ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                          } text-white text-sm`}
                          disabled={!isBettable || !outcome.price}
                          title={isBettable && outcome.price ? `클릭하여 ${outcome.name} 주문하기` : '베팅 마감됨'}
                        >
                          <div className="font-medium">{label}</div>
                          <div className="text-xs">{outcome.price ? outcome.price.toFixed(3) : 'N/A'}</div>
                          {!isBettable && <div className="text-xs text-red-400 mt-1">Betting Closed</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* 🆕 총점 마켓 - 선택된 경우에만 표시 */}
              {getTodaySelectedMarkets(game.id).has('총점') && (
                <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">📈 언더/오버 (Over/Under)</div>
                  {(() => {
                    const totalsOdds = game.officialOdds?.totals || game.officialOdds?.over_under || {};
                    const totalEntries = Object.entries(totalsOdds);
                    
                    if (totalEntries.length === 0) {
                      return (
                        <div className="text-center text-gray-400 py-3">
                          언더/오버 배당 정보가 없습니다.
                        </div>
                      );
                    }
                    
                    // Over/Under 쌍으로 그룹화
                    const groupedTotals: { [point: string]: { over?: any, under?: any } } = {};
                    
                    totalEntries.forEach(([outcomeName, oddsData]) => {
                      if (outcomeName.startsWith('Over ')) {
                        const point = outcomeName.replace('Over ', '');
                        if (!groupedTotals[point]) groupedTotals[point] = {};
                        groupedTotals[point].over = oddsData;
                      } else if (outcomeName.startsWith('Under ')) {
                        const point = outcomeName.replace('Under ', '');
                        if (!groupedTotals[point]) groupedTotals[point] = {};
                        groupedTotals[point].under = oddsData;
                      }
                    });
                    
                    // 0.5 단위 포인트만 필터링 (0.25, 0.75 등 제외)
                    // 0.5 단위 포인트만 필터링하고 Over/Under 쌍이 모두 있는 것만 표시, 포인트 값으로 정렬
                    const filteredTotals = Object.entries(groupedTotals)
                      .filter(([point, oddsPair]) => {
                        const pointValue = parseFloat(point);
                        const isValidPoint = !isNaN(pointValue) && (pointValue % 0.5 === 0) && (pointValue % 1 === 0 || pointValue % 1 === 0.5);
                        const hasBothOdds = oddsPair.over && oddsPair.under; // Over와 Under가 모두 있어야 함
                        return isValidPoint && hasBothOdds;
                      })
                      .sort(([pointA], [pointB]) => {
                        const valueA = parseFloat(pointA);
                        const valueB = parseFloat(pointB);
                        return valueA - valueB; // 오름차순 정렬
                      });
                    
                    if (filteredTotals.length === 0) {
                      return (
                        <div className="text-center text-gray-400 py-3">
                          언더/오버 배당 정보 없음 (0.5 단위만)
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        {filteredTotals.map(([point, oddsPair]) => {
                          const overOdds = oddsPair.over?.averagePrice;
                          const underOdds = oddsPair.under?.averagePrice;
                          
                          // ========================= [ 환수율 적용 로직 추가 ] =========================
                          const allTotalsOdds = [overOdds, underOdds].filter(odds => odds != null);
                          const adjustedOverOdds = applyExchangeReturnRate(overOdds, allTotalsOdds, oddsReturnRateSettings.returnRate);
                          const adjustedUnderOdds = applyExchangeReturnRate(underOdds, allTotalsOdds, oddsReturnRateSettings.returnRate);
                          // ========================================================================
                          
                          return (
                            <div key={point} className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  // 🎯 버튼 선택 상태 토글
                                  const wasSelected = isButtonSelected(game.id, `총점_Over ${point}`);
                                  handleButtonClick(game, `Over ${point}`, adjustedOverOdds, '총점');
                                  
                                  // 선택 해제된 경우가 아니라면 사이드바로 이동
                                  if (!wasSelected && isBettable && adjustedOverOdds) {
                                    const gameInfo = {
                                      gameId: game.id,
                                      homeTeam: game.home_team,
                                      awayTeam: game.away_team,
                                      sportKey: game.sport_key,
                                      market: '총점',
                                      selection: `Over ${point}`,
                                      odds: adjustedOverOdds,
                                      commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                    };
                                    localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                    setTimeout(() => {
                                      window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                        detail: { tab: 'order' }
                                      }));
                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                          detail: { tab: 'order' }
                                        }));
                                      }, 200);
                                    }, 100);

                                    console.log('🎯 Over 배당율 카드 클릭됨:', gameInfo);
                                  }
                                }}
                                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                  isButtonSelected(game.id, `총점_Over ${point}`)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable && adjustedOverOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white text-sm`}
                                disabled={!isBettable || !adjustedOverOdds}
                              >
                                <div className="font-medium">{game.home_team}</div>
                                <div className="text-xs">{adjustedOverOdds ? adjustedOverOdds.toFixed(3) : 'N/A'}</div>
                              </button>
                              <div className="w-12 text-sm font-medium text-blue-400 text-center">{point}</div>
                              <button
                                onClick={() => {
                                  // 🎯 버튼 선택 상태 토글
                                  const wasSelected = isButtonSelected(game.id, `총점_Under ${point}`);
                                  handleButtonClick(game, `Under ${point}`, adjustedUnderOdds, '총점');
                                  
                                  // 선택 해제된 경우가 아니라면 사이드바로 이동
                                  if (!wasSelected && isBettable && adjustedUnderOdds) {
                                    const gameInfo = {
                                      gameId: game.id,
                                      homeTeam: game.home_team,
                                      awayTeam: game.away_team,
                                      sportKey: game.sport_key,
                                      market: '총점',
                                      selection: `Under ${point}`,
                                      odds: adjustedUnderOdds,
                                      commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                    };
                                    localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                    setTimeout(() => {
                                      window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                        detail: { tab: 'order' }
                                      }));
                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                          detail: { tab: 'order' }
                                        }));
                                      }, 200);
                                    }, 100);

                                    console.log('🎯 Under 배당율 카드 클릭됨:', gameInfo);
                                  }
                                }}
                                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                  isButtonSelected(game.id, `총점_Under ${point}`)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable && adjustedUnderOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white text-sm`}
                                disabled={!isBettable || !adjustedUnderOdds}
                              >
                                <div className="font-medium">{game.away_team}</div>
                                <div className="text-xs">{adjustedUnderOdds ? adjustedUnderOdds.toFixed(3) : 'N/A'}</div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* 🆕 핸디캡 마켓 - 선택된 경우에만 표시 */}
              {getTodaySelectedMarkets(game.id).has('핸디캡') && (
                <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">🎯 핸디캡 (Handicap)</div>
                  {(() => {
                    const spreadsOdds = game.officialOdds?.spreads || game.officialOdds?.handicap || {};
                    const spreadEntries = Object.entries(spreadsOdds);
                    
                    if (spreadEntries.length === 0) {
                      return (
                        <div className="text-center text-gray-400 py-3">
                          핸디캡 배당 정보가 없습니다.
                        </div>
                      );
                    }
                    
                    // Home/Away 쌍으로 그룹화 (팀명 기반 매칭)
                    const groupedSpreads: { [absPoint: string]: { home?: { oddsData: any, handicap: number }, away?: { oddsData: any, handicap: number } } } = {};
                    
                    spreadEntries.forEach(([outcomeName, oddsData]) => {
                      // "Team Point" 형식에서 팀명과 핸디캡 분리
                      const parts = outcomeName.split(' ');
                      const point = parts[parts.length - 1]; // 마지막 부분이 핸디캡
                      const teamName = parts.slice(0, -1).join(' '); // 나머지가 팀명
                      
                      const handicapValue = parseFloat(point); // -1.5 또는 +1.5
                      const absPoint = Math.abs(handicapValue).toString(); // "1.5"로 통일
                      
                      if (!groupedSpreads[absPoint]) groupedSpreads[absPoint] = {};
                      
                      // 홈팀인지 원정팀인지 판단
                      if (teamName === game.home_team) {
                        groupedSpreads[absPoint].home = { oddsData, handicap: handicapValue };
                      } else if (teamName === game.away_team) {
                        groupedSpreads[absPoint].away = { oddsData, handicap: handicapValue };
                      }
                    });
                    
                    // 0.5 단위 핸디캡만 필터링 (-1.5, -1, -0.5, 0.5, 1, 1.5 등)
                    const filteredSpreads = Object.entries(groupedSpreads).filter(([absPoint, oddsPair]) => {
                      const pointValue = Math.abs(parseFloat(absPoint));
                      return pointValue % 0.5 === 0;
                    });
                    
                    if (filteredSpreads.length === 0) {
                      return (
                        <div className="text-center text-gray-400 py-3">
                          핸디캡 배당 정보 없음
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        {filteredSpreads.map(([absPoint, oddsPair]) => {
                          const homeData = oddsPair.home;
                          const awayData = oddsPair.away;
                          
                          const homeOdds = homeData?.oddsData?.averagePrice;
                          const awayOdds = awayData?.oddsData?.averagePrice;
                          const pointValue = parseFloat(absPoint);
                          // 스프레드 베팅에서는 하나의 핸디캡 값으로 양팀이 반대 방향을 가짐
                          const homeHandicap = pointValue;
                          const awayHandicap = -pointValue;
                          
                          // ========================= [ 환수율 적용 로직 추가 ] =========================
                          const allSpreadsOdds = [homeOdds, awayOdds].filter(odds => odds != null);
                          const adjustedHomeOdds = applyExchangeReturnRate(homeOdds, allSpreadsOdds, oddsReturnRateSettings.returnRate);
                          const adjustedAwayOdds = applyExchangeReturnRate(awayOdds, allSpreadsOdds, oddsReturnRateSettings.returnRate);
                          // ========================================================================
                          
                          return (
                            <div key={absPoint} className="flex items-center gap-2">
                              {adjustedHomeOdds != null && (
                                <button
                                  onClick={() => {
                                    // 🎯 버튼 선택 상태 토글
                                    const selection = `${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`;
                                    const wasSelected = isButtonSelected(game.id, `핸디캡_${selection}`);
                                    handleButtonClick(game, selection, adjustedHomeOdds, '핸디캡');
                                    
                                    // 선택 해제된 경우가 아니라면 사이드바로 이동
                                    if (!wasSelected && isBettable && adjustedHomeOdds) {
                                      const gameInfo = {
                                        gameId: game.id,
                                        homeTeam: game.home_team,
                                        awayTeam: game.away_team,
                                        sportKey: game.sport_key,
                                        market: '핸디캡',
                                        selection: selection,
                                        odds: adjustedHomeOdds,
                                        commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                      };
                                      localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                          detail: { tab: 'order' }
                                        }));
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                            detail: { tab: 'order' }
                                          }));
                                        }, 200);
                                      }, 100);

                                      console.log('🎯 홈팀 핸디캡 배당율 카드 클릭됨:', gameInfo);
                                    }
                                  }}
                                  className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                    isButtonSelected(game.id, `핸디캡_${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`)
                                      ? 'bg-yellow-500 hover:bg-yellow-600'
                                      : isBettable && adjustedHomeOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                  } text-white text-sm`}
                                  disabled={!isBettable || !adjustedHomeOdds}
                                >
                                  <div className="font-medium">{game.home_team} {homeHandicap > 0 ? '+' : ''}{homeHandicap}</div>
                                  <div className="text-xs">{adjustedHomeOdds ? adjustedHomeOdds.toFixed(3) : 'N/A'}</div>
                                </button>
                              )}
                              <div className="w-12 text-sm font-medium text-blue-400 text-center">{pointValue}</div>
                              {adjustedAwayOdds != null && (
                                <button
                                  onClick={() => {
                                    // 🎯 버튼 선택 상태 토글
                                    const selection = `${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`;
                                    const wasSelected = isButtonSelected(game.id, `핸디캡_${selection}`);
                                    handleButtonClick(game, selection, adjustedAwayOdds, '핸디캡');
                                    
                                    // 선택 해제된 경우가 아니라면 사이드바로 이동
                                    if (!wasSelected && isBettable && adjustedAwayOdds) {
                                      const gameInfo = {
                                        gameId: game.id,
                                        homeTeam: game.home_team,
                                        awayTeam: game.away_team,
                                        sportKey: game.sport_key,
                                        market: '핸디캡',
                                        selection: selection,
                                        odds: adjustedAwayOdds,
                                        commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                      };
                                      localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                          detail: { tab: 'order' }
                                        }));
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                            detail: { tab: 'order' }
                                          }));
                                        }, 200);
                                      }, 100);

                                      console.log('🎯 원정팀 핸디캡 배당율 카드 클릭됨:', gameInfo);
                                    }
                                  }}
                                  className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                    isButtonSelected(game.id, `핸디캡_${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`)
                                      ? 'bg-yellow-500 hover:bg-yellow-600'
                                      : isBettable && adjustedAwayOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                  } text-white text-sm`}
                                  disabled={!isBettable || !adjustedAwayOdds}
                                >
                                  <div className="font-medium">{game.away_team} {awayHandicap > 0 ? '+' : ''}{awayHandicap}</div>
                                  <div className="text-xs">{adjustedAwayOdds ? adjustedAwayOdds.toFixed(3) : 'N/A'}</div>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // League View 컴포넌트
  const LeagueView = () => {
    if (loading) return <div className="text-center py-8 text-white">Loading...</div>;
    if (error) return <div className="text-center py-8 text-red-400">Error: {error}</div>;
    
    return (
      <>
        {/* 상위 카테고리 탭 */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            {Object.keys(SPORTS_TREE || {}).map((mainCategory) => (
              <button
                key={mainCategory}
                onClick={() => {
                  setSelectedMainCategory(mainCategory);
                  setSelectedCategory('');
                  setGames([]);
                  handleCategoryChange(mainCategory);
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedMainCategory === mainCategory
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {mainCategory}
              </button>
            ))}
          </div>
          
          {/* 하위 카테고리 버튼들 */}
          {selectedMainCategory && (
            <div className="mb-6">
              <div className="text-lg font-bold mb-3 text-blue-300">{selectedMainCategory}</div>
              <div className="flex flex-wrap gap-2">
                {SPORTS_TREE[selectedMainCategory]?.map((category) => {
                  const sportKey = getSportKey(category);
                  const seasonInfo = getSeasonInfo(sportKey);
                  const statusBadge = seasonInfo ? getSeasonStatusBadge(seasonInfo.status) : null;
                  const statusStyle = seasonInfo ? getSeasonStatusStyle(seasonInfo.status) : null;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative border-2 shadow-sm ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white border-blue-600'
                          : seasonInfo 
                            ? (seasonInfo.status === 'active' 
                                ? 'bg-blue-900 border-blue-400 text-blue-200 hover:bg-blue-800 hover:border-blue-300'
                                : seasonInfo.status === 'break'
                                ? 'bg-yellow-900 border-yellow-400 text-yellow-200 hover:bg-yellow-800 hover:border-yellow-300'
                                : 'bg-gray-700 border-gray-400 text-gray-300 hover:bg-gray-600')
                            : 'bg-gray-700 border-gray-400 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{category}</span>
                        {statusBadge && seasonInfo && seasonInfo.status !== 'active' && (
                          <span className="text-xs px-2 py-1 rounded-full" style={statusStyle || undefined}>
                            {statusBadge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 선택된 카테고리 정보 */}
        {selectedCategory && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">
                현재 선택: {selectedCategory}
              </h2>
              {(() => {
                const sportKey = getSportKey(selectedCategory);
                const seasonInfo = getSeasonInfo(sportKey);
                const statusBadge = seasonInfo ? getSeasonStatusBadge(seasonInfo.status) : null;
                const statusStyle = seasonInfo ? getSeasonStatusStyle(seasonInfo.status) : null;
                
                return statusBadge ? (
                  <span className="text-xs px-2 py-1 rounded-full" style={statusStyle || undefined}>
                    {statusBadge}
                  </span>
                ) : null;
              })()}
            </div>
            
            {/* 경기 수 정보 표시 */}
            {(() => {
              const bettableGames = games?.filter(game => game.isBettable) || [];
              const totalGames = games?.length || 0;
              
              return (
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mt-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-300">{bettableGames.length}</div>
                        <div className="text-sm text-blue-200">배팅 가능</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-300">{totalGames}</div>
                        <div className="text-sm text-gray-200">전체 경기</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300">
                        📅 {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </div>
                      <div className="text-xs text-gray-400">Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 경기 목록 */}
        <div className="grid grid-cols-1 gap-4">
          {SPORTS_TREE[selectedMainCategory as keyof typeof SPORTS_TREE] && games.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">🏟️ 경기가 없습니다</h3>
              <p className="text-gray-300">현재 {selectedCategory ? selectedCategory : selectedMainCategory} 경기가 예정되어 있지 않습니다.</p>
            </div>
          ) : !selectedCategory && !SPORTS_TREE[selectedMainCategory as keyof typeof SPORTS_TREE] ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">⚽ Please Select a League</h3>
              <p className="text-gray-300">Select your desired league from above to view game information for that league.</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              현재 {selectedCategory}에 대한 예정된 경기가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {games?.map((game, index) => {
                const localGameTime = convertUtcToLocal(game.commence_time);
                const h2hOdds = game.officialOdds?.h2h || {};
                
                                 let outcomes: any[] = [];
                 // 축구 리그인지 확인 (League 기반 또는 sportKey 기반)
                 const isSoccer = game.sport_key?.includes('soccer') ||
                                 game.league === 'K League' ||
                                 game.league === 'J League' ||
                                 game.league === 'Serie A' ||
                                 game.league === 'Brasileirao' ||
                                 game.league === 'MLS' ||
                                 game.league === 'Argentina Primera' ||
                                 game.league === 'Chinese Super League' ||
                                 game.league === 'La Liga' ||
                                 game.league === 'Bundesliga' ||
                                 game.league === 'Premier League';

                 if (isSoccer) {
                   const homeOdds = h2hOdds[game.home_team];
                   const awayOdds = h2hOdds[game.away_team];
                   const drawOdds = Object.entries(h2hOdds).find(([name, _]) => 
                     name.toLowerCase().includes('draw') || name === 'Draw' || name === 'Draw' || name === 'Tie'
                   );
                   
                   // 전체 배당율 배열 생성
                   const allOdds = [
                     (homeOdds as any)?.averagePrice,
                     (drawOdds?.[1] as any)?.averagePrice,
                     (awayOdds as any)?.averagePrice
                   ].filter(odds => odds !== undefined);
                   
                   outcomes = [
                     { name: game.home_team, price: applyExchangeReturnRate((homeOdds as any)?.averagePrice, allOdds, oddsReturnRateSettings.returnRate) },
                     { name: 'Draw', price: applyExchangeReturnRate((drawOdds?.[1] as any)?.averagePrice, allOdds, oddsReturnRateSettings.returnRate) },
                     { name: game.away_team, price: applyExchangeReturnRate((awayOdds as any)?.averagePrice, allOdds, oddsReturnRateSettings.returnRate) }
                   ].filter(outcome => outcome.price !== undefined);
                } else {
                  const h2hKeys = Object.keys(h2hOdds);
                  const homeKey = h2hKeys.find(key => 
                    normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.home_team)
                  );
                  const awayKey = h2hKeys.find(key => 
                    normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.away_team)
                  );
                  
                  // 전체 배당율 배열 생성
                  const allOdds = [
                    homeKey ? h2hOdds[homeKey]?.averagePrice : undefined,
                    awayKey ? h2hOdds[awayKey]?.averagePrice : undefined
                  ].filter(odds => odds !== undefined);
                  
                  outcomes = [
                    { name: game.home_team, price: applyExchangeReturnRate(homeKey ? h2hOdds[homeKey]?.averagePrice : undefined, allOdds, oddsReturnRateSettings.returnRate) },
                    { name: game.away_team, price: applyExchangeReturnRate(awayKey ? h2hOdds[awayKey]?.averagePrice : undefined, allOdds, oddsReturnRateSettings.returnRate) }
                  ].filter(outcome => outcome.price !== undefined);
                }
                
                return (
                  <div key={index} className={`bg-gray-800 rounded-lg shadow p-4 ${!game.isBettable ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-white">🏟️ {game.home_team} vs {game.away_team}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-300">
                          📅 {localGameTime.toLocaleDateString()} {localGameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!game.isBettable && (
                          <div className="text-xs text-red-400 mt-1">
                            ⏰ Betting Closed (10 min before game)
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 🆕 마켓 체크박스 - 여러 마켓을 동시에 선택 가능 */}
                    <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="text-sm font-medium text-white mb-2">📊 베팅 마켓 선택:</div>
                      <div className="flex flex-wrap gap-4">
                        {['승패', '총점', '핸디캡'].map(market => {
                          const isSelected = getLeagueSelectedMarkets(game.id).has(market);
                          return (
                            <label key={market} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLeagueGameMarket(game.id, market)}
                                className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className={`text-sm font-medium ${
                                isSelected ? 'text-blue-400' : 'text-gray-400'
                              }`}>
                                {market === '승패' ? '승/패' : 
                                 market === '총점' ? '언더/오버' : '핸디캡'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      
                      {/* �� 디버깅: 사용 가능한 마켓 정보 표시 */}
                      <div className="mt-2 text-xs text-gray-400">
                        <details>
                          <summary className="cursor-pointer">🔍 사용 가능한 마켓 정보</summary>
                          <pre className="mt-1 text-xs overflow-x-auto">
                            {JSON.stringify(game.officialOdds, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                    
                    {/* 🆕 승패 마켓 - 선택된 경우에만 표시 */}
                    {getLeagueSelectedMarkets(game.id).has('승패') && outcomes.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm font-medium text-white mb-2">🏆 승/패 (Win/Loss)</div>
                        <div className="flex items-center gap-2">
                          {outcomes.map((outcome, idx) => {
                            let label = outcome.name;
                            if (outcome.name.toLowerCase() === 'draw') label = 'Draw';
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  // 🎯 버튼 선택 상태 토글
                                  const wasSelected = isButtonSelected(game.id, `승패_${outcome.name}`);
                                  handleButtonClick(game, outcome.name, outcome.price, '승패');
                                  
                                  // 선택 해제된 경우가 아니라면 사이드바로 이동
                                  if (!wasSelected && game.isBettable && outcome.price) {
                                    const gameInfo = {
                                      gameId: game.id,
                                      homeTeam: game.home_team,
                                      awayTeam: game.away_team,
                                      sportKey: game.sport_key,
                                      market: '승패',
                                      selection: outcome.name,
                                      odds: outcome.price,
                                      commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                    };
                                    localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                    setTimeout(() => {
                                      window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                        detail: { tab: 'order' }
                                      }));
                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                          detail: { tab: 'order' }
                                        }));
                                      }, 200);
                                    }, 100);

                                    console.log('🎯 배당율 카드 클릭됨:', gameInfo);
                                  }
                                }}
                                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                  isButtonSelected(game.id, `승패_${outcome.name}`)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : game.isBettable && outcome.price ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white text-sm`}
                                disabled={!game.isBettable || !outcome.price}
                                title={game.isBettable && outcome.price ? `클릭하여 ${outcome.name} 주문하기` : '베팅 마감됨'}
                              >
                                <div className="font-medium">{label}</div>
                                <div className="text-xs">{outcome.price ? outcome.price.toFixed(3) : 'N/A'}</div>
                                {!game.isBettable && <div className="text-xs text-red-400 mt-1">Betting Closed</div>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* 🆕 총점 마켓 - 선택된 경우에만 표시 */}
                    {getLeagueSelectedMarkets(game.id).has('총점') && (
                      <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm font-medium text-white mb-2">📈 언더/오버 (Over/Under)</div>
                        {(() => {
                          const totalsOdds = game.officialOdds?.totals || game.officialOdds?.over_under || {};
                          const totalEntries = Object.entries(totalsOdds);
                          
                          if (totalEntries.length === 0) {
                            return (
                              <div className="text-center text-gray-400 py-3">
                                언더/오버 배당 정보가 없습니다.
                              </div>
                            );
                          }
                          
                          // Over/Under 쌍으로 그룹화
                          const groupedTotals: { [point: string]: { over?: any, under?: any } } = {};
                          
                          totalEntries.forEach(([outcomeName, oddsData]) => {
                            if (outcomeName.startsWith('Over ')) {
                              const point = outcomeName.replace('Over ', '');
                              if (!groupedTotals[point]) groupedTotals[point] = {};
                              groupedTotals[point].over = oddsData;
                            } else if (outcomeName.startsWith('Under ')) {
                              const point = outcomeName.replace('Under ', '');
                              if (!groupedTotals[point]) groupedTotals[point] = {};
                              groupedTotals[point].under = oddsData;
                            }
                          });
                          
                          // 0.5 단위 포인트만 필터링하고 Over/Under 쌍이 모두 있는 것만 표시, 포인트 값으로 정렬
                          const filteredTotals = Object.entries(groupedTotals)
                            .filter(([point, oddsPair]) => {
                              const pointValue = parseFloat(point);
                              const isValidPoint = !isNaN(pointValue) && (pointValue % 0.5 === 0) && (pointValue % 1 === 0 || pointValue % 1 === 0.5);
                              const hasBothOdds = oddsPair.over && oddsPair.under; // Over와 Under가 모두 있어야 함
                              return isValidPoint && hasBothOdds;
                            })
                            .sort(([pointA], [pointB]) => {
                              const valueA = parseFloat(pointA);
                              const valueB = parseFloat(pointB);
                              return valueA - valueB; // 오름차순 정렬
                            });
                          
                          if (filteredTotals.length === 0) {
                            return (
                              <div className="text-center text-gray-400 py-3">
                                언더/오버 배당 정보 없음 (0.5 단위만)
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-2">
                              {filteredTotals.map(([point, oddsPair]) => {
                                const overOdds = oddsPair.over?.averagePrice;
                                const underOdds = oddsPair.under?.averagePrice;
                                
                                // 🆕 환수율 적용
                                const allTotalsOdds = [overOdds, underOdds].filter(odds => odds !== undefined);
                                const adjustedOverOdds = overOdds ? applyExchangeReturnRate(overOdds, allTotalsOdds, oddsReturnRateSettings.returnRate) : undefined;
                                const adjustedUnderOdds = underOdds ? applyExchangeReturnRate(underOdds, allTotalsOdds, oddsReturnRateSettings.returnRate) : undefined;
                                
                                return (
                                  <div key={point} className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        // 🎯 버튼 선택 상태 토글
                                        const wasSelected = isButtonSelected(game.id, `총점_Over ${point}`);
                                        if (adjustedOverOdds) {
                                          handleButtonClick(game, `Over ${point}`, adjustedOverOdds, '총점');
                                        }
                                        
                                        // 선택 해제된 경우가 아니라면 사이드바로 이동
                                        if (!wasSelected && game.isBettable && adjustedOverOdds) {
                                          const gameInfo = {
                                            gameId: game.id,
                                            homeTeam: game.home_team,
                                            awayTeam: game.away_team,
                                            sportKey: game.sport_key,
                                            market: '총점',
                                            selection: `Over ${point}`,
                                            odds: adjustedOverOdds,
                                            commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                          };
                                          localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                          setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                              detail: { tab: 'order' }
                                            }));
                                            setTimeout(() => {
                                              window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                                detail: { tab: 'order' }
                                              }));
                                            }, 200);
                                          }, 100);

                                          console.log('🎯 총점 마켓 배당율 카드 클릭됨:', gameInfo);
                                        }
                                      }}
                                      className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                        isButtonSelected(game.id, `총점_Over ${point}`)
                                          ? 'bg-yellow-500 hover:bg-yellow-600'
                                          : game.isBettable && adjustedOverOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                      } text-white text-sm`}
                                      disabled={!game.isBettable || !adjustedOverOdds}
                                    >
                                      <div className="font-medium">{game.home_team}</div>
                                      <div className="text-xs">{adjustedOverOdds ? adjustedOverOdds.toFixed(3) : 'N/A'}</div>
                                    </button>
                                    <div className="w-12 text-sm font-medium text-blue-400 text-center">{point}</div>
                                    <button
                                      onClick={() => {
                                        // 🎯 버튼 선택 상태 토글
                                        const wasSelected = isButtonSelected(game.id, `총점_Under ${point}`);
                                        if (adjustedUnderOdds) {
                                          handleButtonClick(game, `Under ${point}`, adjustedUnderOdds, '총점');
                                        }
                                        
                                        // 선택 해제된 경우가 아니라면 사이드바로 이동
                                        if (!wasSelected && game.isBettable && adjustedUnderOdds) {
                                          const gameInfo = {
                                            gameId: game.id,
                                            homeTeam: game.home_team,
                                            awayTeam: game.away_team,
                                            sportKey: game.sport_key,
                                            market: '총점',
                                            selection: `Under ${point}`,
                                            odds: adjustedUnderOdds,
                                            commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                          };
                                          localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                          setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                              detail: { tab: 'order' }
                                            }));
                                            setTimeout(() => {
                                              window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                                detail: { tab: 'order' }
                                              }));
                                            }, 200);
                                          }, 100);

                                          console.log('🎯 Under 배당율 카드 클릭됨:', gameInfo);
                                        }
                                      }}
                                      className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                        isButtonSelected(game.id, `총점_Under ${point}`)
                                          ? 'bg-yellow-500 hover:bg-yellow-600'
                                          : game.isBettable && adjustedUnderOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                      } text-white text-sm`}
                                      disabled={!game.isBettable || !adjustedUnderOdds}
                                    >
                                      <div className="font-medium">{game.away_team}</div>
                                      <div className="text-xs">{adjustedUnderOdds ? adjustedUnderOdds.toFixed(3) : 'N/A'}</div>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* 🆕 핸디캡 마켓 - 선택된 경우에만 표시 */}
                    {getLeagueSelectedMarkets(game.id).has('핸디캡') && (
                      <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm font-medium text-white mb-2">🎯 핸디캡 (Handicap)</div>
                        {(() => {
                          const spreadsOdds = game.officialOdds?.spreads || game.officialOdds?.handicap || {};
                          const spreadEntries = Object.entries(spreadsOdds);
                          
                          if (spreadEntries.length === 0) {
                            return (
                              <div className="text-center text-gray-400 py-3">
                                핸디캡 배당 정보가 없습니다.
                              </div>
                            );
                          }
                          
                          // Home/Away 쌍으로 그룹화 (팀명 기반 매칭)
                          const groupedSpreads: { [absPoint: string]: { home?: { oddsData: any, handicap: number }, away?: { oddsData: any, handicap: number } } } = {};
                          
                          spreadEntries.forEach(([outcomeName, oddsData]) => {
                            // "Team Point" 형식에서 팀명과 핸디캡 분리
                            const parts = outcomeName.split(' ');
                            const point = parts[parts.length - 1]; // 마지막 부분이 핸디캡
                            const teamName = parts.slice(0, -1).join(' '); // 나머지가 팀명
                            
                            const handicapValue = parseFloat(point); // -1.5 또는 +1.5
                            const absPoint = Math.abs(handicapValue).toString(); // "1.5"로 통일
                            
                            if (!groupedSpreads[absPoint]) {
                              groupedSpreads[absPoint] = {};
                            }
                            
                            if (teamName === game.home_team) {
                              groupedSpreads[absPoint].home = { oddsData, handicap: handicapValue };
                            } else if (teamName === game.away_team) {
                              groupedSpreads[absPoint].away = { oddsData, handicap: handicapValue };
                            }
                          });
                          
                          // 0.5 단위 핸디캡만 필터링 (-1.5, -1, -0.5, 0.5, 1, 1.5 등)
                          const filteredSpreads = Object.entries(groupedSpreads).filter(([absPoint, oddsPair]) => {
                            const pointValue = Math.abs(parseFloat(absPoint));
                            return pointValue % 0.5 === 0;
                          });
                          
                          if (filteredSpreads.length === 0) {
                            return (
                              <div className="text-center text-gray-400 py-3">
                                핸디캡 배당 정보 없음
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-2">
                              {filteredSpreads.map(([absPoint, oddsPair]) => {
                                const homeData = oddsPair.home;
                                const awayData = oddsPair.away;
                                
                                const homeOdds = homeData?.oddsData?.averagePrice;
                                const awayOdds = awayData?.oddsData?.averagePrice;
                                
                                // 🆕 환수율 적용
                                const allSpreadsOdds = [homeOdds, awayOdds].filter(odds => odds !== undefined);
                                const adjustedHomeOdds = homeOdds ? applyExchangeReturnRate(homeOdds, allSpreadsOdds, oddsReturnRateSettings.returnRate) : undefined;
                                const adjustedAwayOdds = awayOdds ? applyExchangeReturnRate(awayOdds, allSpreadsOdds, oddsReturnRateSettings.returnRate) : undefined;
                                const pointValue = parseFloat(absPoint);
                                // 스프레드 베팅에서는 하나의 핸디캡 값으로 양팀이 반대 방향을 가짐
                                const homeHandicap = pointValue;
                                const awayHandicap = -pointValue;
                                
                                return (
                                  <div key={absPoint} className="flex items-center gap-2">
                                    {homeOdds != null && (
                                      <button
                                        onClick={() => {
                                          // 🎯 버튼 선택 상태 토글
                                          const selection = `${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`;
                                          const wasSelected = isButtonSelected(game.id, `핸디캡_${selection}`);
                                          if (adjustedHomeOdds) {
                                            handleButtonClick(game, selection, adjustedHomeOdds, '핸디캡');
                                          }
                                          
                                          // 선택 해제된 경우가 아니라면 사이드바로 이동
                                          if (!wasSelected && game.isBettable && adjustedHomeOdds) {
                                            const gameInfo = {
                                              gameId: game.id,
                                              homeTeam: game.home_team,
                                              awayTeam: game.away_team,
                                              sportKey: game.sport_key,
                                              market: '핸디캡',
                                              selection: selection,
                                              odds: adjustedHomeOdds,
                                              commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                            };
                                            localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                            setTimeout(() => {
                                              window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                                detail: { tab: 'order' }
                                              }));
                                              setTimeout(() => {
                                                window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                                  detail: { tab: 'order' }
                                                }));
                                              }, 200);
                                            }, 100);

                                            console.log('🎯 홈팀 핸디캡 배당율 카드 클릭됨:', gameInfo);
                                          }
                                        }}
                                        className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                          isButtonSelected(game.id, `핸디캡_${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`)
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : game.isBettable && adjustedHomeOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                        } text-white text-sm`}
                                        disabled={!game.isBettable || !adjustedHomeOdds}
                                        title={game.isBettable && adjustedHomeOdds ? `클릭하여 ${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap} 주문하기` : '베팅 마감됨'}
                                      >
                                        <div className="font-medium">{game.home_team} {homeHandicap > 0 ? '+' : ''}{homeHandicap}</div>
                                        <div className="text-xs">{adjustedHomeOdds ? adjustedHomeOdds.toFixed(3) : 'N/A'}</div>
                                      </button>
                                    )}
                                    <div className="w-12 text-sm font-medium text-blue-400 text-center">{pointValue}</div>
                                    {awayOdds != null && (
                                      <button
                                        onClick={() => {
                                          // 🎯 버튼 선택 상태 토글
                                          const selection = `${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`;
                                          const wasSelected = isButtonSelected(game.id, `핸디캡_${selection}`);
                                          if (adjustedAwayOdds) {
                                            handleButtonClick(game, selection, adjustedAwayOdds, '핸디캡');
                                          }
                                          
                                          // 선택 해제된 경우가 아니라면 사이드바로 이동
                                          if (!wasSelected && game.isBettable && adjustedAwayOdds) {
                                            const gameInfo = {
                                              gameId: game.id,
                                              homeTeam: game.home_team,
                                              awayTeam: game.away_team,
                                              sportKey: game.sport_key,
                                              market: '핸디캡',
                                              selection: selection,
                                              odds: adjustedAwayOdds,
                                              commenceTime: game.commence_time.endsWith('Z') ? game.commence_time : new Date(game.commence_time + 'Z').toISOString()
                                            };
                                            localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));

                                            setTimeout(() => {
                                              window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                                detail: { tab: 'order' }
                                              }));
                                              setTimeout(() => {
                                                window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', {
                                                  detail: { tab: 'order' }
                                                }));
                                              }, 200);
                                            }, 100);

                                            console.log('🎯 어웨이팀 핸디캡 배당율 카드 클릭됨:', gameInfo);
                                          }
                                        }}
                                        className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                          isButtonSelected(game.id, `핸디캡_${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`)
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : game.isBettable && adjustedAwayOdds ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                        } text-white text-sm`}
                                        disabled={!game.isBettable || !adjustedAwayOdds}
                                        title={game.isBettable && adjustedAwayOdds ? `클릭하여 ${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap} 주문하기` : '베팅 마감됨'}
                                      >
                                        <div className="font-medium">{game.away_team} {awayHandicap > 0 ? '+' : ''}{awayHandicap}</div>
                                        <div className="text-xs">{adjustedAwayOdds ? adjustedAwayOdds.toFixed(3) : 'N/A'}</div>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  };

  useEffect(() => {
    if (viewMode === 'today') {
      fetchTodayGames();
    }
    loadOddsReturnRateSettings(); // 🆕 환수율 설정 로드
    
    const handleOrderPlaced = () => {
      console.log('🔄 주문 완료 이벤트 감지, 익스체인지 홈 투데이 베팅 데이터 새로고침');
      
      // 🆕 주문 완료 후 선택 상태 초기화
      console.log('🎯 주문 완료로 인한 선택 상태 초기화');
      setSelectedBet(null);
      clearMultiBet();
      
      if (viewMode === 'today') {
        fetchTodayGames();
      }
    };

    // 🆕 환수율 설정 변경 이벤트 리스너
    const handlePayoutRateChanged = () => {
      console.log('🔄 환수율 설정 변경 감지, 설정 새로고침');
      loadOddsReturnRateSettings();
    };

    window.addEventListener('exchangeOrderPlaced', handleOrderPlaced);
    window.addEventListener('payoutRateChanged', handlePayoutRateChanged);
    
    if (typeof document !== 'undefined') {
      const interval = setInterval(() => {
        console.log('[Exchange Today] 주기적 경기 데이터 갱신 시도');
        if (viewMode === 'today') {
          fetchTodayGames();
        }
      }, 5 * 60 * 1000);
      return () => {
        clearInterval(interval);
        window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
        window.removeEventListener('payoutRateChanged', handlePayoutRateChanged);
      };
    }
    return () => {
      window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
      window.removeEventListener('payoutRateChanged', handlePayoutRateChanged);
    };
  }, [viewMode]);

  return (
    <div className="p-6">
      <div className="bg-black rounded shadow p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">Sports Exchange</h1>
          {/* 3개 탭 네비게이션 */}
          <div className="flex items-center space-x-2">
            <button
              disabled
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium shadow-lg cursor-not-allowed flex items-center space-x-2 ring-2 ring-blue-400"
            >
              <span>🏠</span>
              <span>배팅</span>
            </button>
            <button
              onClick={() => router.push('/exchange/live-odds')}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg font-medium hover:bg-green-500 hover:shadow-lg transition-all flex items-center space-x-2 opacity-70 hover:opacity-100"
            >
              <span>📊</span>
              <span>주문현황</span>
            </button>
            <button
              onClick={() => router.push('/exchange/orderbook')}
              className="px-4 py-2 bg-pink-700 text-white text-sm rounded-lg font-medium hover:bg-pink-500 hover:shadow-lg transition-all flex items-center space-x-2 opacity-70 hover:opacity-100"
            >
              <span>📋</span>
              <span>매치</span>
            </button>
          </div>
        </div>
        
        {/* 🎯 Today Betting vs 🏟️ League View 탭 */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setViewMode('today')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎯 Today Betting
          </button>
          <button
            onClick={() => {
              setViewMode('league');
              setSelectedMainCategory('Soccer');
              setSelectedCategory('');
              setGames([]);
              setError(null);
              setLoading(false);
              handleCategoryChange('Soccer');
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'league'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🏟️ League View
          </button>
        </div>

        {/* 선택된 모드에 따른 컨텐츠 표시 */}
        {viewMode === 'today' ? (
          <TodayBettingView />
        ) : (
          <LeagueView />
        )}
      </div>
    </div>
  );
} 