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

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const allOrders = await fetchAllOpenOrders();
        // ExchangeOrder를 Order 타입으로 변환
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

  const getSportDisplayName = (sportKey: string) => {
    const sportMap: { [key: string]: string } = {
      'basketball_nba': '🏀 NBA',
      'baseball_mlb': '⚾ MLB',
      'baseball_kbo': '⚾ KBO',
      'americanfootball_nfl': '🏈 NFL',
      'soccer_usa_mls': '⚽ MLS',
      'soccer_korea_kleague1': '⚽ K League',
      'soccer_japan_j_league': '⚽ J League',
      'soccer_italy_serie_a': '⚽ Serie A',
      'soccer_brazil_campeonato': '⚽ Brasileirao',
      'soccer_argentina_primera_division': '⚽ Primera Division',
      'soccer_china_superleague': '⚽ Chinese Super League',
      'soccer_spain_primera_division': '⚽ La Liga',
      'soccer_germany_bundesliga': '⚽ Bundesliga'
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
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  const formatCurrency = (amount: number) => {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-xl font-semibold text-gray-700">호가 데이터를 불러오는 중...</div>
              <div className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 전체 호가 현황</h1>
              <p className="text-gray-600 text-lg">실시간 거래소 주문 현황을 확인하세요</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-600 text-white text-lg rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              ← 뒤로가기
            </button>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-90">전체 주문</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{stats.back}</div>
              <div className="text-sm opacity-90">Back 주문</div>
            </div>
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{stats.lay}</div>
              <div className="text-sm opacity-90">Lay 주문</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{formatAmount(stats.totalAmount)}</div>
              <div className="text-sm opacity-90">총 거래금액</div>
            </div>
          </div>

          {/* 필터 및 검색 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="팀명, 리그명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'back' | 'lay')}
                className="px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체</option>
                <option value="back">Back만</option>
                <option value="lay">Lay만</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'time' | 'odds' | 'amount')}
                className="px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="time">최신순</option>
                <option value="odds">배당순</option>
                <option value="amount">금액순</option>
              </select>
            </div>
          </div>
        </div>

        {/* 주문 목록 */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">호가가 비어있습니다</h3>
            <p className="text-gray-600 text-lg mb-6">현재 등록된 주문이 없습니다.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-blue-700 text-lg">
                💡 <strong>팁:</strong> 익스체인지에서 Back/Lay 버튼을 클릭하여 첫 번째 주문을 등록해보세요!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow"
              >
                {/* 헤더: 스포츠/타입/시간 */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-lg font-semibold rounded-full">
                      {getSportDisplayName(order.sportKey || '')}
                    </span>
                    <span className={`px-3 py-1 text-white text-lg font-semibold rounded-full ${
                      order.type === 'back' ? 'bg-green-500' : 'bg-pink-500'
                    }`}>
                      {order.type === 'back' ? '📈 Back' : '📉 Lay'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {order.odds.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      배당률
                    </div>
                  </div>
                </div>

                {/* 경기 정보 */}
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-800 mb-2">
                    {order.homeTeam} vs {order.awayTeam}
                  </div>
                  <div className="flex items-center gap-4 text-lg text-gray-600">
                    <span>🏆 {order.selection}</span>
                    <span>⏰ {order.commenceTime ? formatGameTime(order.commenceTime) : '시간 미정'}</span>
                  </div>
                </div>

                {/* 금액 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">호가 금액</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {formatCurrency(order.amount)}원
                    </div>
                  </div>
                  {order.stakeAmount && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">베팅 금액</div>
                      <div className="text-2xl font-bold text-gray-800">
                        {formatCurrency(order.stakeAmount)}원
                      </div>
                    </div>
                  )}
                  {order.potentialProfit && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">예상 수익</div>
                      <div className="text-2xl font-bold text-green-600">
                        +{formatCurrency(order.potentialProfit)}원
                      </div>
                    </div>
                  )}
                </div>

                {/* 스포츠북 배당율 정보 */}
                {(order.backOdds || order.layOdds) && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="text-sm text-blue-600 mb-2 font-semibold">
                      📊 스포츠북 참고 배당율 ({order.oddsSource})
                    </div>
                    <div className="flex gap-4 text-lg">
                      {order.backOdds && (
                        <span className="text-green-600">
                          Back: <strong>{order.backOdds.toFixed(2)}</strong>
                        </span>
                      )}
                      {order.layOdds && (
                        <span className="text-pink-600">
                          Lay: <strong>{order.layOdds.toFixed(2)}</strong>
                        </span>
                      )}
                    </div>
                    {order.oddsUpdatedAt && (
                      <div className="text-xs text-blue-500 mt-1">
                        업데이트: {formatDateTime(order.oddsUpdatedAt)}
                      </div>
                    )}
                  </div>
                )}

                {/* 상태 표시 */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    주문 ID: {order.id}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    order.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'matched' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'open' ? '🔄 대기중' :
                     order.status === 'matched' ? '✅ 체결됨' :
                     order.status === 'cancelled' ? '❌ 취소됨' :
                     '📋 정산됨'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderbookPage; 