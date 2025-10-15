import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useExchange } from '../../hooks/useExchange';
import { useExchangeContext, MatchTargetOrder } from '../../contexts/ExchangeContext';
import { API_CONFIG, buildApiUrl } from '../../config/apiConfig';
import { applyExchangeReturnRate } from '../../utils/oddsCalculator';

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
  // 🆕 멀티배팅 필드
  isMultibet?: boolean;
  totalOdds?: number;
  selectionCount?: number;
  selectionDetails?: any;
  potentialWinnings?: number;
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
  
  // 🆕 URL 파라미터에서 검색어 읽어오기
  useEffect(() => {
    if (router.query.search) {
      const searchFromUrl = decodeURIComponent(router.query.search as string);
      setSearchTerm(searchFromUrl);
    }
  }, [router.query.search]);
  
  // 매치 배팅 상태
  const [matchBetAmount, setMatchBetAmount] = useState<{ [key: string]: number }>({});
  const [matchBetOdds, setMatchBetOdds] = useState<{ [key: string]: number }>({});
  const [matchingOrder, setMatchingOrder] = useState<string | null>(null);
  
  // 상세보기 상태
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // 🆕 매칭 금액 및 비율 계산 함수
  const calculateMatchingInfo = (order: ExchangeOrder) => {
    // ✅ 매칭 금액 기준으로 계산 (displayAmount 기준!)
    const totalMatchAmount = order.displayAmount || order.amount || 0; // 전체 매칭 금액
    const remainingMatchAmount = order.type === 'back' 
      ? Math.floor((order.remainingAmount || 0) * ((order.odds || 1) - 1)) // Back: LAY 담보금
      : (order.remainingAmount || 0); // Lay: Back 배팅금
    const matchedAmount = totalMatchAmount - remainingMatchAmount;
    const matchPercentage = totalMatchAmount > 0 ? Math.round((matchedAmount / totalMatchAmount) * 100) : 0;
    
    return {
      totalAmount: totalMatchAmount, // 전체 매칭 금액
      matchedAmount: matchedAmount,
      remainingAmount: remainingMatchAmount,
      matchPercentage: matchPercentage
    };
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const allOrders = await fetchAllOpenOrders();
        console.log('🔍 원본 주문 데이터:', allOrders);
        console.log('🔍 원본 주문 JSON:', JSON.stringify(allOrders, null, 2));
        
        // 🆕 부분 매칭 정보를 포함한 변환
        const convertedOrders: Order[] = allOrders.map(order => {
          console.log('🔍 개별 주문 변환 (상세):', {
            id: order.id,
            side: order.side,
            amount: order.amount,
            displayAmount: order.displayAmount,
            status: order.status,
            price: order.price,
            remainingAmount: order.remainingAmount,
            '계산 확인': order.side === 'back' ? `${order.amount} × (${order.price} - 1) = ${order.amount * (order.price - 1)}` : '-'
          });
          
          return {
            id: order.id.toString(),
            gameId: order.gameId,
            userId: order.userId.toString(),
            type: order.side,
            odds: order.isMultibet ? (order.totalOdds || order.price) : order.price, // ✅ 멀티베팅 배당률 수정
            amount: order.amount, // ✅ 원본 배팅금액 (카드 상단 표시용)
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
            displayAmount: order.displayAmount, // ✅ 매칭 금액 (버튼 표시용)
            originalAmount: order.originalAmount || order.amount,
            filledAmount: order.filledAmount || 0,
            remainingAmount: order.remainingAmount || order.amount,
            partiallyFilled: order.partiallyFilled || false,
            // 🆕 매치 배팅 구분 필드
            matchedOrderId: order.matchedOrderId || null,
            // 🆕 멀티배팅 필드 매핑
            isMultibet: order.isMultibet || false,
            totalOdds: order.totalOdds ? Number(order.totalOdds) : undefined,
            selectionCount: order.selectionCount,
            selectionDetails: order.selectionDetails,
            potentialWinnings: order.potentialWinnings ? Number(order.potentialWinnings) : undefined
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
      console.log('🔄 [Orderbook] exchangeOrderPlaced 이벤트 감지 - 오더북 즉시 갱신');
      loadOrders();
    };
    
    window.addEventListener('exchangeOrderPlaced', handleOrderPlaced);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
    };
  }, [fetchAllOpenOrders]);

  // 매치 배팅 처리 함수 - Exchange 홈으로 리다이렉트하여 사이드바 주문하기 UI 사용
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
      
      // 매칭 모드 활성화
      const matchTargetOrder: MatchTargetOrder = {
        id: targetOrder.id.toString(),
        type: targetOrder.type as 'back' | 'lay',
        odds: targetOrder.odds,
        amount: targetOrder.amount,
        selection: targetOrder.selection || (targetOrder.isMultibet ? '멀티배팅' : ''),
        homeTeam: targetOrder.homeTeam || '',
        awayTeam: targetOrder.awayTeam || '',
        gameId: targetOrder.gameId,
        commenceTime: targetOrder.commenceTime || '',
        sportKey: targetOrder.sportKey || '',
        // 🆕 멀티배팅 정보 추가
        isMultibet: targetOrder.isMultibet || false,
        selectionDetails: targetOrder.selectionDetails || []
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

  // 🆕 멀티배팅 총 배당 계산(백엔드 값이 없을 때 레그 배당 곱으로 보조 계산) - 환수율 적용 제거
  const computeTotalOdds = (order: Order) => {
    let totalOdds;
    if (order.totalOdds) {
      totalOdds = Number(order.totalOdds);
    } else {
      const legs = normalizeSelectionDetails(order.selectionDetails);
      if (legs.length > 0) {
        totalOdds = legs.reduce((prod: number, leg: any) => {
          const legOdds = Number(leg?.odds);
          return prod * (isNaN(legOdds) ? 1 : legOdds);
        }, 1);
      } else {
        totalOdds = order.odds || 0;
      }
    }
    
    // ✅ 환수율 적용 제거 (백엔드에서 이미 적용됨)
    return totalOdds;
  };

  // 🆕 매칭 시 사용자가 실제로 베팅해야 하는 금액 계산
  const computeMatchingAmount = (order: Order) => {
    const baseAmount = Math.floor(order.displayAmount || order.amount || 0);
    const odds = order.odds || computeTotalOdds(order) || 0;
    return order.type === 'back'
      ? Math.floor(baseAmount * Math.max(odds - 1, 0))
      : baseAmount;
  };

  // 🆕 선택 상세를 표준 배열로 정규화 (문자열/객체 케이스 포함)
  function normalizeSelectionDetails(details: any): any[] {
    try {
      const raw = typeof details === 'string' ? JSON.parse(details) : details;
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.legs)) return raw.legs;
      if (Array.isArray(raw?.selections)) return raw.selections;
      return [];
    } catch {
      return [];
    }
  }

  // 필터링 및 정렬
  const filteredOrders = orders
    .filter(order => {
      // ✅ 'open', 'partially_matched', 'matched', 'active' 상태의 주문만 포함 (정산 안 된 주문)
      const validStatuses = ['open', 'partially_matched', 'matched', 'active'];
      if (!validStatuses.includes(order.status)) return false;
      
      // 🆕 매치 배팅 주문 제외 (부분 매칭된 원본 주문은 표시해야 함!)
      // matchedOrderId가 있어도 remainingAmount가 있으면 부분 매칭된 원본 주문
      if (order.matchedOrderId && (!order.remainingAmount || order.remainingAmount <= 0)) {
        return false;
      }
      
      // 🆕 남은 금액이 0인 주문 제외
      if (!order.remainingAmount || order.remainingAmount <= 0) return false;
      
      if (filter !== 'all' && order.type !== filter) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        
        // 🆕 개선된 검색: 공백으로 구분된 각 단어를 개별 검색
        const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
        
        // 검색 대상 텍스트들을 하나의 문자열로 결합
        const getSearchableText = (homeTeam?: string, awayTeam?: string, selection?: string, sportKey?: string) => {
          return [homeTeam, awayTeam, selection, sportKey]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        };
        
        // 🆕 멀티배팅 주문의 경우 selectionDetails.selections 내의 모든 경기 검색
        if (order.isMultibet && order.selectionDetails?.selections) {
          return order.selectionDetails.selections.some((selection: any) => {
            const searchableText = getSearchableText(
              selection.homeTeam,
              selection.awayTeam,
              selection.team || selection.selection,
              ''
            );
            return searchWords.every(word => searchableText.includes(word));
          });
        }
        
        // 일반 주문의 경우
        const searchableText = getSearchableText(
          order.homeTeam,
          order.awayTeam,
          order.selection,
          order.sportKey
        );
        
        return searchWords.every(word => searchableText.includes(word));
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
    total: orders.filter(o => ['open', 'partially_matched', 'matched', 'active'].includes(o.status)).length,
    back: orders.filter(o => ['open', 'partially_matched', 'matched', 'active'].includes(o.status) && o.type === 'back').length,
    lay: orders.filter(o => ['open', 'partially_matched', 'matched', 'active'].includes(o.status) && o.type === 'lay').length,
    totalAmount: orders.filter(o => ['open', 'partially_matched', 'matched', 'active'].includes(o.status)).reduce((sum, o) => sum + (o.displayAmount || o.amount), 0)
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
          <h1 className="text-2xl font-bold text-white mb-1">📋 매치</h1>
          <p className="text-gray-300 text-sm">실시간 거래소 주문 현황을 확인하세요</p>
        </div>
        {/* 3개 탭 네비게이션 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push('/exchange')}
            className="px-4 py-2 bg-blue-700 text-white text-sm rounded-lg font-medium hover:bg-blue-500 hover:shadow-lg transition-all flex items-center space-x-2 opacity-70 hover:opacity-100"
          >
            <span>🏠</span>
            <span>배팅</span>
          </button>
          <button
            onClick={() => router.push('/exchange/live-odds')}
            className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg font-medium hover:bg-green-500 hover:shadow-lg transition-all flex items-center space-x-2 opacity-70 hover:opacity-100"
          >
            <span>📊</span>
            <span>주문현황</span>
          </button>
          <button
            disabled
            className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg font-medium shadow-lg cursor-not-allowed flex items-center space-x-2 ring-2 ring-pink-400"
          >
            <span>📋</span>
            <span>매치</span>
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
              {/* 카드 본문: 멀티배팅 전용 UI vs 일반 주문 UI */}
              {order.isMultibet ? (
                <>
                  {/* 헤더 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-200 text-yellow-900">
                          🎯 멀티배팅 #{order.id}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {order.status === 'open' || order.status === 'partially_matched' ? '진행중' : order.status === 'matched' ? '체결됨' : order.status === 'cancelled' ? '취소됨' : '정산됨'}
                        </span>
                      </div>
                      {/* 주문시간 표시 */}
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        <span>📅</span>
                        <span className="text-gray-500">주문시간:</span>
                        <span className="text-gray-700">{order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">주문금액:</div>
                      <div className="text-lg font-semibold text-gray-700">{formatCurrency(order.amount)}원</div>
                      <div className="text-sm text-gray-500 mt-1">{computeTotalOdds(order).toFixed(3)}배당</div>
                    </div>
                  </div>

                  {/* 요약 */}
                  <div className="mt-3 text-gray-800 font-medium">
                    {(() => {
                      const legs = normalizeSelectionDetails(order.selectionDetails);
                      const count = order.selectionCount || legs.length;
                      return (
                        <>🎯 {count}개 선택 ・ 총 배당: {computeTotalOdds(order).toFixed(3)}</>
                      );
                    })()}
                  </div>


                  {/* 레그 리스트 */}
                  <div className="mt-3 space-y-3">
                    {normalizeSelectionDetails(order.selectionDetails).map((leg: any, idx: number) => (
                      <div key={idx} className="pl-4 border-l-4 border-yellow-400">
                        <div className="font-semibold text-gray-900">{leg?.teamName || leg?.selection || `선택 ${idx + 1}`}</div>
                        <div className="text-sm text-gray-600">
                          {(leg?.homeTeam && leg?.awayTeam) ? `${leg.homeTeam} vs ${leg.awayTeam}` : (leg?.match || '')}
                          {leg?.odds ? ` • @${Number(leg.odds).toFixed(3)}` : ''}
                        </div>
                        {/* 각 경기의 시간 표시 */}
                        {leg?.commenceTime && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <span>⏰</span>
                            <span>경기시간:</span>
                            <span>{new Date(leg.commenceTime).toLocaleString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 버튼들 */}
                  <div className="mt-4 flex gap-2 items-center">
                    <button
                      onClick={() => handleMatchBet(order.id)}
                      disabled={(order.status !== 'open' && order.status !== 'partially_matched') || order.userId === userId}
                      className={`flex-1 py-3 px-3 rounded text-sm font-semibold transition-colors text-white ${
                        (order.status === 'open' || order.status === 'partially_matched') && order.userId !== userId
                          ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {(() => {
                        const matchInfo = calculateMatchingInfo(order);
                        // ✅ 남은 매칭 금액 = displayAmount
                        const remainingMatchAmt = formatCurrency(order.displayAmount || order.amount);
                        // ✅ 전체 매칭 금액 = amount × (odds - 1) for Back, amount for Lay
                        const totalMatchAmt = order.type === 'back' 
                          ? formatCurrency(Math.floor(order.amount * (order.odds - 1)))
                          : formatCurrency(order.amount);
                        const matchPercentage = matchInfo.matchPercentage;
                        
                        return order.type === 'back'
                          ? `📉 Lay로 매칭 (${remainingMatchAmt}원, 총 ${totalMatchAmt}원 중 ${100 - matchPercentage}%)`
                          : `🎯 Back으로 매칭 (${remainingMatchAmt}원, 총 ${totalMatchAmt}원 중 ${100 - matchPercentage}%)`;
                      })()}
                    </button>
                    <button
                      onClick={() => setSelectedOrderDetail(order)}
                      className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      상세보기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* 일반 주문 카드 */}
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
                        {order.odds ? applyExchangeReturnRate(order.odds, [order.odds]).toFixed(3) : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        베팅: {formatCurrency(order.amount)}원
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
                      {/* 매칭 금액 계산 */}
                      <div className="text-sm text-orange-600 font-medium">
                        매칭 금액: {formatCurrency(order.displayAmount || (order.type === 'back' ? 
                          Math.floor(order.remainingAmount * (order.odds - 1)) : 
                          order.remainingAmount)
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
                          ? order.type === 'back' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {(order.status === 'open' || order.status === 'partially_matched') && order.userId !== userId 
                        ? (order.type === 'back' ? 
                            `📉 Lay로 매칭 (${formatCurrency(order.displayAmount || Math.floor(order.remainingAmount * (order.odds - 1)))}원)` : 
                            `🎯 Back으로 매칭 (${formatCurrency(order.displayAmount || order.remainingAmount)}원)`)
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
                </>
              )}
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
                {/* 🆕 멀티배팅 요약 */}
                {selectedOrderDetail.isMultibet && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-200 text-yellow-900">
                      멀티 x{selectedOrderDetail.selectionCount || 0}
                    </span>
                    {selectedOrderDetail.totalOdds && (
                      <span className="text-xs text-yellow-700">총배당 {Number(selectedOrderDetail.totalOdds).toFixed(3)}</span>
                    )}
                    {selectedOrderDetail.potentialWinnings !== undefined && (
                      <span className="text-xs text-green-700">예상당첨 {formatCurrency(Math.floor(selectedOrderDetail.potentialWinnings))}원</span>
                    )}
                  </div>
                )}
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
                      {selectedOrderDetail.odds ? applyExchangeReturnRate(selectedOrderDetail.odds, [selectedOrderDetail.odds]).toFixed(3) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">베팅 금액:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedOrderDetail.amount)}원</span>
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
                      {formatCurrency(selectedOrderDetail.displayAmount || (selectedOrderDetail.type === 'back' ? 
                        Math.floor(selectedOrderDetail.remainingAmount * (selectedOrderDetail.odds - 1)) : 
                        selectedOrderDetail.remainingAmount)
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
              
              {/* 🆕 멀티배팅 선택 상세 */}
              {selectedOrderDetail.isMultibet && selectedOrderDetail.selectionDetails && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">🧩 멀티배팅 레그</h4>
                  <div className="space-y-3 text-sm">
                    {normalizeSelectionDetails(selectedOrderDetail.selectionDetails).map((leg: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white border border-gray-200 rounded">
                        <div className="font-medium text-gray-800 mb-1">{leg.teamName || leg.selection || `선택 ${idx + 1}`}</div>
                        <div className="text-xs text-gray-600">
                          {(leg?.homeTeam && leg?.awayTeam) ? `${leg.homeTeam} vs ${leg.awayTeam}` : (leg?.match || '')}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-gray-500">
                            {leg.marketType || leg.market} {leg.point ? `(${leg.point})` : ''}
                          </div>
                          <div className="text-xs text-blue-600 font-semibold">@ {leg.odds ? Number(leg.odds).toFixed(3) : '-'}</div>
                        </div>
                        {/* 🆕 각 경기의 시간 표시 */}
                        {leg?.commenceTime && (
                          <div className="text-xs text-gray-500 mt-2">
                            ⏰ {formatRemainingTime(leg.commenceTime)} • {new Date(leg.commenceTime).toLocaleString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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