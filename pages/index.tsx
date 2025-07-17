// File: pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import GameCard from "../components/GameCard";
import { SPORTS_TREE, getSportKey, getSeasonInfo, getSeasonStatusBadge, getSeasonStatusStyle, SPORT_CATEGORIES, getDisplayNameFromSportKey } from "../config/sportsMapping";
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
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
              const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
              const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능
              
              // 1. 기본 필터링: 오늘부터 7일 후까지의 경기
              const filteredGames = data.filter((game: any) => {
                const gameTime = new Date(game.commence_time);
                return gameTime >= startOfToday && gameTime <= maxDate;
              });
              
              // 2. 베팅 가능 여부 분류 및 정렬
              const categorizedGames = filteredGames.map((game: any) => {
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
              
              if (sortedGames.length > 0) {
                gamesData[displayName] = sortedGames;
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
        const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능
        
        // 1. 기본 필터링: 오늘부터 7일 후까지의 경기
        const filteredGames = data.filter((game: any) => {
          const gameTime = new Date(game.commence_time);
          return gameTime >= startOfToday && gameTime <= maxDate;
        });
        
        // 2. 중복 제거
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
        
        // 3. 베팅 가능 여부 분류 및 정렬
        const categorizedGames = uniqueGames.map((game: any) => {
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
        
        // 4. 정렬: 베팅 가능한 경기 우선, 그 다음 시간순
        const sortedGames = categorizedGames.sort((a, b) => {
          // 베팅 가능한 경기가 우선
          if (a.isBettable && !b.isBettable) return -1;
          if (!a.isBettable && b.isBettable) return 1;
          
          // 둘 다 베팅 가능하거나 둘 다 불가능한 경우, 시간순 정렬
          return a.gameTime.getTime() - b.gameTime.getTime();
        });
        
        if (selectedCategory === "KBO" && filteredGames.length > 0) {
          console.log("KBO bookmakers 구조 sample:", filteredGames[0].bookmakers);
        }
        setGames(sortedGames);
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
    let categoryToSet;
    
    if (leagueName) {
      sportKey = getSportKey(leagueName);
      // SPORTS_TREE를 사용하여 해당 스포츠가 속한 메인 카테고리를 찾음
      const parentCategory = Object.entries(SPORTS_TREE).find(([main, subs]) => 
        subs.includes(leagueName)
      );
      
      if (parentCategory) {
        // "축구 > K리그" 형태로 설정
        categoryToSet = `${parentCategory[0]} > ${leagueName}`;
      } else {
        // 메인 카테고리에 속하지 않는 경우
        categoryToSet = leagueName;
      }
    } else {
      sportKey = getSportKey(selectedCategory);
      const displayName = getDisplayNameFromSportKey(selectedCategory);
      if (displayName) {
        // SPORTS_TREE를 사용하여 해당 스포츠가 속한 메인 카테고리를 찾음
        const parentCategory = Object.entries(SPORTS_TREE).find(([main, subs]) => 
          subs.includes(displayName)
        );
        
        if (parentCategory) {
          // "축구 > K리그" 형태로 설정
          categoryToSet = `${parentCategory[0]} > ${displayName}`;
        } else {
          // 메인 카테고리에 속하지 않는 경우
          categoryToSet = displayName;
        }
      }
    }
    
    // 사이드바 카테고리 동기화를 위한 이벤트 발생
    if (categoryToSet) {
      window.dispatchEvent(new CustomEvent('categorySelected', { detail: { category: categoryToSet } }));
    }
    
    // 페이지 이동
    if (sportKey) {
      router.push(`/odds/${sportKey}`);
    }
  };

  // 카테고리 선택 핸들러 (사이드바 자동 이동용)
  const handleCategorySelect = (category: string) => {
    // 전역 이벤트를 발생시켜 Layout에서 처리하도록 함
    window.dispatchEvent(new CustomEvent('categorySelected', { detail: { category } }));
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
                // officialOdds 사용 (백엔드에서 반환하는 형태)
                const h2hOdds = game.officialOdds?.h2h || {};
                const totalsOdds = game.officialOdds?.totals || {};
                const isBettable = game.isBettable !== undefined ? game.isBettable : true;
                
                return (
                  <div 
                    key={`${leagueName}-${index}`} 
                    onClick={() => handleGameClick(game, leagueName)}
                    className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${!isBettable ? 'opacity-60' : ''}`}
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
                          {!isBettable && (
                            <div className="text-xs text-red-500 mt-1">
                              ⏰ 베팅 마감
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 메인 배당율 정보 - 크고 눈에 띄게 */}
                      <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                        {Object.keys(h2hOdds).length > 0 && (
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
                                  const homeOdds = h2hOdds[game.home_team];
                                  const awayOdds = h2hOdds[game.away_team];
                                  const drawOdds = Object.entries(h2hOdds).find(([name, _]) => 
                                    name.toLowerCase().includes('draw') || name === 'Draw' || name === 'Tie'
                                  );
                                  
                                  const outcomes = [
                                    { name: game.home_team, odds: homeOdds },
                                    { name: '무승부', odds: drawOdds?.[1] },
                                    { name: game.away_team, odds: awayOdds }
                                  ].filter(outcome => outcome.odds);
                                  
                                  return outcomes.map((outcome: any, idx: number) => (
                                    <div key={idx} className="flex-1 bg-white border-2 border-blue-200 rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                                      <div className="text-xs text-gray-600 truncate">{outcome.name}</div>
                                      <div className="text-lg font-bold text-blue-600">{outcome.odds.averagePrice.toFixed(2)}</div>
                                    </div>
                                  ));
                                } else {
                                  // 다른 스포츠: 기존 방식 (순서대로 표시)
                                  return Object.entries(h2hOdds).map(([name, oddsData]: [string, any], idx: number) => (
                                    <div key={idx} className="flex-1 bg-white border-2 border-blue-200 rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                                      <div className="text-xs text-gray-600 truncate">{name}</div>
                                      <div className="text-lg font-bold text-blue-600">{oddsData.averagePrice.toFixed(2)}</div>
                                    </div>
                                  ));
                                }
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {Object.keys(totalsOdds).length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">📊 오버/언더</div>
                            <div className="flex gap-2">
                              {Object.entries(totalsOdds).slice(0, 2).map(([name, oddsData]: [string, any], idx: number) => (
                                <div key={idx} className="flex-1 bg-white border-2 border-green-200 rounded-lg p-2 text-center hover:border-green-400 transition-colors">
                                  <div className="text-xs text-gray-600">{name}</div>
                                  <div className="text-lg font-bold text-green-600">{oddsData.averagePrice.toFixed(2)}</div>
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
          {/* 카테고리별 그룹 UI로 변경 */}
          <div className="mb-6 space-y-6">
            {Object.entries(SPORTS_TREE).map(([mainCategory, subCategories]) => (
              <div key={mainCategory} className="mb-4">
                <div className="text-lg font-bold mb-2 text-blue-800">{mainCategory}</div>
                <div className="flex flex-wrap gap-2">
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
                  <span className="text-xs px-2 py-1 rounded-full" style={statusStyle || undefined}>
                    {statusBadge}
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
                    sportKey={currentSportKey}
                    onCategorySelect={handleCategorySelect}
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