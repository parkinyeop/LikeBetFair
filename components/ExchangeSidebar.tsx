import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder, OrderForm } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';

// GameResults 타입 정의 (간단 버전)
type GameResult = {
  id: string;
  homeTeam: string | null;
  awayTeam: string | null;
  commenceTime: string | null;
};

// GameResults를 가져오는 mock 훅 (실제 프로젝트에서는 API 호출로 대체)
function useGameResults(gameIds: string[]): Record<string, GameResult> {
  const [gameResults, setGameResults] = useState<Record<string, GameResult>>({});

  useEffect(() => {
    if (gameIds.length === 0) return;
    // 실제로는 API 호출 필요
    fetch(`/api/exchange/game-results?ids=${gameIds.join(',')}`)
      .then(res => res.json())
      .then((data: GameResult[]) => {
        const map: Record<string, GameResult> = {};
        data.forEach(gr => { map[gr.id] = gr; });
        setGameResults(map);
      });
  }, [gameIds.join(',')]);

  return gameResults;
}

function OrderPanel() {
  const { 
    loading, 
    error, 
    placeOrder, 
    clearError,
    orders: userOrders,
    fetchOrders
  } = useExchange();
  const { selectedBet, setSelectedBet } = useExchangeContext();
  const { balance, username } = useAuth();
  
  const [form, setForm] = useState<OrderForm>({ side: 'back', price: 0, amount: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // selectedBet이 변경될 때 form의 price를 자동으로 설정
  useEffect(() => {
    if (selectedBet && selectedBet.price) {
      setForm(prev => ({ ...prev, price: selectedBet.price }));
    }
  }, [selectedBet]);

  // 실시간 업데이트 (30초마다)
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // 통계 계산
  const stats = React.useMemo(() => {
    if (!userOrders || !Array.isArray(userOrders)) {
      return { total: 0, open: 0, matched: 0, totalAmount: 0, totalPotentialProfit: 0 };
    }
    
    const total = userOrders.length;
    const open = userOrders.filter(order => order.status === 'open').length;
    const matched = userOrders.filter(order => order.status === 'matched').length;
    const totalAmount = userOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalPotentialProfit = userOrders.reduce((sum, order) => {
      if (order.side === 'back') {
        return sum + (order.amount * (order.price - 1));
      } else {
        return sum + (order.amount * (order.price - 1) / order.price);
      }
    }, 0);

    return { total, open, matched, totalAmount, totalPotentialProfit };
  }, [userOrders]);

  const handleOrder = async () => {
    if (!selectedBet) {
      alert('배팅을 선택해주세요.');
      return;
    }
    
    if (form.amount <= 0) {
      alert('배팅 금액을 입력해주세요.');
      return;
    }
    
    if (loading) {
      return; // 이미 처리 중이면 중복 실행 방지
    }
    
    try {
      const orderData = {
        gameId: selectedBet.gameId || '',
        market: selectedBet.market || 'h2h',
        line: selectedBet.line || 0,
        side: selectedBet.type,
        price: selectedBet.price,
        amount: form.amount,
        selection: selectedBet.team,
        homeTeam: selectedBet.homeTeam, // 추가
        awayTeam: selectedBet.awayTeam, // 추가
        commenceTime: selectedBet.commenceTime // 추가
      };
      
      console.log('주문 요청:', orderData);
      const result = await placeOrder(orderData);
      console.log('주문 결과:', result);
      
      // 주문 성공 시 처리
      alert('주문이 성공적으로 등록되었습니다!');
      
      // 폼 초기화
      setForm({ side: 'back', price: 0, amount: 0 });
      setSelectedBet(null);
      
      // 주문 내역 새로고침 (useEffect에서 자동으로 처리되지만 즉시 반영을 위해)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('exchangeOrderPlaced'));
      }
      
    } catch (err) {
      console.error('주문 실패:', err);
      alert('주문 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* 마지막 업데이트 정보 */}
      <div className="bg-blue-50 p-2 rounded mb-3 border border-blue-200">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm text-blue-800">실시간 업데이트</h3>
          <div className="text-xs text-blue-600">
                            {lastUpdate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>



      {/* 선택된 배팅 정보 */}
      <div className="bg-gray-50 p-3 rounded mb-3 border border-gray-200">
        <h3 className="font-semibold mb-2 text-sm text-gray-700">선택된 배팅</h3>
        {selectedBet ? (
          <div className="space-y-2 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-gray-800 mb-1">{selectedBet.team}</div>
              {selectedBet.market && (
                <div className="text-gray-500 text-xs">{selectedBet.market}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">유형:</span>
                <span className={`font-medium ${selectedBet.type === 'back' ? 'text-blue-600' : 'text-pink-600'}`}>
                  {selectedBet.type === 'back' ? 'Back (베팅)' : 'Lay (레이)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">배당:</span>
                <span className="font-medium">{selectedBet.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">상태:</span>
              <span className="font-medium text-red-600">미선택</span>
            </div>
            <p className="text-sm text-gray-500">중앙에서 Back/Lay 버튼을 클릭하여 배팅을 선택하세요.</p>
          </div>
        )}
      </div>

      {/* Exchange 주문 폼 */}
      <div className="bg-gray-50 p-3 rounded mb-3">
        <h3 className="font-semibold mb-2 text-sm text-gray-700">Exchange 주문</h3>
        <div className="space-y-2">
          <div>
                            <label className="block text-sm font-medium mb-1">Odds</label>
            <input 
              type="number" 
              step="0.01"
              value={form.price} 
              onChange={e => {
                const newPrice = +e.target.value;
                setForm(f => ({ ...f, price: newPrice }));
                if (selectedBet) {
                  setSelectedBet({ ...selectedBet, price: newPrice });
                }
              }} 
              className="w-full p-1 border rounded text-sm"
            />
          </div>
          <div>
                            <label className="block text-sm font-medium mb-1">Amount (KRW)</label>
            <input 
              type="text" 
              value={form.amount.toLocaleString()} 
              onChange={e => {
                const value = e.target.value.replace(/,/g, '');
                const numValue = parseInt(value) || 0;
                setForm(f => ({ ...f, amount: numValue }));
              }}
              className="w-full p-1 border rounded text-sm"
              placeholder="0"
            />
          </div>
          <button 
            onClick={handleOrder}
            disabled={loading || !selectedBet}
            className="w-full bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {loading ? '처리중...' : '주문'}
          </button>
        </div>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
          {error}
          <button onClick={clearError} className="float-right font-bold">&times;</button>
        </div>
      )}
    </div>
  );
}

function OrderHistoryPanel() {
  const { orders: userOrders, cancelOrder, loading, fetchOrders } = useExchange();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 주문 상태별 한글 표시
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'open': return { text: '미체결', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'matched': return { text: '체결', color: 'text-green-600', bg: 'bg-green-50' };
      case 'settled': return { text: '정산', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'cancelled': return { text: '취소', color: 'text-red-600', bg: 'bg-red-50' };
      default: return { text: status, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  // 주문 타입별 한글 표시
  const getSideDisplay = (side: string) => {
    return side === 'back' 
      ? { text: 'Back (베팅)', color: 'text-blue-600', bg: 'bg-blue-50' }
      : { text: 'Lay (레이)', color: 'text-pink-600', bg: 'bg-pink-50' };
  };

  // 잠재 수익 계산
  const calculatePotentialProfit = (order: ExchangeOrder) => {
    // 올바른 배당률 사용
    const odds = order.side === 'back' 
      ? (order.backOdds || order.price) 
      : (order.layOdds || order.price);
    
    if (order.side === 'back') {
      return Math.round(order.amount * (odds - 1));
    } else {
      return Math.round(order.amount * (odds - 1) / odds);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
                      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // 주문 취소 핸들러
  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('정말로 이 주문을 취소하시겠습니까?')) {
      return;
    }
    
    try {
      await cancelOrder(orderId);
      setShowCancelConfirm(null);
    } catch (error) {
      console.error('주문 취소 실패:', error);
    }
  };

  // 주문 상세 정보 토글
  const toggleOrderDetail = (orderId: number) => {
    setSelectedOrderId(selectedOrderId === orderId ? null : orderId);
  };

  // 필터링된 주문 목록
  const filteredOrders = (userOrders || [])
    .filter(order => statusFilter === 'all' || order.status === statusFilter)
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  // 정렬 방향 토글
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // 실시간 업데이트 (30초마다)
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // 통계 계산
  const stats = React.useMemo(() => {
    if (!userOrders || !Array.isArray(userOrders)) {
      return { total: 0, open: 0, matched: 0, totalAmount: 0, totalPotentialProfit: 0 };
    }
    
    const total = userOrders.length;
    const open = userOrders.filter(order => order.status === 'open').length;
    const matched = userOrders.filter(order => order.status === 'matched').length;
    const totalAmount = userOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalPotentialProfit = userOrders.reduce((sum, order) => {
      if (order.side === 'back') {
        return sum + (order.amount * (order.price - 1));
      } else {
        return sum + (order.amount * (order.price - 1) / order.price);
      }
    }, 0);

    return { total, open, matched, totalAmount, totalPotentialProfit };
  }, [userOrders]);

  // 주문에 필요한 gameId 목록 추출
  const gameIds = React.useMemo(() => {
    return (userOrders || [])
      .map(order => order.gameId)
      .filter((id, idx, arr) => id && arr.indexOf(id) === idx);
  }, [userOrders]);

  // GameResults fetch
  const gameResults = useGameResults(gameIds);

  // gameId별로 정보가 가장 많이 채워진 주문을 맵으로 저장
  const bestOrderInfoByGameId = React.useMemo(() => {
    const map: Record<string, Partial<ExchangeOrder>> = {};
    (userOrders || []).forEach(order => {
      if (!order.gameId) return;
      const prev = map[order.gameId];
      // 정보가 더 많이 채워진 주문을 우선 저장
      const prevScore = prev ? [prev.homeTeam, prev.awayTeam, prev.commenceTime].filter(Boolean).length : 0;
      const currScore = [order.homeTeam, order.awayTeam, order.commenceTime].filter(Boolean).length;
      if (!prev || currScore > prevScore) {
        map[order.gameId] = {
          homeTeam: order.homeTeam,
          awayTeam: order.awayTeam,
          commenceTime: order.commenceTime
        };
      }
    });
    return map;
  }, [userOrders]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="bg-gray-50 p-3 rounded">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm text-gray-700">내 주문 내역</h3>
          <div className="text-right">
            <div className="text-xs text-gray-500">{filteredOrders.length}/{(userOrders || []).length}개 주문</div>
            <div className="text-xs text-gray-400">
                              Last Update: {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="mb-3 p-2 bg-white rounded border border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-500">총 주문</div>
              <div className="font-bold text-gray-800">{stats.total}개</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">총 금액</div>
              <div className="font-bold text-gray-800">{stats.totalAmount.toLocaleString()}원</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">미체결</div>
              <div className="font-bold text-yellow-600">{stats.open}개</div>
            </div>
            <div className="text-center">
                              <div className="text-gray-500">Potential Profit</div>
              <div className={`font-bold ${stats.totalPotentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {stats.totalPotentialProfit >= 0 ? '+' : ''}{Math.round(stats.totalPotentialProfit).toLocaleString()} KRW
              </div>
            </div>
          </div>
        </div>

        {/* 필터 및 정렬 컨트롤 */}
        <div className="mb-3 space-y-2">
          {/* 상태 필터 */}
          <div className="flex space-x-1">
            {['all', 'open', 'matched', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 py-1 px-2 text-xs rounded ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status === 'all' ? '전체' : 
                 status === 'open' ? '미체결' :
                 status === 'matched' ? '체결' : '취소'}
              </button>
            ))}
          </div>
          
          {/* 정렬 컨트롤 */}
          <div className="flex space-x-1">
            {[
              { key: 'date', label: '날짜' },
              { key: 'amount', label: '금액' },
              { key: 'price', label: '배당' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => {
                  if (sortBy === item.key) {
                    toggleSortOrder();
                  } else {
                    setSortBy(item.key as any);
                    setSortOrder('desc');
                  }
                }}
                className={`flex-1 py-1 px-2 text-xs rounded ${
                  sortBy === item.key
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {item.label} {sortBy === item.key && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            ))}
          </div>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-500 text-sm">주문 내역이 없습니다.</p>
            <p className="text-gray-400 text-xs mt-1">중앙에서 Back/Lay 버튼을 클릭하여 주문을 생성하세요.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.slice(0, 10).map((order) => {
              const statusInfo = getStatusDisplay(order.status);
              const sideInfo = getSideDisplay(order.side);
              const dateInfo = formatDate(order.createdAt);
              const potentialProfit = calculatePotentialProfit(order);
              
              // 보완된 경기 정보
              const gr = order.gameId ? gameResults[order.gameId] : undefined;
              const bestOrder = order.gameId ? bestOrderInfoByGameId[order.gameId] : undefined;
              const homeTeam = order.homeTeam || bestOrder?.homeTeam || gr?.homeTeam || '';
              const awayTeam = order.awayTeam || bestOrder?.awayTeam || gr?.awayTeam || '';
              const commenceTime = order.commenceTime || bestOrder?.commenceTime || gr?.commenceTime || null;
              
              return (
                <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                  {/* 헤더: 주문 타입과 상태 */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${sideInfo.bg} ${sideInfo.color}`}>
                        {sideInfo.text}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{dateInfo.date}</div>
                      <div className="text-xs text-gray-400">{dateInfo.time}</div>
                    </div>
                  </div>

                  {/* 경기 정보 */}
                  <div className="mb-2">
                    <div className="text-sm font-medium text-gray-800 mb-1">
                      {homeTeam && awayTeam 
                        ? `${homeTeam} vs ${awayTeam}`
                        : order.selection || '선택된 팀'
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.market} • {commenceTime 
                        ? new Date(commenceTime).toLocaleString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '시간 미정'
                      }
                    </div>
                    {order.selection && (
                      <div className="text-xs text-blue-600 mt-1">
                        선택: {order.selection} ({order.side === 'back' ? '이길 것' : '질 것'})
                      </div>
                    )}
                  </div>

                  {/* 배당률과 금액 정보 */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Odds</div>
                      <div className="text-lg font-bold text-gray-800">
                        {(order.side === 'back' 
                          ? (order.backOdds || order.price) 
                          : (order.layOdds || order.price)
                        ).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">주문 금액</div>
                      <div className="text-lg font-bold text-gray-800">{order.amount.toLocaleString()} KRW</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Potential Profit</div>
                      <div className={`text-lg font-bold ${potentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  {potentialProfit >= 0 ? '+' : ''}{potentialProfit.toLocaleString()} KRW
                      </div>
                    </div>
                  </div>

                  {/* 주문 ID */}
                  <div className="text-xs text-gray-400 text-center pt-1 border-t border-gray-100">
                    주문 ID: {order.id}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => toggleOrderDetail(order.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {selectedOrderId === order.id ? '상세 숨기기' : '상세보기'}
                    </button>
                    
                    {order.status === 'open' && (
                      <button
                        onClick={() => setShowCancelConfirm(order.id)}
                        disabled={loading}
                        className="text-xs text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                      >
                        취소
                      </button>
                    )}
                  </div>

                  {/* 상세 정보 (토글) */}
                  {selectedOrderId === order.id && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">생성 시간:</span>
                          <span>{new Date(order.createdAt).toLocaleString('ko-KR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">수정 시간:</span>
                          <span>{new Date(order.updatedAt).toLocaleString('ko-KR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">게임 ID:</span>
                          <span>{order.gameId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">마켓:</span>
                          <span>{order.market}</span>
                        </div>
                        {order.line && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">라인:</span>
                            <span>{order.line}</span>
                          </div>
                        )}
                        {order.matchedOrderId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">매칭 주문:</span>
                            <span className="text-green-600">#{order.matchedOrderId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 취소 확인 모달 */}
                  {showCancelConfirm === order.id && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <div className="text-xs text-red-700 mb-2">정말로 이 주문을 취소하시겠습니까?</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={loading}
                          className="flex-1 py-1 px-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {loading ? '처리중...' : '확인'}
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(null)}
                          className="flex-1 py-1 px-2 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExchangeSidebar() {
  const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
  const { isLoggedIn, balance } = useAuth();

  if (!isLoggedIn) {
    return (
      <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200 flex items-center justify-center min-h-full">
        <span className="text-gray-500 text-base font-semibold">로그인 후 Exchange 기능을 사용할 수 있습니다</span>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">EXCHANGE</h2>
                        <span className="text-sm font-semibold text-blue-600">Balance: {balance !== null ? Math.round(Number(balance)).toLocaleString() : '-'} KRW</span>
      </div>
      
      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 mb-3">
        <button
          onClick={() => setActiveTab('order')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'order'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          주문하기
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          주문내역
        </button>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'order' ? <OrderPanel /> : <OrderHistoryPanel />}
      </div>
    </aside>
  );
} 