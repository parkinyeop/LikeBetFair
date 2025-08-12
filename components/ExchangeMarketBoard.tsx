import React, { useState, useEffect } from 'react';
import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
import { useExchange } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';
import { getSportKey } from '../config/sportsMapping';
import { useExchangeGames, ExchangeGame } from '../hooks/useExchangeGames';

interface ExchangeMarketBoardProps {
  selectedCategory?: string;
}

export default function ExchangeMarketBoard({ selectedCategory = "NBA" }: ExchangeMarketBoardProps) {
  const { isLoggedIn } = useAuth();
  const { setSelectedBet } = useExchangeContext();
  const { games: exchangeGames, loading: gamesLoading, error: gamesError, refetch } = useExchangeGames(selectedCategory);
  const [gameMarkets, setGameMarkets] = useState<{[gameId: string]: '승패' | '총점' | '핸디캡'}>({});
  const [selectedBets, setSelectedBets] = useState<{[key: string]: boolean}>({});

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
    const gameTime = new Date(commenceTime);
    const cutoffTime = new Date(gameTime.getTime() - 5 * 60 * 1000); // 5분 전 마감
    return now < cutoffTime;
  };

  // 경기 표시 여부 체크 함수 (스포츠북 규칙)
  const shouldDisplayGame = (commenceTime: string): boolean => {
    const now = new Date();
    const gameTime = new Date(commenceTime);
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
      const gameTime = new Date(game.commenceTime);
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
      const timeA = new Date(a.commenceTime);
      const timeB = new Date(b.commenceTime);
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

  // 경기별 마켓 선택 핸들러
  const setGameMarket = (gameId: string, market: '승패' | '총점' | '핸디캡') => {
    setGameMarkets(prev => ({ ...prev, [gameId]: market }));
  };

  // 경기의 현재 선택된 마켓 가져오기
  const getGameMarket = (gameId: string) => {
    return gameMarkets[gameId] || '승패';
  };

  // 주문 클릭 핸들러
  const handleBetClick = (game: ExchangeGame, team: string, price: number, type: 'back' | 'lay') => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!isBettingOpen(game.commenceTime)) {
      alert('베팅 마감되었습니다.');
      return;
    }

    const currentMarket = getGameMarket(game.id);
    const betKey = `${game.id}-${currentMarket}-${team}`;
    
    // 같은 베팅을 다시 클릭하면 선택 해제, 다른 베팅을 클릭하면 선택
    if (selectedBets[betKey]) {
      setSelectedBets(prev => ({ ...prev, [betKey]: false }));
      setSelectedBet(null);
    } else {
      // 이전 선택을 모두 해제하고 새로운 베팅 선택
      setSelectedBets({ [betKey]: true });
      setSelectedBet({
        team,
        price,
        type,
        gameId: game.id,
        market: currentMarket,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        commenceTime: game.commenceTime
      });
    }
  };

  // 베팅 선택 상태 확인 함수
  const isBetSelected = (gameId: string, market: string, team: string): boolean => {
    const betKey = `${gameId}-${market}-${team}`;
    return !!selectedBets[betKey];
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
    <div className="flex flex-col h-full">
      {/* 정렬 정보 및 필터 헤더 */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-gray-700">
              총 {filteredGames.length}경기
            </div>
            <div className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
              ⏰ 미래 경기 우선 + 과거 경기 후순위 정렬
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {(() => {
              if (filteredGames.length === 0) return '';
              const nextGame = filteredGames[0];
              const nextGameTime = new Date(nextGame.commenceTime);
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
          const currentMarket = getGameMarket(game.id);
          
          return (
            <div key={game.id} className="bg-white rounded-lg shadow border border-gray-200">
              {/* 경기 헤더 */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {game.homeTeam} vs {game.awayTeam}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-gray-500">
                        {(() => {
                          // UTC 시간을 올바르게 처리
                          const gameTime = new Date(game.commenceTime);
                          const now = new Date();
                          
                          // UTC 기준으로 시간 차이 계산
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
                        {/* UTC 시간을 한국 시간으로 변환하여 표시 */}
                        {(() => {
                          const gameTime = new Date(game.commenceTime);
                          // UTC를 한국 시간(KST)으로 변환 (UTC+9)
                          const kstTime = new Date(gameTime.getTime() + 9 * 60 * 60 * 1000);
                          return kstTime.toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded ${
                    isOpen ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {isOpen ? '베팅 가능' : '베팅 마감'}
                  </div>
                </div>
              </div>

              {/* 경기별 마켓 탭 선택 - 스포츠북 스타일 */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="flex bg-gray-100 rounded-lg m-3 p-1">
                  <button
                    onClick={() => setGameMarket(game.id, '승패')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      currentMarket === '승패'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Win/Loss
                  </button>
                  <button
                    onClick={() => setGameMarket(game.id, '총점')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      currentMarket === '총점'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Over/Under
                  </button>
                  <button
                    onClick={() => setGameMarket(game.id, '핸디캡')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      currentMarket === '핸디캡'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Handicap
                  </button>
                </div>
              </div>

              {/* 승패 마켓 */}
              {currentMarket === '승패' && (
                <div className="p-4">
                  <div className="flex space-x-4">
                    {/* 홈팀 승리 */}
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, game.homeTeam, game.homeTeamOdds || 2.5, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : isBetSelected(game.id, currentMarket, game.homeTeam)
                            ? 'bg-yellow-400 hover:bg-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center truncate max-w-full">{game.homeTeam}</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: {(game.homeTeamOdds || 2.5).toFixed(2)}
                        </div>
                      </button>
                    </div>

                    {/* 무승부 */}
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, '무승부', game.drawOdds || 3.5, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : isBetSelected(game.id, currentMarket, '무승부')
                            ? 'bg-yellow-400 hover:bg-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center">무승부</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: {(game.drawOdds || 3.5).toFixed(2)}
                        </div>
                      </button>
                    </div>

                    {/* 원정팀 승리 */}
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, game.awayTeam, game.awayTeamOdds || 2.5, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : isBetSelected(game.id, currentMarket, game.awayTeam)
                            ? 'bg-yellow-400 hover:bg-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center truncate max-w-full">{game.awayTeam}</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: {(game.awayTeamOdds || 2.5).toFixed(2)}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 총점 마켓 */}
              {currentMarket === '총점' && (
                <div className="p-4">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, 'Over 2.5', 1.9, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : isBetSelected(game.id, currentMarket, 'Over 2.5')
                            ? 'bg-yellow-400 hover:bg-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center">Over 2.5</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: 1.90
                        </div>
                      </button>
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, 'Under 2.5', 1.9, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : isBetSelected(game.id, currentMarket, 'Under 2.5')
                            ? 'bg-yellow-400 hover:bg-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center">Under 2.5</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: 1.90
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 핸디캡 마켓 */}
              {currentMarket === '핸디캡' && (
                <div className="p-4">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, `${game.homeTeam} -1.5`, 2.0, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : isBetSelected(game.id, currentMarket, `${game.homeTeam} -1.5`)
                            ? 'bg-yellow-400 hover:bg-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center truncate max-w-full">{game.homeTeam} -1.5</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: 2.00
                        </div>
                      </button>
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, `${game.awayTeam} +1.5`, 1.8, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : isBetSelected(game.id, currentMarket, `${game.awayTeam} +1.5`)
                            ? 'bg-yellow-400 hover:bg-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center truncate max-w-full">{game.awayTeam} +1.5</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: 1.80
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}