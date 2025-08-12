import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useExchange } from '../../hooks/useExchange';
import { API_CONFIG, buildApiUrl } from '../../config/apiConfig';

interface Order {
  id: string;
  gameId: string;
  userId: string;
  type: 'back' | 'lay';
  odds: number;
  amount: number;
  status: 'open' | 'matched' | 'cancelled' | 'settled';
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
}

const OrderbookPage: React.FC = () => {
  const router = useRouter();
  const { userId } = useAuth();
  const { fetchAllOpenOrders } = useExchange();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'back' | 'lay'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'odds' | 'amount'>('time');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 매치 배팅 상태
  const [matchBetAmount, setMatchBetAmount] = useState<{ [key: string]: number }>({});
  const [matchBetOdds, setMatchBetOdds] = useState<{ [key: string]: number }>({});
  const [matchingOrder, setMatchingOrder] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const allOrders = await fetchAllOpenOrders();
        console.log('🔍 원본 주문 데이터:', allOrders);
        
        // 백엔드에서 이미 올바른 구조로 반환하므로 직접 사용
        const convertedOrders: Order[] = allOrders.map(order => ({
          id: order.id.toString(),
          gameId: order.gameId,
          userId: order.userId.toString(),
          type: order.side,
          odds: order.price,
          amount: order.amount,
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
          oddsUpdatedAt: order.oddsUpdatedAt
        }));
        
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
    return () => clearInterval(interval);
  }, [fetchAllOpenOrders]);

  // 매치 배팅 처리 함수
  const handleMatchBet = async (orderId: string) => {
    const amount = matchBetAmount[orderId];
    const odds = matchBetOdds[orderId];
    
    if (!amount || !odds) {
      alert('베팅 금액과 배당률을 모두 입력해주세요.');
      return;
    }
    
    if (amount < 1000) {
      alert('최소 베팅 금액은 1,000원입니다.');
      return;
    }
    
    if (odds < 1.01) {
      alert('배당률은 1.01 이상이어야 합니다.');
      return;
    }
    
    try {
      // TODO: 실제 매치 배팅 API 호출
      console.log('매치 배팅 시도:', { orderId, amount, odds });
      alert('매치 배팅이 성공적으로 처리되었습니다!');
      
      // 입력 필드 초기화
      setMatchBetAmount(prev => ({ ...prev, [orderId]: 0 }));
      setMatchBetOdds(prev => ({ ...prev, [orderId]: 0 }));
      setMatchingOrder(null);
      
      // 주문 목록 새로고침
      const allOrders = await fetchAllOpenOrders();
      setOrders(allOrders.map(order => ({
        id: order.id.toString(),
        gameId: order.gameId,
        userId: order.userId.toString(),
        type: order.side,
        odds: order.price,
        amount: order.amount,
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
        oddsUpdatedAt: order.oddsUpdatedAt
      })));
      
    } catch (error) {
      console.error('매치 배팅 실패:', error);
      alert('매치 배팅 처리 중 오류가 발생했습니다.');
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
    total: orders.length,
    back: orders.filter(o => o.type === 'back').length,
    lay: orders.filter(o => o.type === 'lay').length,
    totalAmount: orders.reduce((sum, o) => sum + o.amount, 0)
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">전체 호가 현황</h1>
          <p className="text-gray-600 text-sm">실시간 거래소 주문 현황을 확인하세요</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
        >
          ← 뒤로가기
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
            >
              {/* 헤더: 스포츠/타입/시간 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    {getSportDisplayName(order.sportKey || '')}
                  </span>
                  <span className={`px-3 py-1 text-white text-sm font-bold rounded ${
                    order.type === 'back' ? 'bg-green-600' : 'bg-pink-600'
                  }`}>
                    {order.type === 'back' ? '🎯 Back (이길 것)' : '📉 Lay (질 것)'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(order.createdAt)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {order.odds ? order.odds.toFixed(2) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    호가 배당률
                  </div>
                </div>
              </div>

              {/* 경기 정보 - 더 명확하게 표시 */}
              <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xl font-bold text-gray-800 mb-2 text-center">
                  🏈 {order.homeTeam || '홈팀'} vs {order.awayTeam || '원정팀'}
                  {!order.homeTeam && !order.awayTeam && (
                    <div className="text-sm text-red-600 mt-1">
                      ⚠️ 경기 정보 없음 (Game ID: {order.gameId})
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                  <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-800 font-medium">
                    🏆 {order.selection || '선택 없음'}
                  </span>
                  <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-medium">
                    ⏰ {order.commenceTime ? formatGameTime(order.commenceTime) : '시간 미정'}
                  </span>
                </div>
              </div>

              {/* 금액 정보 - 더 명확하게 표시 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1 font-medium">💰 호가 금액</div>
                  <div className="text-lg font-bold text-gray-800">
                    {formatCurrency(order.amount)}원
                  </div>
                </div>
                {order.stakeAmount && (
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1 font-medium">🎯 베팅 금액</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatCurrency(order.stakeAmount)}원
                    </div>
                  </div>
                )}
                {order.potentialProfit && (
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1 font-medium">💵 예상 수익</div>
                    <div className="text-lg font-bold text-green-600">
                      +{formatCurrency(order.potentialProfit)}원
                    </div>
                  </div>
                )}
              </div>

              {/* 스포츠북 배당율 정보 - 더 명확하게 표시 */}
              {(order.backOdds || order.layOdds) && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <div className="text-sm text-blue-700 mb-2 font-semibold flex items-center gap-2">
                    📊 스포츠북 참고 배당율 
                    <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                      {order.oddsSource || 'OddsAPI'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {order.backOdds && (
                      <span className="bg-green-100 px-3 py-2 rounded text-green-700 font-medium">
                        🎯 Back: <strong className="text-lg">{order.backOdds.toFixed(2)}</strong>
                      </span>
                    )}
                    {order.layOdds && (
                      <span className="bg-pink-100 px-3 py-2 rounded text-pink-700 font-medium">
                        📉 Lay: <strong className="text-lg">{order.layOdds.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                  {order.oddsUpdatedAt && (
                    <div className="text-xs text-blue-600 mt-2 font-medium">
                      🔄 업데이트: {formatDateTime(order.oddsUpdatedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* 상태 표시 - 더 명확하게 표시 */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 font-medium">
                  🆔 주문 ID: {order.id}
                </div>
                <div className={`px-3 py-2 rounded text-sm font-bold ${
                  order.status === 'open' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                  order.status === 'matched' ? 'bg-green-100 text-green-800 border border-green-300' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-300' :
                  'bg-gray-100 text-gray-800 border border-gray-300'
                }`}>
                  {order.status === 'open' ? '🔄 대기중' :
                   order.status === 'matched' ? '✅ 체결됨' :
                   order.status === 'cancelled' ? '❌ 취소됨' :
                   '📋 정산됨'}
                </div>
              </div>

              {/* 매치 배팅 UI - 오픈 상태의 주문에만 표시 */}
              {order.status === 'open' && (
                <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                  <div className="text-center mb-3">
                    <h4 className="text-lg font-bold text-gray-800 mb-2">
                      🎯 이 주문과 매치하시겠습니까?
                    </h4>
                    <p className="text-sm text-gray-600">
                      {order.type === 'back' ? 'Lay' : 'Back'} 주문으로 상대방의 호가를 받아주세요
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 매치 배팅 폼 */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          💰 베팅 금액
                        </label>
                        <input
                          type="number"
                          placeholder="베팅할 금액을 입력하세요"
                          value={matchBetAmount[order.id] || ''}
                          onChange={(e) => setMatchBetAmount(prev => ({ 
                            ...prev, 
                            [order.id]: Number(e.target.value) || 0 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1000"
                          step="1000"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🎯 배당률
                        </label>
                        <input
                          type="number"
                          placeholder="원하는 배당률"
                          value={matchBetOdds[order.id] || ''}
                          onChange={(e) => setMatchBetOdds(prev => ({ 
                            ...prev, 
                            [order.id]: Number(e.target.value) || 0 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          step="0.01"
                          min="1.01"
                        />
                      </div>
                      
                      <button
                        onClick={() => handleMatchBet(order.id)}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors ${
                          order.type === 'back' 
                            ? 'bg-pink-600 hover:bg-pink-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {order.type === 'back' ? '📉 Lay 주문' : '🎯 Back 주문'}
                      </button>
                    </div>
                    
                    {/* 매치 정보 요약 */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h5 className="font-bold text-gray-800 mb-3 text-center">📊 매치 정보</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">상대방 호가:</span>
                          <span className="font-medium">{order.odds.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">상대방 금액:</span>
                          <span className="font-medium">{formatCurrency(order.amount)}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">상대방 타입:</span>
                          <span className={`font-medium px-2 py-1 rounded text-xs ${
                            order.type === 'back' ? 'bg-green-100 text-green-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {order.type === 'back' ? 'Back' : 'Lay'}
                          </span>
                        </div>
                        <hr className="my-2" />
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">매치 시 즉시 체결됩니다</div>
                          <div className="text-xs text-blue-600 font-medium">
                            💡 수수료는 거래 금액의 2%입니다
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderbookPage; 