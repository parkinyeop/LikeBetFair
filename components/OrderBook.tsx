import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';

interface OrderBookProps {
  gameId: string;
  market: string;
  line?: number;
  onOrderClick?: (order: ExchangeOrder) => void;
}

export default function OrderBook({ gameId, market, line, onOrderClick }: OrderBookProps) {
  const { isLoggedIn, username } = useAuth();
  const { fetchOrderbook, orders: userOrders, cancelOrder, loading } = useExchange();
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showCancelConfirm, setShowCancelConfirm] = useState<number | null>(null);
  const [sportsbookOdds, setSportsbookOdds] = useState<any>(null);

  // 스포츠북 배당율 가져오기
  const fetchSportsbookOdds = async () => {
    try {
      // gameId에서 스포츠키 추출 (예: gameId가 "soccer_korea_kleague1_123" 형태라면)
      const sportKey = gameId.split('_').slice(0, -1).join('_');
      if (!sportKey) return;

      // API URL 결정
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                    (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                     ? 'http://localhost:5050' 
                     : 'https://likebetfair.onrender.com');
      
      const response = await fetch(`${apiUrl}/api/odds/${sportKey}`);
      if (!response.ok) return;
      
      const data = await response.json();
      
      // 현재 게임과 매칭되는 스포츠북 경기 찾기
      const matchedGame = data.find((game: any) => {
        // 간단한 매칭 로직 (실제로는 더 정교한 매칭이 필요할 수 있음)
        return game.id === gameId || game.sport_key === sportKey;
      });
      
      if (matchedGame) {
        setSportsbookOdds(matchedGame);
      }
    } catch (error) {
      console.error('스포츠북 배당율 가져오기 실패:', error);
    }
  };

  // 스포츠북에서 특정 팀의 배당율 가져오기
  const getSportsbookOdds = (teamName: string) => {
    if (!sportsbookOdds || !sportsbookOdds.bookmakers) return null;
    
    const bookmaker = sportsbookOdds.bookmakers[0];
    if (!bookmaker || !bookmaker.markets) return null;
    
    const h2hMarket = bookmaker.markets.find((m: any) => m.key === 'h2h');
    if (!h2hMarket || !h2hMarket.outcomes) return null;
    
    const outcome = h2hMarket.outcomes.find((o: any) => o.name === teamName);
    return outcome ? outcome.price : null;
  };

  // 호가창 데이터 로드
  const loadOrderbook = async () => {
    try {
      const orders = await fetchOrderbook(gameId, market, line);
      setOrderbook(orders);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('호가창 로드 실패:', error);
    }
  };

  // 초기 로드 및 주기적 업데이트 (로그인 상태와 관계없이 호가창 표시)
  useEffect(() => {
    if (gameId) {
      loadOrderbook();
      fetchSportsbookOdds();
      
      // 10초마다 호가창 업데이트
      const interval = setInterval(() => {
        loadOrderbook();
        fetchSportsbookOdds();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [gameId, market, line]);

  // 내 주문 취소 핸들러
  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('정말로 이 주문을 취소하시겠습니까?')) {
      return;
    }
    
    try {
      await cancelOrder(orderId);
      setShowCancelConfirm(null);
      // 호가창 새로고침
      loadOrderbook();
    } catch (error) {
      console.error('주문 취소 실패:', error);
    }
  };

  // 주문이 내 주문인지 확인
  const isMyOrder = (order: ExchangeOrder) => {
    return userOrders.some(myOrder => myOrder.id === order.id);
  };

  // 주문 상태별 스타일
  const getOrderStyle = (order: ExchangeOrder) => {
    const isMine = isMyOrder(order);
    const baseStyle = "p-3 rounded-lg border text-sm transition-all hover:shadow-md";
    
    if (order.status === 'matched') {
      return `${baseStyle} bg-green-50 border-green-200 text-green-800`;
    } else if (order.status === 'cancelled') {
      return `${baseStyle} bg-red-50 border-red-200 text-red-800 opacity-60`;
    } else if (isMine) {
      return `${baseStyle} bg-blue-50 border-blue-300 text-blue-800 shadow-sm`;
    } else {
      return `${baseStyle} bg-white border-gray-200 text-gray-800 hover:border-gray-300`;
    }
  };

  // Back/Lay 주문 분리
  const backOrders = orderbook.filter(order => order.side === 'back' && order.status === 'open');
  const layOrders = orderbook.filter(order => order.side === 'lay' && order.status === 'open');
  const matchedOrders = orderbook.filter(order => order.status === 'matched');

  // 가격순 정렬 (Back은 높은 가격부터, Lay는 낮은 가격부터)
  const sortedBackOrders = backOrders.sort((a, b) => b.price - a.price);
  const sortedLayOrders = layOrders.sort((a, b) => a.price - b.price);

  // 주문 카드 렌더링
  const renderOrderCard = (order: ExchangeOrder, index: number) => {
    const isMine = isMyOrder(order);
    const isOpen = order.status === 'open';
    
    return (
      <div key={order.id} className={getOrderStyle(order)}>
        {/* 헤더: 가격과 상태 */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <div>
              <span className="text-lg font-bold text-gray-900">{order.price.toFixed(2)}</span>
              {/* 배당율 정보 표시 */}
              {(() => {
                console.log('🔍 주문 배당율 데이터:', {
                  id: order.id,
                  backOdds: order.backOdds,
                  layOdds: order.layOdds,
                  backOddsType: typeof order.backOdds,
                  layOddsType: typeof order.layOdds
                });
                
                // 스포츠북 배당율 가져오기
                const sportsbookBackOdds = order.selection ? getSportsbookOdds(order.selection) : null;
                const sportsbookLayOdds = order.selection ? getSportsbookOdds(order.selection) : null;
                
                return (
                  <div className="text-xs text-gray-600 mt-1">
                    <div className="flex justify-between">
                      <span>주문 Back: {typeof order.backOdds === 'number' ? order.backOdds.toFixed(2) : 'N/A'}</span>
                      <span>주문 Lay: {typeof order.layOdds === 'number' ? order.layOdds.toFixed(2) : 'N/A'}</span>
                    </div>
                    {sportsbookBackOdds && (
                      <div className="flex justify-between mt-1 text-blue-600">
                        <span>스포츠북: {sportsbookBackOdds.toFixed(2)}</span>
                        <span>참고 배당</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="flex space-x-1">
              {isMine && (
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">내 주문</span>
              )}
              {order.status === 'matched' && (
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">체결</span>
              )}
            </div>
          </div>
          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{order.amount.toLocaleString()} KRW</div>
            <div className="text-xs text-gray-500">
              {new Date(order.createdAt).toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
        
        {/* 선택된 팀 정보 */}
        <div className="mb-2">
          <div className="text-sm font-medium text-gray-800">
            {order.selection || '선택된 팀'}
          </div>
          <div className="text-xs text-gray-500">
            {order.market} • {order.gameId}
          </div>
        </div>
        
        {/* 액션 버튼 */}
        {isMine && isOpen && (
          <div className="flex space-x-2 mt-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => onOrderClick?.(order)}
              className="flex-1 py-1 px-2 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
            >
              수정
            </button>
            <button
              onClick={() => setShowCancelConfirm(order.id)}
              className="flex-1 py-1 px-2 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
            >
              취소
            </button>
          </div>
        )}
        
        {/* 취소 확인 */}
        {showCancelConfirm === order.id && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700 mb-3 font-medium">정말로 이 주문을 취소하시겠습니까?</div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleCancelOrder(order.id)}
                disabled={loading}
                className="flex-1 py-2 px-3 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '처리중...' : '확인'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 py-2 px-3 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">실시간 호가창</h3>
            <p className="text-xs text-gray-600 mt-1">Back/Lay 주문 현황</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 font-medium">
              마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="text-xs text-gray-400">
              총 {orderbook.length}개 주문
            </div>
          </div>
        </div>
      </div>

      {/* 호가창 내용 */}
      <div className="flex-1 overflow-y-auto">
        {/* 미체결 주문 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-800">미체결 주문</h4>
            <div className="flex space-x-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                Back: {sortedBackOrders.length}개
              </span>
              <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                Lay: {sortedLayOrders.length}개
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Back 주문들 */}
            <div>
              <div className="flex items-center justify-center mb-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                <h5 className="text-sm font-semibold text-blue-700">Back (베팅)</h5>
              </div>
              <div className="space-y-3">
                {sortedBackOrders.length > 0 ? (
                  sortedBackOrders.slice(0, 5).map((order, index) => renderOrderCard(order, index))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-gray-400 text-2xl mb-2">📈</div>
                    <p className="text-gray-500 text-sm">Back 주문 없음</p>
                    <p className="text-gray-400 text-xs mt-1">첫 번째 Back 주문을 등록해보세요!</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Lay 주문들 */}
            <div>
              <div className="flex items-center justify-center mb-3">
                <div className="w-4 h-4 bg-pink-500 rounded-full mr-2"></div>
                <h5 className="text-sm font-semibold text-pink-700">Lay (레이)</h5>
              </div>
              <div className="space-y-3">
                {sortedLayOrders.length > 0 ? (
                  sortedLayOrders.slice(0, 5).map((order, index) => renderOrderCard(order, index))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="text-gray-400 text-2xl mb-2">📉</div>
                    <p className="text-gray-500 text-sm">Lay 주문 없음</p>
                    <p className="text-gray-400 text-xs mt-1">첫 번째 Lay 주문을 등록해보세요!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 체결된 주문 */}
        {matchedOrders.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-800">최근 체결</h4>
              <span className="text-xs text-gray-500">
                최근 {matchedOrders.length}개
              </span>
            </div>
            <div className="space-y-3">
              {matchedOrders
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 3)
                .map((order, index) => renderOrderCard(order, index))
              }
            </div>
          </div>
        )}

        {/* 주문이 없을 때 */}
        {orderbook.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">호가창이 비어있습니다</h3>
              <p className="text-gray-500 text-sm mb-4">현재 등록된 주문이 없습니다.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-xs">
                  💡 <strong>팁:</strong> 중앙에서 Back/Lay 버튼을 클릭하여 첫 번째 주문을 등록해보세요!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 