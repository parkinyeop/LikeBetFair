import { buildApiUrl } from '../config/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useExchange, ExchangeOrder, OrderForm } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';
import { parseScore } from '../utils/scoreParser';
// 정밀 계산 함수는 프론트엔드에서 직접 구현

// 🗑️ 불필요한 GameResults 관련 코드 제거 완료
// ExchangeOrder 자체에 필요한 모든 정보가 이미 포함되어 있음

function OrderPanel() {
  const router = useRouter();
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

  // 🆕 페이지 이동 시 폼 완전 초기화 (Next.js 14 호환)
  useEffect(() => {
    const handlePageChange = () => {
      console.log('🔄 페이지 이동 감지 - ExchangeSidebar 폼 초기화');
      setForm({ side: 'back', price: 0, amount: 0 });
    };

    // 브라우저 뒤로가기/앞으로가기 감지
    window.addEventListener('popstate', handlePageChange);
    
    // 페이지 언마운트 시에도 초기화
    return () => {
      window.removeEventListener('popstate', handlePageChange);
      handlePageChange();
    };
  }, []);

  // 🆕 Next.js 14 호환: pathname 변경 감지
  useEffect(() => {
    console.log('🔄 페이지 이동 감지 (pathname 변경) - ExchangeSidebar 폼 초기화');
    setForm({ side: 'back', price: 0, amount: 0 });
  }, [router.pathname]);

  // 🆕 홈에서 선택된 경기 정보를 읽어와서 주문 폼에 자동으로 채우기
  useEffect(() => {
    const checkAndLoadSelectedGame = () => {
      const selectedGameInfo = localStorage.getItem('selectedGameForOrder');
      if (selectedGameInfo) {
        try {
          const gameInfo = JSON.parse(selectedGameInfo);
          
          console.log('🎯 홈에서 선택된 경기 정보 발견:', gameInfo);
          
          // 주문 폼에 자동으로 정보 채우기 (깨끗한 상태에서)
          setForm({
            side: 'back',
            price: gameInfo.odds || 0,
            amount: 0 // 금액은 항상 0으로 시작
          });
          
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
    
    // 🆕 주기적 체크 제거 - 한 번만 실행
    // 탭 변경 시에만 체크
    const handleTabChange = () => {
      setTimeout(checkAndLoadSelectedGame, 100);
    };
    
    // 탭 변경 이벤트 리스너 추가
    window.addEventListener('exchangeSidebarTabChange', handleTabChange);
    
    return () => {
      window.removeEventListener('exchangeSidebarTabChange', handleTabChange);
    };
  }, []); // 의존성 제거하여 매번 체크

  // 매칭 모드일 때 초기값 설정 및 다른 매치 선택 시 금액 초기화
  useEffect(() => {
    if (isMatchMode && matchTargetOrder) {
      // ✅ 다른 매치 버튼 선택 시에도 금액을 최대 금액으로 자동 설정
      const maxAmount = getAvailableMatchAmount();
      console.log('🎯 매치 모드 금액 자동 설정:', { maxAmount, matchTargetOrder: matchTargetOrder.id });
      setForm(prev => ({ ...prev, amount: maxAmount }));
    } else if (!isMatchMode) {
      // 매치 모드가 아닐 때는 금액 초기화
      setForm(prev => ({ ...prev, amount: 0 }));
    }
  }, [isMatchMode, matchTargetOrder, getAvailableMatchAmount]);

  // 🆕 매칭 모드 활성화 이벤트 감지하여 금액 즉시 초기화
  useEffect(() => {
    const handleMatchModeActivated = (event: CustomEvent) => {
      console.log('🎯 매칭 모드 활성화 이벤트 감지, 금액 초기화 중...');
      const maxAmount = getAvailableMatchAmount();
      setForm(prev => ({ ...prev, amount: maxAmount }));
    };

    window.addEventListener('matchModeActivated', handleMatchModeActivated as EventListener);
    
    return () => {
      window.removeEventListener('matchModeActivated', handleMatchModeActivated as EventListener);
    };
  }, [getAvailableMatchAmount]);



  // 실시간 업데이트 (30초마다)
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ✅ 정밀한 Exchange 매치 주문 예상수익 계산
  const calculateMatchOrderProfit = () => {
    if (!selectedBet || !form.amount || form.amount <= 0) return 0;
    
    const amount = form.amount;
    
    if (selectedBet.type === 'back') {
      // Back: 매칭된 Lay 베팅금액만큼 획득 (Exchange 원리)
      return amount;
    } else {
      // ✅ Lay 주문: 매칭 모드에서는 배당률과 금액으로 직접 계산
      // Lay 예상 수익 = 배팅 금액 ÷ (배당률 - 1)
      const layProfit = amount / (selectedBet.price - 1);
      const profit = Math.round(layProfit);
      
      console.log('🔍 [예상 수익 계산]', {
        amount,
        price: selectedBet.price,
        calculation: `${amount} / (${selectedBet.price} - 1) = ${layProfit}`,
        profit
      });
      
      return profit;
    }
  };

  // 통계 계산
  const stats = React.useMemo(() => {
    if (!userOrders || !Array.isArray(userOrders)) {
      return { total: 0, open: 0, matched: 0, settled: 0, totalAmount: 0, totalProfit: 0 };
    }
    
    const total = userOrders.length;
    const open = userOrders.filter(order => order.status === 'open').length;
    const matched = userOrders.filter(order => order.status === 'matched').length;
    const settled = userOrders.filter(order => order.status === 'settled').length;
    const totalAmount = userOrders.reduce((sum, order) => sum + order.amount, 0);
    
    // 정산 완료된 주문의 총 수익 계산
    const totalProfit = userOrders
      .filter(order => order.status === 'settled')
      .reduce((sum, order) => {
        const actualProfit = (order as any).actualProfit;
        if (actualProfit !== null && actualProfit !== undefined) {
          return sum + parseFloat(String(actualProfit));
        }
        return sum;
      }, 0);

    return { total, open, matched, settled, totalAmount, totalProfit };
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
          console.log('✅ [ExchangeSidebar] 매칭 배팅 성공, 이벤트 발생 시작');
          
          // ✅ 서버가 확정한 배당률 표시
          if (result.confirmedPrice) {
            console.log('✅ 매칭 배팅 서버 확정 배당률:', result.confirmedPrice);
          }
          
          // 주문 내역 새로고침 (이벤트 발생)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('exchangeOrderPlaced'));
            console.log('🎯 [ExchangeSidebar] exchangeOrderPlaced 이벤트 발생 완료');
            
            // ✅ 약간의 지연 후 한 번 더 발생 (React 렌더링 타이밍 이슈 방지)
            setTimeout(() => {
              window.dispatchEvent(new Event('exchangeOrderPlaced'));
              console.log('🎯 [ExchangeSidebar] exchangeOrderPlaced 이벤트 재발생 완료 (타이밍 보정)');
            }, 100);
          }
          
          const confirmedPrice = result.confirmedPrice ? `\n확정 배당률: ${result.confirmedPrice}` : '';
          alert(`🎉 매칭 배팅이 성공적으로 처리되었습니다!${confirmedPrice}`);
          
          // 매칭 모드 비활성화
          deactivateMatchMode();
          
          // 폼 초기화 (배당율은 유지)
          setForm(prev => ({ ...prev, amount: 0 }));
          setSelectedBet(null);
          
          // 🆕 매칭 배팅에서는 멀티배팅 선택 유지 (초기화하지 않음)
          // clearMultiBet();
          
          return; // 매칭 배팅 완료 후 함수 종료
        } else {
          alert(`매칭 배팅 실패: ${result.message}`);
          return;
        }
      }
      
      // 일반 주문 처리 (Phase 2: price 파라미터 제거)

      // 🔒 Zero-Sum 위반 방지: selection 필수 검증 (단일 베팅만)
      // 멀티배팅은 selection 체크하지 않음 (selectionDetails에 저장됨)
      if (!selectedBet.isMultibet && !selectedBet.team) {
        alert('선택된 팀 정보가 없습니다. 주문을 생성할 수 없습니다.');
        console.error('❌ selection 누락 (단일 베팅):', selectedBet);
        return;
      }

      const orderData = {
        gameId: selectedBet.gameId || '',
        market: selectedBet.market || 'h2h',
        line: selectedBet.line || 0,
        side: selectedBet.type,
        // price: selectedBet.price, // ✅ 제거: 서버에서 결정
        amount: Math.floor(form.amount), // 🆕 정수로 변환
        selection: selectedBet.team,
        homeTeam: selectedBet.homeTeam, // 추가
        awayTeam: selectedBet.awayTeam, // 추가
        commenceTime: selectedBet.commenceTime // 추가
      };
      
      console.log('주문 요청:', orderData);
      const result = await placeOrder(orderData);
      console.log('주문 결과:', result);
      
      // ✅ 서버가 확정한 배당률 표시
      if (result.confirmedPrice) {
        console.log('✅ 서버 확정 배당률:', result.confirmedPrice);
      }
      
      // 🆕 주문 성공 시 부분 매칭 정보 포함 알림 (확정 배당률 포함)
      if (result.matchingResult) {
        const { totalMatched, remainingAmount, matchCount, isPartiallyMatched, isFullyMatched } = result.matchingResult;
        const confirmedPrice = result.confirmedPrice ? `\n확정 배당률: ${result.confirmedPrice}` : '';
        
        if (isFullyMatched) {
          alert(`🎉 주문이 완전히 매칭되었습니다!${confirmedPrice}\n` +
                `매칭 금액: ${totalMatched.toLocaleString()} KRW\n` +
                `매칭 횟수: ${matchCount}회`);
        } else if (isPartiallyMatched) {
          alert(`⚡ 주문이 부분 매칭되었습니다!${confirmedPrice}\n` +
                `매칭된 금액: ${totalMatched.toLocaleString()} KRW\n` +
                `남은 금액: ${remainingAmount.toLocaleString()} KRW (호가창에 등록)\n` +
                `매칭 횟수: ${matchCount}회`);
        } else if (remainingAmount > 0) {
          alert(`📝 주문이 호가창에 등록되었습니다!${confirmedPrice}\n` +
                `등록 금액: ${remainingAmount.toLocaleString()} KRW\n` +
                `다른 사용자가 매칭하면 자동으로 체결됩니다.`);
        } else {
          alert(`주문이 성공적으로 등록되었습니다!${confirmedPrice}`);
        }
      } else {
        const confirmedPrice = result.confirmedPrice ? `\n확정 배당률: ${result.confirmedPrice}` : '';
        alert(`주문이 성공적으로 등록되었습니다!${confirmedPrice}`);
      }
      
      // 🆕 매칭 모드도 비활성화
      if (isMatchMode) {
        deactivateMatchMode();
      }
      
      // 🆕 폼 완전 초기화 (모든 필드 초기화)
      setForm({ side: 'back', price: 0, amount: 0 });
      setSelectedBet(null);
      
      // 🆕 멀티배팅 선택들도 완전 초기화
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
                  {/* 매칭 모드가 아닐 때만 삭제 버튼 표시 */}
                  {!isMatchMode && (
                    <button
                      onClick={() => removeMultiBetSelection(selection.gameId, selection.market, selection.selection)}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm font-medium underline"
                      title="개별 삭제"
                    >
                      삭제
                    </button>
                  )}
                  <div className="text-sm font-medium text-gray-900 mb-1 pr-6">
                    {selection.homeTeam} vs {selection.awayTeam}
                  </div>
                  <div className="text-sm text-gray-700 pr-6">
                    {selection.selection} • {selection.side === 'back' ? '🎯 Back' : '📉 Lay'} • <span className="font-bold text-blue-600">{(typeof selection.odds === 'string' ? parseFloat(selection.odds) : selection.odds || 0).toFixed(3)}</span>
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
                      
                      // 🆕 모든 금액 허용 (10원 단위 제한 제거)
                      if (numValue > 0) {
                        // 최소 1원으로 설정
                        if (numValue === 0) numValue = 1;
                      }
                      
                      if (isMatchMode) {
                        // 매칭 모드에서 최대 리스크 금액 초과 시 제한
                        const maxRiskAmount = getAvailableMatchAmount();
                        if (numValue > maxRiskAmount) {
                          numValue = Math.floor(maxRiskAmount); // 최대 금액으로 제한
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
                          const quickAmount = Math.floor(maxAmount * ratio); // 🆕 모든 금액 허용
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
                  {isMatchMode ? (
                    // 매치 주문하기 모드
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700">배당률:</span>
                        <span className="font-bold text-blue-600">
                          {(selectedBet?.isMultibet ? 
                            Number(selectedBet?.totalOdds || selectedBet?.price || 0) : 
                            Number(selectedBet?.price || 0)
                          ).toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">배팅 금액:</span>
                        <span className="font-bold text-gray-800">{Math.floor(form.amount).toLocaleString()} KRW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">예상 수익:</span>
                        <span className="font-bold text-green-600">
                          {calculateMatchOrderProfit() > 0 ? `${Math.floor(calculateMatchOrderProfit()).toLocaleString()}` : '0'} KRW
                        </span>
                      </div>
                      {selectedBet?.type === 'lay' && (
                        <div className="text-xs text-gray-500 mt-1">
                          💡 Lay: 상대방이 지면 수익, 이기면 리스크
                        </div>
                      )}
                    </>
                  ) : (
                    // 멀티배팅 모드
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700">총 배당률:</span>
                        <span className="font-bold text-blue-600">{(typeof multiBetTotalOdds === 'string' ? parseFloat(multiBetTotalOdds) : multiBetTotalOdds || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">예상 수익:</span>
                        <span className="font-bold text-green-600">
                          {multiBetPotentialWinnings > 0 ? `${multiBetPotentialWinnings.toLocaleString()}` : '0'} KRW
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <button
                onClick={isMatchMode ? handleOrder : async () => {
                  const result = await createMultiBetOrder();
                  if (result.success) {
                    alert('배팅 주문이 성공적으로 생성되었습니다!');
                    
                    // 🆕 멀티배팅 주문 완료 후 완전 초기화
                    setForm({ side: 'back', price: 0, amount: 0 });
                    setSelectedBet(null);
                    clearMultiBet();
                    
                    // 🆕 멀티배팅 주문 완료 후 이벤트 발생
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new Event('exchangeOrderPlaced'));
                    }
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
  const { token } = useAuth(); // 🆕 토큰 추가
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
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
      case 'partially_matched': return { text: '부분체결', color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'matched': return { text: '체결', color: 'text-green-600', bg: 'bg-green-50' };
      case 'active': return { text: '활성매치', color: 'text-purple-600', bg: 'bg-purple-50' }; // 🆕 Lay 매치 상태
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

  // 통합배당률 계산
  const calculateTotalOdds = (order: ExchangeOrder) => {
    if ((order as any).isMultibet) {
      // 멀티배팅인 경우: DB에 저장된 totalOdds 또는 price 사용 (환수율이 이미 적용됨)
      return (order as any).totalOdds || order.price || 1;
    } else {
      // 단일 배팅인 경우: 해당 배당률 반환
      return order.price || 1;
    }
  };

  // 매칭된 주문 정보 상태
  const [matchedOrderInfo, setMatchedOrderInfo] = useState<{[key: number]: any}>({});

  // Back 주문에서 매칭된 Lay 주문 정보 가져오기
  const loadMatchingLayOrders = useCallback(async (backOrderId: number) => {
    try {
      if (!token) {
        console.error('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/exchange/orders/${backOrderId}/matches`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const matchData = await response.json();
        console.log('매칭된 Lay 주문 정보:', matchData);
        
        // 매칭된 주문 정보를 상태에 저장
        setMatchedOrderInfo(prev => ({
          ...prev,
          [`back_${backOrderId}`]: matchData
        }));
      } else {
        console.error('매칭된 Lay 주문 정보 조회 실패:', response.status);
      }
    } catch (error) {
      console.error('매칭된 Lay 주문 정보 조회 오류:', error);
    }
  }, [token]);

  // 상세 보기가 열릴 때 매칭된 주문 정보 로드
  useEffect(() => {
    if (selectedOrderId && userOrders) {
      const selectedOrder = userOrders.find(order => order.id === selectedOrderId);
      if (selectedOrder) {
        // Lay 주문의 경우: matchedOrderId로 매칭된 Back 주문 조회
        if (selectedOrder.side === 'lay' && selectedOrder.matchedOrderId) {
          if (!matchedOrderInfo[selectedOrder.matchedOrderId]) {
            getMatchedOrderInfo(selectedOrder.matchedOrderId);
          }
        }
        // Back 주문의 경우: ExchangeOrderMatch를 통해 매칭된 Lay 주문 조회
        else if (selectedOrder.side === 'back' && (selectedOrder.status === 'matched' || selectedOrder.status === 'partially_matched')) {
          loadMatchingLayOrders(selectedOrder.id);
        }
      }
    }
  }, [selectedOrderId, userOrders, loadMatchingLayOrders]);

  // 매칭된 주문 정보 가져오기
  const getMatchedOrderInfo = async (matchedOrderId: number) => {
    // 이미 가져온 정보가 있으면 반환
    if (matchedOrderInfo[matchedOrderId]) {
      return matchedOrderInfo[matchedOrderId];
    }

    try {
      // 🆕 특정 주문 ID로 직접 조회
      const response = await fetch(`/api/exchange/order/${matchedOrderId}`);
      
      if (response.ok) {
        const orderData = await response.json();
        const orderInfo = {
          id: orderData.id,
          amount: orderData.amount,
          price: orderData.price,
          status: orderData.status,
          filledAmount: orderData.filledAmount,
          originalAmount: orderData.originalAmount
        };
        
        setMatchedOrderInfo(prev => ({
          ...prev,
          [matchedOrderId]: orderInfo
        }));
        
        return orderInfo;
      } else if (response.status === 404) {
        // 주문을 찾을 수 없는 경우 기본 정보 반환
        const defaultInfo = {
          id: matchedOrderId,
          amount: 0,
          price: 0,
          status: 'not_found'
        };
        
        console.warn('매칭된 주문을 찾을 수 없습니다:', matchedOrderId);
        setMatchedOrderInfo(prev => ({
          ...prev,
          [matchedOrderId]: defaultInfo
        }));
        
        return defaultInfo;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('매칭된 주문 정보 조회 실패:', error);
      
      // 오류 발생 시 기본 정보 반환
      const errorInfo = {
        id: matchedOrderId,
        amount: 0,
        price: 0,
        status: 'error'
      };
      
      setMatchedOrderInfo(prev => ({
        ...prev,
        [matchedOrderId]: errorInfo
      }));
      
      return errorInfo;
    }
  };

  // ✅ 올바른 Exchange 예상 수익 계산 (상세보기용 - 10원 단위 올림)
  const calculateExpectedProfit = (order: ExchangeOrder) => {
    // stakeAmount가 있는 경우 (매치 주문) - Exchange 원리 적용
    if ((order as any).stakeAmount !== undefined && (order as any).stakeAmount !== null && (order as any).stakeAmount > 0) {
      const stakeAmount = typeof (order as any).stakeAmount === 'string' 
        ? parseFloat((order as any).stakeAmount) 
        : (order as any).stakeAmount;
      
      if (order.side === 'back') {
        // Back: 매칭된 Lay 베팅금액만큼 획득 (Exchange 원리)
        return stakeAmount;
      } else {
        // ✅ 정밀한 Lay 예상 수익: 자신의 베팅금액 + (Back의 실제 배팅금액 × Lay 지분율)
        // Lay 지분율 = Lay 베팅금액 ÷ Back의 매치금액
        // Back의 매치금액 = Back 배팅금액 × (배당률 - 1)
        // Lay 예상 수익 = stakeAmount × price / (price - 1)
        return stakeAmount * (order.price || 1) / ((order.price || 1) - 1);
      }
    }
    
    // 일반 주문인 경우 기존 로직 (멀티배팅 등)
    const totalOdds = calculateTotalOdds(order);
    let stakeAmount = 0;
    
    if ((order as any).isMultibet) {
      // 멀티배팅인 경우
      stakeAmount = (order as any).stakeAmount;
      if (stakeAmount && typeof stakeAmount === 'string') {
        stakeAmount = parseFloat(stakeAmount);
      }
    } else {
      // 단일 배팅인 경우
      stakeAmount = order.amount;
    }
    
    if (order.side === 'back') {
      // Back: 본인 배팅금액 + 수익 = stakeAmount + (stakeAmount * (odds - 1))
      return Math.round(stakeAmount * totalOdds * 100) / 100;
    } else {
      // Lay: 본인 배팅금액 + 수익 = stakeAmount + (stakeAmount * (odds - 1) / odds)
      const expectedProfit = stakeAmount + (stakeAmount * (totalOdds - 1) / totalOdds);
      return Math.round(expectedProfit * 100) / 100;
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

  // 주문 취소 핸들러 (확인 모달 없이 바로 처리)
  const handleCancelOrder = async (orderId: number, orderSide: string) => {
    try {
      await cancelOrder(orderId);
      
      // ✅ 성공 메시지 표시
      alert(orderSide === 'back' 
        ? '주문이 취소되었습니다.' 
        : '매치가 취소되었습니다. Back 주문은 유지됩니다.');
      
      // 주문 취소 후 이벤트 발생
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('exchangeOrderPlaced'));
      }
    } catch (error) {
      console.error('주문 취소 실패:', error);
      // ✅ 실패 메시지 표시
      alert(error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다.');
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

  // 기본 주문 목록 (취소된 주문 제외, 날짜순 내림차순)
  const filteredOrders = (userOrders || [])
    .filter(order => order.status !== 'cancelled') // 🆕 취소된 주문 제외
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
      return { total: 0, open: 0, matched: 0, settled: 0, totalAmount: 0, totalProfit: 0 };
    }
    
    const total = userOrders.length;
    const open = userOrders.filter(order => order.status === 'open').length;
    const matched = userOrders.filter(order => order.status === 'matched').length;
    const settled = userOrders.filter(order => order.status === 'settled').length;
    const totalAmount = userOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalProfit = userOrders
      .filter(order => order.status === 'settled')
      .reduce((sum, order) => sum + parseFloat((order as any).actualProfit || 0), 0);

    return { total, open, matched, settled, totalAmount, totalProfit };
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
    <div className="h-full flex flex-col">
      <div className="bg-gray-50 p-3 rounded flex-shrink-0">
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
            <div className="text-xs text-gray-500">{filteredOrders.length}개 주문</div>
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
                <div className="text-gray-500 mb-1">정산</div>
                <div className="font-bold text-lg text-blue-600">{stats.settled}개</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="text-gray-500 mb-1">총 수익</div>
                <div className={`font-bold text-lg ${
                  stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toLocaleString()}원
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
          <div className="text-center py-4 text-gray-400 text-sm">주문 내역이 없습니다</div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto">
            {filteredOrders.map((order, index) => {
              const statusInfo = getStatusDisplay(order.status, order.commenceTime);
              const sideInfo = getSideDisplay(order.side);
              const dateInfo = formatDate(order.createdAt);
              const totalOdds = calculateTotalOdds(order);
              
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
                          const market = selection.market || '';
                          const isOverUnder = market === '총점' || market === 'Over/Under' || market === 'totals';
                          const isHandicap = market === '핸디캡' || market === 'Handicap' || market === 'spreads';
                          
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">
                                  {isOverUnder ? (
                                    `${selection.option || selection.team} ${selection.point || ''}`
                                  ) : isHandicap ? (
                                    selection.team
                                  ) : (
                                    `${selection.team || selection.selection} (Win)`
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
                                  {selection.commenceTime && (
                                    <span className="ml-2 text-blue-600">
                                      • {new Date(selection.commenceTime).toLocaleString('ko-KR', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: 'Asia/Seoul'
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-800">
                                  @{selection.odds?.toFixed(3) || '0.000'}
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
                            {(() => {
                              const market = order.market || '';
                              const isOverUnder = market === '총점' || market === 'Over/Under' || market === 'totals';
                              const isHandicap = market === '핸디캡' || market === 'Handicap' || market === 'spreads';
                              const selection = order.selection || '선택된 팀';
                              
                              // 오버/언더나 핸디캡이 아니면 (Win) 표시
                              return (isOverUnder || isHandicap) ? selection : `${selection} (Win)`;
                            })()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sideInfo.bg} ${sideInfo.color}`}>
                            {sideInfo.text}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-xs text-gray-500">
                            {order.market || '승패'}
                            {commenceTime && (
                              <span className="ml-2 text-blue-600">
                                • {new Date(commenceTime).toLocaleString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                  timeZone: 'Asia/Seoul'
                                })}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-gray-800">
                            @{(order.isMultibet ? 
                              Number(order.totalOdds || order.price || 0) : 
                              Number(order.price || 0)
                            ).toFixed(3)}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 배팅금액과 통합배당률 정보 */}
                    <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500 text-xs">배팅금액</span>
                        <span className="font-bold text-gray-800 text-xs">
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
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500 text-xs">배당률</span>
                        <span className="text-xs font-bold text-blue-600">
                          @{Number(totalOdds || 0).toFixed(3)}
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
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleOrderDetail(order.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{selectedOrderId === order.id ? '상세 숨기기' : '상세 보기'}</span>
                      </button>
                      {order.status === 'settled' && (() => {
                        const actualProfit = (order as any).actualProfit;
                        const hasProfit = actualProfit !== null && actualProfit !== undefined;
                        const profit = hasProfit ? parseFloat(String(actualProfit)) : 0;
                        const stakeAmount = (order as any).stakeAmount || order.amount;
                        const settlementNote = (order as any).settlementNote || '';
                        
                        // ✅ 취소/환불 여부 확인 (settlementNote에 "환불", "취소" 키워드 포함)
                        const isCancelled = settlementNote.includes('환불') || settlementNote.includes('취소') || 
                                           settlementNote.includes('Cancel') || settlementNote.includes('Push');
                        
                        // ✅ 익스체인지 정산 판정 (담보금 미리 차감 방식)
                        const isWin = profit > 0 && !isCancelled;  // 취소가 아니고 수익이 있을 때만 승리
                        const isFullRefund = Math.abs(profit - stakeAmount) < 1 || isCancelled;
                        const isLoss = profit <= 0 && !isFullRefund && !isCancelled; // 0원 이하 = 패배
                        
                        // 부분 환불 판정 (실제 수익이 음수이지만 전체 배팅금액보다 적게 손실)
                        const isPartialRefund = profit < 0 && Math.abs(profit) < stakeAmount;
                        
                        return (
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isWin ? 'bg-green-100 text-green-700' :
                              isLoss ? 'bg-red-100 text-red-700' :
                              isPartialRefund ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {isWin ? '✅ 승리' : 
                               isLoss ? '❌ 패배' : 
                               isPartialRefund ? '🔄 부분환불' : 
                               '✅ 환불'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* 🆕 취소 가능 조건: Back과 Lay 구분 + 경기시간 10분 전까지 */}
                    {(() => {
                      // 멀티배팅인 경우 모든 경기 체크
                      if ((order as any).isMultibet && (order as any).selectionDetails && (order as any).selectionDetails.selections) {
                        const selections = (order as any).selectionDetails.selections || [];
                        
                        // 모든 선택의 경기 시간 체크
                        for (const selection of selections) {
                          if (selection.commenceTime) {
                            const timeUntilGame = new Date(selection.commenceTime).getTime() - new Date().getTime();
                            
                            // 경기 시작 10분 전부터는 취소 불가
                            const isTooCloseToGame = timeUntilGame > 0 && timeUntilGame <= 10 * 60 * 1000;
                            // 경기가 이미 시작했으면 취소 불가
                            const hasGameStarted = timeUntilGame <= 0;
                            
                            if (isTooCloseToGame || hasGameStarted) return false;
                          }
                        }
                      } else {
                        // 단일 주문인 경우
                        const timeUntilGame = order.commenceTime 
                          ? new Date(order.commenceTime).getTime() - new Date().getTime()
                          : Infinity;
                        
                        // 경기 시작 10분 전부터는 취소 불가
                        const isTooCloseToGame = timeUntilGame > 0 && timeUntilGame <= 10 * 60 * 1000;
                        
                        // 경기가 이미 시작했으면 취소 불가
                        const hasGameStarted = timeUntilGame <= 0;
                        
                        if (isTooCloseToGame || hasGameStarted) return false;
                      }
                      
                      // Back과 Lay 구분 취소 조건
                      if (order.side === 'lay') {
                        // Lay 매치: active 상태에서만 취소 가능
                        return order.status === 'active';
                      } else {
                        // Back 주문: open, partially_matched, matched 상태에서 취소 가능 (경기시간 10분 전까지)
                        return order.status === 'open' || order.status === 'partially_matched' || order.status === 'matched';
                      }
                    })() && (
                      <button
                        onClick={() => handleCancelOrder(order.id, order.side)}
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
                        {/* 1. 주문번호 */}
                        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">주문번호</span>
                            <span className="text-sm font-bold text-gray-800">#{order.id}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <div>생성: {new Date(order.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
                          </div>
                        </div>
                        
                        
                        
                        {/* 🆕 정산 대기 중 안내 */}
                        {order.status !== 'settled' && (order as any).isMultibet && (
                          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                            <div className="text-sm font-medium text-yellow-700">
                              ⏳ 모든 경기가 완료되면 자동으로 정산됩니다.
                            </div>
                          </div>
                        )}
                        
                        {/* 2. 게임 결과 및 스코어 정보 */}
                        {/* 🆕 멀티배팅인 경우 각 경기별 결과 표시 */}
                        {(order as any).isMultibet && (order as any).multibetGameResults && (order as any).multibetGameResults.length > 0 ? (
                          <div className="mb-3">
                            <div className="space-y-2">
                              {(order as any).multibetGameResults.map((gameResult: any, idx: number) => {
                                const isPending = gameResult.status === 'scheduled' || !gameResult.score;
                                
                                // 🆕 경기별 승패 판정
                                const gameWon = gameResult.result === 'won';
                                const gameLost = gameResult.result === 'lost';
                                
                                if (isPending) return null;
                                
                                return (
                                  <div key={idx} className="border-l-2 border-gray-200 pl-3 py-1">
                                    {(gameWon || gameLost) && (
                                      <div className="flex items-center text-sm mb-1">
                                        {/* 승패 아이콘 */}
                                        {gameWon && <span className="mr-2 text-green-600">✔️</span>}
                                        {gameLost && <span className="mr-2 text-red-500">❌</span>}
                                        <span className={`text-xs font-medium ${
                                          gameWon ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                          {gameWon ? 'Won' : 'Lost'}
                                        </span>
                                      </div>
                                    )}
                                    {/* 스코어 표시 */}
                                    {(() => {
                                      const parsed = parseScore(
                                        gameResult.score,
                                        gameResult.homeTeam,
                                        gameResult.awayTeam
                                      );
                                      
                                      if (!parsed.isValid) return null;
                                      
                                      return (
                                        <div className="text-xs text-blue-600 mt-1">
                                          {gameResult.homeTeam} {parsed.home} : {parsed.away} {gameResult.awayTeam}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) :
                        /* 단일 배팅 경기 결과 - 간결하게 */
                        (order as any).gameResult && (() => {
                          const gameResult = (order as any).gameResult;
                          const isPending = gameResult.status === 'scheduled' || !gameResult.score;
                          
                          if (isPending) return null;
                          
                          return (
                            <div className="mb-3">
                              <div className="border-l-2 border-gray-200 pl-3 py-1">
                                {/* 스코어 표시 */}
                                {(() => {
                                  const parsed = parseScore(
                                    gameResult.score,
                                    gameResult.homeTeam,
                                    gameResult.awayTeam
                                  );
                                  
                                  if (!parsed.isValid) return null;
                                  
                                  return (
                                    <div className="text-xs text-blue-600 mt-1">
                                      {gameResult.homeTeam} {parsed.home} : {parsed.away} {gameResult.awayTeam}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })()}


                        {/* 3. 매칭 정보 */}
                        {/* Lay 주문의 매칭된 Back 주문 정보 */}
                        {order.side === 'lay' && order.matchedOrderId && (() => {
                          const matchedOrder = matchedOrderInfo[order.matchedOrderId!];
                          return (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-600">매칭된 Back 주문</span>
                                <span className="text-xs font-medium text-green-600">#{order.matchedOrderId}</span>
                              </div>
                              {matchedOrder ? (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">배팅금액</span>
                                    <span className="text-xs font-medium text-gray-700">
                                      {matchedOrder.amount.toLocaleString()}원
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">매치 비율</span>
                                    <span className="text-xs font-medium text-gray-700">
                                      {(() => {
                                        // 매치 비율 계산: 매칭된 주문의 실제 매칭된 금액 / 매칭된 주문의 전체 금액
                                        const matchedAmount = matchedOrder.filledAmount || matchedOrder.amount || 0;  // 매칭된 주문의 실제 매칭된 금액
                                        const originalAmount = matchedOrder.originalAmount || matchedOrder.amount || 0;  // 매칭된 주문의 전체 금액
                                        
                                        if (originalAmount === 0) return '0%';
                                        
                                        const matchRatio = (matchedAmount / originalAmount) * 100;
                                        
                                        // 부분 매칭인 경우 실제 매칭된 금액도 표시
                                        if (matchRatio < 100) {
                                          return `${matchRatio.toFixed(1)}% (${matchedAmount.toLocaleString()}원)`;
                                        } else {
                                          return '100%';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">상태</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      matchedOrder.status === 'matched' ? 'bg-green-100 text-green-700' :
                                      matchedOrder.status === 'partially_matched' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {matchedOrder.status === 'matched' ? '매칭완료' :
                                       matchedOrder.status === 'partially_matched' ? '부분매칭' :
                                       matchedOrder.status}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  {matchedOrder === undefined ? '매칭된 주문 정보를 로딩 중...' : '매칭된 주문 정보를 찾을 수 없습니다'}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Back 주문의 매칭된 Lay 주문 정보 */}
                        {order.side === 'back' && (order.status === 'matched' || order.status === 'partially_matched') && (() => {
                          const matchingData = matchedOrderInfo[`back_${order.id}`];
                          return (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-600">매칭된 Lay 주문</span>
                                <span className="text-xs font-medium text-blue-600">
                                  {matchingData?.orderInfo?.matchCount || 0}개
                                </span>
                              </div>
                              {matchingData ? (
                                <div className="space-y-2">
                                  {matchingData.matches && matchingData.matches.length > 0 ? (
                                    matchingData.matches.map((match: any, index: number) => (
                                      <div key={index} className="text-xs p-2">
                                        <div className="flex justify-between items-center">
                                          <span>
                                            Lay #{match.counterparty?.orderId || match.id}
                                          </span>
                                          <span className="text-gray-600">
                                            (총배팅: {match.counterparty?.order?.stakeAmount ? 
                                              `${match.counterparty.order.stakeAmount.toLocaleString()}원` : 
                                              '확인중'
                                            })
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-500">
                                      매칭된 주문이 없습니다.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  매칭된 Lay 주문 정보를 로딩 중...
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* 4. 정산 결과 정보 */}
                        {order.status === 'settled' && (order as any).actualProfit !== null && (order as any).actualProfit !== undefined && (() => {
                          const actualProfit = parseFloat(String((order as any).actualProfit));
                          const stakeAmount = (order as any).stakeAmount || order.amount;
                          
                          // ✅ 익스체인지 정산 판정 (담보금 미리 차감 방식)
                          // - actualProfit > 0: 승리 (담보금 + 수익 반환)
                          // - actualProfit = 0: 패배 (담보금 못 돌려받음)
                          // - actualProfit = stakeAmount: 환불 (담보금만 반환)
                          const isWin = actualProfit > 0;
                          const isFullRefund = Math.abs(actualProfit - stakeAmount) < 1; // 환불 (거의 없음)
                          const isLoss = actualProfit <= 0 && !isFullRefund; // 0원 이하 = 패배
                          const isPartialRefund = actualProfit < 0 && Math.abs(actualProfit) < stakeAmount;
                          
                          return (
                            <div className={`p-3 rounded-lg border ${
                              isWin ? 'bg-green-50 border-green-200' :
                              isLoss ? 'bg-red-50 border-red-200' :
                              isPartialRefund ? 'bg-yellow-50 border-yellow-200' :
                              'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-600">정산 결과</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  isWin ? 'bg-green-100 text-green-700' :
                                  isLoss ? 'bg-red-100 text-red-700' :
                                  isPartialRefund ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {isWin ? '✅ 승리' : 
                                   isLoss ? '❌ 패배' : 
                                   isPartialRefund ? '🔄 부분환불' : 
                                   '✅ 환불'}
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">정산 손익</span>
                                  <span className={`text-xs font-bold ${
                                    isWin ? 'text-green-600' : isLoss ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {(() => {
                                      if (isFullRefund || isPartialRefund) {
                                        // 환불은 원금 반환이므로 표시
                                        return `환불 ${actualProfit.toLocaleString()}원`;
                                      } else if (isWin) {
                                        return `+${actualProfit.toLocaleString()}원`;
                                      } else {
                                        return `${actualProfit.toLocaleString()}원`;
                                      }
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

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
  const { isLoggedIn } = useAuth();
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