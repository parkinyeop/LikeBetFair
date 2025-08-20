import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../../hooks/useExchange';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { convertUTCToKST } from '../../utils/timeUtils';

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

  return (
    <div className="min-h-screen bg-black p-6">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-black rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">🔥 실시간 호가 현황</h1>
              <p className="text-gray-300 mt-2">현재 등록된 모든 호가를 실시간으로 확인하고 매칭할 수 있습니다.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/exchange')}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
              >
                <span>←</span>
                <span>홈으로 돌아가기</span>
              </button>
              <button
                onClick={() => router.push('/exchange/orderbook')}
                className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition-colors flex items-center space-x-1"
              >
                <span>📋</span>
                <span>전체 호가보기</span>
              </button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{recentOrders.length}</div>
              <div className="text-sm text-blue-700">전체 호가</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {recentOrders.filter(o => o.status === 'open').length}
              </div>
              <div className="text-sm text-green-700">대기중</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {recentOrders.filter(o => o.status === 'partially_matched').length}
              </div>
              <div className="text-sm text-orange-700">부분 체결</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(sportStats).length}
              </div>
              <div className="text-sm text-purple-700">활성 스포츠</div>
            </div>
          </div>

          {/* 필터 및 검색 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* 스포츠 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">스포츠</label>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">마켓</label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <input
                type="text"
                placeholder="팀명 또는 선택 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 새로고침 */}
            <div className="flex items-end">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 호가 목록 */}
        <div className="bg-white rounded-lg shadow">
          {ordersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">호가 정보를 불러오는 중...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">호가가 없습니다</h3>
              <p className="text-gray-600">
                {searchTerm || selectedSport !== 'all' || selectedMarket !== 'all' 
                  ? '검색 조건에 맞는 호가가 없습니다.' 
                  : '현재 등록된 호가가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      경기 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      선택
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      배당율
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      등록 시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="text-lg">{getSportIcon(order.sportKey || '')}</div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {order.homeTeam} vs {order.awayTeam}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.sportKey} • {getMarketDisplayName(order.market || '')}
                            </div>
                            {order.commenceTime && (
                              <div className="text-xs text-gray-400">
                                {convertUTCToKST(order.commenceTime)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.selection}</div>
                        <div className="text-xs text-gray-500">
                          {order.side === 'back' ? 'Back' : 'Lay'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-lg font-bold ${
                          order.side === 'back' ? 'text-blue-600' : 'text-pink-600'
                        }`}>
                          {order.price.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.displayAmount ? order.displayAmount.toLocaleString() : order.amount.toLocaleString()}원
                        </div>
                        {order.partiallyFilled && (
                          <div className="text-xs text-orange-600">
                            남은 금액: {(order.remainingAmount || 0).toLocaleString()}원
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'open' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'partially_matched'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'open' ? '🔄 대기중' : 
                           order.status === 'partially_matched' ? '🔄 부분 체결' : 
                           order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {order.status === 'open' || order.status === 'partially_matched' ? (
                          <button
                            onClick={() => handleMatchOrder(order)}
                            disabled={!isLoggedIn || String(userId) === String(order.userId)}
                            className={`px-3 py-1 text-white text-xs rounded transition-colors ${
                              !isLoggedIn || String(userId) === String(order.userId)
                                ? 'bg-gray-400 cursor-not-allowed'
                                : order.side === 'back' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {order.side === 'back' ? '📉 Lay로 매칭' : '🎯 Back으로 매칭'}
                          </button>
                        ) : (
                          <span className="text-gray-400">매칭 불가</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
