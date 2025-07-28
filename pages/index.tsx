// File: pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import GameCard from "../components/GameCard";
import { SPORTS_TREE, getSportKey, getSeasonInfo, getSeasonStatusBadge, getSeasonStatusStyle, SPORT_CATEGORIES, getDisplayNameFromSportKey } from "../config/sportsMapping";
import { API_CONFIG, TIME_CONFIG, buildApiUrl, isBettingAllowed } from "../config/apiConfig";
import GameTimeDisplay from "../components/GameTimeDisplay";
import { useBetStore } from '../stores/useBetStore';
import { normalizeTeamNameForComparison } from '../utils/matchSportsbookGame';
import { convertUtcToLocal, getCurrentLocalTime } from '../utils/timeUtils';

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
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("야구");
  const [currentSportKey, setCurrentSportKey] = useState<string>("");
  const [viewMode, setViewMode] = useState<'today' | 'league'>('today');
  const [todayGames, setTodayGames] = useState<Record<string, any[]>>({});
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayFlatGames, setTodayFlatGames] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchTodayGames = async () => {
      if (viewMode !== 'today') return;
      
      try {
        setTodayLoading(true);
        const activeLeagues = Object.entries(SPORT_CATEGORIES).filter(([_, config]) => {
          const seasonInfo = getSeasonInfo(config.sportKey);
          const isActive = seasonInfo?.status === 'active';
          console.log(`🔍 Today Betting - ${config.sportKey}: ${seasonInfo?.status} (활성: ${isActive})`);
          return isActive;
        });
        
        console.log(`🔍 Today Betting - 활성 리그 수:`, activeLeagues.length);
        console.log(`🔍 Today Betting - 활성 리그 목록:`, activeLeagues.map(([name, config]) => `${name}(${config.sportKey})`));

        const gamesData: Record<string, any[]> = {};
        
        for (const [displayName, config] of activeLeagues) {
          let apiUrl = '';
          try {
            console.log(`🔍 Today Betting - ${displayName} API 호출:`, config.sportKey);
            apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${config.sportKey}`);
            console.log(`🔍 API URL:`, apiUrl);
            const response = await fetch(apiUrl);
            console.log(`🔍 ${displayName} API 응답 상태:`, response.status, response.statusText);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`🔍 Today Betting - ${displayName} API 응답:`, data.length, '개 경기');
              
              // 모든 활성 리그에 대해 상세 로그
              console.log(`🔍 ${displayName} API 응답 상세:`, {
                totalGames: data.length,
                firstGame: data[0] ? {
                  home_team: data[0].home_team,
                  away_team: data[0].away_team,
                  commence_time: data[0].commence_time,
                  hasOfficialOdds: !!data[0].officialOdds,
                  hasBookmakers: !!data[0].bookmakers,
                  officialOddsKeys: data[0].officialOdds ? Object.keys(data[0].officialOdds) : [],
                  bookmakersCount: data[0].bookmakers ? data[0].bookmakers.length : 0
                } : 'No games'
              });
              
              const now = getCurrentLocalTime(); // 클라이언트 로컬 시간 사용
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); // 오늘 자정 (로컬)
              const maxDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
              const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능
              
              // 1. 기본 필터링: 과거 7일부터 미래 7일까지의 경기 (UTC를 로컬로 변환하여 비교)
              const filteredGames = data.filter((game: any) => {
                const localGameTime = convertUtcToLocal(game.commence_time); // UTC를 로컬로 변환
                const pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7일 전
                const isValid = localGameTime >= pastDate && localGameTime <= maxDate;
                
                // 모든 활성 리그에 대해 필터링 로그 (첫 번째 경기만)
                if (data.indexOf(game) === 0) {
                  console.log(`🔍 ${displayName} 첫 번째 경기 필터링:`, {
                    home_team: game.home_team,
                    away_team: game.away_team,
                    commence_time: game.commence_time,
                    gameTimeUTC: localGameTime.toISOString(),
                    gameTimeLocal: localGameTime.toLocaleString('ko-KR'),
                    nowUTC: now.toISOString(),
                    nowLocal: now.toLocaleString('ko-KR'),
                    todayLocal: today.toLocaleString('ko-KR'),
                    maxDateLocal: maxDate.toLocaleString('ko-KR'),
                    isValid
                  });
                }
                
                return isValid;
              });
              
              console.log(`🔍 ${displayName} 시간 필터링 결과:`, {
                totalData: data.length,
                filteredGames: filteredGames.length,
                filteredOut: data.length - filteredGames.length
              });
              
              // [중복 제거 활성화] 리그별로 동일 경기(홈/어웨이/시간/리그) 1개만 남김
              const uniqueGamesMap = new Map();
              filteredGames.forEach((game: any) => {
                // sport|home_team|away_team|commence_time 조합으로 유니크 처리
                const key = `${game.sport || game.sportKey || game.sportTitle || 'Unknown'}|${game.home_team}|${game.away_team}|${game.commence_time}`;
                if (!uniqueGamesMap.has(key)) {
                  uniqueGamesMap.set(key, game);
                } else {
                  // officialOdds 우선, 그다음 bookmakers 개수, 마지막으로 lastUpdated
                  const prev = uniqueGamesMap.get(key);
                  const prevHasOfficial = !!(prev.officialOdds && prev.officialOdds.h2h);
                  const currHasOfficial = !!(game.officialOdds && game.officialOdds.h2h);
                  if (
                    (!prevHasOfficial && currHasOfficial) ||
                    (currHasOfficial === prevHasOfficial && Array.isArray(game.bookmakers) && Array.isArray(prev.bookmakers) && game.bookmakers.length > prev.bookmakers.length) ||
                    (currHasOfficial === prevHasOfficial && game.bookmakers?.length === prev.bookmakers?.length && new Date(game.lastUpdated || 0) > new Date(prev.lastUpdated || 0))
                  ) {
                    uniqueGamesMap.set(key, game);
                  }
                }
              });
              const uniqueGames = Array.from(uniqueGamesMap.values());
              console.log(`[${displayName}로그] 중복 제거 결과:`, {
                beforeDedup: filteredGames.length,
                afterDedup: uniqueGames.length,
                duplicatesRemoved: filteredGames.length - uniqueGames.length
              });
              
              // 3. 베팅 가능 여부 분류 및 정렬
              const categorizedGames = uniqueGames.map((game: any) => {
                const localGameTime = convertUtcToLocal(game.commence_time); // UTC를 로컬로 변환
                const bettingDeadline = new Date(localGameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
                const isBettable = now < bettingDeadline;
                
                // bookmakers 데이터를 officialOdds로 변환
                let officialOdds = game.officialOdds;
                if (!officialOdds && game.bookmakers && Array.isArray(game.bookmakers)) {
                  officialOdds = {};
                  
                  // h2h 마켓 처리
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
                  
                  // 평균 가격 계산
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
                  sport_key: game.sport || config.sportKey, // sport 필드 우선 사용
                  sportTitle: displayName, // DB와 일치하는 sportTitle 추가
                  sport_title: displayName, // 기존 호환성을 위한 sport_title 추가
                  officialOdds: officialOdds || game.officialOdds, // 변환된 officialOdds 사용
                  isBettable,
                  gameTime: localGameTime,
                  bettingDeadline
                };
              });
              
              // 4. 정렬: 베팅 가능한 경기 우선, 그 다음 시간순(가장 가까운 순)
              const sortedGames = categorizedGames.sort((a, b) => {
                // 베팅 가능한 경기가 우선
                if (a.isBettable && !b.isBettable) return -1;
                if (!a.isBettable && b.isBettable) return 1;
                
                // 둘 다 베팅 가능하거나 둘 다 불가능한 경우, 시간순 정렬(가장 가까운 순)
                return a.gameTime.getTime() - b.gameTime.getTime();
              });
              
              if (sortedGames.length > 0) {
                gamesData[displayName] = sortedGames;
                // 점검: 첫 번째 경기의 officialOdds.h2h 구조 상세 출력
                const firstGame = sortedGames[0];
                console.log(`==== [${displayName}] 첫 번째 경기 officialOdds.h2h 구조 ====`);
                if (firstGame.officialOdds && firstGame.officialOdds.h2h) {
                  Object.entries(firstGame.officialOdds.h2h).forEach(([name, odds]) => {
                    console.log(`  h2h: ${name} =`, odds);
                  });
                } else {
                  console.log('  [배당 없음] officialOdds.h2h가 없음');
                }
                // 점검: outcomes.length === 0인 경기 별도 분류
                sortedGames.forEach((game, idx) => {
                  let h2hOdds = (game.officialOdds && game.officialOdds.h2h) ? game.officialOdds.h2h : {};
                  let outcomes: any[] = [];
                  if (game.sport_key?.includes('soccer')) {
                    const homeOdds = (h2hOdds as any)[game.home_team];
                    const awayOdds = (h2hOdds as any)[game.away_team];
                    const drawOdds = Object.entries(h2hOdds).find(([name, _]) => name.toLowerCase().includes('draw') || name === 'Draw' || name === 'Tie');
                    outcomes = [
                      { name: game.home_team, price: (homeOdds as any)?.averagePrice },
                      { name: 'Draw', price: (drawOdds?.[1] as any)?.averagePrice },
                      { name: game.away_team, price: (awayOdds as any)?.averagePrice }
                    ].filter(outcome => outcome.price !== undefined);
                  } else if (game.sport_key?.includes('baseball')) {
                    // 야구 리그: Draw 없이 home/away만 outcomes에 포함 (정규화 매칭 적용)
                    const h2hKeys = Object.keys(h2hOdds);
                    const homeKey = h2hKeys.find(key => normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.home_team));
                    const awayKey = h2hKeys.find(key => normalizeTeamNameForComparison(key) === normalizeTeamNameForComparison(game.away_team));
                    const homeOdds = homeKey ? (h2hOdds as any)[homeKey] : undefined;
                    const awayOdds = awayKey ? (h2hOdds as any)[awayKey] : undefined;
                    outcomes = [
                      { name: game.home_team, price: (homeOdds as any)?.averagePrice },
                      { name: game.away_team, price: (awayOdds as any)?.averagePrice }
                    ].filter(outcome => outcome.price !== undefined);
                    // 상세 로그 (유니크 말머리 적용)
                    if (!homeOdds) console.log(`[KBO로그][${displayName}] home_team 키 미존재(정규화):`, game.home_team, '| h2h keys:', h2hKeys);
                    if (!awayOdds) console.log(`[KBO로그][${displayName}] away_team 키 미존재(정규화):`, game.away_team, '| h2h keys:', h2hKeys);
                    if ((homeOdds && (homeOdds as any).averagePrice === undefined) || (awayOdds && (awayOdds as any).averagePrice === undefined)) {
                      console.log(`[KBO로그][${displayName}] averagePrice undefined:`, {
                        home_team: game.home_team,
                        homeOdds,
                        away_team: game.away_team,
                        awayOdds
                      });
                    }
                  } else {
                    outcomes = Object.entries(h2hOdds).map(([outcomeName, oddsData]) => ({
                      name: outcomeName,
                      price: (oddsData as any).averagePrice
                    }));
                  }
                  if (outcomes.length === 0) {
                    console.log(`[${displayName}로그][배당 없음] ${game.home_team} vs ${game.away_team} | ${game.commence_time}`);
                    if (game.officialOdds && game.officialOdds.h2h) {
                      console.log(`[${displayName}로그] h2h keys:`, Object.keys(game.officialOdds.h2h));
                    } else {
                      console.log(`[${displayName}로그] [officialOdds.h2h 없음]`);
                    }
                  }
                });
                // 야구 리그도 첫 번째 경기 officialOdds.h2h 구조 반드시 출력
                if (sortedGames.length > 0) {
                  const firstGame = sortedGames[0];
                  console.log(`==== [${displayName}] 첫 번째 경기 officialOdds.h2h 구조 ====`);
                  if (firstGame.officialOdds && firstGame.officialOdds.h2h) {
                    Object.entries(firstGame.officialOdds.h2h).forEach(([name, odds]) => {
                      console.log(`  h2h: ${name} =`, odds);
                    });
                  } else {
                    console.log('  [배당 없음] officialOdds.h2h가 없음');
                  }
                  console.log(`==== [${displayName}] 점검 끝 ====`);
                }
                console.log(`✅ ${displayName} Today Betting 데이터:`, sortedGames.length, '개 경기');
                console.log(`✅ ${displayName} 첫 번째 경기 bookmakers:`, sortedGames[0].bookmakers ? '있음' : '없음');
                console.log(`✅ ${displayName} 첫 번째 경기 officialOdds:`, sortedGames[0].officialOdds ? '있음' : '없음');
              }
            }
          } catch (err) {
            console.error(`Error fetching ${displayName}:`, err);
            console.error(`🔍 ${displayName} API URL:`, apiUrl);
          }
        }
        
        console.log(`🔍 Today Betting - 최종 gamesData:`, Object.keys(gamesData));
        console.log(`🔍 Today Betting - KBO 데이터:`, gamesData["KBO"] ? gamesData["KBO"].length : 0, '개 경기');
        
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
    if (viewMode !== 'today') return;
    // todayGames를 평탄화(flatten)하여 전체 경기 리스트로 변환
    const allGames: any[] = Object.values(todayGames).flat();
    console.log('Today Betting - Total games before deduplication:', allGames.length);
    
    // 전체 deduplication(중복 제거) 제거: allGames를 그대로 todayFlatGames로 사용
    setTodayFlatGames(allGames);
  }, [todayGames, viewMode]);

  useEffect(() => {
    const fetchGames = async () => {
      if (viewMode !== 'league' || selectedCategory === currentSportKey) return;
      
      try {
        setLoading(true);
        let sportKey = getSportKey(selectedCategory);
        
        // KBO 특별 처리: baseball_kbo로 API 호출
        if (selectedCategory === "KBO") {
          sportKey = "baseball_kbo";
        }
        
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
        
        const now = getCurrentLocalTime(); // 클라이언트 로컬 시간 사용
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); // 오늘 자정 (로컬)
        const maxDate = new Date(today.getTime() + TIME_CONFIG.BETTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능
        
        const filteredGames = data.filter((game: any) => {
          const localGameTime = convertUtcToLocal(game.commence_time); // UTC를 로컬로 변환
          const pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7일 전
          return localGameTime >= pastDate && localGameTime <= maxDate;
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
          const localGameTime = convertUtcToLocal(game.commence_time); // UTC를 로컬로 변환
          const bettingDeadline = new Date(localGameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
          const isBettable = now < bettingDeadline;
          
          return {
            ...game,
            isBettable,
            gameTime: localGameTime,
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
          console.log("KBO API 호출 sportKey:", sportKey);
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
      
      // KBO 특별 처리
      if (leagueName === "KBO") {
        sportKey = "baseball_kbo";
      }
      
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
      
      // KBO 특별 처리
      if (selectedCategory === "KBO") {
        sportKey = "baseball_kbo";
      }
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

  const { selections, toggleSelection } = useBetStore();
  const [selectedMarkets, setSelectedMarkets] = useState<{ [gameId: string]: '승/패' | '언더/오버' | '핸디캡' }>({});

  const TodayBettingView = () => {
    if (todayLoading) return <div className="text-center py-8">로딩 중...</div>;
    if (todayFlatGames.length === 0) {
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
    // 배팅 가능한 경기 수 계산
    const bettableGames = todayFlatGames.filter(game => game.isBettable);
    const totalGames = todayFlatGames.length;
    
    return (
      <div className="space-y-4">
        {/* 배팅 가능한 경기 수 표시 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{bettableGames.length}</div>
                <div className="text-sm text-blue-700">배팅 가능</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{totalGames}</div>
                <div className="text-sm text-gray-700">전체 경기</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                📅 {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
              <div className="text-xs text-gray-500">업데이트: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
        
        {todayFlatGames.map((game: any) => {
          const gameTime = new Date(game.commence_time);
          const isBettable = game.isBettable !== undefined ? game.isBettable : true;
          const selectedMarket = selectedMarkets[game.id] || '승/패';
          const marketKeyMap = { '승/패': 'h2h', '언더/오버': 'totals', '핸디캡': 'spreads' };
          const marketKey = marketKeyMap[selectedMarket];
          const officialOdds = game.officialOdds || {};
          const marketOdds = officialOdds[marketKey] || {};
          
          // 모든 리그 디버깅 (첫 번째 경기만)
          if (todayFlatGames.indexOf(game) === 0) {
            console.log(`🔍 Today Betting 첫 번째 경기 렌더링:`, {
              home_team: game.home_team,
              away_team: game.away_team,
              sport_key: game.sport_key,
              sportTitle: game.sportTitle,
              officialOdds: game.officialOdds ? '있음' : '없음',
              bookmakers: game.bookmakers ? '있음' : '없음',
              h2hOdds: officialOdds.h2h ? '있음' : '없음',
              officialOddsKeys: game.officialOdds ? Object.keys(game.officialOdds) : [],
              h2hOddsKeys: officialOdds.h2h ? Object.keys(officialOdds.h2h) : []
            });
          }

          return (
            <div key={game.id} className={`bg-white rounded-lg shadow p-4 ${!isBettable ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex-1">
                  <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
                  <div className="text-sm text-gray-600 mt-1">
                    {(() => {
                      // sport_key를 사용해서 리그명 표시 (DB의 sportTitle 우선 사용)
                      const leagueName = getDisplayNameFromSportKey(game.sport_key) || game.sportTitle || game.sport_title || 'Unknown League';
                      
                      // 스포츠별 아이콘 결정
                      let sportIcon = '🏆';
                      if (game.sport_key?.includes('soccer')) sportIcon = '⚽';
                      else if (game.sport_key?.includes('basketball')) sportIcon = '🏀';
                      else if (game.sport_key?.includes('baseball')) sportIcon = '⚾';
                      else if (game.sport_key?.includes('americanfootball')) sportIcon = '🏈';
                      else if (game.sport_key?.includes('football')) sportIcon = '🏈';
                      
                      // 디버깅용 로그 (개발 환경에서만)
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`[League Display] ${game.home_team} vs ${game.away_team}:`, {
                          sport_key: game.sport_key,
                          sportTitle: game.sportTitle,
                          sport_title: game.sport_title,
                          leagueName,
                          sportIcon
                        });
                      }
                      
                      return `${sportIcon} ${leagueName}`;
                    })()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm">📅 {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                    onClick={() => setSelectedMarkets((prev: any) => ({ ...prev, [game.id]: marketTab }))}
                  >
                    {marketTab}
                  </button>
                ))}
              </div>
              {/* 마켓별 선택 영역 - OddsList.tsx와 동일하게 구현 */}
              {selectedMarket === '승/패' && (
                <div className="space-y-2">
                  {(() => {
                    const h2hOdds = officialOdds.h2h || {};
                    // 축구 경기인지 확인
                    const isSoccer = game.sport_key?.includes('soccer') ||
                                   game.sport_key?.includes('korea_kleague') ||
                                   game.sport_key?.includes('england_premier_league') ||
                                   game.sport_key?.includes('italy_serie_a') ||
                                   game.sport_key?.includes('germany_bundesliga') ||
                                   game.sport_key?.includes('spain_la_liga') ||
                                   game.sport_key?.includes('usa_mls') ||
                                   game.sport_key?.includes('argentina_primera') ||
                                   game.sport_key?.includes('china_super_league');
                    let outcomes;
                    if (isSoccer) {
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
                      outcomes = Object.entries(h2hOdds).map(([outcomeName, oddsData]: [string, any]) => ({
                        name: outcomeName,
                        price: (oddsData as any).averagePrice
                      }));
                    }
                    if (outcomes.length === 0) {
                      console.log(`🔍 ${game.home_team} vs ${game.away_team} - 배당 정보 없음:`, {
                        sport_key: game.sport_key,
                        sportTitle: game.sportTitle,
                        hasOfficialOdds: !!game.officialOdds,
                        hasBookmakers: !!game.bookmakers,
                        officialOddsKeys: game.officialOdds ? Object.keys(game.officialOdds) : [],
                        h2hOdds: h2hOdds
                      });
                      return (
                        <div className="text-center text-gray-500 py-6">
                          <div>승/패 배당 정보 없음</div>
                          <div className="text-xs mt-1">
                            {game.sport_key} | {game.sportTitle}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-base font-bold text-gray-800 text-center">승/패</div>
                        {(() => {
                          // 홈팀, 무승부, 어웨이팀 순서로 정렬
                          const sortedOutcomes = outcomes.sort((a, b) => {
                            if (a.name === game.home_team) return -1;
                            if (b.name === game.home_team) return 1;
                            if (a.name.toLowerCase() === 'draw') return -1;
                            if (b.name.toLowerCase() === 'draw') return 1;
                            return 0;
                          });
                          
                          return sortedOutcomes.map((outcome) => {
                            let label = outcome.name;
                            if (outcome.name.toLowerCase() === 'draw') label = '무승부';
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
                                      market: '승/패',
                                      gameId: game.id,
                                      sport_key: game.sport_key
                                    });
                                  }
                                }}
                                className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                  (selections || []).some(sel => sel.team === outcome.name && sel.market === '승/패' && sel.gameId === game.id)
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
                          });
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* 언더/오버 */}
              {selectedMarket === '언더/오버' && (
                <div className="space-y-2">
                  {(() => {
                    const totalsOdds = officialOdds.totals || {};
                    const totalEntries = Object.entries(totalsOdds);
                    if (totalEntries.length === 0) {
                      return <div className="text-center text-gray-500 py-6">언더오버 배당 정보 없음</div>;
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
                          <button
                            onClick={() => {
                              if (isBettable && overOdds) {
                                toggleSelection({
                                  team: `Over ${point}`,
                                  odds: overOdds,
                                  desc: `${game.home_team} vs ${game.away_team}`,
                                  commence_time: game.commence_time,
                                  market: '언더/오버',
                                  gameId: game.id,
                                  sport_key: game.sport_key,
                                  point: parseFloat(point)
                                });
                              }
                            }}
                                                            className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                  (selections || []).some(sel => sel.team === `Over ${point}` && sel.market === '언더/오버' && sel.gameId === game.id)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white`}
                            disabled={!isBettable || !overOdds}
                          >
                            <div className="font-bold">오버</div>
                            <div className="text-sm">{overOdds ? overOdds.toFixed(2) : 'N/A'}</div>
                          </button>
                          <div className="w-16 text-base font-bold text-gray-800 text-center">{point}</div>
                          <button
                            onClick={() => {
                              if (isBettable && underOdds) {
                                toggleSelection({
                                  team: `Under ${point}`,
                                  odds: underOdds,
                                  desc: `${game.home_team} vs ${game.away_team}`,
                                  commence_time: game.commence_time,
                                  market: '언더/오버',
                                  gameId: game.id,
                                  sport_key: game.sport_key,
                                  point: parseFloat(point)
                                });
                              }
                            }}
                            className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                              (selections || []).some(sel => sel.team === `Under ${point}` && sel.market === '언더/오버' && sel.gameId === game.id)
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
              {/* 핸디캡 */}
              {selectedMarket === '핸디캡' && (
                <div className="space-y-2">
                  {(() => {
                    const spreadsOdds = officialOdds.spreads || {};
                    const spreadEntries = Object.entries(spreadsOdds);
                    if (spreadEntries.length === 0) {
                      return <div className="text-center text-gray-500 py-6">핸디캡 배당 정보 없음</div>;
                    }
                    // 핸디캡 쌍으로 그룹화
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
                    return Object.entries(groupedSpreads).map(([point, oddsPair], idx: number) => {
                      const homeOdds = oddsPair.home?.averagePrice;
                      const awayOdds = oddsPair.away?.averagePrice;
                      return (
                        <div key={point} className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isBettable && homeOdds) {
                                toggleSelection({
                                  team: `${game.home_team} -${point}`,
                                  odds: homeOdds,
                                  desc: `${game.home_team} vs ${game.away_team}`,
                                  commence_time: game.commence_time,
                                  market: '핸디캡',
                                  gameId: game.id,
                                  sport_key: game.sport_key,
                                  point: parseFloat(point)
                                });
                              }
                            }}
                            className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                              (selections || []).some(sel => sel.team === `${game.home_team} -${point}` && sel.market === '핸디캡' && sel.gameId === game.id)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                            } text-white`}
                            disabled={!isBettable || !homeOdds}
                          >
                            <div className="font-bold">홈</div>
                            <div className="text-sm">{homeOdds ? homeOdds.toFixed(2) : 'N/A'}</div>
                          </button>
                          <div className="w-16 text-base font-bold text-gray-800 text-center">{point}</div>
                          <button
                            onClick={() => {
                              if (isBettable && awayOdds) {
                                toggleSelection({
                                  team: `${game.away_team} +${point}`,
                                  odds: awayOdds,
                                  desc: `${game.home_team} vs ${game.away_team}`,
                                  commence_time: game.commence_time,
                                  market: '핸디캡',
                                  gameId: game.id,
                                  sport_key: game.sport_key,
                                  point: parseFloat(point)
                                });
                              }
                            }}
                            className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                              (selections || []).some(sel => sel.team === `${game.away_team} +${point}` && sel.market === '핸디캡' && sel.gameId === game.id)
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
          {/* 상위 카테고리 탭 */}
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              {Object.keys(SPORTS_TREE).map((mainCategory) => (
                <button
                  key={mainCategory}
                  onClick={() => setSelectedMainCategory(mainCategory)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedMainCategory === mainCategory
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {mainCategory}
                </button>
              ))}
            </div>
            
            {/* 하위 카테고리 버튼들 */}
            {selectedMainCategory && (
              <div className="mb-6">
                <div className="text-lg font-bold mb-3 text-blue-800">{selectedMainCategory}</div>
                <div className="flex flex-wrap gap-2">
                  {SPORTS_TREE[selectedMainCategory].map((category) => {
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
            )}
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
            
            {/* 경기 수 정보 표시 */}
            {(() => {
              const bettableGames = games.filter(game => game.isBettable);
              const totalGames = games.length;
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{bettableGames.length}</div>
                        <div className="text-sm text-blue-700">배팅 가능</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-600">{totalGames}</div>
                        <div className="text-sm text-gray-700">전체 경기</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        📅 {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500">업데이트: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {games.length === 0 ? (
              <SeasonInfoDisplay category={selectedCategory} />
            ) : (
              <div className="space-y-4">
                {games.map((game, index) => (
                  <div key={index} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
                      <div className="text-right">
                        <span className="text-sm">📅 {new Date(game.commence_time).toLocaleDateString()} {new Date(game.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    {/* 승/패 배당 */}
                    {game.officialOdds?.h2h && Object.keys(game.officialOdds.h2h).length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">🏆 승/패</div>
                        <div className="space-y-2">
                          {(() => {
                            const h2hOdds = game.officialOdds.h2h;
                            
                            // 축구 경기인지 확인
                            const isSoccer = selectedCategory === '축구' || 
                                           selectedCategory.includes('K리그') || 
                                           selectedCategory.includes('프리미어리그') || 
                                           selectedCategory.includes('세리에A') || 
                                           selectedCategory.includes('분데스리가') || 
                                           selectedCategory.includes('라리가') || 
                                           selectedCategory.includes('MLS') || 
                                           selectedCategory.includes('아르헨티나') || 
                                           selectedCategory.includes('중국');
                            
                            let outcomes;
                            if (isSoccer) {
                              // 축구: 팀A, 무, 팀B 순서로 정렬
                              const homeOdds = h2hOdds[game.home_team];
                              const awayOdds = h2hOdds[game.away_team];
                              const drawOdds = Object.entries(h2hOdds).find(([name, _]) => 
                                name.toLowerCase().includes('draw') || name === 'Draw' || name === 'Tie'
                              );
                              
                              outcomes = [
                                { name: game.home_team, odds: homeOdds },
                                { name: 'Draw', odds: drawOdds?.[1] },
                                { name: game.away_team, odds: awayOdds }
                              ].filter(outcome => outcome.odds);
                            } else {
                              // 다른 스포츠: 기존 순서 유지
                              outcomes = Object.entries(h2hOdds).map(([name, oddsData]: [string, any]) => ({
                                name,
                                odds: oddsData
                              }));
                            }
                            
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-16 text-base font-bold text-gray-800 text-center">
                                  승/패
                                </div>
                                {(() => {
                                  // 홈팀, 무승부, 어웨이팀 순서로 정렬
                                  const sortedOutcomes = outcomes.sort((a: any, b: any) => {
                                    if (a.name === game.home_team) return -1;
                                    if (b.name === game.home_team) return 1;
                                    if (a.name.toLowerCase() === 'draw') return -1;
                                    if (b.name.toLowerCase() === 'draw') return 1;
                                    return 0;
                                  });
                                  
                                  return sortedOutcomes.map((outcome: any, idx: number) => {
                                    let label = outcome.name;
                                    if (outcome.name.toLowerCase() === 'draw') label = '무승부';
                                    else if (outcome.name === game.home_team) label = game.home_team;
                                    else if (outcome.name === game.away_team) label = game.away_team;
                                    
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          toggleSelection({
                                            team: outcome.name,
                                            odds: outcome.odds.averagePrice,
                                            desc: `${game.home_team} vs ${game.away_team}`,
                                            commence_time: game.commence_time,
                                            market: '승/패',
                                            gameId: game.id,
                                            sport_key: game.sport_key
                                          });
                                        }}
                                        className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                          (selections || []).some(sel => sel.team === outcome.name && sel.market === '승/패' && sel.gameId === game.id)
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : 'bg-blue-500 hover:bg-blue-600'
                                        } text-white`}
                                      >
                                        <div className="font-bold">{label}</div>
                                        <div className="text-sm">{outcome.odds.averagePrice.toFixed(2)}</div>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* 언더/오버 배당 */}
                    {game.officialOdds?.totals && Object.keys(game.officialOdds.totals).length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">📊 오버/언더</div>
                        <div className="space-y-2">
                          {(() => {
                            const totalsOdds = game.officialOdds.totals;
                            const groupedTotals: { [point: string]: { over?: any, under?: any } } = {};
                            
                            Object.entries(totalsOdds).forEach(([outcomeName, oddsData]) => {
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
                            
                            return Object.entries(groupedTotals).map(([point, oddsPair], idx: number) => {
                              const overOdds = oddsPair.over?.averagePrice;
                              const underOdds = oddsPair.under?.averagePrice;
                              
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      toggleSelection({
                                        team: `Over ${point}`,
                                        odds: overOdds,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: '언더/오버',
                                        gameId: game.id,
                                        sport_key: game.sport_key,
                                        point: parseFloat(point)
                                      });
                                    }}
                                    className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                      (selections || []).some(sel => sel.team === `Over ${point}` && sel.market === '언더/오버' && sel.gameId === game.id)
                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white`}
                                  >
                                    <div className="font-bold">오버</div>
                                    <div className="text-sm">{overOdds ? overOdds.toFixed(2) : 'N/A'}</div>
                                  </button>
                                  <div className="w-16 text-base font-bold text-gray-800 text-center">
                                    {point}
                                  </div>
                                  <button
                                    onClick={() => {
                                      toggleSelection({
                                        team: `Under ${point}`,
                                        odds: underOdds,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: '언더/오버',
                                        gameId: game.id,
                                        sport_key: game.sport_key,
                                        point: parseFloat(point)
                                      });
                                    }}
                                    className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                      (selections || []).some(sel => sel.team === `Under ${point}` && sel.market === '언더/오버' && sel.gameId === game.id)
                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white`}
                                  >
                                    <div className="font-bold">언더</div>
                                    <div className="text-sm">{underOdds ? underOdds.toFixed(2) : 'N/A'}</div>
                                  </button>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* 핸디캡 배당 */}
                    {game.officialOdds?.spreads && Object.keys(game.officialOdds.spreads).length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">⚖️ 핸디캡</div>
                        <div className="space-y-2">
                          {(() => {
                            const spreadsOdds = game.officialOdds.spreads;
                            const groupedSpreads: { [point: string]: { home?: any, away?: any } } = {};
                            
                            Object.entries(spreadsOdds).forEach(([outcomeName, oddsData]) => {
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
                            
                            return Object.entries(groupedSpreads).map(([point, oddsPair], idx: number) => {
                              const homeOdds = oddsPair.home?.averagePrice;
                              const awayOdds = oddsPair.away?.averagePrice;
                              
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      toggleSelection({
                                        team: `${game.home_team} -${point}`,
                                        odds: homeOdds,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: '핸디캡',
                                        gameId: game.id,
                                        sport_key: game.sport_key,
                                        point: parseFloat(point)
                                      });
                                    }}
                                    className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                      (selections || []).some(sel => sel.team === `${game.home_team} -${point}` && sel.market === '핸디캡' && sel.gameId === game.id)
                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white`}
                                  >
                                    <div className="font-bold">홈</div>
                                    <div className="text-sm">{homeOdds ? homeOdds.toFixed(2) : 'N/A'}</div>
                                  </button>
                                  <div className="w-16 text-base font-bold text-gray-800 text-center">
                                    {point}
                                  </div>
                                  <button
                                    onClick={() => {
                                      toggleSelection({
                                        team: `${game.away_team} +${point}`,
                                        odds: awayOdds,
                                        desc: `${game.home_team} vs ${game.away_team}`,
                                        commence_time: game.commence_time,
                                        market: '핸디캡',
                                        gameId: game.id,
                                        sport_key: game.sport_key,
                                        point: parseFloat(point)
                                      });
                                    }}
                                    className={`flex-1 p-3 rounded-lg text-center transition-colors ${
                                      (selections || []).some(sel => sel.team === `${game.away_team} +${point}` && sel.market === '핸디캡' && sel.gameId === game.id)
                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white`}
                                  >
                                    <div className="font-bold">원정</div>
                                    <div className="text-sm">{awayOdds ? awayOdds.toFixed(2) : 'N/A'}</div>
                                  </button>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}