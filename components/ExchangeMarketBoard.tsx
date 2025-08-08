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
  const [selectedMarket, setSelectedMarket] = useState<'승패' | '총점' | '핸디캡'>('승패');

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

    setSelectedBet({
      team,
      price,
      type,
      gameId: game.id,
      market: selectedMarket,
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
      {/* 마켓 탭 선택 - 스포츠북 스타일 */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex bg-gray-100 rounded-lg m-4 p-1">
          <button
            onClick={() => setSelectedMarket('승패')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedMarket === '승패'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Win/Loss
          </button>
          <button
            onClick={() => setSelectedMarket('총점')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedMarket === '총점'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Over/Under
          </button>
          <button
            onClick={() => setSelectedMarket('핸디캡')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedMarket === '핸디캡'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Handicap
          </button>
        </div>
      </div>

      {/* 경기 리스트 - 스포츠북 스타일 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {filteredGames.map((game) => {
          const isOpen = isBettingOpen(game.commenceTime);
          
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

              {/* 승패 마켓 */}
              {selectedMarket === '승패' && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {/* 홈팀 승리 */}
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium mb-2">{game.homeTeam}</div>
                      <button
                        onClick={() => handleBetClick(game, game.homeTeam, 1.8, 'back')}
                        disabled={!isOpen}
                        className={`w-full py-3 rounded-lg text-white font-medium ${
                          isOpen 
                            ? 'bg-blue-500 hover:bg-blue-600' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        1.80
                      </button>
                    </div>

                    {/* 무승부 */}
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium mb-2">무</div>
                      <button
                        onClick={() => handleBetClick(game, '무승부', 3.2, 'back')}
                        disabled={!isOpen}
                        className={`w-full py-3 rounded-lg text-white font-medium ${
                          isOpen 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        3.20
                      </button>
                    </div>

                    {/* 원정팀 승리 */}
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium mb-2">{game.awayTeam}</div>
                      <button
                        onClick={() => handleBetClick(game, game.awayTeam, 2.1, 'back')}
                        disabled={!isOpen}
                        className={`w-full py-3 rounded-lg text-white font-medium ${
                          isOpen 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        2.10
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 총점 마켓 */}
              {selectedMarket === '총점' && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium mb-2">Over 2.5</div>
                      <button
                        onClick={() => handleBetClick(game, 'Over 2.5', 1.9, 'back')}
                        disabled={!isOpen}
                        className={`w-full py-3 rounded-lg text-white font-medium ${
                          isOpen 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        1.90
                      </button>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium mb-2">Under 2.5</div>
                      <button
                        onClick={() => handleBetClick(game, 'Under 2.5', 1.9, 'back')}
                        disabled={!isOpen}
                        className={`w-full py-3 rounded-lg text-white font-medium ${
                          isOpen 
                            ? 'bg-purple-500 hover:bg-purple-600' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        1.90
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 핸디캡 마켓 */}
              {selectedMarket === '핸디캡' && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium mb-2">{game.homeTeam} -1.5</div>
                      <button
                        onClick={() => handleBetClick(game, `${game.homeTeam} -1.5`, 2.0, 'back')}
                        disabled={!isOpen}
                        className={`w-full py-3 rounded-lg text-white font-medium ${
                          isOpen 
                            ? 'bg-indigo-500 hover:bg-indigo-600' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        2.00
                      </button>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium mb-2">{game.awayTeam} +1.5</div>
                      <button
                        onClick={() => handleBetClick(game, `${game.awayTeam} +1.5`, 1.8, 'back')}
                        disabled={!isOpen}
                        className={`w-full py-3 rounded-lg text-white font-medium ${
                          isOpen 
                            ? 'bg-teal-500 hover:bg-teal-600' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        1.80
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