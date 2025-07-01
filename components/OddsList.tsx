import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { useBetStore } from '../stores/useBetStore';
import GameTimeDisplay from './GameTimeDisplay';
import { getSeasonInfo } from '../config/sportsMapping';

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

// 팀명 정규화(매핑) 함수 예시
const normalizeTeamName = (name: string) => {
  // TODO: 실제 매핑 테이블로 대체
  const map: Record<string, string> = {
    "Gimcheon Sangmu": "Sangju Sangmu FC",
    "Daejeon": "Daejeon Citizen",
    "Jeju SK": "Jeju United FC",
    // ... 추가 매핑
  };
  return map[name] || name;
};

const OddsList: React.FC<OddsListProps> = memo(({ sportKey }) => {
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
        const filteredGames = data.filter((game: Game) => {
          const gameTime = new Date(game.commence_time);
          return gameTime >= startOfToday && gameTime <= maxDate;
        });
        setGames(filteredGames);
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

  const isTeamSelected = (team: string, market: string, gameId: string, point?: number) => {
    return selections.some(selection =>
      selection.team === team &&
      selection.market === market &&
      selection.gameId === gameId &&
      (point === undefined || selection.point === point)
    );
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

  // 시즌 상태 판단 로직
  const getSeasonStatus = (sportKey: string) => {
    const seasonInfo = getSeasonInfo(sportKey);
    return seasonInfo?.status || 'active';
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  if (games.length === 0) {
    const seasonInfo = getSeasonInfo(sportKey);
    const sportName = seasonInfo?.name || sportKey.split('_').pop()?.toUpperCase() || sportKey;
    
    if (seasonInfo?.status === 'offseason') {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🏖️ 시즌 오프</h3>
          <p className="text-gray-600 mb-4">
            {seasonInfo.description}
          </p>
          <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              {seasonInfo.nextSeasonStart ? (
                <>
                  <strong>다음 시즌 시작:</strong><br/>
                  {formatDate(seasonInfo.nextSeasonStart)}
                </>
              ) : (
                <>
                  <strong>새로운 시즌이 시작되면</strong><br/>
                  배당율이 다시 제공됩니다.
                </>
              )}
            </p>
          </div>
        </div>
      );
    } else if (seasonInfo?.status === 'break') {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">⏸️ 시즌 휴식기</h3>
          <p className="text-gray-600 mb-4">
            {seasonInfo.description}
          </p>
          <div className="bg-green-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-green-800">
              {seasonInfo.breakPeriod?.end ? (
                <>
                  <strong>시즌 재개:</strong><br/>
                  {formatDate(seasonInfo.breakPeriod.end)}
                </>
              ) : (
                <>
                  <strong>곧 시즌이 재개됩니다</strong><br/>
                  재개 시 배당율이 업데이트됩니다.
                </>
              )}
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 경기 준비 중</h3>
          <p className="text-gray-600 mb-4">
            현재 {sportName} 리그의 예정된 경기가 없습니다.
          </p>
          <div className="bg-green-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-green-800">
              <strong>새로운 경기 일정이 발표되면</strong><br/>
              자동으로 배당율이 업데이트됩니다.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4 h-full flex-1 min-h-0 px-1 overflow-y-auto">
      {games.map((game) => {
        if (game.sport_key === "baseball_kbo") {
          console.log("[KBO] 렌더링 map에서 만난 경기:", game);
        }
        const gameTime = new Date(game.commence_time); // 현지 시간 기준
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
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
              <div className="text-right">
                <GameTimeDisplay 
                  time={game.commence_time} 
                  showStatus={true} 
                />
                <div className="text-xs text-gray-500 mt-1">[{game.sport_title}]</div>
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
                  // 라인(point) 기준 오름차순 정렬
                  grouped.sort((a, b) => {
                    const pa = (a as any[])[0]?.point ?? 0;
                    const pb = (b as any[])[0]?.point ?? 0;
                    return pa - pb;
                  });
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
                                      className={`w-full py-1 rounded ${isTeamSelected(normalizeTeamName(bestOver.name), selectedMarket, game.id, bestOver.point) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestOver.price}
                                      onClick={() => isBettable && bestOver.price && toggleSelection({
                                        team: normalizeTeamName(bestOver.name),
                                        odds: bestOver.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestOver.point
                                      })}
                                    >
                                      {bestOver.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">
                                  {bestUnder ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(normalizeTeamName(bestUnder.name), selectedMarket, game.id, bestUnder.point) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestUnder.price}
                                      onClick={() => isBettable && bestUnder.price && toggleSelection({
                                        team: normalizeTeamName(bestUnder.name),
                                        odds: bestUnder.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestUnder.point
                                      })}
                                    >
                                      {bestUnder.price}
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
                                      className={`w-full py-1 rounded ${isTeamSelected(normalizeTeamName(bestHome.name), selectedMarket, game.id, bestHome.point) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestHome.price}
                                      onClick={() => isBettable && bestHome.price && toggleSelection({
                                        team: normalizeTeamName(bestHome.name),
                                        odds: bestHome.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestHome.point
                                      })}
                                    >
                                      {bestHome.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">
                                  {bestAway ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(normalizeTeamName(bestAway.name), selectedMarket, game.id, bestAway.point) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestAway.price}
                                      onClick={() => isBettable && bestAway.price && toggleSelection({
                                        team: normalizeTeamName(bestAway.name),
                                        odds: bestAway.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestAway.point
                                      })}
                                    >
                                      {bestAway.price}
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
                                      className={`w-full py-1 rounded ${isTeamSelected(normalizeTeamName(bestHome.name), selectedMarket, game.id, bestHome.point) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestHome.price}
                                      onClick={() => isBettable && bestHome.price && toggleSelection({
                                        team: normalizeTeamName(bestHome.name),
                                        odds: bestHome.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestHome.point
                                      })}
                                    >
                                      {bestHome.price}
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="border px-2 py-1">
                                  {bestAway ? (
                                    <button
                                      className={`w-full py-1 rounded ${isTeamSelected(normalizeTeamName(bestAway.name), selectedMarket, game.id, bestAway.point) ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                      disabled={!isBettable || !bestAway.price}
                                      onClick={() => isBettable && bestAway.price && toggleSelection({
                                        team: normalizeTeamName(bestAway.name),
                                        odds: bestAway.price,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: selectedMarket,
                                        gameId: game.id,
                                        point: bestAway.point
                                      })}
                                    >
                                      {bestAway.price}
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
              <div className={`grid gap-2 ${
                // 축구는 무승부가 있으므로 3열, 다른 스포츠는 2열
                sportKey.startsWith('soccer_') ? 'grid-cols-3' : 'grid-cols-2'
              }`}>
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
                  
                  // 축구의 경우 Home-Draw-Away 순서로 정렬
                  let sortedOutcomes: any[] = [];
                  if (sportKey.startsWith('soccer_')) {
                    // 홈팀, 무승부, 원정팀 순서로 정렬
                    const homeBest = allOutcomes.filter(o => o.name === game.home_team)
                      .sort((a, b) => b.price - a.price)[0];
                    const drawBest = allOutcomes.filter(o => o.name.toLowerCase().includes('draw') || o.name === 'Draw' || o.name === 'Tie')
                      .sort((a, b) => b.price - a.price)[0];
                    const awayBest = allOutcomes.filter(o => o.name === game.away_team)
                      .sort((a, b) => b.price - a.price)[0];
                    
                    sortedOutcomes = [homeBest, drawBest, awayBest].filter(Boolean);
                  } else {
                    // 다른 스포츠는 홈팀, 원정팀만
                    const homeBest = allOutcomes.filter(o => o.name === game.home_team)
                      .sort((a, b) => b.price - a.price)[0];
                    const awayBest = allOutcomes.filter(o => o.name === game.away_team)
                      .sort((a, b) => b.price - a.price)[0];
                    
                    sortedOutcomes = [homeBest, awayBest].filter(Boolean);
                  }

                  return (
                    <>
                      {sortedOutcomes.map((outcome, idx) => {
                        if (!outcome) return null;
                        
                        const isDrawOutcome = outcome.name.toLowerCase().includes('draw') || outcome.name === 'Draw' || outcome.name === 'Tie';
                        const teamDisplayName = isDrawOutcome ? '무승부' : outcome.name;
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => isBettable && outcome && toggleSelection({
                              team: normalizeTeamName(outcome.name),
                              odds: outcome.price,
                              desc: `${game.home_team} vs ${game.away_team}`,
                              commence_time: game.commence_time,
                              market: selectedMarket,
                              gameId: game.id,
                              ...(outcome.point && { point: outcome.point })
                            })}
                            className={`w-full p-3 rounded-lg text-center transition-colors ${
                              isTeamSelected(normalizeTeamName(outcome?.name), selectedMarket, game.id, outcome.point)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                            } text-white`}
                            disabled={!isBettable || !outcome}
                          >
                            <div className="font-bold">
                              {teamDisplayName}
                            </div>
                            <div className="text-sm">
                              {outcome ? outcome.price : 'N/A'}
                            </div>
                            {!isBettable && !isTooFar && <div className="text-xs text-red-500 mt-1">마감</div>}
                            {isTooFar && <div className="text-xs text-gray-400 mt-1">오픈 예정</div>}
                          </button>
                        );
                      })}
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
});

OddsList.displayName = 'OddsList';

export default OddsList; 