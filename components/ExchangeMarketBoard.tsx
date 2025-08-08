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

  // 중복 제거: homeTeam, awayTeam, commenceTime 조합
  const uniqueGamesMap = new Map();
  filteredGamesRaw.forEach((game) => {
    const key = `${game.homeTeam}|${game.awayTeam}|${game.commenceTime}`;
    if (!uniqueGamesMap.has(key)) {
      uniqueGamesMap.set(key, game);
    }
  });
  const filteredGames = Array.from(uniqueGamesMap.values());

  // 베팅 마감 시간 체크 함수
  const isBettingOpen = (commenceTime: string): boolean => {
    const now = new Date();
    const gameTime = new Date(commenceTime);
    const cutoffTime = new Date(gameTime.getTime() - 5 * 60 * 1000); // 5분 전 마감
    return now < cutoffTime;
  };

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
                    <div className="text-xs text-gray-500">
                      {new Date(game.commenceTime).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
                        onClick={() => handleBetClick(game, game.homeTeam, 1.8, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center truncate max-w-full">{game.homeTeam}</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: 1.80
                        </div>
                      </button>
                    </div>

                    {/* 무승부 */}
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, '무승부', 3.2, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center">무승부</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: 3.20
                        </div>
                      </button>
                    </div>

                    {/* 원정팀 승리 */}
                    <div className="flex-1">
                      <button
                        onClick={() => handleBetClick(game, game.awayTeam, 2.1, 'back')}
                        disabled={!isOpen}
                        className={`w-full h-16 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 flex flex-col justify-center items-center ${
                          !isOpen
                            ? 'opacity-50 cursor-not-allowed bg-gray-400'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <div className="text-center truncate max-w-full">{game.awayTeam}</div>
                        <div className="text-xs mt-1 opacity-90">
                          배당: 2.10
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