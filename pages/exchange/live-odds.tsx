import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../../hooks/useExchange';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { convertUTCToKST } from '../../utils/timeUtils';
import { getButtonStyle } from '../../utils/buttonStyles';

export default function LiveOddsPage() {
  const { isLoggedIn, token, userId } = useAuth();
  const { fetchAllOpenOrders } = useExchange();
  const router = useRouter();
  
  const [recentOrders, setRecentOrders] = useState<ExchangeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [filteredOrders, setFilteredOrders] = useState<ExchangeOrder[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // 🎯 버튼별 선택 상태 관리 추가
  const [selectedButtons, setSelectedButtons] = useState<{[orderId: string]: string}>({});

  // 🎯 버튼이 선택되었는지 확인하는 함수
  const isButtonSelected = (orderId: string, buttonKey: string) => {
    const isSelected = selectedButtons[orderId] === buttonKey;
    console.log('🎯 live-odds isButtonSelected 확인:', { orderId, buttonKey, isSelected, selectedButtons });
    return isSelected;
  };

  // 🎯 버튼 클릭 시 선택 상태 변경
  const handleButtonClick = (orderId: string, buttonKey: string) => {
    console.log('🎯 live-odds handleButtonClick 호출됨:', { orderId, buttonKey });
    setSelectedButtons(prev => {
      const newState = { ...prev };
      // 같은 주문의 다른 버튼이 선택되어 있다면 해제
      if (newState[orderId] === buttonKey) {
        delete newState[orderId]; // 같은 버튼 재클릭 시 선택 해제
        console.log('🎯 live-odds 버튼 선택 해제됨:', { orderId, buttonKey });
      } else {
        newState[orderId] = buttonKey; // 새 버튼 선택
        console.log('🎯 live-odds 새 버튼 선택됨:', { orderId, buttonKey });
      }
      console.log('🎯 live-odds selectedButtons 상태 업데이트:', newState);
      return newState;
    });
  };

  // 실시간 호가 현황 로드
  useEffect(() => {
    const loadRecentOrders = async () => {
      try {
        setOrdersLoading(true);
        const orders = await fetchAllOpenOrders();
        
        // 열린 주문과 부분 매칭된 주문만 표시
        const openOrders = orders.filter(order => 
          order.status === 'open' || 
          (order.status === 'partially_matched' && (order.remainingAmount || 0) > 0)
        );
        
        setRecentOrders(openOrders);
        setFilteredOrders(openOrders);
      } catch (error) {
        console.error('실시간 호가 현황 로드 실패:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadRecentOrders();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadRecentOrders, 30000);
    
    // 🆕 주문 완료 이벤트 감지하여 즉시 새로고침
    const handleOrderPlaced = () => {
      console.log('🔄 주문 완료 이벤트 감지, 실시간 호가 현황 새로고침');
      loadRecentOrders();
    };
    
    window.addEventListener('exchangeOrderPlaced', handleOrderPlaced);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
    };
  }, [fetchAllOpenOrders]);

  // 필터링 로직
  useEffect(() => {
    let filtered = recentOrders;

    // 스포츠 필터
    if (selectedSport !== 'all') {
      filtered = filtered.filter(order => order.sportKey === selectedSport);
    }

    // 마켓 필터
    if (selectedMarket !== 'all') {
      filtered = filtered.filter(order => order.market === selectedMarket);
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.homeTeam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.awayTeam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.selection?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  }, [recentOrders, selectedSport, selectedMarket, searchTerm]);

  // 스포츠별 통계
  const sportStats = recentOrders.reduce((acc, order) => {
    const sport = order.sportKey || 'unknown';
    if (!acc[sport]) acc[sport] = 0;
    acc[sport]++;
    return acc;
  }, {} as Record<string, number>);

  // 마켓별 통계
  const marketStats = recentOrders.reduce((acc, order) => {
    const market = order.market || 'unknown';
    if (!acc[market]) acc[market] = 0;
    acc[market]++;
    return acc;
  }, {} as Record<string, number>);

  const handleMatchOrder = (order: ExchangeOrder) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (String(userId) === String(order.userId)) {
      alert('자신의 주문과는 매칭할 수 없습니다.');
      return;
    }

    // 매칭 주문 페이지로 이동
    router.push(`/exchange/orderbook?matchOrderId=${order.id}`);
  };

  const getSportIcon = (sportKey: string) => {
    if (sportKey?.includes('soccer')) return '⚽';
    if (sportKey?.includes('basketball')) return '🏀';
    if (sportKey?.includes('baseball')) return '⚾';
    if (sportKey?.includes('americanfootball')) return '🏈';
    return '🏆';
  };

  const getMarketDisplayName = (market: string) => {
    const marketNames: Record<string, string> = {
      'h2h': '승패',
      'totals': '오버/언더',
      'spreads': '핸디캡',
      '승패': '승패',
      '오버/언더': '오버/언더',
      '핸디캡': '핸디캡'
    };
    return marketNames[market] || market;
  };

  // 🎯 공통 버튼 스타일 함수 - 모든 마켓 버튼에서 재사용
  const getButtonStyle = (isActive: boolean, isDisabled: boolean) => {
    const baseStyle = "flex-1 p-2 rounded-lg text-center transition-colors text-white text-sm";
    
    if (isDisabled) {
      return `${baseStyle} bg-gray-600 cursor-not-allowed`;
    }
    
    if (isActive) {
      return `${baseStyle} bg-blue-500 hover:bg-blue-600 cursor-pointer`;
    }
    
    return `${baseStyle} bg-gray-600 cursor-not-allowed`;
  };

  return (
    <div className="p-6">
      <div className="bg-black rounded shadow p-6 mb-4">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">🔥 실시간 호가 현황</h1>
              <p className="text-gray-300 mt-2">현재 등록된 모든 호가를 실시간으로 확인하고 매칭할 수 있습니다.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/exchange')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <span>←</span>
                <span>홈으로 돌아가기</span>
              </button>
              <button
                onClick={() => router.push('/exchange/orderbook')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <span>📋</span>
                <span>전체 호가보기</span>
              </button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{recentOrders.length}</div>
              <div className="text-sm text-gray-300">전체 호가</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {recentOrders.filter(o => o.status === 'open').length}
              </div>
              <div className="text-sm text-gray-300">대기중</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">
                {recentOrders.filter(o => o.status === 'partially_matched').length}
              </div>
              <div className="text-sm text-gray-300">부분 체결</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {Object.keys(sportStats).length}
              </div>
              <div className="text-sm text-gray-300">활성 스포츠</div>
            </div>
          </div>

          {/* 필터 및 검색 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* 스포츠 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">스포츠</label>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
              >
                <option value="all">전체 스포츠</option>
                {Object.keys(sportStats).map(sport => (
                  <option key={sport} value={sport}>
                    {getSportIcon(sport)} {sport}
                  </option>
                ))}
              </select>
            </div>

            {/* 마켓 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">마켓</label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
              >
                <option value="all">전체 마켓</option>
                {Object.keys(marketStats).map(market => (
                  <option key={market} value={market}>
                    {getMarketDisplayName(market)}
                  </option>
                ))}
              </select>
            </div>

            {/* 검색 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">검색</label>
              <input
                type="text"
                placeholder="팀명 또는 선택 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white placeholder-gray-400"
              />
            </div>

            {/* 새로고침 */}
            <div className="flex items-end">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 호가 목록 */}
        <div className="bg-black rounded-lg shadow">
          {ordersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">호가 정보를 불러오는 중...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">호가가 없습니다</h3>
              <p className="text-gray-400">
                {searchTerm || selectedSport !== 'all' || selectedMarket !== 'all' 
                  ? '검색 조건에 맞는 호가가 없습니다.' 
                  : '현재 등록된 호가가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* 🆕 투데이 배팅 GameCard와 정확히 동일한 구조 */}
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-800 p-4 rounded shadow border-2 border-blue-400"
                  >
                    {/* 🆕 투데이 배팅과 동일: 경기명 (font-semibold) */}
                    <div className="text-white font-semibold mb-2">
                      {order.homeTeam} vs {order.awayTeam}
                    </div>
                    
                    {/* 🆕 투데이 배팅과 동일: 시간 (기본 폰트) */}
                    <div className="mb-4">
                      <div className="text-white">
                        {order.commenceTime ? convertUTCToKST(order.commenceTime) : '시간 미정'}
                      </div>
                    </div>
                    
                    {/* 🆕 투데이 배팅과 동일: 선택지별 버튼 (Back/Lay 상태에 따라 활성화/비활성화) */}
                    <div className="flex space-x-4">
                      {(() => {
                        // 🎯 축구 경기인지 확인
                        const isFootball = order.sportKey?.startsWith('soccer');
                        
                        if (isFootball && (order.market === 'h2h' || order.market === '승패')) {
                          // 🎯 축구 경기: 승/무/패 3개 버튼
                          if (order.selection === '무승부' || order.selection === 'Draw') {
                            // 무승부 배팅: 승리 → 무승부 → 패배 순서로 3개 버튼
                            return (
                              <>
                                {/* 승리 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_승리`)}
                                  className={getButtonStyle(
                                    true, 
                                    false
                                  )}
                                >
                                  <div className="font-medium">승리</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                                  </div>
                                </button>
                                
                                {/* 무승부 (Back - 비활성화) */}
                                <button 
                                  disabled={true}
                                  className={getButtonStyle(false, true, false, false)}
                                >
                                  <div className="font-medium">{order.selection}</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    🎯 Back
                                  </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    배당률: {order.price.toFixed(2)}
                                  </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    금액: {order.amount.toLocaleString()}원
                                  </div>
                                </button>
                                
                                {/* 패배 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_패배`)}
                                  className={getButtonStyle(
                                    true, 
                                    false
                                  )}
                                >
                                  <div className="font-medium">패배</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                                  </div>
                                </button>
                              </>
                            );
                          } else {
                            // 승/패 배팅: 승/패 → 무승부 → 승/패 순서로 3개 버튼
                            const oppositeSelection = order.selection === order.homeTeam ? order.awayTeam : order.homeTeam;
                            return (
                              <>
                                {/* 승/패 (Back - 비활성화) */}
                                <button 
                                  disabled={true}
                                  className={getButtonStyle(false, true, false, false)}
                                >
                                  <div className="font-medium">{order.selection}</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    🎯 Back
                                  </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    배당률: {order.price.toFixed(2)}
                                  </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    금액: {order.amount.toLocaleString()}원
                                  </div>
                                </button>
                                
                                {/* 무승부 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_무승부`)}
                                  className={getButtonStyle(
                                    true, 
                                    false
                                  )}
                                >
                                  <div className="font-medium">무승부</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                                  </div>
                                </button>
                                
                                {/* 반대 승/패 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_${oppositeSelection}`)}
                                  className={getButtonStyle(
                                    true, 
                                    false
                                  )}
                                >
                                  <div className="font-medium">{oppositeSelection}</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                                  </div>
                                </button>
                              </>
                            );
                          }
                        } else {
                          // 🎯 축구가 아닌 다른 스포츠: 2개 버튼만 표시
                          return (
                            <>
                              {/* Back 주문이 있는 선택지 (비활성화) */}
                              <button 
                                disabled={true}
                                className={getButtonStyle(false, true, false, false)}
                              >
                                <div className="font-medium">{order.selection}</div>
                                <div className="text-xs mt-1 opacity-90">
                                  🎯 Back
                                </div>
                                <div className="text-xs mt-1 text-white font-medium">
                                  배당률: {order.price.toFixed(2)}
                                </div>
                                <div className="text-xs mt-1 text-white font-medium">
                                  금액: {order.amount.toLocaleString()}원
                                </div>
                              </button>
                              
                              {/* Lay 주문이 가능한 반대 선택지 (활성화) */}
                              <button 
                                onClick={() => handleButtonClick(String(order.id), `lay_${order.market}_${order.selection}`)}
                                className={getButtonStyle(
                                  true, 
                                  false
                                )}
                              >
                                <div className="font-medium">
                                  {(() => {
                                    // 🆕 반대 선택지 찾기
                                    if (order.market === 'h2h' || order.market === '승패') {
                                      // 승/패 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                      if (order.selection === order.homeTeam) {
                                        return order.awayTeam;
                                      } else {
                                        return order.homeTeam;
                                      }
                                    } else if (order.market === 'totals' || order.market === '오버/언더') {
                                      // 오버/언더 경기: 현재 선택지가 오버면 언더, 언더면 오버
                                      if (order.selection === '오버') {
                                        return '언더';
                                      } else {
                                        return '오버';
                                      }
                                    } else if (order.market === 'spreads' || order.market === '핸디캡') {
                                      // 핸디캡 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                      if (order.selection === order.homeTeam) {
                                        return order.awayTeam;
                                      } else {
                                        return order.homeTeam;
                                      }
                                    }
                                    // 기본값: 반대 선택지
                                    return order.selection === order.homeTeam ? order.awayTeam : order.homeTeam;
                                  })()}
                                </div>
                                <div className="text-xs mt-1 opacity-90">
                                  📉 Lay 가능
                                </div>
                                <div className="text-xs mt-1 opacity-90">
                                  매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                                </div>
                              </button>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 페이지 하단 정보 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>30초마다 자동으로 새로고침됩니다. 마지막 업데이트: {new Date().toLocaleString('ko-KR')}</p>
        </div>
      </div>
    </div>
  );
}
