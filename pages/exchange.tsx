import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { SPORTS_TREE, getSportKey, getSeasonInfo, getSeasonStatusBadge, getSeasonStatusStyle, SPORT_CATEGORIES, getDisplayNameFromSportKey } from '../config/sportsMapping';
import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
import { normalizeTeamNameForComparison } from '../utils/matchSportsbookGame';
import { convertUtcToLocal, getCurrentLocalTime } from '../utils/timeUtils';

export default function Exchange() {
  const router = useRouter();
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
              const isValid = localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
              
              // 🆕 KBO 경기 시간 추가 검증
              if (game.sport_key === 'baseball_kbo' || game.sport_key === 'KBO' || config.sportKey === 'baseball_kbo') {
                const hour = localGameTime.getHours();
                const isKBOValidTime = hour >= 18 && hour <= 21; // KBO는 18:00~21:00에 진행
                
                if (!isKBOValidTime) {
                  console.log(`[KBO 시간 검증] 부정확한 경기 시간 제외: ${game.home_team} vs ${game.away_team} - ${localGameTime.toLocaleString()} (${hour}시)`);
                  return false;
                }
              }
              
              return isValid;
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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    fetchLeagueGames(category);
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
             
             outcomes = [
               { name: game.home_team, price: (homeOdds as any)?.averagePrice },
               { name: 'Draw', price: (drawOdds?.[1] as any)?.averagePrice },
               { name: game.away_team, price: (awayOdds as any)?.averagePrice }
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
            
            outcomes = [
              { name: game.home_team, price: homeKey ? h2hOdds[homeKey]?.averagePrice : undefined },
              { name: game.away_team, price: awayKey ? h2hOdds[awayKey]?.averagePrice : undefined }
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
                    <div className="w-16 text-base font-bold text-gray-300 text-center">
                      승/패
                    </div>
                    {outcomes.map((outcome, idx) => {
                      let label = outcome.name;
                      if (outcome.name.toLowerCase() === 'draw') label = 'Draw';
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (isBettable && outcome.price) {
                              const gameInfo = {
                                gameId: game.id,
                                homeTeam: game.home_team,
                                awayTeam: game.away_team,
                                sportKey: game.sport_key,
                                market: '승패',
                                selection: outcome.name,
                                odds: outcome.price,
                                commenceTime: game.commence_time
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
                          className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                            isBettable && outcome.price
                              ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-lg hover:shadow-xl'
                              : 'bg-gray-600 cursor-not-allowed'
                          } text-white`}
                          disabled={!isBettable || !outcome.price}
                          title={isBettable && outcome.price ? `클릭하여 ${outcome.name} 주문하기` : '베팅 마감됨'}
                        >
                          <div className="font-bold">{label}</div>
                          <div className="text-sm">{outcome.price ? outcome.price.toFixed(2) : 'N/A'}</div>
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
                    const totalKeys = Object.keys(totalsOdds);
                    
                    if (totalKeys.length > 0) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-base font-bold text-gray-300 text-center">
                            총점
                          </div>
                          {totalKeys.map((key, idx) => {
                            const odds = totalsOdds[key];
                            if (!odds || !odds.averagePrice) return null;
                            
                            let label = key;
                            if (key.includes('Over') || key.includes('over')) label = 'Over';
                            else if (key.includes('Under') || key.includes('under')) label = 'Under';
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (isBettable && odds.averagePrice) {
                                    const gameInfo = {
                                      gameId: game.id,
                                      homeTeam: game.home_team,
                                      awayTeam: game.away_team,
                                      sportKey: game.sport_key,
                                      market: '총점',
                                      selection: key,
                                      odds: odds.averagePrice,
                                      commenceTime: game.commence_time
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
                                className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                                  isBettable && odds.averagePrice
                                    ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-lg hover:shadow-xl'
                                    : 'bg-gray-600 cursor-not-allowed'
                                } text-white`}
                                disabled={!isBettable || !odds.averagePrice}
                                title={isBettable && odds.averagePrice ? `클릭하여 ${key} 주문하기` : '베팅 마감됨'}
                              >
                                <div className="font-bold">{label}</div>
                                <div className="text-sm">{odds.averagePrice ? odds.averagePrice.toFixed(2) : 'N/A'}</div>
                                {!isBettable && <div className="text-xs text-red-400 mt-1">Betting Closed</div>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center text-gray-400 py-4">
                          총점 마켓 배당 정보가 없습니다.
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
              
              {/* 🆕 핸디캡 마켓 - 선택된 경우에만 표시 */}
              {getTodaySelectedMarkets(game.id).has('핸디캡') && (
                <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-sm font-medium text-white mb-2">🎯 핸디캡 (Handicap)</div>
                  {(() => {
                    const spreadsOdds = game.officialOdds?.spreads || game.officialOdds?.handicap || {};
                    const spreadKeys = Object.keys(spreadsOdds);
                    
                    if (spreadKeys.length > 0) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-base font-bold text-gray-300 text-center">
                            핸디캡
                          </div>
                          {spreadKeys.map((key, idx) => {
                            const odds = spreadsOdds[key];
                            if (!odds || !odds.averagePrice) return null;
                            
                            let label = key;
                            if (key.includes(game.home_team)) label = '홈팀';
                            else if (key.includes(game.away_team)) label = '원정팀';
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (isBettable && odds.averagePrice) {
                                    const gameInfo = {
                                      gameId: game.id,
                                      homeTeam: game.home_team,
                                      awayTeam: game.away_team,
                                      sportKey: game.sport_key,
                                      market: '핸디캡',
                                      selection: key,
                                      odds: odds.averagePrice,
                                      commenceTime: game.commence_time
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

                                    console.log('🎯 핸디캡 마켓 배당율 카드 클릭됨:', gameInfo);
                                  }
                                }}
                                className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                                  isBettable && odds.averagePrice
                                    ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-lg hover:shadow-xl'
                                    : 'bg-gray-600 cursor-not-allowed'
                                } text-white`}
                                disabled={!isBettable || !odds.averagePrice}
                                title={isBettable && odds.averagePrice ? `클릭하여 ${key} 주문하기` : '베팅 마감됨'}
                              >
                                <div className="font-bold">{label}</div>
                                <div className="text-sm">{odds.averagePrice ? odds.averagePrice.toFixed(2) : 'N/A'}</div>
                                {!isBettable && <div className="text-xs text-red-400 mt-1">Betting Closed</div>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center text-gray-400 py-4">
                          핸디캡 마켓 배당 정보가 없습니다.
                        </div>
                      );
                    }
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
                 if (game.sport_key?.includes('soccer')) {
                   const homeOdds = h2hOdds[game.home_team];
                   const awayOdds = h2hOdds[game.away_team];
                   const drawOdds = Object.entries(h2hOdds).find(([name, _]) => 
                     name.toLowerCase().includes('draw') || name === 'Draw' || name === 'Draw' || name === 'Tie'
                   );
                   
                   outcomes = [
                     { name: game.home_team, price: (homeOdds as any)?.averagePrice },
                     { name: 'Draw', price: (drawOdds?.[1] as any)?.averagePrice },
                     { name: game.away_team, price: (awayOdds as any)?.averagePrice }
                   ].filter(outcome => outcome.price !== undefined);
                } else {
                  const h2hKeys = Object.keys(h2hOdds);
                  const homeKey = h2hKeys.find(key => 
                    normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.home_team)
                  );
                  const awayKey = h2hKeys.find(key => 
                    normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.away_team)
                  );
                  
                  outcomes = [
                    { name: game.home_team, price: homeKey ? h2hOdds[homeKey]?.averagePrice : undefined },
                    { name: game.away_team, price: awayKey ? h2hOdds[awayKey]?.averagePrice : undefined }
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
                    {getLeagueSelectedMarkets(game.id).has('승패') && outcomes.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm font-medium text-white mb-2">🏆 승/패 (Win/Loss)</div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-base font-bold text-gray-300 text-center">
                            승/패
                          </div>
                          {outcomes.map((outcome, idx) => {
                            let label = outcome.name;
                            if (outcome.name.toLowerCase() === 'draw') label = 'Draw';
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (game.isBettable && outcome.price) {
                                    const gameInfo = {
                                      gameId: game.id,
                                      homeTeam: game.home_team,
                                      awayTeam: game.away_team,
                                      sportKey: game.sport_key,
                                      market: '승패',
                                      selection: outcome.name,
                                      odds: outcome.price,
                                      commenceTime: game.commence_time
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
                                className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                                  game.isBettable && outcome.price
                                    ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-lg hover:shadow-xl'
                                    : 'bg-gray-600 cursor-not-allowed'
                                } text-white`}
                                disabled={!game.isBettable || !outcome.price}
                                title={game.isBettable && outcome.price ? `클릭하여 ${outcome.name} 주문하기` : '베팅 마감됨'}
                              >
                                <div className="font-bold">{label}</div>
                                <div className="text-sm">{outcome.price ? outcome.price.toFixed(2) : 'N/A'}</div>
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
                          const totalKeys = Object.keys(totalsOdds);
                          
                          if (totalKeys.length > 0) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-16 text-base font-bold text-gray-300 text-center">
                                  총점
                                </div>
                                {totalKeys.map((key, idx) => {
                                  const odds = totalsOdds[key];
                                  if (!odds || !odds.averagePrice) return null;
                                  
                                  let label = key;
                                  if (key.includes('Over') || key.includes('over')) label = 'Over';
                                  else if (key.includes('Under') || key.includes('under')) label = 'Under';
                                  
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        if (game.isBettable && odds.averagePrice) {
                                          const gameInfo = {
                                            gameId: game.id,
                                            homeTeam: game.home_team,
                                            awayTeam: game.away_team,
                                            sportKey: game.sport_key,
                                            market: '총점',
                                            selection: key,
                                            odds: odds.averagePrice,
                                            commenceTime: game.commence_time
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
                                      className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                                        game.isBettable && odds.averagePrice
                                          ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-lg hover:shadow-xl'
                                          : 'bg-gray-600 cursor-not-allowed'
                                      } text-white`}
                                      disabled={!game.isBettable || !odds.averagePrice}
                                      title={game.isBettable && odds.averagePrice ? `클릭하여 ${key} 주문하기` : '베팅 마감됨'}
                                    >
                                      <div className="font-bold">{label}</div>
                                      <div className="text-sm">{odds.averagePrice ? odds.averagePrice.toFixed(2) : 'N/A'}</div>
                                      {!game.isBettable && <div className="text-xs text-red-400 mt-1">Betting Closed</div>}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-center text-gray-400 py-4">
                                총점 마켓 배당 정보가 없습니다.
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                    
                    {/* 🆕 핸디캡 마켓 - 선택된 경우에만 표시 */}
                    {getLeagueSelectedMarkets(game.id).has('핸디캡') && (
                      <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm font-medium text-white mb-2">🎯 핸디캡 (Handicap)</div>
                        {(() => {
                          const spreadsOdds = game.officialOdds?.spreads || game.officialOdds?.handicap || {};
                          const spreadKeys = Object.keys(spreadsOdds);
                          
                          if (spreadKeys.length > 0) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-16 text-base font-bold text-gray-300 text-center">
                                  핸디캡
                                </div>
                                {spreadKeys.map((key, idx) => {
                                  const odds = spreadsOdds[key];
                                  if (!odds || !odds.averagePrice) return null;
                                  
                                  let label = key;
                                  if (key.includes(game.home_team)) label = '홈팀';
                                  else if (key.includes(game.away_team)) label = '원정팀';
                                  
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        if (game.isBettable && odds.averagePrice) {
                                          const gameInfo = {
                                            gameId: game.id,
                                            homeTeam: game.home_team,
                                            awayTeam: game.away_team,
                                            sportKey: game.sport_key,
                                            market: '핸디캡',
                                            selection: key,
                                            odds: odds.averagePrice,
                                            commenceTime: game.commence_time
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

                                          console.log('🎯 핸디캡 마켓 배당율 카드 클릭됨:', gameInfo);
                                        }
                                      }}
                                      className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                                        game.isBettable && odds.averagePrice
                                          ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-lg hover:shadow-xl'
                                          : 'bg-gray-600 cursor-not-allowed'
                                      } text-white`}
                                      disabled={!game.isBettable || !odds.averagePrice}
                                      title={game.isBettable && odds.averagePrice ? `클릭하여 ${key} 주문하기` : '베팅 마감됨'}
                                    >
                                      <div className="font-bold">{label}</div>
                                      <div className="text-sm">{odds.averagePrice ? odds.averagePrice.toFixed(2) : 'N/A'}</div>
                                      {!game.isBettable && <div className="text-xs text-red-400 mt-1">Betting Closed</div>}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-center text-gray-400 py-4">
                                핸디캡 마켓 배당 정보가 없습니다.
                              </div>
                            );
                          }
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
    
    const handleOrderPlaced = () => {
      console.log('🔄 주문 완료 이벤트 감지, 익스체인지 홈 투데이 베팅 데이터 새로고침');
      if (viewMode === 'today') {
        fetchTodayGames();
      }
    };
    window.addEventListener('exchangeOrderPlaced', handleOrderPlaced);
    
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
      };
    }
    return () => {
      window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
    };
  }, [viewMode]);

  return (
    <div className="p-6">
      <div className="bg-black rounded shadow p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">Sports Exchange</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/exchange/live-odds')}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
            >
              <span>📊</span>
              <span>실시간 호가 현황</span>
            </button>
            <button
              onClick={() => router.push('/exchange/orderbook')}
              className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition-colors flex items-center space-x-1"
            >
              <span>📋</span>
              <span>전체 호가보기</span>
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