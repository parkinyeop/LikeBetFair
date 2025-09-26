import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
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
  'Win/Loss': 'h2h', 
  'Over/Under': 'totals', 
  'Handicap': 'spreads'
};

const OddsList: React.FC<OddsListProps> = memo(({ sportKey, onBettingAreaSelect }) => {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selections, toggleSelection } = useBetStore();
  // 체크박스 방식으로 변경: 여러 마켓을 동시에 선택 가능
  const [selectedMarkets, setSelectedMarkets] = useState<{ [gameId: string]: Set<string> }>({});

  useEffect(() => {
    const fetchOdds = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${sportKey}`));
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
            const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${sportKey}`));
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

  // 체크박스 핸들러 추가
  const handleMarketToggle = (gameId: string, market: string) => {
    setSelectedMarkets(prev => {
      const current = prev[gameId] || new Set();
      const newSet = new Set(current);
      
      if (newSet.has(market)) {
        newSet.delete(market);
      } else {
        newSet.add(market);
      }
      
      // 최소 하나는 선택되도록 보장
      if (newSet.size === 0) {
        newSet.add('Win/Loss');
      }
      
      return { ...prev, [gameId]: newSet };
    });
  };

  // 게임별 기본 마켓 설정
  const getDefaultMarkets = (gameId: string) => {
    if (!selectedMarkets[gameId]) {
      setSelectedMarkets(prev => ({ ...prev, [gameId]: new Set(['Win/Loss']) }));
      return new Set(['Win/Loss']);
    }
    return selectedMarkets[gameId];
  };

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
      {/* 전체 페이지 탭 제거 - 각 게임마다 개별 체크박스로 변경 */}

      <div className="space-y-4 flex-1 min-h-0 px-1 overflow-y-auto">
        {games?.map((game: any) => {
          const gameTime = game.gameTime || new Date(game.commence_time);
          const isBettable = game.isBettable !== undefined ? game.isBettable : true;
          
          // 게임별 선택된 마켓들
          const selectedMarketsForGame = getDefaultMarkets(game.id);
          
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
            
            {/* 마켓 체크박스 - 여러 마켓을 동시에 선택 가능 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">📊 베팅 마켓 선택:</div>
              <div className="flex flex-wrap gap-4">
                {['Win/Loss', 'Over/Under', 'Handicap'].map(marketTab => {
                  const isSelected = selectedMarketsForGame.has(marketTab);
                  return (
                    <label key={marketTab} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMarketToggle(game.id, marketTab)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {marketTab === 'Win/Loss' ? '승/패' : 
                         marketTab === 'Over/Under' ? '언더/오버' : '핸디캡'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            
            {/* 선택된 마켓들의 배당률 표시 */}
            {selectedMarketsForGame.has('Win/Loss') && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">🏆 승/패 (Win/Loss)</div>
                {(() => {
                  const h2hOdds = game.officialOdds?.h2h || {};
                  
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
                    // 축구: 홈팀, 무, 원정팀 순서로 정렬 (일관된 순서)
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
                    // 야구 등 다른 스포츠: 홈팀을 왼쪽에 표시하도록 순서 조정
                    const homeOdds = h2hOdds[game.home_team];
                    const awayOdds = h2hOdds[game.away_team];
                    
                    outcomes = [
                      { name: game.home_team, price: (homeOdds as any)?.averagePrice },
                      { name: game.away_team, price: (awayOdds as any)?.averagePrice }
                    ].filter(outcome => outcome.price !== undefined);
                  }
                  
                  if (outcomes.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-3">
                        승/패 배당 정보 없음
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex items-center gap-2">
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
                                  team: outcome.name,
                                  odds: outcome.price,
                                  desc: `${game.home_team} vs ${game.away_team}`,
                                  commence_time: game.commence_time,
                                  market: 'Win/Loss',
                                  gameId: game.id,
                                  sport_key: game.sport_key
                                });
                                handleBettingAreaSelect();
                              }
                            }}
                            className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                              isTeamSelected(outcome.name, 'Win/Loss', game.id)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                            } text-white text-sm`}
                            disabled={!isBettable || !outcome.price}
                          >
                            <div className="font-medium">{label}</div>
                            <div className="text-xs">{outcome.price ? outcome.price.toFixed(2) : 'N/A'}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            
            {selectedMarketsForGame.has('Over/Under') && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">📈 언더/오버 (Over/Under)</div>
                {(() => {
                  const totalsOdds = game.officialOdds?.totals || {};
                  const totalEntries = Object.entries(totalsOdds);
                  
                  if (totalEntries.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-3">
                        언더/오버 배당 정보 없음
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
                      <div className="text-center text-gray-500 py-3">
                        언더/오버 배당 정보 없음 (0.5 단위만)
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {filteredTotals.map(([point, oddsPair]) => {
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
                                    market: 'Over/Under',
                                    gameId: game.id,
                                    sport_key: game.sport_key,
                                    point: parseFloat(point)
                                  });
                                  handleBettingAreaSelect();
                                }
                              }}
                              className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                isTeamSelected(`Over ${point} (${game.home_team} vs ${game.away_team})`, 'Over/Under', game.id, parseFloat(point))
                                  ? 'bg-yellow-500 hover:bg-yellow-600'
                                  : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                              } text-white text-sm`}
                              disabled={!isBettable || !overOdds}
                            >
                              <div className="font-medium">Over {point}</div>
                              <div className="text-xs">{overOdds ? overOdds.toFixed(2) : 'N/A'}</div>
                            </button>
                            <div className="w-12 text-sm font-medium text-blue-700 text-center">{point}</div>
                            <button
                              onClick={() => {
                                if (isBettable && underOdds) {
                                  toggleSelection({
                                    team: `Under ${point} (${game.home_team} vs ${game.away_team})`,
                                    odds: underOdds,
                                    desc: `${game.home_team} vs ${game.away_team}`,
                                    commence_time: game.commence_time,
                                    market: 'Over/Under',
                                    gameId: game.id,
                                    sport_key: game.sport_key,
                                    point: parseFloat(point)
                                  });
                                  handleBettingAreaSelect();
                                }
                              }}
                              className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                isTeamSelected(`Under ${point} (${game.home_team} vs ${game.away_team})`, 'Over/Under', game.id, parseFloat(point))
                                  ? 'bg-yellow-500 hover:bg-yellow-600'
                                  : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                              } text-white text-sm`}
                              disabled={!isBettable || !underOdds}
                            >
                              <div className="font-medium">Under {point}</div>
                              <div className="text-xs">{underOdds ? underOdds.toFixed(2) : 'N/A'}</div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            
            {selectedMarketsForGame.has('Handicap') && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">🎯 핸디캡 (Handicap)</div>
                {(() => {
                  const spreadsOdds = game.officialOdds?.spreads || {};
                  const spreadEntries = Object.entries(spreadsOdds);
                  
                  if (spreadEntries.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-3">
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
                      <div className="text-center text-gray-500 py-3">
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
                        // API에서 제공하는 실제 핸디캡 값을 사용하도록 수정
                        const homeHandicap = homeData?.handicap;
                        const awayHandicap = awayData?.handicap;
                        
                        return (
                          <div key={absPoint} className="flex items-center gap-2">
                            {/* 홈팀을 왼쪽에 표시 */}
                            {homeOdds != null && homeHandicap != null && (
                              <button
                                onClick={() => {
                                  if (isBettable && homeOdds) {
                                    toggleSelection({
                                      team: `${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`,
                                      odds: homeOdds,
                                      desc: `${game.home_team} vs ${game.away_team}`,
                                      commence_time: game.commence_time,
                                      market: 'Handicap',
                                      gameId: game.id,
                                      sport_key: game.sport_key,
                                      // 실제 핸디캡 값을 point로 전달
                                      point: homeHandicap
                                    });
                                    handleBettingAreaSelect();
                                  }
                                }}
                                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                  isTeamSelected(`${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`, 'Handicap', game.id, homeHandicap)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white text-sm`}
                                disabled={!isBettable || !homeOdds}
                              >
                                <div className="font-medium">{game.home_team} {homeHandicap > 0 ? '+' : ''}{homeHandicap}</div>
                                <div className="text-xs">{homeOdds.toFixed(2)}</div>
                              </button>
                            )}
                            <div className="w-12 text-sm font-medium text-blue-700 text-center">{homeHandicap != null ? (homeHandicap > 0 ? '+' : '') + homeHandicap : pointValue}</div>
                            {/* 원정팀을 오른쪽에 표시 */}
                            {awayOdds != null && awayHandicap != null && (
                              <button
                                onClick={() => {
                                  if (isBettable && awayOdds) {
                                    toggleSelection({
                                      team: `${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`,
                                      odds: awayOdds,
                                      desc: `${game.home_team} vs ${game.away_team}`,
                                      commence_time: game.commence_time,
                                      market: 'Handicap',
                                      gameId: game.id,
                                      sport_key: game.sport_key,
                                      // 실제 핸디캡 값을 point로 전달
                                      point: awayHandicap
                                    });
                                    handleBettingAreaSelect();
                                  }
                                }}
                                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                  isTeamSelected(`${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`, 'Handicap', game.id, awayHandicap)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white text-sm`}
                                disabled={!isBettable || !awayOdds}
                              >
                                <div className="font-medium">{game.away_team} {awayHandicap > 0 ? '+' : ''}{awayHandicap}</div>
                                <div className="text-xs">{awayOdds.toFixed(2)}</div>
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