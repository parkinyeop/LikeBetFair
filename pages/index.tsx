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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("Soccer");
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
        // 시즌 정보 필터링 주석처리 - 모든 리그 포함
        const activeLeagues = Object.entries(SPORT_CATEGORIES);

        const gamesData: Record<string, any[]> = {};
        
        for (const [displayName, config] of activeLeagues) {
          let apiUrl = '';
          try {
            apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${config.sportKey}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
              const data = await response.json();
              
              const now = getCurrentLocalTime(); // 클라이언트 로컬 시간 사용
              // 시간 필터링 범위 조정: 1일 전부터 7일 후까지
              const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1일 전
              const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
              const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능
              
              // 1. 기본 필터링: 1일 전부터 7일 후까지의 경기 (UTC를 로컬로 변환하여 비교)
              const filteredGames = data.filter((game: any) => {
                const localGameTime = convertUtcToLocal(game.commence_time); // UTC를 로컬로 변환
                const isValid = localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
                

                
                return isValid;
              });
              

              
              // [중복 제거 간소화] 리그별로 동일 경기(홈/어웨이/시간) 1개만 남김
              const uniqueGamesMap = new Map();
              filteredGames.forEach((game: any) => {
                // home_team|away_team|commence_time 조합으로 유니크 처리 (sport 제외하여 더 관대하게)
                const key = `${game.home_team}|${game.away_team}|${game.commence_time}`;
                if (!uniqueGamesMap.has(key)) {
                  uniqueGamesMap.set(key, game);
                } else {
                  // 더 간단한 우선순위: bookmakers 개수가 많은 것 우선
                  const prev = uniqueGamesMap.get(key);
                  const prevBookmakersCount = Array.isArray(prev.bookmakers) ? prev.bookmakers.length : 0;
                  const currBookmakersCount = Array.isArray(game.bookmakers) ? game.bookmakers.length : 0;
                  if (currBookmakersCount > prevBookmakersCount) {
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
              
              // 4. 정렬: 미래 경기 우선(가까운 순), 과거 경기는 아래
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

                });

              }
            }
          } catch (err) {
            console.error(`Error fetching ${displayName}:`, err);
            console.error(`🔍 ${displayName} API URL:`, apiUrl);
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
    
    // Today Betting 5분 주기 자동 갱신 (백그라운드에서도 동작)
    if (viewMode === 'today') {
      const interval = setInterval(() => {
        console.log('[TodayBetting] 주기적 경기 데이터 갱신 시도');
        fetchTodayGames();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'today') return;
    // todayGames를 평탄화(flatten)하여 전체 경기 리스트로 변환
    const allGames: any[] = Object.values(todayGames).flat();
    
    // 전체 시간순 정렬: 미래 경기 우선(가까운 순), 과거 경기는 아래
    const now = getCurrentLocalTime();
    const sortedAllGames = allGames.sort((a, b) => {
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
    
    // Today Betting 전체 베팅 가능한 경기 개수 로깅
    const bettableGames = sortedAllGames.filter(game => game.isBettable);
    const nonBettableGames = sortedAllGames.filter(game => !game.isBettable);
    
    console.log("=== Today Betting 전체 통계 ===");
    console.log("전체 경기 개수:", sortedAllGames.length);
    console.log("베팅 가능한 경기 개수:", bettableGames.length);
    console.log("베팅 불가능한 경기 개수:", nonBettableGames.length);
    
    // 리그별 배당율 데이터 개수
    const leagueDataCount = {};
    Object.entries(todayGames).forEach(([league, games]) => {
      leagueDataCount[league] = games.length;
    });
    
    console.log("리그별 배당율 데이터 개수:", leagueDataCount);
    
    if (bettableGames.length > 0) {
      console.log("베팅 가능한 첫 번째 경기:", {
        homeTeam: bettableGames[0].home_team,
        awayTeam: bettableGames[0].away_team,
        sportTitle: bettableGames[0].sportTitle,
        commenceTime: bettableGames[0].commence_time,
        gameTime: bettableGames[0].gameTime,
        bettingDeadline: bettableGames[0].bettingDeadline,
        isBettable: bettableGames[0].isBettable
      });
    }
    
    setTodayFlatGames(sortedAllGames);
  }, [todayGames, viewMode]);

  // Page Visibility API - Today Betting 탭 활성화시 즉시 갱신
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && viewMode === 'today') {
        console.log('[TodayBetting] 탭 활성화 - 경기 데이터 즉시 갱신');
        const fetchTodayGames = async () => {
          if (viewMode !== 'today') return;
          
          try {
            setTodayLoading(true);
            const activeLeagues = Object.entries(SPORT_CATEGORIES);
            const gamesData: Record<string, any[]> = {};
            
            for (const [displayName, config] of activeLeagues) {
              let apiUrl = '';
              try {
                apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${config.sportKey}`);
                const response = await fetch(apiUrl);
                
                if (response.ok) {
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
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [viewMode]);

  useEffect(() => {
    const fetchGames = async () => {
      if (viewMode !== 'league') return;
      
      try {
        setLoading(true);
        setError(null);
        
        let allGames: any[] = [];
        
        // 메인 카테고리별 전체 리그 데이터 로드
        if (SPORTS_TREE[selectedMainCategory as keyof typeof SPORTS_TREE]) {
          console.log(`=== 전체 ${selectedMainCategory} 리그 데이터 로드 시작 ===`);
          
          const leagues = SPORTS_TREE[selectedMainCategory as keyof typeof SPORTS_TREE];
          console.log(`${selectedMainCategory} 리그 목록:`, leagues);
          
          for (const leagueName of leagues) {
            try {
              const leagueConfig = SPORT_CATEGORIES[leagueName];
              if (!leagueConfig) continue;
              
              const apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${leagueConfig.sportKey}`);
              console.log(`${leagueName} 데이터 요청:`, apiUrl);
              
              const response = await fetch(apiUrl);
              if (response.ok) {
                const data = await response.json();
                // 각 게임에 리그 정보 추가
                const gamesWithLeague = data.map((game: any) => ({
                  ...game,
                  leagueName: leagueName,
                  sport_key: leagueConfig.sportKey,
                  sportTitle: leagueConfig.displayName,
                  mainCategory: selectedMainCategory
                }));
                allGames.push(...gamesWithLeague);
                console.log(`${leagueName}: ${gamesWithLeague.length}개 경기 로드됨`);
              }
            } catch (err) {
              console.error(`${leagueName} 로드 오류:`, err);
            }
          }
          
          console.log(`전체 ${selectedMainCategory} 경기 수: ${allGames.length}개`);
        }
        // 하위 카테고리가 선택된 경우 -> 해당 리그만 로드
        else if (selectedCategory) {
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

          const apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${sportKey}`);
          
          console.log(`=== ${selectedCategory} 데이터 요청 시작 ===`);
          console.log("요청 URL:", apiUrl);
          
          const response = await fetch(apiUrl);
        
          if (!response.ok) {
            throw new Error(`Failed to fetch games for ${selectedCategory}`);
          }
        
          const data = await response.json();
          allGames = data;
          
          console.log(`${selectedCategory} 데이터 응답: ${data.length}개 경기`);
        }
        
        // 공통 데이터 처리 로직
        const now = getCurrentLocalTime();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const bettingDeadlineMinutes = 10;
        
        // 과거 1일부터 미래 7일까지 필터링 (Today Betting과 동일)
        const oneDayAgo = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
        const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const filteredGames = allGames.filter((game: any) => {
          const localGameTime = convertUtcToLocal(game.commence_time);
          return localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
        });
        
        console.log(`필터링 결과: ${allGames.length} → ${filteredGames.length}개 경기`);
        
        // 하위 카테고리 필터링 (모든 스포츠)
        let finalFilteredGames = filteredGames;
        if (selectedCategory) {
          finalFilteredGames = filteredGames.filter((game: any) => game.leagueName === selectedCategory);
          console.log(`[리그 필터링] ${selectedCategory}: ${finalFilteredGames.length}개 경기`);
        }
        
        // 중복 제거
        const uniqueGamesMap = new Map();
        finalFilteredGames.forEach((game: any) => {
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
        
        // 베팅 가능 여부 및 배당율 처리 (Today Betting 스타일)
        const processedGames = uniqueGames.map((game: any) => {
          const localGameTime = convertUtcToLocal(game.commence_time);
          const bettingDeadline = new Date(localGameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
          const isBettable = now < bettingDeadline;
          
          // bookmakers 데이터를 officialOdds로 변환 (Today Betting과 동일)
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
            isBettable,
            gameTime: localGameTime,
            bettingDeadline,
            officialOdds: officialOdds || game.officialOdds
          };
        });
        
        // 정렬: 미래 경기 우선(가까운 순), 과거 경기는 아래
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
        
        console.log(`최종 처리 완료: ${sortedGames.length}개 경기`);
        console.log(`베팅 가능: ${sortedGames.filter(game => game.isBettable).length}개`);
        console.log(`베팅 불가능: ${sortedGames.filter(game => !game.isBettable).length}개`);
        
        setGames(sortedGames);
        setLoading(false);
        
      } catch (err) {
        console.error('데이터 로드 오류:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchGames();
  }, [selectedMainCategory, selectedCategory, viewMode]);

  const handleSelect = (match: string, team: string) => {
    setSelectedMatches((prev) => ({ ...prev, [match]: team }));
  };

  const handleCategoryChange = (category: string) => {
    // 토글 방식: 같은 카테고리를 다시 클릭하면 선택 해제
    if (selectedCategory === category) {
      console.log(`[토글] ${category} 선택 해제 - 전체 ${selectedMainCategory} 데이터로 복귀`);
      setSelectedCategory('');
    } else {
      console.log(`[토글] ${category} 선택 - 해당 리그만 표시`);
      setSelectedCategory(category);
    }
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
        // "Soccer > K League" 형태로 설정
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
          // "Soccer > K League" 형태로 설정
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
    return date.toLocaleDateString('en-US', { 
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
  // 체크박스 방식으로 변경: 여러 마켓을 동시에 선택 가능
  const [selectedMarkets, setSelectedMarkets] = useState<{ [gameId: string]: Set<string> }>({});

  const TodayBettingView = () => {
    if (todayLoading) return <div className="text-center py-8">Loading...</div>;
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📅 No Games Scheduled for Today</h3>
          <p className="text-gray-600 mb-4">No games found for today and tomorrow in active leagues.</p>
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
                <div className="text-sm text-blue-700">Betting Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{totalGames}</div>
                <div className="text-sm text-gray-700">Total Games</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                📅 {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
              <div className="text-xs text-gray-500">Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
        
        {todayFlatGames?.map((game: any) => {
          const gameTime = new Date(game.commence_time);
          const isBettable = game.isBettable !== undefined ? game.isBettable : true;
          
          // 게임별 선택된 마켓들 (체크박스 방식)
          const selectedMarketsForGame = selectedMarkets[game.id] || new Set(['Win/Loss']);
          if (!selectedMarkets[game.id]) {
            setSelectedMarkets(prev => ({ ...prev, [game.id]: new Set(['Win/Loss']) }));
          }
          const officialOdds = game.officialOdds || {};
          
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
                  <span className="text-sm">📅 {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
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
                          onChange={() => {
                            setSelectedMarkets(prev => {
                              const current = prev[game.id] || new Set();
                              const newSet = new Set(current);
                              
                              if (newSet.has(marketTab)) {
                                newSet.delete(marketTab);
                              } else {
                                newSet.add(marketTab);
                              }
                              
                              // 최소 하나는 선택되도록 보장
                              if (newSet.size === 0) {
                                newSet.add('Win/Loss');
                              }
                              
                              return { ...prev, [game.id]: newSet };
                            });
                          }}
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
                          <div>No Win/Loss odds available</div>
                          <div className="text-xs mt-1">
                            {game.sport_key} | {game.sportTitle}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-sm font-medium text-blue-700 text-center">
                          승/패
                        </div>
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
                            if (outcome.name.toLowerCase() === 'draw') label = 'Draw';
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
                                  }
                                }}
                                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                  (selections || []).some(sel => sel.team === outcome.name && sel.market === 'Win/Loss' && sel.gameId === game.id)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white text-sm`}
                                disabled={!isBettable || !outcome.price}
                              >
                                <div className="font-medium">{label}</div>
                                <div className="text-xs">{outcome.price ? outcome.price.toFixed(2) : 'N/A'}</div>
                                {!isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
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
              {selectedMarketsForGame.has('Over/Under') && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">📈 언더/오버 (Over/Under)</div>
                  <div className="space-y-2">
                  {(() => {
                    const totalsOdds = officialOdds.totals || {};
                    const totalEntries = Object.entries(totalsOdds);
                    if (totalEntries.length === 0) {
                      return <div className="text-center text-gray-500 py-6">No Over/Under odds available</div>;
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
                    
                    return filteredTotals.map(([point, oddsPair]) => {
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
                                  market: 'Over/Under',
                                  gameId: game.id,
                                  sport_key: game.sport_key,
                                  point: parseFloat(point)
                                });
                              }
                            }}
                                                            className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                  (selections || []).some(sel => sel.team === `Over ${point}` && sel.market === 'Over/Under' && sel.gameId === game.id)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                } text-white text-sm`}
                            disabled={!isBettable || !overOdds}
                          >
                            <div className="font-medium">{game.home_team}</div>
                            <div className="text-xs">Over ({overOdds ? overOdds.toFixed(2) : 'N/A'})</div>
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
                                  market: 'Over/Under',
                                  gameId: game.id,
                                  sport_key: game.sport_key,
                                  point: parseFloat(point)
                                });
                              }
                            }}
                            className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                              (selections || []).some(sel => sel.team === `Under ${point}` && sel.market === 'Over/Under' && sel.gameId === game.id)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                            } text-white text-sm`}
                            disabled={!isBettable || !underOdds}
                          >
                            <div className="font-medium">{game.away_team}</div>
                            <div className="text-xs">Under ({underOdds ? underOdds.toFixed(2) : 'N/A'})</div>
                          </button>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>
              )}
              {/* 핸디캡 */}
              {selectedMarketsForGame.has('Handicap') && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">🎯 핸디캡 (Handicap)</div>
                  <div className="space-y-2">
                  {(() => {
                    const spreadsOdds = officialOdds.spreads || {};
                    const spreadEntries = Object.entries(spreadsOdds);
                    if (spreadEntries.length === 0) {
                      return <div className="text-center text-gray-500 py-6">No Handicap odds available</div>;
                    }
                    // 핸디캡 쌍으로 그룹화
                    const groupedSpreads: { [point: string]: { home?: any, away?: any } } = {};
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
                    const filteredSpreads = Object.entries(groupedSpreads).filter(([point, oddsPair]) => {
                      const pointValue = Math.abs(parseFloat(point));
                      return pointValue % 0.5 === 0;
                    });
                    
                    if (filteredSpreads.length === 0) {
                      return <div className="text-center text-gray-500 py-6">No Handicap odds available</div>;
                    }
                    
                    return (
                      <div className="space-y-2">
                        {filteredSpreads.map(([absPoint, oddsPair], idx: number) => {
                          const homeData = oddsPair.home;
                          const awayData = oddsPair.away;
                          
                          const homeOdds = homeData?.oddsData?.averagePrice;
                          const awayOdds = awayData?.oddsData?.averagePrice;
                          const homeHandicap = homeData?.handicap || 0;
                          const awayHandicap = awayData?.handicap || 0;
                          const pointValue = parseFloat(absPoint);
                          
                          return (
                            <div key={absPoint} className="flex items-center gap-2">
                              {homeOdds != null && (
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
                                        point: pointValue
                                      });
                                    }
                                  }}
                                  className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                    (selections || []).some(sel => sel.team === `${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}` && sel.market === 'Handicap' && sel.gameId === game.id)
                                      ? 'bg-yellow-500 hover:bg-yellow-600'
                                      : isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                  } text-white text-sm`}
                                  disabled={!isBettable || !homeOdds}
                                >
                                  <div className="font-medium">{game.home_team} {homeHandicap > 0 ? '+' : ''}{homeHandicap}</div>
                                  <div className="text-xs">{homeOdds.toFixed(2)}</div>
                                </button>
                              )}
                              <div className="w-16 text-base font-bold text-gray-800 text-center">{homeHandicap > 0 ? '+' : ''}{homeHandicap}</div>
                              {awayOdds != null && (
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
                                        point: pointValue
                                      });
                                    }
                                  }}
                                  className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                    (selections || []).some(sel => sel.team === `${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}` && sel.market === 'Handicap' && sel.gameId === game.id)
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
                  Odds will be updated when the season resumes.
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
      <h2 className="text-2xl font-bold mb-6">Sports Betting</h2>
      
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
          onClick={() => {
            setViewMode('league');
            // 리그별 보기 선택시 축구를 기본 메인 카테고리로 설정하고 하위 카테고리는 선택 해제
            setSelectedMainCategory('Soccer');
            setSelectedCategory('');
            setCurrentSportKey('');
            setGames([]);
            setError(null);
            setLoading(false);
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'league'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🏟️ League View
        </button>
      </div>

      {viewMode === 'today' ? (
        <TodayBettingView />
      ) : (
        <>
          {/* 상위 카테고리 탭 */}
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              {Object.keys(SPORTS_TREE || {}).map((mainCategory) => (
                <button
                  key={mainCategory}
                  onClick={() => {
                    setSelectedMainCategory(mainCategory);
                    setSelectedCategory(''); // 하위 카테고리 초기화
                    console.log(`[메인 카테고리 변경] ${mainCategory} 선택 - 하위 카테고리 초기화`);
                  }}
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
              const bettableGames = games?.filter(game => game.isBettable) || [];
              const totalGames = games?.length || 0;
              
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
              📅 {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
                                              <div className="text-xs text-gray-500">Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {SPORTS_TREE[selectedMainCategory as keyof typeof SPORTS_TREE] && games.length === 0 ? (
              <div className="text-center py-12 bg-blue-50 rounded-lg">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🏟️ 경기가 없습니다</h3>
                <p className="text-gray-600">현재 {selectedCategory ? selectedCategory : selectedMainCategory} 경기가 예정되어 있지 않습니다.</p>
              </div>
            ) : !selectedCategory && !SPORTS_TREE[selectedMainCategory as keyof typeof SPORTS_TREE] ? (
              <div className="text-center py-12 bg-blue-50 rounded-lg">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">⚽ Please Select a League</h3>
                <p className="text-gray-600">Select your desired league from above to view game information for that league.</p>
              </div>
            ) : games.length === 0 ? (
              <SeasonInfoDisplay category={selectedCategory} />
            ) : (
              <div className="space-y-4">
                {games?.map((game, index) => {
                  // 게임별 선택된 마켓들 (체크박스 방식)
                  const selectedMarketsForGame = selectedMarkets[game.id] || new Set(['Win/Loss']);
                  if (!selectedMarkets[game.id]) {
                    setSelectedMarkets(prev => ({ ...prev, [game.id]: new Set(['Win/Loss']) }));
                  }
                  
                  return (
                    <div key={index} className={`bg-white rounded-lg shadow p-4 ${!game.isBettable ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
                      <div className="text-right">
                        <span className="text-sm">📅 {new Date(game.commence_time).toLocaleDateString()} {new Date(game.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!game.isBettable && (
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
                                onChange={() => {
                                  setSelectedMarkets(prev => {
                                    const current = prev[game.id] || new Set();
                                    const newSet = new Set(current);
                                    
                                    if (newSet.has(marketTab)) {
                                      newSet.delete(marketTab);
                                    } else {
                                      newSet.add(marketTab);
                                    }
                                    
                                    // 최소 하나는 선택되도록 보장
                                    if (newSet.size === 0) {
                                      newSet.add('Win/Loss');
                                    }
                                    
                                    return { ...prev, [game.id]: newSet };
                                  });
                                }}
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
                    
                    {/* 승/패 배당 */}
                    {selectedMarketsForGame.has('Win/Loss') && game.officialOdds?.h2h && Object.keys(game.officialOdds.h2h).length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-800 mb-2">🏆 승/패 (Win/Loss)</div>
                        {(() => {
                            const h2hOdds = game.officialOdds.h2h;
                            
                                // 축구 경기인지 확인
    const isSoccer = selectedCategory === 'Soccer' || 
                                           selectedCategory.includes('K League 1') || 
                                           selectedCategory.includes('Premier League') || 
                                           selectedCategory.includes('Serie A') || 
                                           selectedCategory.includes('Bundesliga') || 
                                           selectedCategory.includes('La Liga') || 
                                           selectedCategory.includes('MLS') || 
                                           selectedCategory.includes('Primera Division') || 
                                           selectedCategory.includes('Chinese Super League');
                            
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
                                  Win/Loss
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
                                    if (outcome.name.toLowerCase() === 'draw') label = 'Draw';
                                    else if (outcome.name === game.home_team) label = game.home_team;
                                    else if (outcome.name === game.away_team) label = game.away_team;
                                    
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          if (game.isBettable && outcome.odds.averagePrice) {
                                            toggleSelection({
                                              team: outcome.name,
                                              odds: outcome.odds.averagePrice,
                                              desc: `${game.home_team} vs ${game.away_team}`,
                                            commence_time: game.commence_time,
                                            market: 'Win/Loss',
                                            gameId: game.id,
                                            sport_key: game.sport_key
                                            });
                                          }
                                        }}
                                        className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                          (selections || []).some(sel => sel.team === outcome.name && sel.market === 'Win/Loss' && sel.gameId === game.id)
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : game.isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                        } text-white text-sm`}
                                        disabled={!game.isBettable || !outcome.odds.averagePrice}
                                      >
                                        <div className="font-medium">{label}</div>
                                        <div className="text-xs">{outcome.odds.averagePrice.toFixed(2)}</div>
                                        {!game.isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            );
                        })()}
                      </div>
                    )}
                    
                    {/* 언더/오버 배당 */}
                    {selectedMarketsForGame.has('Over/Under') && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-800 mb-2">📈 언더/오버 (Over/Under)</div>
                        
                        {/* 디버깅 정보 추가 */}
                        <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
                          <details>
                            <summary className="cursor-pointer font-medium">🔍 디버깅 정보</summary>
                            <div className="mt-2 space-y-1">
                              <div>officialOdds 존재: {game.officialOdds ? '✅' : '❌'}</div>
                              <div>totals 키: {game.officialOdds?.totals ? Object.keys(game.officialOdds.totals).join(', ') : '없음'}</div>
                              <div>totals 데이터 길이: {game.officialOdds?.totals ? Object.keys(game.officialOdds.totals).length : 0}</div>
                              <div>bookmakers 존재: {game.bookmakers ? '✅' : '❌'}</div>
                              <div>sport_key: {game.sport_key}</div>
                            </div>
                          </details>
                        </div>
                        
                        {game.officialOdds?.totals && Object.keys(game.officialOdds.totals).length > 0 ? (
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
                              
                              // 0.5 단위 포인트만 필터링 (0.25, 0.75 등 제외)
                              const filteredTotals = Object.entries(groupedTotals).filter(([point, oddsPair]) => {
                                const pointValue = parseFloat(point);
                                // NaN이거나 0.5 단위가 아니면 제외 (0.5, 1, 1.5, 2, 2.5... 만 허용)
                                return !isNaN(pointValue) && (pointValue % 0.5 === 0) && (pointValue % 1 === 0 || pointValue % 1 === 0.5);
                              });
                              
                              if (filteredTotals.length === 0) {
                                return (
                                  <div className="text-center text-gray-500 py-6">
                                    <div className="mb-2">📊 필터링된 언더/오버 정보가 없습니다</div>
                                    <div className="text-xs text-gray-400">
                                      원본 데이터는 있지만 0.5 단위 포인트가 아닙니다.
                                    </div>
                                  </div>
                                );
                              }
                              
                              return filteredTotals.map(([point, oddsPair], idx: number) => {
                                const overOdds = oddsPair.over?.averagePrice;
                                const underOdds = oddsPair.under?.averagePrice;
                                
                                return (
                                  <div key={idx} className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        const isBettable = new Date(game.commence_time) > new Date(Date.now() + 10 * 60 * 1000);
                                        if (!isBettable) {
                                          alert('This game is closed for betting.');
                                          return;
                                        }
                                        toggleSelection({
                                          team: `Over ${point}`,
                                          odds: overOdds,
                                          desc: `${game.home_team} vs ${game.away_team}`,
                                          commence_time: game.commence_time,
                                          market: 'Over/Under',
                                          gameId: game.id,
                                          sport_key: game.sport_key,
                                          point: parseFloat(point)
                                        });
                                      }}
                                      className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                        (selections || []).some(sel => sel.team === `Over ${point}` && sel.market === 'Over/Under' && sel.gameId === game.id)
                                          ? 'bg-yellow-500 hover:bg-yellow-600'
                                          : game.isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                      } text-white text-sm`}
                                      disabled={!game.isBettable || !overOdds}
                                    >
                                      <div className="font-medium">{game.home_team}</div>
                                      <div className="text-xs">Over ({overOdds ? overOdds.toFixed(2) : 'N/A'})</div>
                                      {!game.isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
                                    </button>
                                    <div className="w-16 text-base font-bold text-gray-800 text-center">
                                      {point}
                                    </div>
                                    <button
                                      onClick={() => {
                                        const isBettable = new Date(game.commence_time) > new Date(Date.now() + 10 * 60 * 1000);
                                        if (!isBettable) {
                                          alert('This game is closed for betting.');
                                          return;
                                        }
                                        toggleSelection({
                                          team: `Under ${point}`,
                                          odds: underOdds,
                                          desc: `${game.home_team} vs ${game.away_team}`,
                                          commence_time: game.commence_time,
                                          market: 'Over/Under',
                                          gameId: game.id,
                                          sport_key: game.sport_key,
                                          point: parseFloat(point)
                                        });
                                      }}
                                      className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                        (selections || []).some(sel => sel.team === `Under ${point}` && sel.market === 'Over/Under' && sel.gameId === game.id)
                                          ? 'bg-yellow-500 hover:bg-yellow-600'
                                          : game.isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                      } text-white text-sm`}
                                      disabled={!game.isBettable || !underOdds}
                                    >
                                      <div className="font-medium">{game.away_team}</div>
                                      <div className="text-xs">Under ({underOdds ? underOdds.toFixed(2) : 'N/A'})</div>
                                      {!game.isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
                                    </button>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-6">
                            <div className="mb-2">📊 언더/오버 배당 정보가 없습니다</div>
                            <div className="text-xs text-gray-400">
                              이 경기에는 총점 관련 배당 정보가 제공되지 않습니다.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 핸디캡 배당 */}
                    {selectedMarketsForGame.has('Handicap') && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-800 mb-2">🎯 핸디캡 (Handicap)</div>
                        
                        {/* 디버깅 정보 추가 */}
                        <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
                          <details>
                            <summary className="cursor-pointer font-medium">🔍 디버깅 정보</summary>
                            <div className="mt-2 space-y-1">
                              <div>officialOdds 존재: {game.officialOdds ? '✅' : '❌'}</div>
                              <div>spreads 키: {game.officialOdds?.spreads ? Object.keys(game.officialOdds.spreads).join(', ') : '없음'}</div>
                              <div>spreads 데이터 길이: {game.officialOdds?.spreads ? Object.keys(game.officialOdds.spreads).length : 0}</div>
                              <div>bookmakers 존재: {game.bookmakers ? '✅' : '❌'}</div>
                              <div>sport_key: {game.sport_key}</div>
                            </div>
                          </details>
                        </div>
                        
                        {game.officialOdds?.spreads && Object.keys(game.officialOdds.spreads).length > 0 ? (
                          <div className="space-y-2">
                            {(() => {
                              const spreadsOdds = game.officialOdds.spreads;
                              const groupedSpreads: { [point: string]: { home?: any, away?: any } } = {};
                              
                              Object.entries(spreadsOdds).forEach(([outcomeName, oddsData]) => {
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
                              const filteredSpreads = Object.entries(groupedSpreads).filter(([point, oddsPair]) => {
                                const pointValue = Math.abs(parseFloat(point));
                                return pointValue % 0.5 === 0;
                              });
                              
                              if (filteredSpreads.length === 0) {
                                return (
                                  <div className="text-center text-gray-500 py-6">
                                    <div className="mb-2">🎯 필터링된 핸디캡 정보가 없습니다</div>
                                    <div className="text-xs text-gray-400">
                                      원본 데이터는 있지만 0.5 단위 핸디캡이 아닙니다.
                                    </div>
                                  </div>
                                );
                              }
                              
                              return filteredSpreads.map(([absPoint, oddsPair], idx: number) => {
                                const homeData = oddsPair.home;
                                const awayData = oddsPair.away;
                                
                                const homeOdds = homeData?.oddsData?.averagePrice;
                                const awayOdds = awayData?.oddsData?.averagePrice;
                                const homeHandicap = homeData?.handicap || 0;
                                const awayHandicap = awayData?.handicap || 0;
                                const pointValue = parseFloat(absPoint);
                                
                                return (
                                  <div key={idx} className="flex items-center gap-2">
                                    {homeOdds != null && (
                                      <button
                                        onClick={() => {
                                          const isBettable = new Date(game.commence_time) > new Date(Date.now() + 10 * 60 * 1000);
                                          if (!isBettable) {
                                            alert('This game is closed for betting.');
                                            return;
                                          }
                                          toggleSelection({
                                            team: `${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`,
                                            odds: homeOdds,
                                            desc: `${game.home_team} vs ${game.away_team}`,
                                            commence_time: game.commence_time,
                                            market: 'Handicap',
                                            gameId: game.id,
                                            sport_key: game.sport_key,
                                            point: pointValue
                                          });
                                        }}
                                        className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                          (selections || []).some(sel => sel.team === `${game.home_team} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}` && sel.market === 'Handicap' && sel.gameId === game.id)
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : game.isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                        } text-white text-sm`}
                                        disabled={!game.isBettable || !homeOdds}
                                      >
                                        <div className="font-medium">{game.home_team}</div>
                                        <div className="text-xs">
                                          {homeOdds.toFixed(2)} 
                                          <span className="ml-1 text-xs">{homeHandicap > 0 ? '+' : ''}{homeHandicap}</span>
                                        </div>
                                        {!game.isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
                                      </button>
                                    )}
                                    <div className="w-16 text-base font-bold text-gray-800 text-center">{homeHandicap > 0 ? '+' : ''}{homeHandicap}</div>
                                    {awayOdds != null && (
                                      <button
                                        onClick={() => {
                                          const isBettable = new Date(game.commence_time) > new Date(Date.now() + 10 * 60 * 1000);
                                          if (!isBettable) {
                                            alert('This game is closed for betting.');
                                            return;
                                          }
                                          toggleSelection({
                                            team: `${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`,
                                            odds: awayOdds,
                                            desc: `${game.home_team} vs ${game.away_team}`,
                                            commence_time: game.commence_time,
                                            market: 'Handicap',
                                            gameId: game.id,
                                            sport_key: game.sport_key,
                                            point: pointValue
                                          });
                                        }}
                                        className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                                          (selections || []).some(sel => sel.team === `${game.away_team} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}` && sel.market === 'Handicap' && sel.gameId === game.id)
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : game.isBettable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                                        } text-white text-sm`}
                                        disabled={!game.isBettable || !awayOdds}
                                      >
                                        <div className="font-medium">{game.away_team}</div>
                                        <div className="text-xs">
                                          {awayOdds.toFixed(2)} 
                                          <span className="ml-1 text-xs">{awayHandicap > 0 ? '+' : ''}{awayHandicap}</span>
                                        </div>
                                        {!game.isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
                                      </button>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-6">
                            <div className="mb-2">🎯 핸디캡 배당 정보가 없습니다</div>
                            <div className="text-xs text-gray-400">
                              이 경기에는 핸디캡 관련 배당 정보가 제공되지 않습니다.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}