import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder, OrderForm } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';

// 🗑️ 불필요한 GameResults 관련 코드 제거 완료
// ExchangeOrder 자체에 필요한 모든 정보가 이미 포함되어 있음

function OrderPanel() {
  const { 
    loading, 
    error, 
    placeOrder, 
    clearError,
    orders: userOrders,
    fetchOrders
  } = useExchange();
  const { 
    selectedBet, 
    setSelectedBet, 
    isMatchMode, 
    matchTargetOrder, 
    deactivateMatchMode,
    getRequiredMatchAmount,
    // 🆕 부분 매칭 관련 함수들 추가
    getMaxMatchAmount,
    getAvailableMatchAmount,
    formatPartialMatchInfo,
    // 🆕 멀티배팅 관련 상태와 함수들
    multiBetSelections,
    multiBetStake,
    multiBetTotalOdds,
    multiBetPotentialWinnings,
    updateMultiBetStake,
    createMultiBetOrder,
    clearMultiBet,
    removeMultiBetSelection
  } = useExchangeContext();
  const { balance, username, token } = useAuth(); // 🆕 token 추가
  
  const [form, setForm] = useState<OrderForm>({ side: 'back', price: 0, amount: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // selectedBet이 변경될 때 form의 price를 자동으로 설정
  useEffect(() => {
    if (selectedBet && selectedBet.price) {
      setForm(prev => ({ ...prev, price: selectedBet.price }));
    } else if (!selectedBet) {
      // 🆕 선택된 베팅이 없으면 배당율도 0으로 초기화
      setForm(prev => ({ ...prev, price: 0 }));
    }
  }, [selectedBet]);

  // 🆕 홈에서 선택된 경기 정보를 읽어와서 주문 폼에 자동으로 채우기
  useEffect(() => {
    const checkAndLoadSelectedGame = () => {
      const selectedGameInfo = localStorage.getItem('selectedGameForOrder');
      if (selectedGameInfo) {
        try {
          const gameInfo = JSON.parse(selectedGameInfo);
          
          console.log('🎯 홈에서 선택된 경기 정보 발견:', gameInfo);
          
          // 주문 폼에 자동으로 정보 채우기
          setForm(prev => ({
            ...prev,
            price: gameInfo.odds || prev.price,
            amount: prev.amount, // 금액은 사용자가 입력하도록 유지
            side: 'back' as const
          }));
          
          // selectedBet 업데이트 (더 확실하게)
          const newSelectedBet = {
            team: gameInfo.selection,
            price: gameInfo.odds,
            type: 'back' as const, // 기본값으로 back 설정
            gameId: gameInfo.gameId,
            market: gameInfo.market,
            homeTeam: gameInfo.homeTeam,
            awayTeam: gameInfo.awayTeam,
            commenceTime: gameInfo.commenceTime
          };
          
          console.log('🎯 새로운 selectedBet 설정:', newSelectedBet);
          setSelectedBet(newSelectedBet);
          
          // 사용 후 localStorage에서 제거
          localStorage.removeItem('selectedGameForOrder');
          
          console.log('🎯 홈에서 선택된 경기 정보로 주문 폼 자동 채움 완료');
        } catch (error) {
          console.error('선택된 경기 정보 파싱 오류:', error);
          localStorage.removeItem('selectedGameForOrder');
        }
      }
    };

    // 초기 체크
    checkAndLoadSelectedGame();
    
    // 주기적으로 체크 (500ms마다 - 더 빠르게)
    const interval = setInterval(checkAndLoadSelectedGame, 500);
    
    // 🆕 추가로 탭 변경 시에도 체크
    const handleTabChange = () => {
      setTimeout(checkAndLoadSelectedGame, 100);
    };
    
    // 탭 변경 이벤트 리스너 추가
    window.addEventListener('exchangeSidebarTabChange', handleTabChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('exchangeSidebarTabChange', handleTabChange);
    };
  }, []); // 의존성 제거하여 매번 체크

  // 매칭 모드일 때 초기값 설정 (자동 설정 제거)
  useEffect(() => {
    if (isMatchMode && form.amount === 0) {
      const maxAmount = getRequiredMatchAmount();
      setForm(prev => ({ ...prev, amount: maxAmount }));
    }
  }, [isMatchMode, getRequiredMatchAmount, form.amount]);



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
      // 🆕 매칭 모드일 때는 매칭 배팅 API 호출
      if (isMatchMode && matchTargetOrder) {
        console.log('🎯 매칭 배팅 처리 시작:', { matchTargetOrder, form });
        
        // 🆕 토큰 상태 확인 및 디버깅
        console.log('🔑 토큰 상태:', { 
          hasToken: !!token, 
          tokenLength: token ? token.length : 0,
          tokenPreview: token ? token.substring(0, 20) + '...' : '없음',
          source: 'AuthContext'
        });
        
        // 🆕 API URL 결정 (개발환경에서는 localhost:5050 사용)
        const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                       ? 'http://localhost:5050' 
                       : window.location.origin;
        
        console.log('🌐 API URL:', apiUrl);
        
        const response = await fetch(`${apiUrl}/api/exchange/match-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token || ''
          },
          body: JSON.stringify({
            targetOrderId: matchTargetOrder.id,
            matchAmount: Math.floor(form.amount), // 🆕 정수로 변환
            matchType: selectedBet.type
          })
        });

        const result = await response.json();
        
        if (result.success) {
          alert('🎉 매칭 배팅이 성공적으로 처리되었습니다!');
          
          // 매칭 모드 비활성화
          deactivateMatchMode();
          
          // 폼 초기화 (배당율은 유지)
          setForm(prev => ({ ...prev, amount: 0 }));
          setSelectedBet(null);
          
          // 🆕 매칭 배팅에서는 멀티배팅 선택 유지 (초기화하지 않음)
          // clearMultiBet();
          
          // 주문 내역 새로고침
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('exchangeOrderPlaced'));
          }
          
          return; // 매칭 배팅 완료 후 함수 종료
        } else {
          alert(`매칭 배팅 실패: ${result.message}`);
          return;
        }
      }
      
      // 일반 주문 처리 (기존 로직)
      const orderData = {
        gameId: selectedBet.gameId || '',
        market: selectedBet.market || 'h2h',
        line: selectedBet.line || 0,
        side: selectedBet.type,
        price: selectedBet.price,
        amount: Math.floor(form.amount), // 🆕 정수로 변환
        selection: selectedBet.team,
        homeTeam: selectedBet.homeTeam, // 추가
        awayTeam: selectedBet.awayTeam, // 추가
        commenceTime: selectedBet.commenceTime // 추가
      };
      
      console.log('주문 요청:', orderData);
      const result = await placeOrder(orderData);
      console.log('주문 결과:', result);
      
      // 🆕 주문 성공 시 부분 매칭 정보 포함 알림
      if (result.matchingResult) {
        const { totalMatched, remainingAmount, matchCount, isPartiallyMatched, isFullyMatched } = result.matchingResult;
        
        if (isFullyMatched) {
          alert(`🎉 주문이 완전히 매칭되었습니다!\n` +
                `매칭 금액: ${totalMatched.toLocaleString()} KRW\n` +
                `매칭 횟수: ${matchCount}회`);
        } else if (isPartiallyMatched) {
          alert(`⚡ 주문이 부분 매칭되었습니다!\n` +
                `매칭된 금액: ${totalMatched.toLocaleString()} KRW\n` +
                `남은 금액: ${remainingAmount.toLocaleString()} KRW (호가창에 등록)\n` +
                `매칭 횟수: ${matchCount}회`);
        } else if (remainingAmount > 0) {
          alert(`📝 주문이 호가창에 등록되었습니다!\n` +
                `등록 금액: ${remainingAmount.toLocaleString()} KRW\n` +
                `다른 사용자가 매칭하면 자동으로 체결됩니다.`);
        } else {
          alert('주문이 성공적으로 등록되었습니다!');
        }
      } else {
        alert('주문이 성공적으로 등록되었습니다!');
      }
      
      // 🆕 매칭 모드도 비활성화
      if (isMatchMode) {
        deactivateMatchMode();
      }
      
      // 폼 초기화 (배당율은 유지)
      setForm(prev => ({ ...prev, amount: 0 }));
      setSelectedBet(null);
      
      // 🆕 멀티배팅 선택들도 초기화
      clearMultiBet();
      
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
      <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900">실시간 업데이트</h3>
          <div className="text-sm text-gray-600">
            {lastUpdate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>



      {/* 단일 주문 UI - 주석처리 (멀티배팅 UI로 통합) */}
      {/* 
      {!isMatchMode && (
        <div className="bg-gray-50 p-3 rounded mb-3 border border-gray-200">
          <h3 className="font-semibold mb-2 text-sm text-gray-700">
            선택된 배팅
          </h3>
        </div>
      )}
      */}

      {/* Exchange 주문 폼 - 주석처리 (멀티배팅 UI로 통합) */}
      {/* 
      {!isMatchMode && (
        <div className="bg-gray-50 p-3 rounded mb-3">
          <h3 className="font-semibold mb-2 text-sm text-gray-700">
            Exchange 주문
          </h3>
        </div>
      )}
      */}
      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
          {error}
          <button onClick={clearError} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* 멀티배팅 선택 정보 표시 - 항상 표시 */}
      {(multiBetSelections.length > 0 || (isMatchMode && matchTargetOrder)) ? (
          <div className="bg-white p-4 rounded-lg mb-4 shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {isMatchMode ? `🎯 배팅 (${multiBetSelections.length}개)` : `🎯 배팅 선택 (${multiBetSelections.length}개)`}
              </h3>
              <button 
                onClick={isMatchMode ? deactivateMatchMode : clearMultiBet}
                className="text-sm text-red-600 hover:text-red-800 underline font-medium"
              >
                {isMatchMode ? '취소' : '초기화'}
              </button>
            </div>
            
            {/* 멀티배팅 선택된 경기들 (항상 표시) */}
            <div className="space-y-3 mb-4">
              {multiBetSelections.map((selection, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border border-gray-200 relative">
                  <button
                    onClick={() => removeMultiBetSelection(selection.gameId, selection.market, selection.selection)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm font-medium underline"
                    title="개별 삭제"
                  >
                    삭제
                  </button>
                  <div className="text-sm font-medium text-gray-900 mb-1 pr-6">
                    {selection.homeTeam} vs {selection.awayTeam}
                  </div>
                  <div className="text-sm text-gray-700 pr-6">
                    {selection.selection} • {selection.side === 'back' ? '🎯 Back' : '📉 Lay'} • <span className="font-bold text-blue-600">{(typeof selection.odds === 'string' ? parseFloat(selection.odds) : selection.odds || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 배팅 폼 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isMatchMode ? '배팅 금액 (KRW)' : '베팅 금액 (KRW)'}
                </label>
                {/* 매칭 모드에서 부분 매칭 안내 */}
                {isMatchMode && (
                  <div className="text-xs text-gray-500 mb-1">
                    💡 부분 매칭 가능 (최대: {Math.floor(getMaxMatchAmount()).toLocaleString()} KRW)
                  </div>
                )}
                <input
                  type="text"
                  value={isMatchMode ? (form.amount > 0 ? Math.floor(form.amount).toLocaleString() : '') : (multiBetStake > 0 ? multiBetStake.toLocaleString() : '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    if (value === '' || /^\d*$/.test(value)) {
                      let numValue = value === '' ? 0 : parseInt(value);
                      
                      if (isMatchMode) {
                        // 매칭 모드에서 최대 리스크 금액 초과 시 제한
                        const maxRiskAmount = getAvailableMatchAmount();
                        if (numValue > maxRiskAmount) {
                          numValue = Math.floor(maxRiskAmount);
                        }
                        setForm(f => ({ ...f, amount: numValue }));
                      } else {
                        updateMultiBetStake(numValue);
                      }
                    }
                  }}
                  placeholder={isMatchMode ? "원하는 금액 입력" : "베팅 금액 입력"}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {/* 매칭 모드에서 빠른 금액 선택 버튼 */}
                {isMatchMode && (
                  <div className="flex space-x-1 mt-1">
                    {[0.25, 0.5, 0.75, 1.0].map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => {
                          const maxAmount = getAvailableMatchAmount();
                          const quickAmount = Math.floor(maxAmount * ratio);
                          setForm(f => ({ ...f, amount: quickAmount }));
                        }}
                        className="flex-1 py-1 px-2 text-xs bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                      >
                        {ratio === 1 ? '전액' : `${Math.round(ratio * 100)}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">총 배당률:</span>
                    <span className="font-bold text-blue-600">{(typeof multiBetTotalOdds === 'string' ? parseFloat(multiBetTotalOdds) : multiBetTotalOdds || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">예상 수익:</span>
                    <span className="font-bold text-green-600">
                      {multiBetPotentialWinnings > 0 ? `+${multiBetPotentialWinnings.toLocaleString()}` : '0'} KRW
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={isMatchMode ? handleOrder : async () => {
                  const result = await createMultiBetOrder();
                  if (result.success) {
                    alert('배팅 주문이 성공적으로 생성되었습니다!');
                  } else {
                    alert(`배팅 주문 생성 실패: ${result.error}`);
                  }
                }}
                disabled={isMatchMode ? (loading || form.amount <= 0) : (multiBetStake <= 0)}
                className={`w-full py-3 px-4 rounded text-sm font-semibold transition-colors ${
                  (isMatchMode ? (loading || form.amount <= 0) : (multiBetStake <= 0))
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? '처리중...' : isMatchMode ? 
                  `🎯 매칭 (${Math.floor(form.amount).toLocaleString()}원)` : 
                  '🎯 배팅 주문 생성'}
              </button>
            </div>
          </div>
        ) : (
          /* 미선택 상태 */
          <div className="bg-white p-4 rounded-lg mb-4 shadow-md border border-gray-200">
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900 mb-2">배팅을 선택하세요</div>
              <p className="text-sm text-gray-600">중앙에서 Back/Lay 버튼을 클릭하여 배팅을 선택하세요.</p>
            </div>
          </div>
        )}



      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
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
  // 필터 및 정렬 관련 상태 - 주석 처리 (나중에 재활용 가능)
  // const [statusFilter, setStatusFilter] = useState<string>('all');
  // const [sortBy, setSortBy] = useState<'date' | 'amount' | 'price'>('date');
  // const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // 주문 상태별 한글 표시
  const getStatusDisplay = (status: string, commenceTime?: string) => {
    // 경기 시간이 지났는지 확인
    const isExpired = commenceTime && new Date(commenceTime) < new Date();
    
    if (isExpired && status === 'open') {
      return { text: '경기 만료', color: 'text-red-600', bg: 'bg-red-50' };
    }
    
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
    // 호가 배당률 사용 (order.price)
    const odds = order.price;
    
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

  // 주문 취소 핸들러 (중복 확인창 제거)
  const handleCancelOrder = async (orderId: number) => {
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

  // 필터링된 주문 목록 - 주석 처리 (나중에 재활용 가능)
  // const filteredOrders = (userOrders || [])
  //   .filter(order => statusFilter === 'all' || order.status === statusFilter)
  //   .sort((a, b) => {
  //     let aValue: any, bValue: any;
  //     
  //     switch (sortBy) {
  //       case 'date':
  //         aValue = new Date(a.createdAt).getTime();
  //         bValue = new Date(b.createdAt).getTime();
  //         break;
  //       case 'amount':
  //         aValue = a.amount;
  //         bValue = b.amount;
  //         break;
  //       case 'price':
  //         aValue = a.price;
  //         bValue = b.price;
  //         break;
  //       default:
  //         aValue = new Date(a.createdAt).getTime();
  //         bValue = new Date(b.createdAt).getTime();
  //     }
  //     
  //     return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  //   });

  // 기본 주문 목록 (날짜순 내림차순만)
  const filteredOrders = (userOrders || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 정렬 방향 토글 - 주석 처리 (나중에 재활용 가능)
  // const toggleSortOrder = () => {
  //   setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  // };

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

  // 🗑️ 불필요한 gameIds 추출 및 GameResults API 호출 제거

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
        {/* 접을 수 있는 헤더 */}
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-left hover:bg-gray-100 p-1 rounded transition-colors"
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="font-semibold text-sm text-gray-700">내 주문 내역</h3>
          </button>
          <div className="text-right">
            <div className="text-xs text-gray-500">{(userOrders || []).length}개 주문</div>
            <div className="text-xs text-gray-400">
              Last Update: {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* 접을 수 있는 내용 - 통계 정보 */}
        {isExpanded && (
          <div className="mb-3 p-3 bg-white rounded border border-gray-200">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-gray-500 mb-1">총 주문</div>
                <div className="font-bold text-lg text-gray-800">{stats.total}개</div>
            </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-gray-500 mb-1">총 금액</div>
                <div className="font-bold text-lg text-gray-800">{stats.totalAmount.toLocaleString()}원</div>
            </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="text-gray-500 mb-1">미체결</div>
                <div className="font-bold text-lg text-yellow-600">{stats.open}개</div>
            </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-gray-500 mb-1">체결</div>
                <div className="font-bold text-lg text-green-600">{stats.matched}개</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-gray-500 mb-1">잠재 수익</div>
                <div className={`font-bold text-lg ${stats.totalPotentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalPotentialProfit >= 0 ? '+' : ''}{Math.round(stats.totalPotentialProfit).toLocaleString()}원
            </div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="text-gray-500 mb-1">멀티배팅</div>
                <div className="font-bold text-lg text-purple-600">
                {(userOrders || []).filter(order => (order as any).isMultibet).length}개
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 필터 및 정렬 컨트롤 - 주석 처리 (나중에 재활용 가능) */}
        {/* 
        <div className="mb-3 space-y-2">
          {/* 상태 필터 */}
          {/* 
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
          */}
          
          {/* 정렬 컨트롤 */}
          {/* 
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
          */}
        {/* </div> */}
        
        {/* 주문 목록 - 항상 표시 */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-500 text-sm">주문 내역이 없습니다.</p>
            <p className="text-gray-400 text-xs mt-1">중앙에서 Back/Lay 버튼을 클릭하여 주문을 생성하세요.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredOrders.slice(0, 10).map((order, index) => {
              const statusInfo = getStatusDisplay(order.status, order.commenceTime);
              const sideInfo = getSideDisplay(order.side);
              const dateInfo = formatDate(order.createdAt);
              const potentialProfit = calculatePotentialProfit(order);
              
              // 경기 정보 (간소화된 2단계 Fallback)
              const bestOrder = order.gameId ? bestOrderInfoByGameId[order.gameId] : undefined;
              const homeTeam = order.homeTeam || bestOrder?.homeTeam || '';
              const awayTeam = order.awayTeam || bestOrder?.awayTeam || '';
              const commenceTime = order.commenceTime || bestOrder?.commenceTime || null;
              
              return (
                <div key={order.id} className="relative">
                  {/* 구분선 - 첫 번째 주문이 아닌 경우에만 표시 */}
                  {index > 0 && (
                    <div className="my-4">
                      <div className="border-t border-gray-200"></div>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200 shadow-sm">
                  
                  {/* 멀티배팅 표시 */}
                  {(order as any).isMultibet && (order as any).selectionDetails && (order as any).selectionDetails.selections && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-800">
                        배팅({((order as any).selectionDetails.selections || []).length}개)
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${sideInfo.bg} ${sideInfo.color}`}>
                        {sideInfo.text}
                      </span>
                    </div>
                  )}
                  
                  {/* 핵심 정보 표시 */}
                  <div className="space-y-2">
                    {/* 멀티배팅인 경우 각 배팅 표시 */}
                    {(order as any).isMultibet && (order as any).selectionDetails && (order as any).selectionDetails.selections ? (
                      <div className="space-y-2">
                        {((order as any).selectionDetails.selections || []).map((selection: any, idx: number) => {
                          const isOverUnder = selection.market === 'Over/Under' || selection.market === 'totals';
                          const isHandicap = selection.market === 'Handicap' || selection.market === 'spreads';
                          
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">
                                  {isOverUnder ? (
                                    `${selection.option || selection.team} ${selection.point || ''}`
                                  ) : isHandicap ? (
                                    selection.team
                                  ) : (
                                    selection.team || selection.selection
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {selection.homeTeam && selection.awayTeam 
                                    ? `${selection.homeTeam} vs ${selection.awayTeam}`
                                    : selection.desc || '경기 정보'
                                  }
                                </div>
                                <div className="text-xs text-gray-400">
                                  {selection.market || '승패'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-800">
                                  @{selection.odds?.toFixed(2) || '0.00'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* 단일 배팅인 경우 */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-800">
                            {order.selection || '선택된 팀'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sideInfo.bg} ${sideInfo.color}`}>
                            {sideInfo.text}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-xs text-gray-500">
                            {order.market || '승패'}
                          </div>
                          <div className="font-bold text-gray-800">
                            @{(typeof order.price === 'string' ? parseFloat(order.price) : order.price || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 배팅금액과 수익 정보 */}
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">배팅금액</span>
                        <span className="font-bold text-gray-800">
                          {(() => {
                            if ((order as any).isMultibet) {
                              const stakeAmount = (order as any).stakeAmount;
                              if (stakeAmount && typeof stakeAmount === 'number') {
                                return stakeAmount.toLocaleString();
                              } else if (stakeAmount && typeof stakeAmount === 'string') {
                                return parseFloat(stakeAmount).toLocaleString();
                              }
                              return '0';
                            } else {
                              return order.amount.toLocaleString();
                            }
                          })()}원
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">수익</span>
                        <span className={`text-sm font-bold ${potentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {potentialProfit >= 0 ? '+' : ''}{potentialProfit.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {/* 부분 매칭 정보 표시 */}
                    {order.status === 'partially_matched' && (order as any).partiallyFilled && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-yellow-700 font-medium">부분 매칭</span>
                          <div className="flex items-center space-x-3 text-yellow-600">
                            <span>체결: {((order as any).filledAmount || 0).toLocaleString()}원</span>
                            <span>남은: {((order as any).remainingAmount || 0).toLocaleString()}원</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 - 개선된 디자인 */}
                  <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200">
                    <button
                      onClick={() => toggleOrderDetail(order.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{selectedOrderId === order.id ? '상세 숨기기' : '상세 보기'}</span>
                    </button>
                    
                    {/* 취소 가능 조건: open 또는 partially_matched 상태이고, 경기시간 10분 전까지 */}
                    {((order.status === 'open' || order.status === 'partially_matched') && 
                      order.commenceTime && 
                      new Date(order.commenceTime).getTime() - new Date().getTime() > 10 * 60 * 1000) && (
                      <button
                        onClick={() => setShowCancelConfirm(order.id)}
                        disabled={loading}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>취소</span>
                      </button>
                    )}
                  </div>

                  {/* 상세 정보 (토글) */}
                  {selectedOrderId === order.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-4">
                        {/* 생성 시간 */}
                        <div className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleString('ko-KR')}
                        </div>
                        
                        {/* 매칭 정보 */}
                        {order.matchedOrderId && (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">매칭된 주문</span>
                              <span className="text-xs font-medium text-green-600">#{order.matchedOrderId}</span>
                            </div>
                          </div>
                        )}
                        {/* 멀티배팅 상세 정보 */}
                        {(order as any).isMultibet && (order as any).selectionDetails && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-1 flex items-center">
                              <svg className="w-3 h-3 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              멀티배팅 상세
                            </h4>
                            <div className="space-y-3">
                              {((order as any).selectionDetails.selections || []).map((selection: any, idx: number) => {
                                const isOverUnder = selection.market === 'Over/Under' || selection.market === 'totals';
                                const isHandicap = selection.market === 'Handicap' || selection.market === 'spreads';
                                
                                return (
                                  <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-xs font-medium text-yellow-800">
                                        {isOverUnder ? (
                                          `${selection.option || selection.team} ${selection.point || ''}`
                                        ) : isHandicap ? (
                                          selection.team
                                        ) : (
                                          selection.team
                                        )}
                                      </div>
                                      <div className="text-xs font-bold text-blue-600">@ {selection.odds}</div>
                                    </div>
                                    <div className="text-xs text-gray-600 mb-1">
                                      {selection.homeTeam && selection.awayTeam 
                                        ? `${selection.homeTeam} vs ${selection.awayTeam}`
                                        : selection.desc || '경기 정보'
                                      }
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {selection.market} • {selection.commenceTime 
                                        ? (() => {
                                            const utcDate = new Date(selection.commenceTime);
                                            return utcDate.toLocaleString('ko-KR', { 
                                              month: 'short', 
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            });
                                          })()
                                        : '시간 미정'
                                      }
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  {/* 취소 확인 모달 */}
                  {showCancelConfirm === order.id && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="text-sm font-medium text-red-800">
                          {order.side === 'back' ? '주문 취소 확인' : '매치 취소 확인'}
                        </div>
                      </div>
                      <div className="text-sm text-red-700 mb-4">
                        {order.side === 'back' ? (
                          <>
                            정말로 이 주문을 취소하시겠습니까?<br/>
                            {order.status === 'partially_matched' && (
                              <>매칭된 Lay 주문도 함께 취소됩니다.<br/></>
                            )}
                            취소된 주문은 복구할 수 없습니다.
                          </>
                        ) : (
                          <>
                            정말로 이 매치를 취소하시겠습니까?<br/>
                            Back 주문은 유지되고 매치만 취소됩니다.<br/>
                            취소된 매치는 복구할 수 없습니다.
                          </>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={loading}
                          className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {loading ? '처리중...' : '확인'}
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(null)}
                          className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExchangeSidebar({ 
  activeTab: externalActiveTab, 
  onTabChange 
}: { 
  activeTab?: 'order' | 'history';
  onTabChange?: (tab: 'order' | 'history') => void;
}) {
  const { isLoggedIn, balance } = useAuth();
  const { sidebarActiveTab, setSidebarActiveTab } = useExchangeContext();

  // 외부에서 제어하는 경우와 Context에서 제어하는 경우를 구분
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : sidebarActiveTab;
  const setActiveTab = (tab: 'order' | 'history') => {
    if (externalActiveTab !== undefined) {
      // 외부 제어인 경우
      onTabChange?.(tab);
    } else {
      // Context 제어인 경우
      setSidebarActiveTab(tab);
    }
  };

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