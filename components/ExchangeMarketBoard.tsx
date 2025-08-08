import React, { useState, useEffect } from 'react';
import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
import { useExchange } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';
import { getSportKey } from '../config/sportsMapping';
import { useExchangeGames, ExchangeGame } from '../hooks/useExchangeGames';
import { isSameGame } from '../utils/matchSportsbookGame';

interface ExchangeMarketBoardProps {
  selectedCategory?: string;
}

export default function ExchangeMarketBoard({ selectedCategory = "NBA" }: ExchangeMarketBoardProps) {
  const { isLoggedIn } = useAuth();
  const { setSelectedBet } = useExchangeContext();
  const { games: exchangeGames, loading: gamesLoading, error: gamesError, refetch } = useExchangeGames(selectedCategory);
  const [sportsbookOdds, setSportsbookOdds] = useState<any[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [selectedMarket, setSelectedMarket] = useState<'승패' | '총점' | '핸디캡'>('승패');
  const [currentTime, setCurrentTime] = useState(new Date());

  // 선택된 카테고리에서 스포츠 키 추출 (sportsMapping.ts 사용)
  const getSportKeyFromCategory = (category: string): string | null => {
    console.log('🔍 카테고리에서 스포츠 키 추출:', category);
    
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      const sportKey = getSportKey(subCategory);
      console.log('🔍 서브카테고리 스포츠 키:', subCategory, '->', sportKey);
      return sportKey || null;
    }
    
    // 직접 카테고리명으로 매핑 (sportsMapping.ts의 SPORT_CATEGORIES 사용)
    const sportKey = getSportKey(category);
    console.log('🔍 직접 매핑 스포츠 키:', category, '->', sportKey);
    return sportKey || null;
  };

  const currentSportKey = getSportKeyFromCategory(selectedCategory);
  console.log('🎯 현재 스포츠 키:', currentSportKey);

  // 해당 카테고리의 경기만 필터링 후 중복 제거
  const filteredGamesRaw = exchangeGames.filter(game => {
    if (!currentSportKey) return false;
    console.log('🔍 게임 필터링:', {
      gameSportKey: game.sportKey,
      currentSportKey: currentSportKey,
      match: game.sportKey === currentSportKey
    });
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

  console.log('📊 필터링된 게임들:', filteredGames.length, '개');
  console.log('📊 전체 게임들:', exchangeGames.length, '개');

  // 선택된 경기
  const selectedGame = filteredGames[selectedGameIndex];

  // 스포츠북 배당률 fetch
  useEffect(() => {
    if (!selectedGame || !currentSportKey) return;
    
    const fetchSportsbookOdds = async () => {
      try {
        console.log('📡 스포츠북 배당률 fetch:', currentSportKey);
        const url = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${currentSportKey}`);
        const response = await fetch(url);
        if (!response.ok) {
          console.log('❌ 스포츠북 배당률 fetch 실패:', response.status);
          return setSportsbookOdds([]);
        }
        const data = await response.json();
        console.log('✅ 스포츠북 배당률 fetch 성공:', data.length, '개 경기');
        setSportsbookOdds(data);
      } catch (error) {
        console.error('❌ 스포츠북 배당률 fetch 오류:', error);
        setSportsbookOdds([]);
      }
    };
    
    fetchSportsbookOdds();
  }, [selectedGame, currentSportKey]);

  // 실시간 시간 업데이트 (베팅 마감 시간 체크용, 백그라운드에서도 동작)
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('[ExchangeMarketBoard] 주기적 시간 업데이트');
      setCurrentTime(new Date());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(timer);
  }, []);

  // Page Visibility API - 탭 활성화시 즉시 시간 갱신
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[ExchangeMarketBoard] 탭 활성화 - 시간 즉시 갱신');
        setCurrentTime(new Date());
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  // 선택된 경기의 스포츠북 배당률 추출
  const getSportsbookOdds = (marketType: string, selection: string) => {
    if (!sportsbookOdds || sportsbookOdds.length === 0 || !selectedGame) return null;
    
    // 팀명+경기시간+리그까지 모두 비교하는 매칭
    const sbGame = sportsbookOdds.find((g: any) => isSameGame(selectedGame, g));
    
    if (!sbGame) {
      console.log('❌ 매칭되는 스포츠북 경기 없음:', {
        homeTeam: selectedGame.homeTeam,
        awayTeam: selectedGame.awayTeam,
        commenceTime: selectedGame.commenceTime,
        sportKey: selectedGame.sportKey
      });
      return null;
    }
    
    // 마켓 매핑
    let marketKey = '';
    if (marketType === '승패') marketKey = 'h2h';
    else if (marketType === '총점') marketKey = 'totals';
    else if (marketType === '핸디캡') marketKey = 'spreads';

    const market = sbGame.bookmakers?.[0]?.markets?.find((m: any) => m.key === marketKey);
    if (!market) return null;

    // 선택지 매핑
    if (marketKey === 'h2h') {
      const outcome = market.outcomes?.find((o: any) => o.name === selection);
      return outcome ? outcome.price : null;
    } else if (marketKey === 'totals') {
      const isOver = selection.toLowerCase().includes('over');
      const outcome = market.outcomes?.find((o: any) => 
        isOver ? o.name.toLowerCase().includes('over') : o.name.toLowerCase().includes('under')
      );
      return outcome ? outcome.price : null;
    } else if (marketKey === 'spreads') {
      const outcome = market.outcomes?.find((o: any) => o.name === selection);
      return outcome ? outcome.price : null;
    }

    return null;
  };

  // 팀명 유사도 계산 함수
  const calculateTeamSimilarity = (team1: string, team2: string): number => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t1 = normalize(team1);
    const t2 = normalize(team2);
    
    // 정확히 일치
    if (t1 === t2) return 100;
    
    // 포함 관계 체크
    if (t1.includes(t2) || t2.includes(t1)) return 80;
    
    // 공통 단어 체크
    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    if (commonWords.length > 0) {
      return Math.min(70, commonWords.length * 30);
    }
    
    // Levenshtein 거리 기반 유사도
    const distance = levenshteinDistance(t1, t2);
    const maxLength = Math.max(t1.length, t2.length);
    const similarity = Math.max(0, 100 - (distance / maxLength) * 100);
    
    return similarity;
  };

  // Levenshtein 거리 계산 함수
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // 베팅 마감 시간 체크 함수
  const checkBettingCutoff = (commenceTime: string): { isAllowed: boolean; message: string; timeLeft?: number } => {
    const now = currentTime;
    const gameTime = new Date(commenceTime);
    const cutoffTime = new Date(gameTime.getTime() - 10 * 60 * 1000); // 경기 시작 10분 전
    const maxTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
    
    // 이미 마감된 경기
    if (now >= cutoffTime) {
      return {
        isAllowed: false,
        message: '베팅 마감됨 (경기 시작 10분 전 마감)'
      };
    }
    
    // 너무 먼 미래 경기
    if (gameTime > maxTime) {
      return {
        isAllowed: false,
        message: '베팅 오픈 예정 (7일 이내 경기만 가능)'
      };
    }
    
    // 마감 임박 (30분 이내)
    const timeUntilCutoff = cutoffTime.getTime() - now.getTime();
    if (timeUntilCutoff <= 30 * 60 * 1000) {
      const minutesLeft = Math.floor(timeUntilCutoff / (60 * 1000));
      return {
        isAllowed: true,
        message: `곧 마감 (${minutesLeft}분 후)`,
        timeLeft: timeUntilCutoff
      };
    }
    
    return {
      isAllowed: true,
      message: '베팅 가능'
    };
  };

  // 주문 클릭 핸들러
  const handleBetClick = (team: string, price: number, type: 'back' | 'lay') => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!selectedGame) {
      alert('경기를 선택해주세요.');
      return;
    }

    // 베팅 마감 시간 체크
    const bettingStatus = checkBettingCutoff(selectedGame.commenceTime);
    if (!bettingStatus.isAllowed) {
      alert(bettingStatus.message);
      return;
    }

    console.log('🎯 주문 선택:', { team, price, type, gameId: selectedGame.id, market: selectedMarket });
    
    setSelectedBet({
      team,
      price,
      type,
      gameId: selectedGame.id,
      market: selectedMarket,
      homeTeam: selectedGame.homeTeam,
      awayTeam: selectedGame.awayTeam,
      commenceTime: selectedGame.commenceTime
    });
  };

  // 경기 선택 핸들러
  const handleGameSelect = (index: number) => {
    console.log('🎮 경기 선택:', index, filteredGames[index]);
    setSelectedGameIndex(index);
  };

  // 마켓 선택 핸들러
  const handleMarketSelect = (market: '승패' | '총점' | '핸디캡') => {
    console.log('📊 마켓 선택:', market);
    setSelectedMarket(market);
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
          <div className="text-gray-400 text-sm">스포츠 키: {currentSportKey}</div>
        </div>
      </div>
    );
  }

  // 메인 UI 렌더링
  return (
    <div className="flex flex-col h-full">
      {/* 경기 선택 - 고정 높이 스크롤 영역 */}
      <div className="border-b border-gray-200 bg-white">
        <div className="p-3 pb-2">
          <h3 className="text-sm font-semibold text-gray-700">경기 선택</h3>
        </div>
        <div className="max-h-40 overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredGames.map((game, index) => {
              const bettingStatus = checkBettingCutoff(game.commenceTime);
              const isSelected = selectedGameIndex === index;
              
              return (
                <div
                  key={game.id}
                  className={`p-2 border rounded cursor-pointer transition-colors relative ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : bettingStatus.isAllowed
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-red-200 bg-red-50 opacity-60'
                  }`}
                  onClick={() => handleGameSelect(index)}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium mb-1">{game.homeTeam}</div>
                    <div className="text-xs text-gray-500 mb-1">vs</div>
                    <div className="text-sm font-medium mb-1">{game.awayTeam}</div>
                    <div className="text-xs text-gray-400 mb-1">
                      {new Date(game.commenceTime).toLocaleDateString('ko-KR', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {/* 베팅 상태 표시 */}
                    <div className={`text-xs px-1 py-0.5 rounded ${
                      !bettingStatus.isAllowed
                        ? 'bg-red-100 text-red-600'
                        : bettingStatus.timeLeft && bettingStatus.timeLeft <= 30 * 60 * 1000
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {bettingStatus.message}
                    </div>
                  </div>
                  {/* 마감된 경기 오버레이 */}
                  {!bettingStatus.isAllowed && (
                    <div className="absolute inset-0 bg-gray-500 bg-opacity-20 rounded flex items-center justify-center">
                      <div className="text-xs font-medium text-gray-600">마감</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 선택된 경기가 있을 때만 마켓 표시 */}
      {selectedGame && (
        <>
          {/* 마켓 타입 선택 - 컴팩트한 탭 */}
          <div className="flex border-b border-gray-200">
            {(['승패', '총점', '핸디캡'] as const).map((marketType) => (
              <button
                key={marketType}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedMarket === marketType
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleMarketSelect(marketType)}
              >
                {marketType}
              </button>
            ))}
          </div>

          {/* 주문 생성 영역 - 남은 공간 활용 */}
          <div className="flex-1 p-4 min-h-0 overflow-y-auto">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold mb-1">
                {selectedGame.homeTeam} vs {selectedGame.awayTeam}
              </h3>
              <p className="text-sm text-gray-600">{selectedMarket} 마켓</p>
            </div>

            {/* Back/Lay 버튼 영역 - 적절한 크기 */}
            <div className="flex justify-center gap-4 max-w-2xl mx-auto">
              {selectedMarket === '승패' && (() => {
                const bettingStatus = checkBettingCutoff(selectedGame.commenceTime);
                const isDisabled = !bettingStatus.isAllowed;
                
                // 축구 경기인지 확인
                const isSoccer = currentSportKey?.includes('soccer') || 
                               selectedCategory.includes('축구') || 
                               selectedCategory.includes('K리그') || 
                               selectedCategory.includes('J리그') || 
                               selectedCategory.includes('세리에A') || 
                               selectedCategory.includes('브라질세리에A') || 
                               selectedCategory.includes('MLS') || 
                               selectedCategory.includes('아르헨티나프리메라') || 
                               selectedCategory.includes('중국슈퍼리그') || 
                               selectedCategory.includes('라리가') || 
                               selectedCategory.includes('분데스리가');
                
                if (isSoccer) {
                  // 축구: 홈팀, 무승부, 원정팀 순서
                  return (
                    <div className="flex gap-4 max-w-4xl mx-auto">
                      {/* 홈팀 Back */}
                      <button
                        className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                          isDisabled
                            ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                        }`}
                        onClick={() => {
                          const odds = getSportsbookOdds('승패', selectedGame.homeTeam);
                          if (odds) handleBetClick(selectedGame.homeTeam, odds, 'back');
                        }}
                        disabled={isDisabled}
                      >
                        <div className={`text-lg font-bold ${isDisabled ? 'text-gray-600' : 'text-blue-800'}`}>
                          {selectedGame.homeTeam}
                        </div>
                        <div className={`text-xl font-extrabold mt-1 ${isDisabled ? 'text-gray-700' : 'text-blue-900'}`}>
                          {getSportsbookOdds('승패', selectedGame.homeTeam)?.toFixed(2) || 'N/A'}
                        </div>
                        <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-blue-600'}`}>
                          Back (이길 것)
                        </div>
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                            <div className="text-xs font-medium text-gray-600">마감</div>
                          </div>
                        )}
                      </button>

                      {/* 무승부 Back */}
                      <button
                        className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                          isDisabled
                            ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-green-300 bg-green-50 hover:bg-green-100'
                        }`}
                        onClick={() => {
                          const odds = getSportsbookOdds('승패', 'Draw');
                          if (odds) handleBetClick('Draw', odds, 'back');
                        }}
                        disabled={isDisabled}
                      >
                        <div className={`text-lg font-bold ${isDisabled ? 'text-gray-600' : 'text-green-800'}`}>
                          무승부
                        </div>
                        <div className={`text-xl font-extrabold mt-1 ${isDisabled ? 'text-gray-700' : 'text-green-900'}`}>
                          {getSportsbookOdds('승패', 'Draw')?.toFixed(2) || 'N/A'}
                        </div>
                        <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-green-600'}`}>
                          Back (무승부)
                        </div>
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                            <div className="text-xs font-medium text-gray-600">마감</div>
                          </div>
                        )}
                      </button>

                      {/* 원정팀 Back */}
                      <button
                        className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                          isDisabled
                            ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-purple-300 bg-purple-50 hover:bg-purple-100'
                        }`}
                        onClick={() => {
                          const odds = getSportsbookOdds('승패', selectedGame.awayTeam);
                          if (odds) handleBetClick(selectedGame.awayTeam, odds, 'back');
                        }}
                        disabled={isDisabled}
                      >
                        <div className={`text-lg font-bold ${isDisabled ? 'text-gray-600' : 'text-purple-800'}`}>
                          {selectedGame.awayTeam}
                        </div>
                        <div className={`text-xl font-extrabold mt-1 ${isDisabled ? 'text-gray-700' : 'text-purple-900'}`}>
                          {getSportsbookOdds('승패', selectedGame.awayTeam)?.toFixed(2) || 'N/A'}
                        </div>
                        <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-purple-600'}`}>
                          Back (이길 것)
                        </div>
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                            <div className="text-xs font-medium text-gray-600">마감</div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                } else {
                  // 다른 스포츠: 기존 방식 (홈팀 Back, 원정팀 Lay)
                  return (
                    <>
                      {/* 홈팀 Back */}
                      <button
                        className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                          isDisabled
                            ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                        }`}
                        onClick={() => {
                          const odds = getSportsbookOdds('승패', selectedGame.homeTeam);
                          if (odds) handleBetClick(selectedGame.homeTeam, odds, 'back');
                        }}
                        disabled={isDisabled}
                      >
                        <div className={`text-lg font-bold ${isDisabled ? 'text-gray-600' : 'text-blue-800'}`}>
                          {selectedGame.homeTeam}
                        </div>
                        <div className={`text-xl font-extrabold mt-1 ${isDisabled ? 'text-gray-700' : 'text-blue-900'}`}>
                          {getSportsbookOdds('승패', selectedGame.homeTeam)?.toFixed(2) || 'N/A'}
                        </div>
                        <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-blue-600'}`}>
                          Back (이길 것)
                        </div>
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                            <div className="text-xs font-medium text-gray-600">마감</div>
                          </div>
                        )}
                      </button>

                      {/* 원정팀 Lay */}
                      <button
                        className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                          isDisabled
                            ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-pink-300 bg-pink-50 hover:bg-pink-100'
                        }`}
                        onClick={() => {
                          const odds = getSportsbookOdds('승패', selectedGame.awayTeam);
                          if (odds) handleBetClick(selectedGame.awayTeam, odds, 'lay');
                        }}
                        disabled={isDisabled}
                      >
                        <div className={`text-lg font-bold ${isDisabled ? 'text-gray-600' : 'text-pink-800'}`}>
                          {selectedGame.awayTeam}
                        </div>
                        <div className={`text-xl font-extrabold mt-1 ${isDisabled ? 'text-gray-700' : 'text-pink-900'}`}>
                          {getSportsbookOdds('승패', selectedGame.awayTeam)?.toFixed(2) || 'N/A'}
                        </div>
                        <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-pink-600'}`}>
                          Lay (질 것)
                        </div>
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                            <div className="text-xs font-medium text-gray-600">마감</div>
                          </div>
                        )}
                      </button>
                    </>
                  );
                }
              })()}

              {selectedMarket === '총점' && (() => {
                const bettingStatus = checkBettingCutoff(selectedGame.commenceTime);
                const isDisabled = !bettingStatus.isAllowed;
                
                return (
                  <>
                    {/* Over Back */}
                    <button
                      className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                        isDisabled
                          ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                          : 'border-green-300 bg-green-50 hover:bg-green-100'
                      }`}
                      onClick={() => {
                        const odds = getSportsbookOdds('총점', 'Over 2.5');
                        if (odds) handleBetClick('Over 2.5', odds, 'back');
                      }}
                      disabled={isDisabled}
                    >
                      <div className={`text-lg font-bold ${isDisabled ? 'text-gray-600' : 'text-green-800'}`}>
                        Over 2.5
                      </div>
                      <div className={`text-xl font-extrabold mt-1 ${isDisabled ? 'text-gray-700' : 'text-green-900'}`}>
                        {getSportsbookOdds('총점', 'Over 2.5')?.toFixed(2) || 'N/A'}
                      </div>
                      <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-green-600'}`}>
                        Back (초과)
                      </div>
                      {isDisabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                          <div className="text-xs font-medium text-gray-600">마감</div>
                        </div>
                      )}
                    </button>

                    {/* Under Lay */}
                    <button
                      className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                        isDisabled
                          ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                          : 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                      }`}
                      onClick={() => {
                        const odds = getSportsbookOdds('총점', 'Under 2.5');
                        if (odds) handleBetClick('Under 2.5', odds, 'lay');
                      }}
                      disabled={isDisabled}
                    >
                      <div className={`text-lg font-bold ${isDisabled ? 'text-gray-600' : 'text-orange-800'}`}>
                        Under 2.5
                      </div>
                      <div className={`text-xl font-extrabold mt-1 ${isDisabled ? 'text-gray-700' : 'text-orange-900'}`}>
                        {getSportsbookOdds('총점', 'Under 2.5')?.toFixed(2) || 'N/A'}
                      </div>
                      <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-orange-600'}`}>
                        Lay (미만)
                      </div>
                      {isDisabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                          <div className="text-xs font-medium text-gray-600">마감</div>
                        </div>
                      )}
                    </button>
                  </>
                );
              })()}

              {selectedMarket === '핸디캡' && (() => {
                const bettingStatus = checkBettingCutoff(selectedGame.commenceTime);
                const isDisabled = !bettingStatus.isAllowed;
                
                // 스포츠북에서 핸디캡 배당 가져오기
                const sbGame = sportsbookOdds.find((g: any) => isSameGame(selectedGame, g));
                if (!sbGame || !sbGame.officialOdds?.spreads) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      <p>핸디캡 배당 정보 없음</p>
                    </div>
                  );
                }
                
                const spreadsOdds = sbGame.officialOdds.spreads;
                const spreadEntries = Object.entries(spreadsOdds);
                
                if (spreadEntries.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      <p>핸디캡 배당 정보 없음</p>
                    </div>
                  );
                }
                
                // Home/Away 쌍으로 그룹화 (팀명 기반 매칭)
                const groupedSpreads: { [absPoint: string]: { home?: { oddsData: any, handicap: number }, away?: { oddsData: any, handicap: number } } } = {};
                
                spreadEntries.forEach(([outcomeName, oddsData]) => {
                  // "Team Point" 형식에서 팀명과 핸디캡 분리
                  const parts = outcomeName.split(' ');
                  const point = parts[parts.length - 1]; // 마지막 부분이 핸디캡
                  const teamName = parts.slice(0, -1).join(' '); // 나머지가 팀명
                  
                  const handicapValue = parseFloat(point); // -1.5 또는 +1.5
                  const absPoint = Math.abs(handicapValue).toString(); // "1.5"로 통일
                  
                  if (!groupedSpreads[absPoint]) groupedSpreads[absPoint] = {};
                  
                  // 홈팀인지 원정팀인지 판단
                  if (teamName === selectedGame.homeTeam) {
                    groupedSpreads[absPoint].home = { oddsData, handicap: handicapValue };
                  } else if (teamName === selectedGame.awayTeam) {
                    groupedSpreads[absPoint].away = { oddsData, handicap: handicapValue };
                  }
                });
                
                // 0.5 단위 핸디캡만 필터링 (-1.5, -1, -0.5, 0.5, 1, 1.5 등)
                const filteredSpreads = Object.entries(groupedSpreads).filter(([absPoint, oddsPair]) => {
                  const pointValue = Math.abs(parseFloat(absPoint));
                  return pointValue % 0.5 === 0;
                });
                
                if (filteredSpreads.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      <p>핸디캡 배당 정보 없음</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {filteredSpreads.map(([absPoint, oddsPair]) => {
                      const homeData = oddsPair.home;
                      const awayData = oddsPair.away;
                      
                      const homeOdds = homeData?.oddsData?.averagePrice;
                      const awayOdds = awayData?.oddsData?.averagePrice;
                      const homeHandicap = homeData?.handicap || 0;
                      const awayHandicap = awayData?.handicap || 0;
                      
                      return (
                        <div key={absPoint} className="flex gap-4">
                          {/* 홈팀 Back */}
                          {homeOdds != null && (
                            <button
                              className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                                isDisabled || !homeOdds
                                  ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                                  : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                              }`}
                              onClick={() => {
                                if (homeOdds) handleBetClick(`${selectedGame.homeTeam} ${homeHandicap > 0 ? '+' : ''}${homeHandicap}`, homeOdds, 'back');
                              }}
                              disabled={isDisabled || !homeOdds}
                            >
                              <div className={`text-lg font-bold ${isDisabled || !homeOdds ? 'text-gray-600' : 'text-blue-800'}`}>
                                {selectedGame.homeTeam} {homeHandicap > 0 ? '+' : ''}{homeHandicap}
                              </div>
                              <div className={`text-xl font-extrabold mt-1 ${isDisabled || !homeOdds ? 'text-gray-700' : 'text-blue-900'}`}>
                                {homeOdds.toFixed(2)}
                              </div>
                              <div className={`text-xs mt-1 ${isDisabled || !homeOdds ? 'text-gray-500' : 'text-blue-600'}`}>
                                Back
                              </div>
                            </button>
                          )}

                          {/* 핸디캡 표시 */}
                          <div className="w-20 flex items-center justify-center">
                            <div className="text-lg font-bold text-gray-800">
                              {homeHandicap > 0 ? '+' : ''}{homeHandicap}
                            </div>
                          </div>

                          {/* 원정팀 Back */}
                          {awayOdds != null && (
                            <button
                              className={`flex-1 p-4 border-2 rounded-lg text-center transition relative ${
                                isDisabled || !awayOdds
                                  ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                                  : 'border-purple-300 bg-purple-50 hover:bg-purple-100'
                              }`}
                              onClick={() => {
                                if (awayOdds) handleBetClick(`${selectedGame.awayTeam} ${awayHandicap > 0 ? '+' : ''}${awayHandicap}`, awayOdds, 'back');
                              }}
                              disabled={isDisabled || !awayOdds}
                            >
                              <div className={`text-lg font-bold ${isDisabled || !awayOdds ? 'text-gray-600' : 'text-purple-800'}`}>
                                {selectedGame.awayTeam} {awayHandicap > 0 ? '+' : ''}{awayHandicap}
                              </div>
                              <div className={`text-xl font-extrabold mt-1 ${isDisabled || !awayOdds ? 'text-gray-700' : 'text-purple-900'}`}>
                                {awayOdds.toFixed(2)}
                              </div>
                              <div className={`text-xs mt-1 ${isDisabled || !awayOdds ? 'text-gray-500' : 'text-purple-600'}`}>
                                Back
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 안내 메시지 - 컴팩트 */}
            <div className="mt-6 text-center text-xs text-gray-500">
              <p>스포츠북 배당률 기반 Exchange 주문 생성 | 버튼 클릭 시 오른쪽 패널에서 주문 설정</p>
            </div>

            {/* 추가 경기 정보 - 선택사항 */}
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">경기 시간:</span>
                <span className="font-medium">{new Date(selectedGame.commenceTime).toLocaleString('ko-KR')}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-600">리그:</span>
                <span className="font-medium">{selectedGame.league}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 