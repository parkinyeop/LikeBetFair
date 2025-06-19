import React, { useEffect, useState } from 'react';
import { useBetStore } from '../stores/useBetStore';

interface OddsListProps {
  sportKey: string;
}

interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

const marketKeyMap = { 
  '승/패': 'h2h', 
  '언더/오버': 'totals', 
  '핸디캡': 'spreads'
};

const OddsList: React.FC<OddsListProps> = ({ sportKey }) => {
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
        
        // 현재 시간 이후의 경기만 필터링
        const now = new Date();
        const filteredGames = data.filter((game: Game) => {
          const gameTime = new Date(game.commence_time);
          return gameTime > now;
        });
        
        // 중복 게임 제거 (home_team, away_team, commence_time 기준)
        const uniqueGamesMap = new Map();
        filteredGames.forEach((game: Game) => {
          const key = `${game.home_team}|${game.away_team}|${game.commence_time}`;
          if (!uniqueGamesMap.has(key)) {
            uniqueGamesMap.set(key, game);
          }
        });
        const uniqueGames = Array.from(uniqueGamesMap.values());
        // 시작 시간순으로 정렬
        uniqueGames.sort((a: Game, b: Game) => {
          return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
        });

        if (sportKey === "baseball_kbo" && filteredGames.length > 0) {
          console.log("KBO 상세 bookmakers 구조 sample:", JSON.stringify(filteredGames[0].bookmakers, null, 2));
        }
        setGames(uniqueGames);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch odds');
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
    const interval = setInterval(fetchOdds, 5 * 60 * 1000); // 5분마다 갱신

    return () => clearInterval(interval);
  }, [sportKey]);

  const isTeamSelected = (team: string, market: string, gameId: string) => {
    return selections.some(selection => selection.team === team && selection.market === market && selection.gameId === gameId);
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
        해당 리그의 경기 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {games.map((game) => {
        const gameTime = new Date(game.commence_time);
        const now = new Date();
        const marginMinutes = 10;
        const maxDays = 7;
        const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
        const isBettable = gameTime > new Date(now.getTime() + marginMinutes * 60000) && gameTime <= maxDate;
        const isTooFar = gameTime > maxDate;
        const selectedMarket = selectedMarkets[game.id] || '승/패';
        const marketKey = marketKeyMap[selectedMarket];
        const market = game.bookmakers[0]?.markets.find(m => m.key === marketKey);
        return (
          <div key={game.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
              <span className="text-sm">📅 {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} [{game.sport_title}]</span>
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
            {selectedMarket === '핸디캡' && (!market || !market.outcomes || market.outcomes.length === 0) ? (
              <div className="text-center text-gray-500 py-6">
                현재 핸디캡 배당 정보가 제공되지 않습니다.
              </div>
            ) : selectedMarket === '언더/오버' && (!market || !market.outcomes || market.outcomes.length === 0) ? (
              <div className="text-center text-gray-500 py-6">
                현재 언더/오버 배당 정보가 제공되지 않습니다.
              </div>
            ) : (selectedMarket === '언더/오버' || selectedMarket === '핸디캡') && market ? (
              <div className="overflow-x-auto">
                {(() => {
                  // 모든 bookmaker의 해당 마켓 outcomes를 합침
                  const allOutcomes: any[] = [];
                  game.bookmakers.forEach(bm => {
                    const m = bm.markets.find(m => m.key === marketKey);
                    if (m && m.outcomes) {
                      m.outcomes.forEach(outcome => {
                        allOutcomes.push({ ...outcome, bookmaker: bm.title });
                      });
                    }
                  });
                  // point별로 그룹핑 (Over/Under 또는 Home/Away 쌍)
                  const grouped = Object.values(
                    allOutcomes.reduce((acc, cur) => {
                      const key = cur.point ?? 'none';
                      acc[key] = acc[key] || [];
                      acc[key].push(cur);
                      return acc;
                    }, {} as Record<string, typeof allOutcomes>)
                  );
                  // 최고 배당 추출 및 payout 계산
                  const getBest = (arr: any[], type: string) => {
                    const filtered = arr.filter(o => o.name.toLowerCase().includes(type));
                    if (!filtered.length) return null;
                    return filtered.reduce((best, cur) => (cur.price > best.price ? cur : best), filtered[0]);
                  };
                  const calcPayout = (over: any, under: any) => {
                    if (!over || !under) return '-';
                    // payout = 1 / (1/over + 1/under)
                    const payout = 1 / (1/over.price + 1/under.price);
                    return (payout * 100).toFixed(1) + '%';
                  };
                  return (
                    <table className="min-w-full text-center border">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 border">라인</th>
                          {selectedMarket === '언더/오버' ? (
                            <>
                              <th className="px-2 py-1 border">Over (최고배당)</th>
                              <th className="px-2 py-1 border">Under (최고배당)</th>
                            </>
                          ) : selectedMarket === '핸디캡' ? (
                            <>
                              <th className="px-2 py-1 border">Home ({game.home_team})</th>
                              <th className="px-2 py-1 border">Away ({game.away_team})</th>
                            </>
                          ) : (
                            <>
                              <th className="px-2 py-1 border">Home ({game.home_team})</th>
                              <th className="px-2 py-1 border">Away ({game.away_team})</th>
                            </>
                          )}
                          <th className="px-2 py-1 border">Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped.length > 0 ? grouped.map((arr: any[], idx: number) => {
                          const point = arr[0]?.point ?? '-';
                          if (selectedMarket === '언더/오버') {
                            const bestOver = getBest(arr, 'over');
                            const bestUnder = getBest(arr, 'under');
                            return (
                              <tr key={idx}>
                                <td className="border px-2 py-1 font-semibold">{point}</td>
                                <td className="border px-2 py-1">
                                  {bestOver ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(bestOver.name + bestOver.bookmaker, selectedMarket, game.id) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestOver.price}
                                      onClick={() => isBettable && bestOver.price && toggleSelection({
                                        team: bestOver.name + bestOver.bookmaker,
                                        odds: bestOver.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestOver.point
                                      })}
                                    >
                                      {bestOver.bookmaker}: {bestOver.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">
                                  {bestUnder ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(bestUnder.name + bestUnder.bookmaker, selectedMarket, game.id) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestUnder.price}
                                      onClick={() => isBettable && bestUnder.price && toggleSelection({
                                        team: bestUnder.name + bestUnder.bookmaker,
                                        odds: bestUnder.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestUnder.point
                                      })}
                                    >
                                      {bestUnder.bookmaker}: {bestUnder.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">{calcPayout(bestOver, bestUnder)}</td>
                              </tr>
                            );
                          } else if (selectedMarket === '핸디캡') {
                            const bestHome = getBest(arr, 'home');
                            const bestAway = getBest(arr, 'away');
                            if (!bestHome && !bestAway) {
                              return (
                                <tr key={idx}>
                                  <td colSpan={4} className="border px-2 py-1 text-center text-gray-500">
                                    현재 핸디캡 배당 정보가 제공되지 않습니다.
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={idx}>
                                <td className="border px-2 py-1 font-semibold">{point}</td>
                                <td className="border px-2 py-1">
                                  {bestHome ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(bestHome.name + bestHome.bookmaker, selectedMarket, game.id) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestHome.price}
                                      onClick={() => isBettable && bestHome.price && toggleSelection({
                                        team: bestHome.name + bestHome.bookmaker,
                                        odds: bestHome.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestHome.point
                                      })}
                                    >
                                      {bestHome.bookmaker}: {bestHome.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">
                                  {bestAway ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(bestAway.name + bestAway.bookmaker, selectedMarket, game.id) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestAway.price}
                                      onClick={() => isBettable && bestAway.price && toggleSelection({
                                        team: bestAway.name + bestAway.bookmaker,
                                        odds: bestAway.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestAway.point
                                      })}
                                    >
                                      {bestAway.bookmaker}: {bestAway.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">{calcPayout(bestHome, bestAway)}</td>
                              </tr>
                            );
                          } else {
                            const bestHome = getBest(arr, 'home');
                            const bestAway = getBest(arr, 'away');
                            return (
                              <tr key={idx}>
                                <td className="border px-2 py-1 font-semibold">{point}</td>
                                <td className="border px-2 py-1">
                                  {bestHome ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(bestHome.name + bestHome.bookmaker, selectedMarket, game.id) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestHome.price}
                                      onClick={() => isBettable && bestHome.price && toggleSelection({
                                        team: bestHome.name + bestHome.bookmaker,
                                        odds: bestHome.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestHome.point
                                      })}
                                    >
                                      {bestHome.bookmaker}: {bestHome.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">
                                  {bestAway ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(bestAway.name + bestAway.bookmaker, selectedMarket, game.id) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestAway.price}
                                      onClick={() => isBettable && bestAway.price && toggleSelection({
                                        team: bestAway.name + bestAway.bookmaker,
                                        odds: bestAway.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestAway.point
                                      })}
                                    >
                                      {bestAway.bookmaker}: {bestAway.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">{calcPayout(bestHome, bestAway)}</td>
                              </tr>
                            );
                          }
                        }) : (
                          <tr>
                            <td colSpan={4} className="border px-2 py-1 text-center text-gray-500">
                              {selectedMarket === '핸디캡' 
                                ? '현재 핸디캡 배당 정보가 제공되지 않습니다.'
                                : '현재 배당 정보가 제공되지 않습니다.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            ) : selectedMarket === '승/패' ? (
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  // 모든 bookmaker의 h2h outcomes를 합침
                  const allOutcomes: any[] = [];
                  game.bookmakers.forEach(bm => {
                    const m = bm.markets.find(m => m.key === 'h2h');
                    if (m && m.outcomes) {
                      m.outcomes.forEach(outcome => {
                        allOutcomes.push({ ...outcome, bookmaker: bm.title });
                      });
                    }
                  });
                  // 팀별로 최고 배당 추출
                  const homeBest = allOutcomes.filter(o => o.name === game.home_team)
                    .sort((a, b) => b.price - a.price)[0];
                  const awayBest = allOutcomes.filter(o => o.name === game.away_team)
                    .sort((a, b) => b.price - a.price)[0];
                  return (
                    <>
                      <button
                        onClick={() => isBettable && homeBest && toggleSelection({
                          team: homeBest.name + homeBest.bookmaker,
                          odds: homeBest.price,
                          desc: `${game.home_team} vs ${game.away_team}`,
                          commence_time: game.commence_time,
                          market: selectedMarket,
                          gameId: game.id,
                          ...(homeBest.point && { point: homeBest.point })
                        })}
                        className={`w-full p-3 rounded-lg text-center transition-colors ${
                          isTeamSelected(homeBest?.name + homeBest?.bookmaker, selectedMarket, game.id)
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                        } text-white`}
                        disabled={!isBettable || !homeBest}
                      >
                        <div className="font-bold">
                          {game.home_team}
                        </div>
                        <div className="text-sm">
                          {homeBest ? `${homeBest.bookmaker}: ${homeBest.price}` : 'N/A'}
                        </div>
                        {!isBettable && !isTooFar && <div className="text-xs text-red-500 mt-1">마감</div>}
                        {isTooFar && <div className="text-xs text-gray-400 mt-1">오픈 예정</div>}
                      </button>
                      <button
                        onClick={() => isBettable && awayBest && toggleSelection({
                          team: awayBest.name + awayBest.bookmaker,
                          odds: awayBest.price,
                          desc: `${game.home_team} vs ${game.away_team}`,
                          commence_time: game.commence_time,
                          market: selectedMarket,
                          gameId: game.id,
                          ...(awayBest.point && { point: awayBest.point })
                        })}
                        className={`w-full p-3 rounded-lg text-center transition-colors ${
                          isTeamSelected(awayBest?.name + awayBest?.bookmaker, selectedMarket, game.id)
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                        } text-white`}
                        disabled={!isBettable || !awayBest}
                      >
                        <div className="font-bold">
                          {game.away_team}
                        </div>
                        <div className="text-sm">
                          {awayBest ? `${awayBest.bookmaker}: ${awayBest.price}` : 'N/A'}
                        </div>
                        {!isBettable && !isTooFar && <div className="text-xs text-red-500 mt-1">마감</div>}
                        {isTooFar && <div className="text-xs text-gray-400 mt-1">오픈 예정</div>}
                      </button>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default OddsList; 