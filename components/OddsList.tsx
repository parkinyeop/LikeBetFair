import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { useBetStore } from '../stores/useBetStore';
import { normalizeTeamName } from '../server/normalizeUtils';

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
          setError('해당 리그의 배당 정보가 없습니다.');
          setGames([]);
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch odds');
        }
        const data = await response.json();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
        const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능
        
        // 1. 기본 필터링: 오늘부터 7일 후까지의 경기
        const filteredGames = data.filter((game: Game) => {
          const gameTime = new Date(game.commence_time);
          return gameTime >= startOfToday && gameTime <= maxDate;
        });
        
        // 2. 베팅 가능 여부 분류 및 정렬
        const categorizedGames = filteredGames.map((game: Game) => {
          const gameTime = new Date(game.commence_time);
          const bettingDeadline = new Date(gameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
          const isBettable = now < bettingDeadline;
          
          return {
            ...game,
            isBettable,
            gameTime,
            bettingDeadline
          };
        });
        
        // 3. 정렬: 베팅 가능한 경기 우선, 그 다음 시간순
        const sortedGames = categorizedGames.sort((a, b) => {
          // 베팅 가능한 경기가 우선
          if (a.isBettable && !b.isBettable) return -1;
          if (!a.isBettable && b.isBettable) return 1;
          
          // 둘 다 베팅 가능하거나 둘 다 불가능한 경우, 시간순 정렬
          return a.gameTime.getTime() - b.gameTime.getTime();
        });
        
        setGames(sortedGames);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch odds');
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
    const interval = setInterval(fetchOdds, 5 * 60 * 1000); // 5분마다 갱신

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

  const isTeamSelected = (team: string, market: string, gameId: string, point?: number) => {
    return selections.some(selection =>
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
        해당 리그의 경기 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex-1 min-h-0 px-1 overflow-y-auto">
      {games.map((game: any) => {
        const gameTime = game.gameTime || new Date(game.commence_time);
        const isBettable = game.isBettable !== undefined ? game.isBettable : true;
        const selectedMarket = selectedMarkets[game.id] || '승/패';
        const marketKey = marketKeyMap[selectedMarket];
        
        // officialOdds에서 해당 마켓의 평균 배당률 가져오기
        const officialOdds = game.officialOdds || {};
        const marketOdds = officialOdds[marketKey] || {};
        
        return (
          <div key={game.id} className={`bg-white rounded-lg shadow p-4 ${!isBettable ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
              <div className="text-right">
                <span className="text-sm">📅 {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} [{game.sport_title}]</span>
                {!isBettable && (
                  <div className="text-xs text-red-500 mt-1">
                    ⏰ 베팅 마감 (경기 시작 10분 전)
                  </div>
                )}
              </div>
            </div>
            
            {/* 마켓 탭 */}
            <div className="flex gap-2 mb-3">
              {['승/패', '언더/오버', '핸디캡'].map(marketTab => (
                <button
                  key={marketTab}
                  className={`px-3 py-1 rounded ${selectedMarket === marketTab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setSelectedMarkets(prev => ({ ...prev, [game.id]: marketTab as any }))}
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
                  const outcomes = Object.entries(h2hOdds).map(([outcomeName, oddsData]: [string, any]) => ({
                    name: outcomeName,
                    price: oddsData.averagePrice
                  }));
                  
                  if (outcomes.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-6">
                        승/패 배당 정보 없음
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
                                  team: normalizeTeamName(outcome.name),
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
                              isTeamSelected(normalizeTeamName(outcome.name), selectedMarket, game.id)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                            } text-white`}
                            disabled={!isBettable || !outcome.price}
                          >
                            <div className="font-bold">{label}</div>
                            <div className="text-sm">{outcome.price ? outcome.price.toFixed(2) : 'N/A'}</div>
                            {!isBettable && <div className="text-xs text-red-500 mt-1">베팅 마감</div>}
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
                        언더오버 배당 정보 없음
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
                  
                  return Object.entries(groupedTotals).map(([point, oddsPair]) => {
                    const overOdds = oddsPair.over?.averagePrice;
                    const underOdds = oddsPair.under?.averagePrice;
                    
                    return (
                      <div key={point} className="flex items-center gap-2">
                        <div className="w-16 text-base font-bold text-gray-800 text-center">
                          {point}
                        </div>
                        <button
                          onClick={() => {
                            if (isBettable && overOdds) {
                              toggleSelection({
                                team: `Over ${point}`,
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
                            isTeamSelected(`Over ${point}`, selectedMarket, game.id, parseFloat(point))
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                          } text-white`}
                          disabled={!isBettable || !overOdds}
                        >
                          <div className="font-bold">오버</div>
                          <div className="text-sm">{overOdds ? overOdds.toFixed(2) : 'N/A'}</div>
                        </button>
                        <button
                          onClick={() => {
                            if (isBettable && underOdds) {
                              toggleSelection({
                                team: `Under ${point}`,
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
                            isTeamSelected(`Under ${point}`, selectedMarket, game.id, parseFloat(point))
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                          } text-white`}
                          disabled={!isBettable || !underOdds}
                        >
                          <div className="font-bold">언더</div>
                          <div className="text-sm">{underOdds ? underOdds.toFixed(2) : 'N/A'}</div>
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
                  
                  // Home/Away 쌍으로 그룹화
                  const groupedSpreads: { [point: string]: { home?: any, away?: any } } = {};
                  
                  spreadEntries.forEach(([outcomeName, oddsData]) => {
                    if (outcomeName.includes(' -')) {
                      const point = outcomeName.split(' -')[1];
                      if (!groupedSpreads[point]) groupedSpreads[point] = {};
                      groupedSpreads[point].home = oddsData;
                    } else if (outcomeName.includes(' +')) {
                      const point = outcomeName.split(' +')[1];
                      if (!groupedSpreads[point]) groupedSpreads[point] = {};
                      groupedSpreads[point].away = oddsData;
                    }
                  });
                  
                  return Object.entries(groupedSpreads).map(([point, oddsPair]) => {
                    const homeOdds = oddsPair.home?.averagePrice;
                    const awayOdds = oddsPair.away?.averagePrice;
                    
                    return (
                      <div key={point} className="flex items-center gap-2">
                        <div className="w-16 text-base font-bold text-gray-800 text-center">
                          {point}
                        </div>
                        <button
                          onClick={() => {
                            if (isBettable && homeOdds) {
                              toggleSelection({
                                team: `${game.home_team} -${point}`,
                                odds: homeOdds,
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
                            isTeamSelected(`${game.home_team} -${point}`, selectedMarket, game.id, parseFloat(point))
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                          } text-white`}
                          disabled={!isBettable || !homeOdds}
                        >
                          <div className="font-bold">홈</div>
                          <div className="text-sm">{homeOdds ? homeOdds.toFixed(2) : 'N/A'}</div>
                        </button>
                        <button
                          onClick={() => {
                            if (isBettable && awayOdds) {
                              toggleSelection({
                                team: `${game.away_team} +${point}`,
                                odds: awayOdds,
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
                            isTeamSelected(`${game.away_team} +${point}`, selectedMarket, game.id, parseFloat(point))
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                          } text-white`}
                          disabled={!isBettable || !awayOdds}
                        >
                          <div className="font-bold">원정</div>
                          <div className="text-sm">{awayOdds ? awayOdds.toFixed(2) : 'N/A'}</div>
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

OddsList.displayName = 'OddsList';

export default OddsList; 