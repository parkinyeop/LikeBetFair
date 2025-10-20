import React, { useState, useEffect } from 'react';
import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
import { useExchange } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { getSportKey } from '../config/sportsMapping';
import { useExchangeGames, ExchangeGame } from '../hooks/useExchangeGames';
import { useExchangeStore } from '../stores/useExchangeStore';
import { adjustOddsSophisticated } from '../utils/oddsCalculator';
import { groupHandicapsByPoint, filterHalfPointHandicaps, formatHandicap } from '../utils/handicapUtils';

interface ExchangeMarketBoardProps {
  selectedCategory?: string;
  onSidebarTabChange?: (tab: 'order' | 'history') => void;
}

export default function ExchangeMarketBoard({ selectedCategory = "NBA", onSidebarTabChange }: ExchangeMarketBoardProps) {
  const { isLoggedIn } = useAuth();
  const { selections, toggleSelection } = useExchangeStore();
  const { games: exchangeGames, loading: gamesLoading, error: gamesError, refetch } = useExchangeGames(selectedCategory);
  // 체크박스 방식으로 변경: 여러 마켓을 동시에 선택 가능
  const [gameMarkets, setGameMarkets] = useState<{[gameId: string]: Set<string>}>({});
  
  // 🆕 Exchange 환수율 설정
  const [oddsReturnRateSettings, setOddsReturnRateSettings] = useState({ returnRate: 0.99, enabled: true });

  // 🆕 Exchange 환수율 설정 로드
  useEffect(() => {
    const loadOddsReturnRateSettings = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/exchange/odds-return-rate-settings'));
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setOddsReturnRateSettings(data.data);
          }
        }
      } catch (error) {
        console.error('❌ Exchange 환수율 설정 로드 실패:', error);
      }
    };
    
    loadOddsReturnRateSettings();
  }, []);

  // ✅ Phase 2: 환수율 적용 제거 (서버에서 처리)
  // 프론트엔드에서는 원본 배당률을 그대로 표시
  const applyExchangeReturnRate = (originalOdds: number, allOdds: number[] = []) => {
    // 서버에서 환수율을 적용하므로 프론트엔드에서는 원본 그대로 반환
    return originalOdds;
  };

  // 선택된 카테고리에서 스포츠 키 추출
  const getSportKeyFromCategory = (category: string): string | null => {
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      return getSportKey(subCategory);
    }
    return getSportKey(category);
  };

  const currentSportKey = getSportKeyFromCategory(selectedCategory);

  // 해당 카테고리의 경기만 필터링 후 중복 제거
  const filteredGamesRaw = exchangeGames.filter(game => {
    if (!currentSportKey) return false;
    return game.sportKey === currentSportKey;
  });

  // 중복 제거: homeTeam, awayTeam, commenceTime 조합 (UTC 시간 기준)
  const uniqueGamesMap = new Map();
  filteredGamesRaw.forEach((game) => {
    // UTC 시간을 기준으로 정확한 중복 제거
    const gameTime = new Date(game.commenceTime);
    const timeKey = gameTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const key = `${game.homeTeam}|${game.awayTeam}|${timeKey}`;
    
    if (!uniqueGamesMap.has(key)) {
      uniqueGamesMap.set(key, game);
    } else {
      // 더 최신 데이터가 있으면 교체
      const existingGame = uniqueGamesMap.get(key);
      const existingTime = new Date(existingGame.commenceTime);
      if (gameTime > existingTime) {
        uniqueGamesMap.set(key, game);
      }
    }
  });
  
  // 베팅 마감 시간 체크 함수 (스포츠북 규칙) - 먼저 선언
  const isBettingOpen = (commenceTime: string): boolean => {
    const now = new Date();
    // 🚨 수정: 하드코딩된 KST 변환 제거
    // 브라우저의 로컬 시간대 설정을 사용하여 자동 변환
    const utcDate = new Date(commenceTime);
    const gameTime = utcDate;
    const cutoffTime = new Date(gameTime.getTime() - 5 * 60 * 1000); // 5분 전 마감
    return now < cutoffTime;
  };

  // 경기 표시 여부 체크 함수 (스포츠북 규칙)
  const shouldDisplayGame = (commenceTime: string): boolean => {
    const now = new Date();
    // 🚨 수정: 하드코딩된 KST 변환 제거
    // 브라우저의 로컬 시간대 설정을 사용하여 자동 변환
    const utcDate = new Date(commenceTime);
    const gameTime = utcDate;
    const timeDiff = gameTime.getTime() - now.getTime();
    
    // 스포츠북 규칙: 과거 경기도 표시하되 배당율만 다르게 처리
    // 1. 미래 경기: 표시 (베팅 가능)
    // 2. 현재 진행 중 경기: 표시 (베팅 불가)
    // 3. 과거 경기: 표시 (베팅 불가, 결과 표시)
    
    return true; // 모든 경기 표시
  };

  // 스포츠북 스타일: 현재에 가까운 미래 순으로 정렬
  // 1. 현재 시간 기준으로 진행 중이거나 예정된 경기만 필터링
  // 2. 시작 시간 순으로 정렬 (가장 가까운 경기부터)
  const now = new Date();
  console.log('🕐 현재 시간:', now.toISOString());
  
  const sortedGames = Array.from(uniqueGamesMap.values())
    .filter(game => {
      // 🚨 수정: 하드코딩된 KST 변환 제거
      // 브라우저의 로컬 시간대 설정을 사용하여 자동 변환
      const utcDate = new Date(game.commenceTime);
      const gameTime = utcDate;
      const timeDiff = gameTime.getTime() - now.getTime();
      const shouldDisplay = shouldDisplayGame(game.commenceTime);
      
      // 디버깅: 각 경기의 시간 정보 로그
      console.log(`🏈 경기: ${game.homeTeam} vs ${game.awayTeam}`, {
        gameTime: gameTime.toISOString(),
        timeDiff: timeDiff,
        timeDiffHours: Math.round(timeDiff / (1000 * 60 * 60) * 100) / 100,
        shouldDisplay: shouldDisplay,
        status: timeDiff > 0 ? '미래' : timeDiff > -2 * 60 * 60 * 1000 ? '진행중' : '과거'
      });
      
      // 스포츠북 규칙 적용: 표시 여부 결정
      return shouldDisplay;
    })
    .sort((a, b) => {
      // 🚨 수정: 하드코딩된 KST 변환 제거
      // 브라우저의 로컬 시간대 설정을 사용하여 자동 변환
      const utcDateA = new Date(a.commenceTime);
      const utcDateB = new Date(b.commenceTime);
      const timeA = utcDateA;
      const timeB = utcDateB;
      const now = new Date();
      
      // 1. 미래 경기 우선 (가까운 순)
      // 2. 과거 경기는 나중에 (최근 순)
      
      const timeDiffA = timeA.getTime() - now.getTime();
      const timeDiffB = timeB.getTime() - now.getTime();
      
      // 둘 다 미래: 가까운 순
      if (timeDiffA > 0 && timeDiffB > 0) {
        return timeA.getTime() - timeB.getTime(); // 오름차순
      }
      
      // 둘 다 과거: 최근 순  
      if (timeDiffA < 0 && timeDiffB < 0) {
        return timeB.getTime() - timeA.getTime(); // 내림차순
      }
      
      // 미래 vs 과거: 미래가 우선
      return timeDiffA > 0 ? -1 : 1;
    });
  
  console.log('✅ 필터링 후 경기 수:', sortedGames.length);
  const filteredGames = sortedGames;

  // 체크박스 방식 마켓 토글 핸들러
  const toggleGameMarket = (gameId: string, market: string) => {
    setGameMarkets(prev => {
      const current = prev[gameId] || new Set();
      const newSet = new Set(current);
      
      if (newSet.has(market)) {
        newSet.delete(market);
      } else {
        newSet.add(market);
      }
      
      // 최소 하나는 선택되도록 보장
      if (newSet.size === 0) {
        newSet.add('승패');
      }
      
      return { ...prev, [gameId]: newSet };
    });
  };

  // 경기의 선택된 마켓들 가져오기
  const getSelectedMarkets = (gameId: string) => {
    return gameMarkets[gameId] || new Set(['승패']);
  };

  // 🆕 게임이 로드될 때 기본 마켓 설정
  useEffect(() => {
    if (filteredGames.length > 0) {
      const newGameMarkets: {[gameId: string]: Set<string>} = {};
      
      filteredGames.forEach(game => {
        if (!gameMarkets[game.id]) {
          newGameMarkets[game.id] = new Set(['승패']);
        }
      });
      
      if (Object.keys(newGameMarkets).length > 0) {
        setGameMarkets(prev => ({
          ...prev,
          ...newGameMarkets
        }));
      }
    }
  }, [filteredGames]);

  // 주문 클릭 핸들러 (스포츠북 구조로 단순화)
  const handleBetClick = (game: ExchangeGame, team: string, price: number, type: 'back' | 'lay', market: string = '승패') => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!isBettingOpen(game.commenceTime)) {
      alert('베팅 마감되었습니다.');
      return;
    }

    console.log('🎯 버튼 클릭됨:', { game, team, price, market });
    
    // 스포츠북처럼 단순한 토글
    toggleSelection({
      team,
      odds: price,
      type,
      gameId: game.id,
      market,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      commenceTime: game.commenceTime,
      sportKey: game.sportKey
    });
    
    // 사이드바를 주문하기 탭으로 자동 변경
    if (onSidebarTabChange) {
      onSidebarTabChange('order');
    }
  };



  // 베팅 선택 상태 확인 함수 (스포츠북 구조로 단순화)
  const isBetSelected = (gameId: string, market: string, team: string): boolean => {
    return selections.some(selection =>
      selection.gameId === gameId &&
      selection.market === market &&
      selection.team === team
    );
  };

  // 로딩 상태
  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">게임 데이터를 불러오는 중...</div>
      </div>
    );
  }

  // 에러 상태
  if (gamesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">게임 데이터 로드 중 오류가 발생했습니다.</div>
      </div>
    );
  }

  // 경기 없음
  if (filteredGames.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">{selectedCategory}에 예정된 경기가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* 정렬 정보 및 필터 헤더 */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-white">
              총 {filteredGames.length}경기
            </div>
            <div className="text-xs text-blue-400 bg-gray-700 px-2 py-1 rounded">
              ⏰ 미래 경기 우선 + 과거 경기 후순위 정렬
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {(() => {
              if (filteredGames.length === 0) return '';
              const nextGame = filteredGames[0];
              // 🚨 수정: 하드코딩된 KST 변환 제거
              // 브라우저의 로컬 시간대 설정을 사용하여 자동 변환
              const utcDate = new Date(nextGame.commenceTime);
              const nextGameTime = utcDate;
              const now = new Date();
              const timeDiff = nextGameTime.getTime() - now.getTime();
              if (timeDiff > 0) {
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                
                let timeString = '다음 경기: ';
                if (days > 0) {
                  timeString += `${days}일 `;
                }
                if (hours > 0 || days > 0) {
                  timeString += `${hours}시간 `;
                }
                timeString += `${minutes}분 후`;
                return timeString;
              }
              return '다음 경기: 곧 시작';
            })()}
          </div>
        </div>
      </div>
      
      {/* 경기 리스트 - 각 경기마다 개별 탭 구조 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
                {filteredGames.map((game) => {
          const isOpen = isBettingOpen(game.commenceTime);
          const selectedMarkets = getSelectedMarkets(game.id);
          
          return (
            <div key={game.id} className="bg-gray-900 rounded-lg shadow border border-gray-700">
              {/* 경기 헤더 */}
              <div className="p-4 border-b border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-semibold text-white">
                      {game.homeTeam} vs {game.awayTeam}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-gray-400">
                        {(() => {
                          // 🚨 수정: 하드코딩된 KST 변환 제거
                          // 브라우저의 로컬 시간대 설정을 사용하여 자동 변환
                          const utcDate = new Date(game.commenceTime);
                          const gameTime = utcDate;
                          const now = new Date();
                          
                          // KST 기준으로 시간 차이 계산
                          const timeDiff = gameTime.getTime() - now.getTime();
                          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                          const hoursDiff = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                          
                          // 스포츠북 스타일: 상대적 시간 표시
                          if (timeDiff < 0) {
                            // 이미 시작된 경기 - 경과 시간 표시
                            const elapsedDays = Math.abs(daysDiff);
                            const elapsedHours = Math.abs(hoursDiff);
                            const elapsedMinutes = Math.abs(minutesDiff);
                            if (elapsedDays > 0) {
                              return `진행 중 (${elapsedDays}일 ${elapsedHours}시간 ${elapsedMinutes}분 경과)`;
                            } else if (elapsedHours > 0) {
                              return `진행 중 (${elapsedHours}시간 ${elapsedMinutes}분 경과)`;
                            } else {
                              return `진행 중 (${elapsedMinutes}분 경과)`;
                            }
                          } else if (daysDiff > 0) {
                            return `${daysDiff}일 ${hoursDiff}시간 ${minutesDiff}분 후`;
                          } else if (hoursDiff > 0) {
                            return `${hoursDiff}시간 ${minutesDiff}분 후`;
                          } else if (minutesDiff > 0) {
                            return `${minutesDiff}분 후`;
                          } else {
                            return '곧 시작';
                          }
                        })()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {/* 🚨 수정: 하드코딩된 KST 변환 제거 */}
                        {/* 브라우저의 로컬 시간대 설정을 사용하여 자동 변환 */}
                        {(() => {
                          const gameTime = new Date(game.commenceTime);
                          return gameTime.toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            timeZone: 'Asia/Seoul',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded ${
                    isOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isOpen ? '베팅 가능' : '베팅 마감'}
                  </div>
                </div>
              </div>

              {/* 마켓 체크박스 - 여러 마켓을 동시에 선택 가능 */}
              <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-sm font-medium text-white mb-2">📊 베팅 마켓 선택:</div>
                <div className="flex flex-wrap gap-4">
                  {['승패', '총점', '핸디캡'].map(market => {
                    const isSelected = selectedMarkets.has(market);
                    return (
                      <label key={market} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleGameMarket(game.id, market)}
                          className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                          {market === '승패' ? '승/패' : 
                           market === '총점' ? '언더/오버' : '핸디캡'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 승패 마켓 */}
              {selectedMarkets.has('승패') && (
                              <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-sm font-medium text-white mb-2">🏆 승/패 (Win/Loss)</div>
                  <div className="flex items-center gap-2">
                    {/* 홈팀 승리 */}
                    <button
                      onClick={() => handleBetClick(game, game.homeTeam, game.homeTeamOdds || 2.5, 'back')}
                      disabled={!isOpen}
                      className={`flex-1 p-2 rounded-lg text-center text-white text-sm transition-colors ${
                        isBetSelected(game.id, '승패', game.homeTeam)
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : isOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-center truncate max-w-full">{game.homeTeam}</div>
                      <div className="text-xs mt-1 opacity-90">
                        배당: {game.homeTeamOdds ? game.homeTeamOdds.toFixed(3) : 'N/A'}
                      </div>
                    </button>

                    {/* 무승부 - 야구가 아닐 때만 표시 */}
                    {!game.sportKey?.includes('baseball') && (
                      <button
                        onClick={() => handleBetClick(game, '무승부', game.drawOdds || 3.5, 'back')}
                        disabled={!isOpen}
                        className={`flex-1 p-2 rounded-lg text-center text-white text-sm transition-colors ${
                          isBetSelected(game.id, '승패', '무승부')
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : isOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-center">무승부</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: {game.drawOdds ? game.drawOdds.toFixed(3) : 'N/A'}
                        </div>
                      </button>
                    )}

                    {/* 원정팀 승리 */}
                    <button
                      onClick={() => handleBetClick(game, game.awayTeam, game.awayTeamOdds || 2.5, 'back')}
                      disabled={!isOpen}
                      className={`flex-1 p-2 rounded-lg text-center text-white text-sm transition-colors ${
                        isBetSelected(game.id, '승패', game.awayTeam)
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : isOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-center truncate max-w-full">{game.awayTeam}</div>
                      <div className="text-xs mt-1 opacity-90">
                        배당: {game.awayTeamOdds ? game.awayTeamOdds.toFixed(3) : 'N/A'}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* 총점 마켓 */}
              {selectedMarkets.has('총점') && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="text-sm font-medium text-white mb-2">📈 언더/오버 (Over/Under)</div>
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
                          
                          // 🆕 환수율 적용
                          const allTotalsOdds = [overOdds, underOdds].filter(odds => odds !== undefined);
                          const adjustedOverOdds = overOdds ? applyExchangeReturnRate(overOdds, allTotalsOdds) : undefined;
                          const adjustedUnderOdds = underOdds ? applyExchangeReturnRate(underOdds, allTotalsOdds) : undefined;
                          
                          
                          return (
                            <div key={point} className="flex items-center gap-2">
                              <button
                                onClick={() => handleBetClick(game, `Over ${point}`, adjustedOverOdds || 1.9, 'back', '총점')}
                                disabled={!isOpen}
                                className={`flex-1 p-2 rounded-lg text-center text-white text-sm transition-colors ${
                                  isBetSelected(game.id, '총점', `Over ${point}`)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <div className="font-medium">{game.homeTeam}</div>
                                <div className="text-xs">{adjustedOverOdds ? adjustedOverOdds.toFixed(3) : 'N/A'}</div>
                              </button>
                              <div className="w-12 text-sm font-medium text-blue-400 text-center">{point}</div>
                              <button
                                onClick={() => handleBetClick(game, `Under ${point}`, adjustedUnderOdds || 1.9, 'back', '총점')}
                                disabled={!isOpen}
                                className={`flex-1 p-2 rounded-lg text-center text-white text-sm transition-colors ${
                                  isBetSelected(game.id, '총점', `Under ${point}`)
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : isOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <div className="font-medium">{game.awayTeam}</div>
                                <div className="text-xs">{adjustedUnderOdds ? adjustedUnderOdds.toFixed(3) : 'N/A'}</div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 핸디캡 마켓 */}
              {selectedMarkets.has('핸디캡') && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="text-sm font-medium text-white mb-2">🎯 핸디캡 (Handicap)</div>
                  {(() => {
                    const spreadsOdds = game.officialOdds?.spreads || {};

                    if (Object.keys(spreadsOdds).length === 0) {
                      return (
                        <div className="text-center text-gray-500 py-3">
                          핸디캡 배당 정보가 없습니다.
                        </div>
                      );
                    }

                    // ✅ 유틸리티 함수 사용
                    
                    const groupedSpreads = groupHandicapsByPoint(
                      spreadsOdds,
                      game.homeTeam,
                      game.awayTeam
                    );

                    const filteredSpreads = filterHalfPointHandicaps(groupedSpreads);

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

                          // 🆕 환수율 적용 (기존 로직 유지)
                          const allSpreadsOdds = [homeOdds, awayOdds].filter(odds => odds !== undefined);
                          const adjustedHomeOdds = homeOdds ? applyExchangeReturnRate(homeOdds, allSpreadsOdds) : undefined;
                          const adjustedAwayOdds = awayOdds ? applyExchangeReturnRate(awayOdds, allSpreadsOdds) : undefined;

                          const pointValue = parseFloat(absPoint);
                          // ✅ 수정: groupHandicapsByPoint()에서 계산된 실제 핸디캡 값 사용
                          const homeHandicap = homeData.handicap;  // 실제 핸디캡 값 (부호 포함)
                          const awayHandicap = awayData.handicap;  // 실제 핸디캡 값 (부호 포함)
                          

                          return (
                            <div key={absPoint} className="flex items-center gap-2">
                              {homeOdds != null && (
                                <button
                                  onClick={() => handleBetClick(game, `${game.homeTeam} ${formatHandicap(homeHandicap)}`, adjustedHomeOdds, 'back', '핸디캡')}
                                  disabled={!isOpen}
                                  className={`flex-1 p-2 rounded-lg text-center text-white text-sm transition-colors ${
                                    isBetSelected(game.id, '핸디캡', `${game.homeTeam} ${formatHandicap(homeHandicap)}`)
                                      ? 'bg-yellow-500 hover:bg-yellow-600'
                                      : isOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="font-medium">{game.homeTeam} {formatHandicap(homeHandicap)}</div>
                                  <div className="text-xs">{adjustedHomeOdds ? adjustedHomeOdds.toFixed(3) : 'N/A'}</div>
                                </button>
                              )}
                              <div className="w-12 text-sm font-medium text-blue-400 text-center">{pointValue}</div>
                              {awayOdds != null && (
                                <button
                                  onClick={() => handleBetClick(game, `${game.awayTeam} ${formatHandicap(awayHandicap)}`, adjustedAwayOdds, 'back', '핸디캡')}
                                  disabled={!isOpen}
                                  className={`flex-1 p-2 rounded-lg text-center text-white text-sm transition-colors ${
                                    isBetSelected(game.id, '핸디캡', `${game.awayTeam} ${formatHandicap(awayHandicap)}`)
                                      ? 'bg-yellow-500 hover:bg-yellow-600'
                                      : isOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="font-medium">{game.awayTeam} {formatHandicap(awayHandicap)}</div>
                                  <div className="text-xs">{adjustedAwayOdds ? adjustedAwayOdds.toFixed(3) : 'N/A'}</div>
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
}