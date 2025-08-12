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
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              {/* 간소화된 정보 표시 */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {order.homeTeam || '홈팀'} vs {order.awayTeam || '원정팀'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.selection || '선택 없음'} • {order.commenceTime ? formatGameTime(order.commenceTime) : '시간 미정'}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {order.odds ? order.odds.toFixed(2) : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(order.amount)}원
                  </div>
                </div>
              </div>
              
              {/* 간단한 매칭 배팅 버튼 */}
              <div className="mt-3 flex gap-2">
                <button className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-green-700">
                  매칭 배팅
                </button>
                <button className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm">
                  상세보기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
 
export default OrderbookPage; 
export default OrderbookPage; 