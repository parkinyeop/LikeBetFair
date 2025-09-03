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
    clearMultiBet
  } = useExchangeContext();
  const { balance, username, token } = useAuth(); // 🆕 token 추가
  
  const [form, setForm] = useState<OrderForm>({ side: 'back', price: 0, amount: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // selectedBet이 변경될 때 form의 price를 자동으로 설정
  useEffect(() => {
    if (selectedBet && selectedBet.price) {
      setForm(prev => ({ ...prev, price: selectedBet.price }));
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
          
          // 폼 초기화
          setForm({ side: 'back', price: 0, amount: 0 });
          setSelectedBet(null);
          
          // 🆕 멀티배팅 선택들도 초기화
          clearMultiBet();
          
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
      
      // 폼 초기화
      setForm({ side: 'back', price: 0, amount: 0 });
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
        <h3 className="font-semibold mb-2 text-sm text-gray-700">
          {isMatchMode ? '매칭 배팅 정보' : '선택된 배팅'}
          {isMatchMode && (
            <button 
              onClick={deactivateMatchMode}
              className="ml-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              매칭 모드 해제
            </button>
          )}
        </h3>
        
        {isMatchMode && matchTargetOrder ? (
          <div className="space-y-2 text-sm">
            <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-2">
              <div className="text-xs text-blue-700 mb-1">매칭 대상 주문</div>
              <div className="font-medium text-blue-800">
                {matchTargetOrder.homeTeam} vs {matchTargetOrder.awayTeam}
              </div>
              <div className="text-xs text-blue-600">
                {matchTargetOrder.selection} • {matchTargetOrder.type === 'back' ? '🎯 Back(Win)' : '📉 Lay(Loss)'}
              </div>
              {/* 🆕 부분 매칭 정보 표시 */}
              <div className="text-xs text-green-600 mt-1">
                💰 가능 금액: {formatPartialMatchInfo(matchTargetOrder)}
              </div>
              {matchTargetOrder.partiallyFilled && (
                <div className="text-xs text-orange-600 mt-1">
                  ⚡ 부분 체결된 주문
                </div>
              )}
            </div>
            
            <div className="text-center">
              <div className="font-bold text-lg text-gray-800 mb-1">{selectedBet?.team}</div>
              <div className="text-xs text-gray-500">매칭 배팅</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">매칭 타입:</span>
                <span className={`font-medium ${selectedBet?.type === 'back' ? 'text-blue-600' : 'text-pink-600'}`}>
                  {selectedBet?.type === 'back' ? '🎯 Back(Win)' : '📉 Lay(Loss)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">매칭 배당:</span>
                <span className="font-medium">{(typeof selectedBet?.price === 'string' ? parseFloat(selectedBet.price) : selectedBet?.price || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : selectedBet ? (
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
                <span className="font-medium">{(typeof selectedBet.price === 'string' ? parseFloat(selectedBet.price) : selectedBet.price || 0).toFixed(2)}</span>
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

        {/* 🆕 멀티배팅 정보 표시 */}
        {multiBetSelections.length > 0 && (
          <div className="bg-yellow-50 p-3 rounded mb-3 border border-yellow-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-sm text-yellow-800">
                🎯 멀티배팅 선택 ({multiBetSelections.length}개)
              </h3>
              <button 
                onClick={clearMultiBet}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                초기화
              </button>
            </div>
            
            {/* 선택된 경기들 */}
            <div className="space-y-2 mb-3">
              {multiBetSelections.map((selection, index) => (
                <div key={index} className="bg-white p-2 rounded border border-yellow-200">
                  <div className="text-xs text-yellow-700 mb-1">
                    {selection.homeTeam} vs {selection.awayTeam}
                  </div>
                  <div className="text-xs text-yellow-600">
                    {selection.selection} • {selection.side === 'back' ? '🎯 Back' : '📉 Lay'} • {(typeof selection.odds === 'string' ? parseFloat(selection.odds) : selection.odds || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 멀티배팅 베팅 폼 */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-yellow-700 mb-1">베팅 금액 (KRW)</label>
                <input
                  type="text"
                  value={multiBetStake > 0 ? multiBetStake.toLocaleString() : ''}
                  onChange={(e) => {
                    // 🆕 스포츠북과 동일한 방식: 콤마 제거 후 숫자만 처리
                    const value = e.target.value.replace(/,/g, ''); // 콤마 제거
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const numValue = value === '' ? 0 : parseFloat(value);
                      updateMultiBetStake(numValue);
                    }
                  }}
                  placeholder="베팅 금액 입력"
                  className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>
              
              <div className="bg-white p-2 rounded border border-yellow-200">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-yellow-700">총 배당률:</span>
                  <span className="font-medium text-yellow-800">{(typeof multiBetTotalOdds === 'string' ? parseFloat(multiBetTotalOdds) : multiBetTotalOdds || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-700">예상 수익:</span>
                  <span className="font-medium text-yellow-800">
                    {multiBetPotentialWinnings > 0 ? `+${multiBetPotentialWinnings.toLocaleString()}` : '0'} KRW
                  </span>
                </div>
              </div>
              
              <button
                onClick={async () => {
                  const result = await createMultiBetOrder();
                  if (result.success) {
                    alert('멀티배팅 주문이 성공적으로 생성되었습니다!');
                  } else {
                    alert(`멀티배팅 주문 생성 실패: ${result.error}`);
                  }
                }}
                disabled={multiBetStake <= 0}
                className="w-full py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                🎯 멀티배팅 주문 생성
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exchange 주문 폼 */}
      <div className="bg-gray-50 p-3 rounded mb-3">
        <h3 className="font-semibold mb-2 text-sm text-gray-700">
          {isMatchMode ? '매칭 배팅 주문' : 'Exchange 주문'}
        </h3>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium mb-1">
              {isMatchMode ? '매칭 배당' : 'Odds'}
            </label>
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
              readOnly={isMatchMode}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
                          {isMatchMode ? 
              `배팅 금액 (1 ~ ${Math.floor(getAvailableMatchAmount()).toLocaleString()} KRW)` : 
              'Amount (KRW)'
            }
            </label>
            {/* 🆕 부분 매칭 모드에서 범위 표시 */}
            {isMatchMode && (
              <div className="text-xs text-gray-500 mb-1">
                              💡 원하는 금액만큼 부분 매칭 가능 
              (최대 매칭 가능: {Math.floor(getMaxMatchAmount()).toLocaleString()} KRW)
              </div>
            )}
            <input 
              type="text" 
              value={form.amount > 0 ? form.amount.toLocaleString() : ''} 
              onChange={e => {
                // 🆕 스포츠북과 동일한 방식: 콤마 제거 후 숫자만 처리
                const value = e.target.value.replace(/,/g, ''); // 콤마 제거
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  let numValue = value === '' ? 0 : parseFloat(value);
                  
                  // 🆕 매칭 모드에서 최대 리스크 금액 초과 시 제한
                  if (isMatchMode) {
                    const maxRiskAmount = getAvailableMatchAmount();
                    if (numValue > maxRiskAmount) {
                      numValue = maxRiskAmount;
                    }
                  }
                  
                  setForm(f => ({ ...f, amount: numValue }));
                }
              }}
              className="w-full p-1 border rounded text-sm"
              placeholder={isMatchMode ? "원하는 금액 입력" : "0"}
            />
            {/* 🆕 매칭 모드에서 빠른 금액 선택 버튼 */}
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
          <button 
            onClick={handleOrder}
            disabled={loading || !selectedBet || (isMatchMode && form.amount <= 0)}
            className={`w-full py-1 px-2 rounded text-sm font-medium ${
              isMatchMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:bg-gray-400`}
          >
            {loading ? '처리중...' : isMatchMode ? 
              `🎯 부분 매칭 (${Math.floor(form.amount).toLocaleString()} KRW)` : 
              '주문하기'}
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
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-500">총 주문</div>
              <div className="font-bold text-gray-800">{stats.total}개</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">총 금액</div>
              <div className="font-bold text-gray-800">{stats.totalAmount.toLocaleString()} KRW</div>
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
            <div className="text-center">
              <div className="text-gray-500">멀티배팅</div>
              <div className="font-bold text-yellow-600">
                {(userOrders || []).filter(order => (order as any).isMultibet).length}개
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">체결</div>
              <div className="font-bold text-green-600">{stats.matched}개</div>
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
              const statusInfo = getStatusDisplay(order.status, order.commenceTime);
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
                      {/* 🆕 멀티배팅 표시 */}
                      {(order as any).isMultibet && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          🎯 멀티배팅
                        </span>
                      )}
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
                        ? (() => {
                            // 🚨 수정: 하드코딩된 KST 변환 제거
                            // 브라우저의 로컬 시간대 설정을 사용하여 자동 변환
                            const utcDate = new Date(commenceTime);
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
                    {order.selection && (
                      <div className="text-xs text-blue-600 mt-1">
                        선택: {order.selection} ({order.side === 'back' ? '이길 것' : '질 것'})
                      </div>
                    )}
                    {/* 🆕 멀티배팅 선택 정보 표시 */}
                    {(order as any).isMultibet && (order as any).selectionDetails && (
                      <div className="mt-2">
                        <div className="text-xs text-yellow-700 bg-yellow-50 p-1 rounded mb-2">
                          🎯 {((order as any).selectionDetails.selections || []).length}개 선택 • 
                          총 배당: {(() => {
                            const totalOdds = (order as any).totalOdds;
                            if (totalOdds && typeof totalOdds === 'number') {
                              return totalOdds.toFixed(2);
                            } else if (totalOdds && typeof totalOdds === 'string') {
                              return parseFloat(totalOdds).toFixed(2);
                            }
                            return 'N/A';
                          })()}
                        </div>
                        {/* 각 선택의 상세 정보 표시 */}
                        <div className="space-y-1">
                          {((order as any).selectionDetails.selections || []).map((selection: any, idx: number) => {
                            const isOverUnder = selection.market === 'Over/Under' || selection.market === 'totals';
                            const isHandicap = selection.market === 'Handicap' || selection.market === 'spreads';
                            
                            return (
                              <div key={idx} className="border-l-2 border-yellow-200 pl-2 py-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">
                                      {isOverUnder ? (
                                        `${selection.option || selection.team} ${selection.point || ''}`
                                      ) : isHandicap ? (
                                        selection.team
                                      ) : (
                                        selection.team
                                      )}
                                    </span>
                                    <span className="text-gray-500">
                                      {selection.homeTeam && selection.awayTeam 
                                        ? `${selection.homeTeam} vs ${selection.awayTeam}`
                                        : selection.desc || '경기 정보'
                                      }
                                    </span>
                                    <span className="text-gray-400">
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
                                    </span>
                                  </div>
                                  <span className="text-blue-600 font-medium">@ {selection.odds}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* 만료된 주문 표시 */}
                    {commenceTime && new Date(commenceTime) < new Date() && (
                      <div className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ 경기 만료됨
                      </div>
                    )}
                  </div>

                  {/* 배당률과 금액 정보 */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Odds</div>
                      <div className="text-lg font-bold text-gray-800">
                        {(typeof order.price === 'string' ? parseFloat(order.price) : order.price || 0).toFixed(2)}
                      </div>
                      {/* 스포츠북 참고 배당률 표시 */}
                      {order.side === 'back' && order.backOdds && (
                        <div className="text-xs text-blue-600">
                          참고: {(typeof order.backOdds === 'string' ? parseFloat(order.backOdds) : order.backOdds || 0).toFixed(2)}
                        </div>
                      )}
                      {order.side === 'lay' && order.layOdds && (
                        <div className="text-xs text-blue-600">
                          참고: {(typeof order.layOdds === 'string' ? parseFloat(order.layOdds) : order.layOdds || 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">
                        {(order as any).isMultibet ? '베팅 금액' : '주문 금액'}
                      </div>
                      <div className="text-lg font-bold text-gray-800">
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
                        })()} KRW
                      </div>
                      {/* 🆕 멀티배팅 예상 수익 표시 */}
                      {(order as any).isMultibet && (order as any).potentialWinnings && (
                        <div className="text-xs text-yellow-600 mt-1">
                          💰 예상 수익: +{(() => {
                            const potentialWinnings = (order as any).potentialWinnings;
                            if (potentialWinnings && typeof potentialWinnings === 'number') {
                              return potentialWinnings.toLocaleString();
                            } else if (potentialWinnings && typeof potentialWinnings === 'string') {
                              return parseFloat(potentialWinnings).toLocaleString();
                            }
                            return '0';
                          })()} KRW
                        </div>
                      )}
                      {/* 🆕 멀티배팅 순수익 표시 */}
                      {(order as any).isMultibet && (order as any).potentialProfit && (
                        <div className="text-xs text-green-600 mt-1">
                          🏆 순수익: +{(() => {
                            const potentialProfit = (order as any).potentialProfit;
                            if (potentialProfit && typeof potentialProfit === 'number') {
                              return potentialProfit.toLocaleString();
                            } else if (potentialProfit && typeof potentialProfit === 'string') {
                              return parseFloat(potentialProfit).toLocaleString();
                            }
                            return '0';
                          })()} KRW
                        </div>
                      )}
                      {/* 🆕 부분 매칭 정보 표시 */}
                      {(order as any).matchInfo && (order as any).matchInfo.partiallyFilled && (
                        <div className="text-xs text-orange-600 mt-1">
                          📈 {(order as any).matchInfo.fillPercentage}% 체결
                        </div>
                      )}
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
                        {/* 🆕 부분 매칭 상세 정보 */}
                        {(order as any).matchInfo && (
                          <div className="border-t border-gray-200 pt-1 mt-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">원래 금액:</span>
                              <span>{(order as any).matchInfo.originalAmount.toLocaleString()} KRW</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">체결 금액:</span>
                              <span className="text-green-600">{(order as any).matchInfo.filledAmount.toLocaleString()} KRW</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">남은 금액:</span>
                              <span className="text-orange-600">{(order as any).matchInfo.remainingAmount.toLocaleString()} KRW</span>
                            </div>
                            {(order as any).matchInfo.matchCount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">매칭 횟수:</span>
                                <span className="text-blue-600">{(order as any).matchInfo.matchCount}회</span>
                              </div>
                            )}
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