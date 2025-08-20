import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useExchange } from '../../hooks/useExchange';
import { useExchangeContext, MatchTargetOrder } from '../../contexts/ExchangeContext';
import { API_CONFIG, buildApiUrl } from '../../config/apiConfig';

interface Order {
  id: string;
  gameId: string;
  userId: string;
  type: 'back' | 'lay';
  odds: number;
  amount: number;
  status: 'open' | 'partially_matched' | 'matched' | 'cancelled' | 'settled';
  createdAt: string;
  selection?: string;
  homeTeam?: string;
  awayTeam?: string;
  commenceTime?: string;
  sportKey?: string;
  stakeAmount?: number;
  potentialProfit?: number;
  backOdds?: number;
  layOdds?: number;
  oddsSource?: string;
  oddsUpdatedAt?: string;
  // 🆕 부분 매칭 필드들 추가
  displayAmount?: number;
  originalAmount?: number;
  filledAmount?: number;
  remainingAmount?: number;
  partiallyFilled?: boolean;
  // 🆕 매치 배팅 구분 필드
  matchedOrderId?: number | null;
}

const OrderbookPage: React.FC = () => {
  const router = useRouter();
  const { userId } = useAuth();
  const { fetchAllOpenOrders } = useExchange();
  const { activateMatchMode } = useExchangeContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'back' | 'lay'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'odds' | 'amount'>('time');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 매치 배팅 상태
  const [matchBetAmount, setMatchBetAmount] = useState<{ [key: string]: number }>({});
  const [matchBetOdds, setMatchBetOdds] = useState<{ [key: string]: number }>({});
  const [matchingOrder, setMatchingOrder] = useState<string | null>(null);
  
  // 상세보기 상태
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const allOrders = await fetchAllOpenOrders();
        console.log('🔍 원본 주문 데이터:', allOrders);
        
        // 🆕 부분 매칭 정보를 포함한 변환
        const convertedOrders: Order[] = allOrders.map(order => {
          console.log('🔍 개별 주문 변환:', {
            id: order.id,
            side: order.side,
            amount: order.amount,
            status: order.status,
            partiallyFilled: order.partiallyFilled,
            remainingAmount: order.remainingAmount,
            displayAmount: order.displayAmount
          });
          
          return {
            id: order.id.toString(),
            gameId: order.gameId,
            userId: order.userId.toString(),
            type: order.side,
            odds: order.price,
            amount: order.displayAmount || order.amount, // 🆕 displayAmount 우선 사용
            status: order.status,
            createdAt: order.createdAt,
            selection: order.selection,
            homeTeam: order.homeTeam,
            awayTeam: order.awayTeam,
            commenceTime: order.commenceTime,
            sportKey: order.sportKey,
            stakeAmount: order.stakeAmount,
            potentialProfit: order.potentialProfit,
            backOdds: order.backOdds,
            layOdds: order.layOdds,
            oddsSource: order.oddsSource,
            oddsUpdatedAt: order.oddsUpdatedAt,
            // 🆕 부분 매칭 필드들 추가
            displayAmount: order.displayAmount || order.amount,
            originalAmount: order.originalAmount || order.amount,
            filledAmount: order.filledAmount || 0,
            remainingAmount: order.remainingAmount || order.amount,
            partiallyFilled: order.partiallyFilled || false,
            // 🆕 매치 배팅 구분 필드
            matchedOrderId: order.matchedOrderId || null
          };
        });
        
        console.log('🔍 변환된 주문 데이터:', convertedOrders);
        setOrders(convertedOrders);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadOrders, 30000);
    
    // 🆕 주문 완료 이벤트 감지하여 즉시 새로고침
    const handleOrderPlaced = () => {
      console.log('🔄 주문 완료 이벤트 감지, 전체 호가보기 새로고침');
      loadOrders();
    };
    
    window.addEventListener('exchangeOrderPlaced', handleOrderPlaced);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
    };
  }, [fetchAllOpenOrders]);

  // 매치 배팅 처리 함수 - 오른쪽 사이드 주문하기 UI 사용
  const handleMatchBet = (orderId: string) => {
    try {
      // 해당 주문 찾기
      const targetOrder = orders.find(order => order.id === orderId);
      if (!targetOrder) {
        alert('주문을 찾을 수 없습니다.');
        return;
      }
      
      // 본인 주문인지 확인
      if (targetOrder.userId === userId) {
        alert('자신이 생성한 주문에는 매칭 배팅을 할 수 없습니다.');
        return;
      }
      
      // 주문 상태 확인 - 🆕 부분 매칭된 주문도 매칭 가능
      if (targetOrder.status !== 'open' && targetOrder.status !== 'partially_matched') {
        alert('이미 완전히 체결되었거나 취소된 주문입니다.');
        return;
      }
      
      // 🆕 부분 매칭된 주문의 경우 남은 금액이 있어야 함
      if (targetOrder.status === 'partially_matched' && (!targetOrder.remainingAmount || targetOrder.remainingAmount <= 0)) {
        alert('매칭 가능한 금액이 없습니다.');
        return;
      }
      
      // 매칭 모드 활성화하여 오른쪽 사이드 주문하기 UI 사용
      const matchTargetOrder: MatchTargetOrder = {
        id: targetOrder.id.toString(),
        type: targetOrder.type as 'back' | 'lay',
        odds: targetOrder.odds,
        amount: targetOrder.amount,
        selection: targetOrder.selection || '',
        homeTeam: targetOrder.homeTeam || '',
        awayTeam: targetOrder.awayTeam || '',
        gameId: targetOrder.gameId,
        commenceTime: targetOrder.commenceTime || '',
        sportKey: targetOrder.sportKey || ''
      };
      
      activateMatchMode(matchTargetOrder);
      
    } catch (error) {
      console.error('매치 배팅 모드 활성화 실패:', error);
      alert('매치 배팅 모드 활성화 중 오류가 발생했습니다.');
    }
  };

  const getSportDisplayName = (sportKey: string) => {
    const sportMap: { [key: string]: string } = {
      'basketball_nba': 'NBA',
      'baseball_mlb': 'MLB',
      'baseball_kbo': 'KBO',
      'americanfootball_nfl': 'NFL',
      'soccer_usa_mls': 'MLS',
      'soccer_korea_kleague1': 'K League',
      'soccer_japan_j_league': 'J League',
      'soccer_italy_serie_a': 'Serie A',
      'soccer_brazil_campeonato': 'Brasileirao',
      'soccer_argentina_primera_division': 'Primera Division',
      'soccer_china_superleague': 'Chinese Super League',
      'soccer_spain_primera_division': 'La Liga',
      'soccer_germany_bundesliga': 'Bundesliga'
    };
    return sportMap[sportKey] || sportKey;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 0) {
      return '경기 종료';
    } else if (diffInHours < 1) {
      const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
      return `${diffInMinutes}분 후`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 후`;
    } else {
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 남은 경기 시간 계산 (일/시간/분)
  const formatRemainingTime = (commenceTime: string) => {
    const now = new Date();
    const gameTime = new Date(commenceTime);
    const timeDiff = gameTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return '경기 시작됨';
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}일 ${hours}시간 ${minutes}분 후`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분 후`;
    } else {
      return `${minutes}분 후`;
    }
  };

  const formatAmount = (amount: number) => {
    if (!amount || isNaN(amount)) return '0';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '0';
    return amount.toLocaleString('ko-KR');
  };

  // 필터링 및 정렬
  const filteredOrders = orders
    .filter(order => {
      // 🆕 'open' 또는 'partially_matched' 상태의 주문만 포함
      if (order.status !== 'open' && order.status !== 'partially_matched') return false;
      
      // 🆕 매치 배팅 주문 제외 (matchedOrderId가 있는 주문은 매치 배팅 주문)
      if (order.matchedOrderId) return false;
      
      // 🆕 부분 매칭된 주문의 경우 남은 금액이 있어야 함
      if (order.status === 'partially_matched' && (!order.remainingAmount || order.remainingAmount <= 0)) return false;
      
      if (filter !== 'all' && order.type !== filter) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          order.homeTeam?.toLowerCase().includes(searchLower) ||
          order.awayTeam?.toLowerCase().includes(searchLower) ||
          order.selection?.toLowerCase().includes(searchLower) ||
          order.sportKey?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'odds':
          return b.odds - a.odds;
        case 'amount':
          return b.amount - a.amount;
        case 'time':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const stats = {
    total: orders.filter(o => o.status === 'open' || o.status === 'partially_matched').length,
    back: orders.filter(o => (o.status === 'open' || o.status === 'partially_matched') && o.type === 'back').length,
    lay: orders.filter(o => (o.status === 'open' || o.status === 'partially_matched') && o.type === 'lay').length,
    totalAmount: orders.filter(o => o.status === 'open' || o.status === 'partially_matched').reduce((sum, o) => sum + (o.displayAmount || o.amount), 0)
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-700">호가 데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg shadow-sm p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">전체 호가 현황</h1>
          <p className="text-gray-300 text-sm">실시간 거래소 주문 현황을 확인하세요</p>
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
            onClick={() => router.push('/exchange/live-odds')}
            className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
          >
            <span>📊</span>
            <span>실시간 호가 현황</span>
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg">
          <div className="text-lg font-bold">{stats.total}</div>
          <div className="text-xs">전체 주문</div>
        </div>
        <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg">
          <div className="text-lg font-bold">{stats.back}</div>
          <div className="text-xs">Back 주문</div>
        </div>
        <div className="bg-pink-50 border border-pink-200 text-pink-800 p-3 rounded-lg">
          <div className="text-lg font-bold">{stats.lay}</div>
          <div className="text-xs">Lay 주문</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg">
          <div className="text-lg font-bold">{orders.filter(o => o.partiallyFilled).length}</div>
          <div className="text-xs">부분 매칭</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 text-purple-800 p-3 rounded-lg">
          <div className="text-lg font-bold">{formatAmount(stats.totalAmount)}</div>
          <div className="text-xs">총 거래금액</div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="팀명, 리그명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'back' | 'lay')}
            className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체</option>
            <option value="back">Back만</option>
            <option value="lay">Lay만</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'odds' | 'amount')}
            className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="time">최신순</option>
            <option value="odds">배당순</option>
            <option value="amount">금액순</option>
          </select>
        </div>
      </div>

      {/* 주문 목록 */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">호가가 비어있습니다</h3>
          <p className="text-gray-600 text-sm mb-4">현재 등록된 주문이 없습니다.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-blue-700 text-sm">
              💡 <strong>팁:</strong> 익스체인지에서 Back/Lay 버튼을 클릭하여 첫 번째 주문을 등록해보세요!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              {/* 간소화된 정보 표시 */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">
                    {order.homeTeam || '홈팀'} vs {order.awayTeam || '원정팀'}
                  </div>
                  {/* 배팅 정보 강조 표시 */}
                  <div className="mt-2">
                    <div className="text-lg font-bold text-gray-900">
                      {order.selection || '선택 없음'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        order.type === 'back' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {order.type === 'back' ? '🎯 Back(Win)' : '📉 Lay(Loss)'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {order.commenceTime ? (
                          <>
                            {formatRemainingTime(order.commenceTime)} • {new Date(order.commenceTime).toLocaleString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit', 
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </>
                        ) : '시간 미정'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {order.odds ? order.odds.toFixed(2) : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">
                    베팅: {formatCurrency(order.displayAmount || order.amount)}원
                  </div>
                  {/* 🆕 부분 매칭 정보 표시 */}
                  {order.partiallyFilled && (
                    <div className="text-xs text-orange-600 mt-1">
                      🔄 부분 체결됨
                      <br />
                      원래: {formatCurrency(order.originalAmount || order.amount)}원
                      <br />
                      체결: {formatCurrency(order.filledAmount || 0)}원
                      <br />
                      남음: {formatCurrency(order.remainingAmount || 0)}원
                    </div>
                  )}
                  {/* 매칭 배팅자가 베팅해야 할 금액 표시 */}
                  <div className="text-sm text-orange-600 font-medium">
                    매칭 금액: {formatCurrency(order.type === 'back' ? 
                      Math.floor((order.displayAmount || order.amount) * (order.odds - 1)) : 
                      Math.floor(order.displayAmount || order.amount)
                    )}원
                  </div>
                  {/* 상태 표시 */}
                  <div className="text-xs text-gray-400 mt-1">
                    {order.status === 'open' ? 
                      (order.partiallyFilled ? '🔄 부분 체결 대기중' : '🔄 대기중') : 
                     order.status === 'partially_matched' ? '🔄 부분 체결 대기중' :
                     order.status === 'matched' ? '✅ 체결됨' : 
                     order.status === 'cancelled' ? '❌ 취소됨' : '📋 정산됨'}
                  </div>
                </div>
              </div>
              
              {/* 간단한 매칭 배팅 버튼 */}
              <div className="mt-3 flex gap-2">
                <button 
                  onClick={() => handleMatchBet(order.id)}
                  disabled={(order.status !== 'open' && order.status !== 'partially_matched') || order.userId === userId}
                  className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors text-white ${
                    (order.status === 'open' || order.status === 'partially_matched') && order.userId !== userId
                      ? order.type === 'back' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {(order.status === 'open' || order.status === 'partially_matched') && order.userId !== userId 
                    ? (order.type === 'back' ? 
                        `📉 Lay로 매칭 (${formatCurrency(Math.floor((order.displayAmount || order.amount) * (order.odds - 1)))}원)` : 
                        `🎯 Back으로 매칭 (${formatCurrency(Math.floor(order.displayAmount || order.amount))}원)`)
                    : order.userId === userId 
                      ? '내 주문' 
                      : '매칭 불가'}
                </button>
                <button 
                  onClick={() => setSelectedOrderDetail(order)}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  상세보기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 상세보기 모달 */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">주문 상세 정보</h3>
              <button 
                onClick={() => setSelectedOrderDetail(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 경기 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">🏈 경기 정보</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">홈팀:</span>
                    <span className="ml-2 font-medium">{selectedOrderDetail.homeTeam || '홈팀'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">원정팀:</span>
                    <span className="ml-2 font-medium">{selectedOrderDetail.awayTeam || '원정팀'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">선택:</span>
                    <span className="ml-2 font-medium">{selectedOrderDetail.selection || '선택 없음'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">경기시간:</span>
                    <span className="ml-2 font-medium">
                      {selectedOrderDetail.commenceTime ? formatGameTime(selectedOrderDetail.commenceTime) : '시간 미정'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 주문 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">📋 주문 정보</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">타입:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      selectedOrderDetail.type === 'back' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {selectedOrderDetail.type === 'back' ? 'Back (이길 것)' : 'Lay (질 것)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">배당률:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {selectedOrderDetail.odds ? selectedOrderDetail.odds.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">베팅 금액:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedOrderDetail.displayAmount || selectedOrderDetail.amount)}원</span>
                  </div>
                  {/* 🆕 부분 매칭 정보 표시 */}
                  {selectedOrderDetail.partiallyFilled && (
                    <>
                      <div>
                        <span className="text-gray-600">원래 금액:</span>
                        <span className="ml-2 font-medium text-gray-600">{formatCurrency(selectedOrderDetail.originalAmount || selectedOrderDetail.amount)}원</span>
                      </div>
                      <div>
                        <span className="text-gray-600">체결된 금액:</span>
                        <span className="ml-2 font-medium text-green-600">{formatCurrency(selectedOrderDetail.filledAmount || 0)}원</span>
                      </div>
                      <div>
                        <span className="text-gray-600">남은 금액:</span>
                        <span className="ml-2 font-medium text-orange-600">{formatCurrency(selectedOrderDetail.remainingAmount || 0)}원</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-gray-600">매칭 금액:</span>
                    <span className="ml-2 font-medium text-orange-600">
                      {formatCurrency(selectedOrderDetail.type === 'back' ? 
                        Math.floor((selectedOrderDetail.displayAmount || selectedOrderDetail.amount) * (selectedOrderDetail.odds - 1)) : 
                        Math.floor(selectedOrderDetail.displayAmount || selectedOrderDetail.amount)
                      )}원
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">승리 시 수익:</span>
                    <span className="ml-2 font-medium text-green-600">
                      +{formatCurrency(selectedOrderDetail.type === 'back' ? selectedOrderDetail.amount : selectedOrderDetail.amount * (selectedOrderDetail.odds - 1))}원
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">패배 시 손실:</span>
                    <span className="ml-2 font-medium text-red-600">
                      -{formatCurrency(selectedOrderDetail.type === 'back' ? selectedOrderDetail.amount * (selectedOrderDetail.odds - 1) : selectedOrderDetail.amount)}원
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">상태:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      selectedOrderDetail.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                      selectedOrderDetail.status === 'matched' ? 'bg-green-100 text-green-800' :
                      selectedOrderDetail.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedOrderDetail.status === 'open' ? '대기중' :
                       selectedOrderDetail.status === 'matched' ? '체결됨' :
                       selectedOrderDetail.status === 'cancelled' ? '취소됨' :
                       '정산됨'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 추가 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">ℹ️ 추가 정보</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">주문 ID:</span>
                    <span className="ml-2 font-mono text-xs">{selectedOrderDetail.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">생성시간:</span>
                    <span className="ml-2 font-medium">
                      {formatDateTime(selectedOrderDetail.createdAt)}
                    </span>
                  </div>
                  {selectedOrderDetail.sportKey && (
                    <div>
                      <span className="text-gray-600">스포츠:</span>
                      <span className="ml-2 font-medium">
                        {getSportDisplayName(selectedOrderDetail.sportKey)}
                      </span>
                    </div>
                  )}
                  {selectedOrderDetail.backOdds && (
                    <div>
                      <span className="text-gray-600">참고 Back:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {selectedOrderDetail.backOdds.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedOrderDetail.layOdds && (
                    <div>
                      <span className="text-gray-600">참고 Lay:</span>
                      <span className="ml-2 font-medium text-pink-600">
                        {selectedOrderDetail.layOdds.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default OrderbookPage; 