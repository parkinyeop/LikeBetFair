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
                const h2hOutcomes: Record<string, { count: number; totalPrice: number }> = {};
                game.bookmakers.forEach((bookmaker: any) => {
                  const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
                  if (h2hMarket) {
                    h2hMarket.outcomes?.forEach((outcome: any) => {
                      if (!h2hOutcomes[outcome.name]) {
                        h2hOutcomes[outcome.name] = { count: 0, totalPrice: 0 };
                      }
                      h2hOutcomes[outcome.name].count++;
                      h2hOutcomes[outcome.name].totalPrice += outcome.price;
                    });
                  }
                });
                
                if (Object.keys(h2hOutcomes).length > 0) {
                  officialOdds.h2h = {};
                  Object.entries(h2hOutcomes).forEach(([name, data]) => {
                    officialOdds.h2h[name] = {
                      count: data.count,
                      averagePrice: data.totalPrice / data.count
                    };
                  });
                }
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
          const h2hOutcomes: Record<string, { count: number; totalPrice: number }> = {};
          game.bookmakers.forEach((bookmaker: any) => {
            const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
            if (h2hMarket) {
              h2hMarket.outcomes?.forEach((outcome: any) => {
                if (!h2hOutcomes[outcome.name]) {
                  h2hOutcomes[outcome.name] = { count: 0, totalPrice: 0 };
                }
                h2hOutcomes[outcome.name].count++;
                h2hOutcomes[outcome.name].totalPrice += outcome.price;
              });
            }
          });
          
          if (Object.keys(h2hOutcomes).length > 0) {
            officialOdds.h2h = {};
            Object.entries(h2hOutcomes).forEach(([name, data]) => {
              officialOdds.h2h[name] = {
                count: data.count,
                averagePrice: data.totalPrice / data.count
              };
            });
          }
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
                    📅 {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {!isBettable && (
                    <div className="text-xs text-red-400 mt-1">
                      ⏰ Betting Closed (10 min before game)
                    </div>
                  )}
                </div>
              </div>
              
              {/* 배당율 버튼들 */}
              {outcomes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-300 mb-2">💰 Win/Loss</div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 text-base font-bold text-gray-300 text-center">
                      Win/Loss
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
                                market: 'Win/Loss',
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
                          📅 {new Date(game.commence_time).toLocaleDateString()} {new Date(game.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!game.isBettable && (
                          <div className="text-xs text-red-400 mt-1">
                            ⏰ Betting Closed (10 min before game)
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 배당율 버튼들 */}
                    {outcomes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-300 mb-2">💰 Win/Loss</div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-base font-bold text-gray-300 text-center">
                            Win/Loss
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
                                      market: 'Win/Loss',
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