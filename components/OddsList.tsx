import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { useBetStore } from '../stores/useBetStore';
import { normalizeTeamName } from '../server/normalizeUtils';
import { convertUtcToLocal, getBettingStatus } from '../utils/timeUtils';
import { useRouter } from "next/router";

interface OddsListProps {
  sportKey: string;
  onBettingAreaSelect?: () => void;
}

interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  officialOdds?: {
    [marketKey: string]: {
      [outcomeName: string]: {
        averagePrice: number;
        count: number;
      };
    };
  };
}

const marketKeyMap = { 
  '승/패': 'h2h', 
  '언더/오버': 'totals', 
  '핸디캡': 'spreads'
};

const OddsList: React.FC<OddsListProps> = memo(({ sportKey, onBettingAreaSelect }) => {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selections, toggleSelection } = useBetStore();
  const [selectedMarkets, setSelectedMarkets] = useState<{ [gameId: string]: '승/패' | '언더/오버' | '핸디캡' }>({});

  useEffect(() => {
    const fetchOdds = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/odds/${sportKey}`);
        if (response.status === 404) {
          setError('No odds information available for this league.');
          setGames([]);
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch odds');
        }
        const data = await response.json();
        
        const now = new Date();
        const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능
        
        // 1. 기본 필터링: 1일 전부터 7일 후까지의 경기 (홈페이지와 동일)
        const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const filteredGames = data.filter((game: Game) => {
          // timeUtils를 사용하여 UTC 시간을 로컬 시간으로 변환
          const localGameTime = convertUtcToLocal(game.commence_time);
          return localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
        });
        

        
        // 2. 베팅 가능 여부 분류 및 정렬
        const categorizedGames = filteredGames.map((game: Game) => {
          // timeUtils를 사용하여 베팅 상태 확인
          const bettingStatus = getBettingStatus(game.commence_time);
          const localGameTime = convertUtcToLocal(game.commence_time);
          
          return {
            ...game,
            isBettable: bettingStatus.isBettingAllowed,
            gameTime: localGameTime,
            bettingDeadline: bettingStatus.timeUntilCutoff
          };
        });
        
        // 3. 정렬: 미래 경기 우선(가까운 순), 과거 경기는 아래
        const sortedGames = categorizedGames.sort((a, b) => {
          const currentTime = now.getTime();
          const aTime = a.gameTime.getTime();
          const bTime = b.gameTime.getTime();
          
          // 미래 경기 vs 과거 경기 구분
          const aIsFuture = aTime >= currentTime;
          const bIsFuture = bTime >= currentTime;
          
          // 미래 경기가 과거 경기보다 우선
          if (aIsFuture && !bIsFuture) return -1;
          if (!aIsFuture && bIsFuture) return 1;
          
          // 둘 다 미래 경기인 경우: 가까운 시간 순
          if (aIsFuture && bIsFuture) {
            return aTime - bTime;
          }
          
          // 둘 다 과거 경기인 경우: 최근 순 (큰 시간 값이 먼저)
          return bTime - aTime;
        });
        
        // odds 필드를 officialOdds로 매핑 (백엔드 호환성 보정)
        const dataWithOfficialOdds = sortedGames.map((game: any) => ({
          ...game,
          officialOdds: game.officialOdds || game.odds || {},
        }));
        
        // 4. 개선된 중복 제거: 시간 우선 → 팀 조합으로 정확한 중복 판단
        const uniqueGamesMap = new Map();
        
        // 시간별로 그룹화
        const gamesByTime = new Map();
        dataWithOfficialOdds.forEach((game: any) => {
          const timeKey = game.commence_time; // 정확한 시간 사용
          if (!gamesByTime.has(timeKey)) {
            gamesByTime.set(timeKey, []);
          }
          gamesByTime.get(timeKey).push(game);
        });
        
        // 각 시간대별로 팀 조합 중복 제거
        gamesByTime.forEach((gamesAtTime, timeKey) => {
          const teamMap = new Map();
          
          gamesAtTime.forEach((game: any) => {
            const teamKey = `${game.home_team}|${game.away_team}`;
            
            if (!teamMap.has(teamKey)) {
              teamMap.set(teamKey, game); // 첫 번째 경기는 반드시 저장
            } else {
              // 중복인 경우 더 나은 데이터로 교체
              const existing = teamMap.get(teamKey);
              const currentBookmakers = Array.isArray(game.bookmakers) ? game.bookmakers.length : 0;
              const existingBookmakers = Array.isArray(existing.bookmakers) ? existing.bookmakers.length : 0;
              
              if (currentBookmakers > existingBookmakers || 
                  (game.officialOdds && !existing.officialOdds)) {
                teamMap.set(teamKey, game);
              }
            }
          });
          
          // 해당 시간대의 유니크한 경기들을 최종 맵에 추가
          teamMap.forEach((game, teamKey) => {
            const finalKey = `${timeKey}|${teamKey}`;
            uniqueGamesMap.set(finalKey, game);
          });
        });
        
        const finalGames = Array.from(uniqueGamesMap.values());
        console.log(`[OddsList] 중복 제거 후:`, finalGames.length, '개 경기');
        console.log(`[OddsList] 최종 경기 목록:`, finalGames.map(g => `${g.home_team} vs ${g.away_team} (${g.commence_time})`));
        
        setGames(finalGames);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch odds');
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
    
    // 5분마다 갱신 (백그라운드에서도 동작하도록 강화)
    const interval = setInterval(() => {
      console.log('[OddsList] 주기적 배당률 갱신 시도');
      fetchOdds();
    }, 5 * 60 * 1000);

    // refreshOdds 이벤트 리스너 추가
    const handleRefreshOdds = () => {
      fetchOdds();
    };

    window.addEventListener('refreshOdds', handleRefreshOdds);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshOdds', handleRefreshOdds);
    };
  }, [sportKey]);

  // Page Visibility API - 탭 활성화시 즉시 갱신
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[OddsList] 탭 활성화 - 배당률 즉시 갱신');
        const fetchOdds = async () => {
          try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/odds/${sportKey}`);
            if (response.status === 404) {
              setError('해당 리그의 배당 정보가 없습니다.');
              setGames([]);
              return;
            }
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setGames(data);
            setError(null);
          } catch (err) {
            console.error('Error fetching odds:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch odds');
          } finally {
            setLoading(false);
          }
        };
        fetchOdds();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [sportKey]);

  const isTeamSelected = (team: string, market: string, gameId: string, point?: number) => {
    return (selections || []).some(selection =>
      selection.team === team &&
      selection.market === market &&
      selection.gameId === gameId &&
      (point === undefined || selection.point === point)
    );
  };

  const handleBettingAreaSelect = useCallback(() => {
    if (onBettingAreaSelect) {
      onBettingAreaSelect();
    }
  }, [onBettingAreaSelect]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No game data available for this league.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 전체 페이지 탭 제거 - 각 게임마다 개별 탭으로 변경 */}

      <div className="space-y-4 flex-1 min-h-0 px-1 overflow-y-auto">
        {games.map((game: any) => {
          const gameTime = game.gameTime || new Date(game.commence_time);
          const isBettable = game.isBettable !== undefined ? game.isBettable : true;
          const selectedMarket = selectedMarkets[game.id] || '승/패';
          const marketKey = marketKeyMap[selectedMarket];
          
          // officialOdds에서 해당 마켓의 평균 배당률 가져오기
          const officialOdds = game.officialOdds || {};
          const marketOdds = officialOdds[marketKey] || {};
        
        return (
          <div
            key={game.id}
            className={`bg-white rounded-lg shadow p-4 ${!isBettable ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
              <div className="text-right">
                <span className="text-sm">📅 {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} [{game.sport_title}]</span>
                {!isBettable && (
                  <div className="text-xs text-red-500 mt-1">
                    ⏰ Betting Closed (10 min before game)
                  </div>
                )}
              </div>
            </div>
            
            {/* 마켓 탭 - 투데이 배팅과 동일한 구조 */}
            <div className="flex gap-2 mb-3">
              {['승/패', '언더/오버', '핸디캡'].map(marketTab => (
                <button
                  key={marketTab}
                  className={`px-3 py-1 rounded ${selectedMarket === marketTab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={(e) => {
                    e.stopPropagation(); // 게임 클릭 이벤트 방지
                    setSelectedMarkets((prev: any) => ({ ...prev, [game.id]: marketTab }));
                  }}
                >
                  {marketTab}
                </button>
              ))}
            </div>
            
            {/* 마켓별 선택 영역 */}
            {selectedMarket === '승/패' && (
              <div className="space-y-2">
                {(() => {
                  const h2hOdds = officialOdds.h2h || {};
                  
                  // 축구 경기인지 확인
                  const isSoccer = sportKey.includes('soccer') || 
                                 sportKey.includes('korea_kleague') || 
                                 sportKey.includes('england_premier_league') || 
                                 sportKey.includes('italy_serie_a') || 
                                 sportKey.includes('germany_bundesliga') || 
                                 sportKey.includes('spain_la_liga') || 
                                 sportKey.includes('usa_mls') || 
                                 sportKey.includes('argentina_primera') || 
                                 sportKey.includes('china_super_league');
                  
                  let outcomes;
                  if (isSoccer) {
                    // 축구: 팀A, 무, 팀B 순서로 정렬
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
                    // 다른 스포츠: 기존 순서 유지
                    outcomes = Object.entries(h2hOdds).map(([outcomeName, oddsData]: [string, any]) => ({
                      name: outcomeName,
                      price: oddsData.averagePrice
                    }));
                  }
                  
                  if (outcomes.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-6">
                        No Win/Loss odds available
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-base font-bold text-gray-800 text-center">
                        승/패
                      </div>
                      {outcomes.map((outcome) => {
                        let label = outcome.name;
                        if (outcome.name.toLowerCase() === 'draw') label = '무';
                        else if (outcome.name === game.home_team) label = game.home_team;
                        else if (outcome.name === game.away_team) label = game.away_team;
                        
                        return (
                          <button
                            key={outcome.name}
                            onClick={() => {
                              if (isBettable && outcome.price) {
                                toggleSelection({
                                  team: outcome.name, // normalizeTeamName 제거, outcome.name 그대로 사용
                                  odds: outcome.price,
                                  desc: `${game.home_team} vs ${game.away_team}`,
                                  commence_time: game.commence_time,
                                  market: selectedMarket,
                                  gameId: game.id,
                                  sport_key: game.sport_key
                                });
                                handleBettingAreaSelect();
                              }
                            }}
                            className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                              isTeamSelected(outcome.name, selectedMarket, game.id)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                            } text-white`}
                            disabled={!isBettable || !outcome.price}
                          >
                            <div className="font-bold">{label}</div>
                            <div className="text-sm">{outcome.price ? outcome.price.toFixed(2) : 'N/A'}</div>
                            {!isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            
            {selectedMarket === '언더/오버' && (
              <div className="space-y-2">
                {(() => {
                  const totalsOdds = officialOdds.totals || {};
                  const totalEntries = Object.entries(totalsOdds);
                  
                  if (totalEntries.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-6">
                        No Over/Under odds available
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
                  const filteredTotals = Object.entries(groupedTotals).filter(([point, oddsPair]) => {
                    const pointValue = parseFloat(point);
                    // NaN이거나 0.5 단위가 아니면 제외 (0.5, 1, 1.5, 2, 2.5... 만 허용)
                    return !isNaN(pointValue) && (pointValue % 0.5 === 0) && (pointValue % 1 === 0 || pointValue % 1 === 0.5);
                  });
                  
                  if (filteredTotals.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-6">
                        No Over/Under odds available (0.5 unit only)
                      </div>
                    );
                  }
                  
                  return filteredTotals.map(([point, oddsPair]) => {
                    const overOdds = oddsPair.over?.averagePrice;
                    const underOdds = oddsPair.under?.averagePrice;
                    
                    return (
                      <div key={point} className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (isBettable && overOdds) {
                              toggleSelection({
                                team: `Over ${point} (${game.home_team} vs ${game.away_team})`,
                                odds: overOdds,
                                desc: `${game.home_team} vs ${game.away_team}`,
                                commence_time: game.commence_time,
                                market: selectedMarket,
                                gameId: game.id,
                                sport_key: game.sport_key,
                                point: parseFloat(point)
                              });
                              handleBettingAreaSelect();
                            }
                          }}
                          className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                            isTeamSelected(`Over ${point} (${game.home_team} vs ${game.away_team})`, selectedMarket, game.id, parseFloat(point))
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                          } text-white`}
                          disabled={!isBettable || !overOdds}
                        >
                          <div className="font-bold">{game.home_team}</div>
                          <div className="text-sm">오버 ({overOdds ? overOdds.toFixed(2) : 'N/A'})</div>
                        </button>
                        <div className="w-16 text-base font-bold text-gray-800 text-center">
                          {point}
                        </div>
                        <button
                          onClick={() => {
                            if (isBettable && underOdds) {
                              toggleSelection({
                                team: `Under ${point} (${game.home_team} vs ${game.away_team})`,
                                odds: underOdds,
                                desc: `${game.home_team} vs ${game.away_team}`,
                                commence_time: game.commence_time,
                                market: selectedMarket,
                                gameId: game.id,
                                sport_key: game.sport_key,
                                point: parseFloat(point)
                              });
                              handleBettingAreaSelect();
                            }
                          }}
                          className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                            isTeamSelected(`Under ${point} (${game.home_team} vs ${game.away_team})`, selectedMarket, game.id, parseFloat(point))
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                          } text-white`}
                          disabled={!isBettable || !underOdds}
                        >
                          <div className="font-bold">{game.away_team}</div>
                          <div className="text-sm">언더 ({underOdds ? underOdds.toFixed(2) : 'N/A'})</div>
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            
            {selectedMarket === '핸디캡' && (
              <div className="space-y-2">
                {(() => {
                  const spreadsOdds = officialOdds.spreads || {};
                  const spreadEntries = Object.entries(spreadsOdds);
                  
                  if (spreadEntries.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-6">
                        핸디캡 배당 정보 없음
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
                      <div className="text-center text-gray-500 py-6">
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
                        
                        return (
                          <div key={absPoint} className="flex items-center gap-2">
                            {homeOdds != null && (
                              <button
                                onClick={() => {
                                  if (isBettable && homeOdds) {
                                    toggleSelection({
                                      team: `${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap} (vs ${game.away_team})`,
                                      odds: homeOdds,
                                      desc: `${game.home_team} vs ${game.away_team}`,
                                      commence_time: game.commence_time,
                                      market: selectedMarket,
                                      gameId: game.id,
                                      sport_key: game.sport_key,
                                      point: pointValue
                                    });
                                    handleBettingAreaSelect();
                                  }
                                }}
                                className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                  isTeamSelected(`${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap} (vs ${game.away_team})`, selectedMarket, game.id, pointValue)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white`}
                                disabled={!isBettable || !homeOdds}
                              >
                                <div className="font-bold">{game.home_team} {homeHandicap > 0 ? '+' : ''}{homeHandicap}</div>
                                <div className="text-sm">{homeOdds.toFixed(2)}</div>
                              </button>
                            )}
                            <div className="w-16 text-base font-bold text-gray-800 text-center">{pointValue}</div>
                            {awayOdds != null && (
                              <button
                                onClick={() => {
                                  if (isBettable && awayOdds) {
                                    toggleSelection({
                                      team: `${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap} (vs ${game.home_team})`,
                                      odds: awayOdds,
                                      desc: `${game.home_team} vs ${game.away_team}`,
                                      commence_time: game.commence_time,
                                      market: selectedMarket,
                                      gameId: game.id,
                                      sport_key: game.sport_key,
                                      point: pointValue
                                    });
                                    handleBettingAreaSelect();
                                  }
                                }}
                                className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                  isTeamSelected(`${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap} (vs ${game.home_team})`, selectedMarket, game.id, pointValue)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white`}
                                disabled={!isBettable || !awayOdds}
                              >
                                <div className="font-bold">{game.away_team} {awayHandicap > 0 ? '+' : ''}{awayHandicap}</div>
                                <div className="text-sm">{awayOdds.toFixed(2)}</div>
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
    </div>
  );
});

OddsList.displayName = 'OddsList';

export default OddsList; 