import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { getGameInfo } from '../config/sportsMapping';

export default function ExchangePage() {
  const { isLoggedIn } = useAuth();
  const { fetchOrderbook, placeMatchOrder } = useExchange();
  const router = useRouter();
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [gameInfo, setGameInfo] = useState<any>(null);

  // 대표 경기의 호가 데이터 로드 (원래 실제 게임 ID)
  useEffect(() => {
    if (isLoggedIn) {
      const gameId = '8818fb84-7b44-4cfa-a406-83f8bf1457d1';
      const info = getGameInfo(gameId);
      setGameInfo(info);
      
      fetchOrderbook(gameId, '승패', 8.5).then((orders) => {
        console.log('🏠 Exchange 홈 - 호가 데이터 로드:', orders);
        setOrderbook(orders);
      });
    } else {
      setOrderbook([]);
      setGameInfo(null);
    }
  }, [isLoggedIn, fetchOrderbook]);

  // 매치 주문 핸들러
  const handleMatchOrder = async (existingOrder: ExchangeOrder) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      // 기존 주문의 반대편으로 매치 주문 생성
      const oppositeSide: 'back' | 'lay' = existingOrder.side === 'back' ? 'lay' : 'back';
      const matchPrice = existingOrder.price; // 기존 주문 가격으로 매치
      
      const orderData = {
        gameId: existingOrder.gameId,
        market: existingOrder.market,
        line: existingOrder.line,
        side: oppositeSide,
        price: matchPrice,
        amount: existingOrder.amount // 전액 매치
      };

      console.log('🎯 홈에서 매치 주문 실행:', orderData);
      
      const result = await placeMatchOrder(orderData);
      
      if (result.success) {
        alert(`✅ 매치 성공!\n매치된 금액: ${result.totalMatched.toLocaleString()}원\n매치 개수: ${result.matches}개`);
        
        // 호가창 데이터 새로고침
        const gameId = '8818fb84-7b44-4cfa-a406-83f8bf1457d1';
        const updatedOrderbook = await fetchOrderbook(gameId, '승패', 8.5);
        setOrderbook(updatedOrderbook);
      } else {
        alert('매치 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('❌ 홈에서 매치 주문 오류:', error);
      alert('매치 주문 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 실시간 호가 현황 - 상단 */}
      <div className="bg-white rounded shadow p-6 mb-4">
        <h3 className="text-lg font-bold mb-4">🔥 실시간 호가 현황</h3>
        {!isLoggedIn ? (
          <div className="text-center py-8">
            <p className="text-gray-600">로그인 후 실시간 호가 정보를 확인할 수 있습니다.</p>
          </div>
        ) : orderbook.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">현재 등록된 호가가 없습니다.</p>
            <p className="text-sm text-gray-400">아래 스포츠를 선택해서 새로운 호가를 등록해보세요!</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-3">
              {gameInfo ? (
                <>
                  <strong>🏀 {gameInfo.displayName} - 승패 마켓</strong>
                  <div className="text-xs text-gray-500 mt-1">
                    📅 {new Date(gameInfo.gameDate).toLocaleString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-xs text-blue-500 mt-1">
                    🏀 {gameInfo.homeTeam} vs {gameInfo.awayTeam}
                  </div>
                </>
              ) : (
                <strong>🏀 경기 정보 로딩 중...</strong>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Back 주문들 */}
              <div>
                <h4 className="text-sm font-semibold text-blue-600 mb-2 text-center">Back (베팅)</h4>
                <div className="space-y-1">
                  {orderbook
                    .filter(order => order.side === 'back')
                    .sort((a, b) => b.price - a.price) // 높은 가격부터
                    .slice(0, 3) // 상위 3개만 표시
                    .map((order) => (
                      <div key={order.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-blue-700">{order.price.toFixed(2)}</span>
                          <span className="text-right text-blue-600">{order.amount.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleMatchOrder(order)}
                            className="px-2 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600 transition-colors"
                          >
                            Lay로 매치
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Lay 주문들 */}
              <div>
                <h4 className="text-sm font-semibold text-pink-600 mb-2 text-center">Lay (레이)</h4>
                <div className="space-y-1">
                  {orderbook
                    .filter(order => order.side === 'lay')
                    .sort((a, b) => a.price - b.price) // 낮은 가격부터
                    .slice(0, 3) // 상위 3개만 표시
                    .map((order) => (
                      <div key={order.id} className="bg-pink-50 border border-pink-200 rounded p-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-pink-700">{order.price.toFixed(2)}</span>
                          <span className="text-right text-pink-600">{order.amount.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleMatchOrder(order)}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                          >
                            Back으로 매치
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => router.push('/exchange/basketball_nba')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                전체 호가 보기 →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 경기 선택 - 하단 */}
      <div className="bg-white rounded shadow p-4 flex-1">
        <h3 className="text-lg font-bold mb-3">스포츠 선택 (Exchange 거래)</h3>
        <div className="text-center mb-4">
          <p className="text-gray-600 text-sm">원하는 스포츠를 선택하여 호가 거래를 시작하세요.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* 스포츠 카테고리 버튼들 */}
          {[
            { id: 'kbo', name: 'KBO', sport: 'baseball_kbo', count: 5, emoji: '⚾' },
            { id: 'kleague', name: 'K리그', sport: 'soccer_korea_kleague1', count: 3, emoji: '⚽' },
            { id: 'mlb', name: 'MLB', sport: 'baseball_mlb', count: 4, emoji: '⚾' },
            { id: 'nba', name: 'NBA', sport: 'basketball_nba', count: 6, emoji: '🏀' },
            { id: 'nfl', name: 'NFL', sport: 'americanfootball_nfl', count: 2, emoji: '🏈' },
            { id: 'kbl', name: 'KBL', sport: 'basketball_kbl', count: 3, emoji: '🏀' }
          ].map((sport) => (
            <button
              key={sport.id}
              onClick={() => router.push(`/exchange/${sport.sport}`)}
              className="p-4 rounded-lg border text-left transition-colors border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md"
            >
              <div className="text-2xl mb-2">{sport.emoji}</div>
              <div className="font-semibold text-sm text-blue-600">{sport.name}</div>
              <div className="text-xs text-gray-500 mt-1">{sport.count}경기</div>
              <div className="text-xs text-blue-500 mt-1">클릭하여 보기 →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 