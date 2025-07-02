// File: pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import GameCard from "../components/GameCard";
import { SPORTS_TREE, getSportKey, getSeasonInfo, getSeasonStatusBadge, getSeasonStatusStyle, SPORT_CATEGORIES } from "../config/sportsMapping";
import { API_CONFIG, TIME_CONFIG, buildApiUrl, isBettingAllowed } from "../config/apiConfig";
import GameTimeDisplay from "../components/GameTimeDisplay";

const initialGameData: Record<string, { teams: string; time: string }[]> = {
  "EPL": [
    { teams: "맨체스터 유나이티드 vs 리버풀", time: "2024-03-20 20:00" },
    { teams: "아스널 vs 첼시", time: "2024-03-21 19:45" },
  ],
  "NBA": [
    { teams: "LA 레이커스 vs 골든스테이트", time: "2024-03-20 11:30" },
    { teams: "보스턴 vs 마이애미", time: "2024-03-21 08:00" },
  ],
  "MLB": [
    { teams: "LA 다저스 vs 뉴욕 양키스", time: "2024-03-20 10:00" },
    { teams: "시카고 컵스 vs 세인트루이스", time: "2024-03-21 09:00" },
  ],
};

export default function Home() {
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("KBO");
  const [currentSportKey, setCurrentSportKey] = useState<string>("");
  const [viewMode, setViewMode] = useState<'today' | 'league'>('today');
  const [todayGames, setTodayGames] = useState<Record<string, any[]>>({});
  const [todayLoading, setTodayLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchTodayGames = async () => {
      if (viewMode !== 'today') return;
      
      try {
        setTodayLoading(true);
        const activeLeagues = Object.entries(SPORT_CATEGORIES).filter(([_, config]) => {
          const seasonInfo = getSeasonInfo(config.sportKey);
          return seasonInfo?.status === 'active';
        });

        const gamesData: Record<string, any[]> = {};
        
        for (const [displayName, config] of activeLeagues) {
          try {
            const apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${config.sportKey}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
              const data = await response.json();
              
              const now = new Date();
              const tomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
              const filteredGames = data.filter((game: any) => {
                const gameTime = new Date(game.commence_time);
                return gameTime >= now && gameTime <= tomorrow;
              });
              
              if (filteredGames.length > 0) {
                filteredGames.sort((a: any, b: any) => 
                  new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
                );
                gamesData[displayName] = filteredGames;
              }
            }
          } catch (err) {
            console.error(`Error fetching ${displayName}:`, err);
          }
        }
        
        setTodayGames(gamesData);
        setTodayLoading(false);
      } catch (err) {
        console.error('Error fetching today games:', err);
        setTodayLoading(false);
      }
    };

    fetchTodayGames();
  }, [viewMode]);

  useEffect(() => {
    const fetchGames = async () => {
      if (viewMode !== 'league' || selectedCategory === currentSportKey) return;
      
      try {
        setLoading(true);
        const sportKey = getSportKey(selectedCategory);
        if (!sportKey) {
          setError('Invalid sport category');
          setLoading(false);
          return;
        }

        console.log(`Fetching data for ${selectedCategory} with sportKey: ${sportKey}`);
        const apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${sportKey}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch games for ${selectedCategory}`);
        }
        
        const data = await response.json();
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const maxDate = new Date(now.getTime() + TIME_CONFIG.BETTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const filteredGames = data.filter((game: any) => {
          const gameTime = new Date(game.commence_time);
          return gameTime >= startOfToday && gameTime <= maxDate;
        });
        
        const uniqueGamesMap = new Map();
        filteredGames.forEach((game: any) => {
          const key = `${game.home_team}|${game.away_team}|${game.commence_time}`;
          if (!uniqueGamesMap.has(key)) {
            uniqueGamesMap.set(key, game);
          } else {
            const prev = uniqueGamesMap.get(key);
            if (
              (!prev.bookmakers && game.bookmakers) ||
              (Array.isArray(game.bookmakers) && Array.isArray(prev.bookmakers) && game.bookmakers.length > prev.bookmakers.length)
            ) {
              uniqueGamesMap.set(key, game);
            }
          }
        });
        const uniqueGames = Array.from(uniqueGamesMap.values());
        uniqueGames.sort((a: any, b: any) => {
          return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
        });
        
        if (selectedCategory === "KBO" && filteredGames.length > 0) {
          console.log("KBO bookmakers 구조 sample:", filteredGames[0].bookmakers);
        }
        setGames(uniqueGames);
        setCurrentSportKey(selectedCategory);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchGames();
  }, [selectedCategory, currentSportKey, viewMode]);

  const handleSelect = (match: string, team: string) => {
    setSelectedMatches((prev) => ({ ...prev, [match]: team }));
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setViewMode('league');
  };

  const handleGameClick = (game: any, leagueName?: string) => {
    let sportKey;
    if (leagueName) {
      sportKey = getSportKey(leagueName);
    } else {
      sportKey = getSportKey(selectedCategory);
    }
    
    if (sportKey) {
      router.push(`/odds/${sportKey}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  // 리그 선택 버튼 스타일 함수
  const getButtonStyle = (category: string, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-blue-600 text-white border-blue-600';
    }
    
    const sportKey = getSportKey(category);
    const seasonInfo = getSeasonInfo(sportKey);
    
    if (!seasonInfo) {
      return 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300';
    }
    
    switch (seasonInfo.status) {
      case 'active':
        return 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100';
      case 'break':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100';
      case 'offseason':
        return 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100';
      default:
        return 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300';
    }
  };

  const TodayBettingView = () => {
    if (todayLoading) return <div className="text-center py-8">로딩 중...</div>;
    
    const activeLeagues = Object.keys(todayGames);
    
    if (activeLeagues.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📅 오늘 예정된 경기가 없습니다</h3>
          <p className="text-gray-600 mb-4">현재 활성화된 리그에 오늘~내일 경기가 없습니다.</p>
        </div>
      );
    }

    const totalGames = activeLeagues.reduce((total, league) => total + todayGames[league].length, 0);

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">📊 Today Betting 요약</h2>
              <p className="text-sm text-gray-600">활성 리그 {activeLeagues.length}개 · 총 {totalGames}경기</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{totalGames}</div>
              <div className="text-xs text-gray-500">베팅 가능 경기</div>
            </div>
          </div>
        </div>

        {activeLeagues.map(leagueName => (
          <div key={leagueName} className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{leagueName}</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {todayGames[leagueName].length}경기
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {todayGames[leagueName].map((game, index) => {
                const mainMarket = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'h2h');
                const totalsMarket = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'totals');
                
                return (
                  <div 
                    key={`${leagueName}-${index}`} 
                    onClick={() => handleGameClick(game, leagueName)}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="space-y-3">
                      {/* 경기 정보 */}
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-lg text-gray-900">
                            🏟️ {game.home_team} vs {game.away_team}
                          </div>
                          <div className="text-xs text-gray-500">[{leagueName}]</div>
                        </div>
                        <div className="text-right">
                          <GameTimeDisplay 
                            time={game.commence_time} 
                            showStatus={true} 
                          />
                        </div>
                      </div>
                      
                      {/* 메인 배당율 정보 - 크고 눈에 띄게 */}
                      <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                        {mainMarket && mainMarket.outcomes && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">⚔️ 승부 배당</div>
                            <div className="flex gap-2">
                              {(() => {
                                // 리그명에서 sportKey 추출 (K리그 -> soccer_korea_kleague1 등)
                                const isSoccer = leagueName.includes('리그') || leagueName.includes('세리에') || 
                                                leagueName.includes('MLS') || leagueName.includes('아르헨티나') || 
                                                leagueName.includes('중국') || leagueName.includes('라리가') || 
                                                leagueName.includes('분데스리가');
                                
                                if (isSoccer) {
                                  // 축구: Home-Draw-Away 순서로 정렬
                                  const homeBest = mainMarket.outcomes.find((o: any) => o.name === game.home_team);
                                  const drawBest = mainMarket.outcomes.find((o: any) => 
                                    o.name.toLowerCase().includes('draw') || o.name === 'Draw' || o.name === 'Tie'
                                  );
                                  const awayBest = mainMarket.outcomes.find((o: any) => o.name === game.away_team);
                                  
                                  const sortedOutcomes = [homeBest, drawBest, awayBest].filter(Boolean);
                                  
                                  return sortedOutcomes.map((outcome: any, idx: number) => {
                                    const isDrawOutcome = outcome.name.toLowerCase().includes('draw') || 
                                                         outcome.name === 'Draw' || outcome.name === 'Tie';
                                    const teamDisplayName = isDrawOutcome ? '무승부' : outcome.name;
                                    
                                    return (
                                      <div key={idx} className="flex-1 bg-white border-2 border-blue-200 rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                                        <div className="text-xs text-gray-600 truncate">{teamDisplayName}</div>
                                        <div className="text-lg font-bold text-blue-600">{outcome.price}</div>
                                      </div>
                                    );
                                  });
                                } else {
                                  // 다른 스포츠: 기존 방식 (순서대로 표시)
                                  return mainMarket.outcomes.map((outcome: any, idx: number) => (
                                    <div key={idx} className="flex-1 bg-white border-2 border-blue-200 rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                                      <div className="text-xs text-gray-600 truncate">{outcome.name}</div>
                                      <div className="text-lg font-bold text-blue-600">{outcome.price}</div>
                                    </div>
                                  ));
                                }
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {totalsMarket && totalsMarket.outcomes && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">📊 오버/언더 {totalsMarket.outcomes[0]?.point || ''}</div>
                            <div className="flex gap-2">
                              {totalsMarket.outcomes.slice(0, 2).map((outcome: any, idx: number) => (
                                <div key={idx} className="flex-1 bg-white border-2 border-green-200 rounded-lg p-2 text-center hover:border-green-400 transition-colors">
                                  <div className="text-xs text-gray-600">{outcome.name} {outcome.point}</div>
                                  <div className="text-lg font-bold text-green-600">{outcome.price}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SeasonInfoDisplay = ({ category }: { category: string }) => {
    const sportKey = getSportKey(category);
    const seasonInfo = getSeasonInfo(sportKey);
    
    if (!seasonInfo) return null;

    if (seasonInfo.status === 'offseason') {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🏖️ {category} 시즌 오프</h3>
          <p className="text-gray-600 mb-4">{seasonInfo.description}</p>
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
    } else if (seasonInfo.status === 'break') {
      return (
        <div className="text-center py-12 bg-yellow-50 rounded-lg">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">⏸️ {category} 시즌 휴식기</h3>
          <p className="text-gray-600 mb-4">{seasonInfo.description}</p>
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
        <div className="text-center py-8 text-gray-500">
          현재 {category}에 대한 예정된 경기가 없습니다.
        </div>
      );
    }
  };

  if (viewMode === 'league' && loading) return <div>Loading...</div>;
  if (viewMode === 'league' && error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
        홈화면은 정보 제공용입니다. 경기를 클릭하면 상세 페이지로 이동합니다.
      </div>
      
      <h1 className="text-2xl font-bold mb-6">스포츠 베팅</h1>
      
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setViewMode('today')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🎯 Today Betting
        </button>
        <button
          onClick={() => setViewMode('league')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'league'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🏟️ 리그별 보기
        </button>
      </div>

      {viewMode === 'today' ? (
        <TodayBettingView />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(SPORTS_TREE).map(([mainCategory, subCategories]) => (
              <div key={mainCategory} className="flex flex-wrap gap-1">
                {subCategories.map((category) => {
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
                                ? 'bg-blue-50 border-blue-400 text-blue-900 hover:bg-blue-100 hover:border-blue-500'
                                : seasonInfo.status === 'break'
                                ? 'bg-yellow-50 border-yellow-400 text-yellow-900 hover:bg-yellow-100 hover:border-yellow-500'
                                : 'bg-gray-50 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-500')
                            : 'bg-gray-200 border-gray-400 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{category}</span>
                        {statusBadge && seasonInfo && seasonInfo.status !== 'active' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            selectedCategory === category 
                              ? 'bg-white/20 text-white' 
                              : statusBadge.className
                          }`}>
                            {seasonInfo.status === 'break' ? '휴식' : '오프'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-700">
                현재 선택: {selectedCategory}
              </h2>
              {(() => {
                const sportKey = getSportKey(selectedCategory);
                const seasonInfo = getSeasonInfo(sportKey);
                const statusBadge = seasonInfo ? getSeasonStatusBadge(seasonInfo.status) : null;
                const statusStyle = seasonInfo ? getSeasonStatusStyle(seasonInfo.status) : null;
                
                return statusBadge ? (
                  <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.className}`}>
                    {statusBadge.text}
                  </span>
                ) : null;
              })()}
            </div>
            <p className="text-sm text-gray-500">
              총 {games.length}개의 경기가 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {games.length === 0 ? (
              <SeasonInfoDisplay category={selectedCategory} />
            ) : (
              games.map((game, index) => (
                <div key={index} onClick={() => handleGameClick(game)} style={{ cursor: 'pointer' }}>
                  <GameCard 
                    teams={`${game.home_team} vs ${game.away_team}`}
                    time={game.commence_time}
                    selectedTeam={""}
                    onSelect={() => {}}
                    bookmakers={game.bookmakers}
                    infoOnly={true}
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}