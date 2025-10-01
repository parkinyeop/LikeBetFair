import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';

export type ExchangeOrder = {
  id: number;
  userId: number;
  gameId: string;
  market: string;
  line: number;
  side: 'back' | 'lay';
  price: number;
  amount: number;
  selection?: string; // 선택한 팀/선수명
  status: 'open' | 'partially_matched' | 'matched' | 'settled' | 'cancelled' | 'active';
  matchedOrderId?: number;
  createdAt: string;
  updatedAt: string;
  homeTeam?: string;
  awayTeam?: string;
  commenceTime?: string;
  sportKey?: string; // 스포츠 키 추가
  backOdds?: number;
  layOdds?: number;
  stakeAmount?: number; // 베팅 금액
  potentialProfit?: number; // 예상 수익
  oddsSource?: string; // 배당율 출처
  oddsUpdatedAt?: string; // 배당율 업데이트 시간
  // 🆕 부분 매칭 필드들 추가
  originalAmount?: number; // 최초 주문 금액
  remainingAmount?: number; // 남은 금액
  filledAmount?: number; // 체결된 금액
  partiallyFilled?: boolean; // 부분 체결 여부
  displayAmount?: number; // 화면에 표시할 금액
  // 🆕 멀티배팅 필드들 추가
  isMultibet?: boolean;
  totalOdds?: number;
  selectionCount?: number;
  selectionDetails?: any;
  potentialWinnings?: number;
};

export interface ExchangeBalance {
  balance: number;
}

export interface OrderForm {
  side: 'back' | 'lay';
  price: number;
  amount: number;
}

export interface SelectedBet {
  team: string;
  price: number;
  type: 'back' | 'lay';
  gameId?: string;
  market?: string;
  line?: number;
  homeTeam?: string; // 추가
  awayTeam?: string; // 추가
  commenceTime?: string; // 추가
}

export const useExchange = () => {
  const { token, balance, setBalance, logout } = useAuth();
  const { selectedBet, setSelectedBet } = useExchangeContext();
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // selectedBet 상태 변경 로그
  const setSelectedBetWithLog = (bet: SelectedBet | null) => {
    console.log('setSelectedBet called with:', bet);
    console.log('Previous selectedBet state:', selectedBet);
    setSelectedBet(bet);
    console.log('setSelectedBet state update triggered');
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-auth-token': token || '',
  };

  // 잔고 조회 (AuthContext의 balance 사용)
  const fetchBalance = useCallback(async () => {
    if (!token) return;
    
    try {
      const url = buildApiUrl('/api/exchange/balance');
      const response = await fetch(url, { headers });
      
      // 401 에러 시 자동 로그아웃
      if (response.status === 401) {
        console.warn('⚠️ 토큰 만료 또는 인증 실패, 자동 로그아웃 처리');
        logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        return;
      }
      
      if (!response.ok) throw new Error('잔고 조회 실패');
      
      const data: ExchangeBalance = await response.json();
      setBalance(data.balance);
    } catch (err) {
      console.error('잔고 조회 중 오류:', err);
    }
  }, [token, setBalance, logout]);

  // 주문 내역 조회
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const url = buildApiUrl('/api/exchange/orders');
      const response = await fetch(url, { headers });
      
      // 401 에러 시 자동 로그아웃
      if (response.status === 401) {
        console.warn('⚠️ 토큰 만료 또는 인증 실패, 자동 로그아웃 처리');
        logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        return;
      }
      
      if (!response.ok) throw new Error('주문 내역 조회 실패');
      
      const data: ExchangeOrder[] = await response.json();
      console.log('📋 주문 내역 조회 성공:', data.length, '개 주문');
      setOrders(data);
    } catch (err) {
      console.error('❌ 주문 내역 조회 오류:', err);
      setError(err instanceof Error ? err.message : '주문 내역 조회 중 오류 발생');
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  // 주문 등록
  const placeOrder = useCallback(async (orderData: {
    gameId: string;
    market: string;
    line: number;
    side: 'back' | 'lay';
    price: number;
    amount: number;
    selection?: string; // 선택한 팀/선수명
  }) => {
    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📝 주문 생성:', orderData);
      const response = await fetch('/api/exchange/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `주문 생성 실패 (${response.status})`);
      }

      const result = await response.json();
      console.log('✅ 주문 생성 완료:', result);
      
      // 주문 성공 후 주문 내역과 잔고 새로고침
      await fetchOrders();
      await fetchBalance();
      
      return result;
    } catch (error) {
      console.error('❌ 주문 생성 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, fetchOrders, fetchBalance]);

  // 매치 주문 (기존 주문과 즉시 매칭 시도)
  const placeMatchOrder = useCallback(async (orderData: {
    gameId: string;
    market: string;
    line: number;
    side: 'back' | 'lay';
    price: number;
    amount: number;
    selection?: string; // 선택한 팀/선수명
  }) => {
    try {
      console.log('🎯 매치 주문:', orderData);
      const response = await fetch('/api/exchange/match-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('매치 주문 실패');
      }

      const result = await response.json();
      console.log('✅ 매치 주문 완료:', result);
      return result;
    } catch (error) {
      console.error('❌ 매치 주문 오류:', error);
      throw error;
    }
  }, [token]);

  // 주문 취소
  const cancelOrder = useCallback(async (orderId: number) => {
    if (!token) throw new Error('로그인이 필요합니다');
    
    try {
      setLoading(true);
      const url = buildApiUrl(`/api/exchange/cancel/${orderId}`);
      const response = await fetch(url, {
        method: 'POST',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '주문 취소 실패');
      }
      
      const data = await response.json();
      
      // 잔고 업데이트 (응답에 포함된 경우)
      if (data.newBalance !== undefined) {
        setBalance(data.newBalance);
      }
      
      // 주문 내역 갱신
      await fetchOrders();
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 취소 중 오류 발생');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchBalance, fetchOrders]);

  // 호가 조회 (공개 API - 토큰 불필요)
  const fetchOrderbook = useCallback(async (
    gameId: string,
    market: string,
    line?: number
  ) => {
    
    try {
      const encodedGameId = encodeURIComponent(gameId);
      const encodedMarket = encodeURIComponent(market);
      const encodedLine = line !== undefined ? encodeURIComponent(line.toString()) : '';
      
      console.log('fetchOrderbook 호출:', {
        original: { gameId, market, line },
        encoded: { encodedGameId, encodedMarket, encodedLine }
      });
      
      const url = line !== undefined 
        ? `/api/exchange/orderbook-test?gameId=${encodedGameId}&market=${encodedMarket}&line=${encodedLine}`
        : `/api/exchange/orderbook-test?gameId=${encodedGameId}&market=${encodedMarket}`;
      console.log('fetchOrderbook URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('fetchOrderbook 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('fetchOrderbook 에러 응답:', errorText);
        throw new Error(`호가 조회 실패: ${response.status} ${errorText}`);
      }
      
      const data: { orders: ExchangeOrder[] } = await response.json();
      console.log('fetchOrderbook 성공:', data.orders.length, '개 주문');
      return data.orders;
    } catch (err) {
      console.error('fetchOrderbook 에러:', err);
      setError(err instanceof Error ? err.message : '호가 조회 중 오류 발생');
      return [];
    }
  }, []);

  // 전체 오픈 주문 조회 (공개 API - 토큰 불필요)
  const fetchAllOpenOrders = useCallback(async () => {
    try {
      const url = buildApiUrl('/api/exchange/all-orders');
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`전체 주문 조회 실패: ${response.status} ${errorText}`);
      }
      
      const data: ExchangeOrder[] = await response.json();
      console.log('fetchAllOpenOrders 성공:', data.length, '개 주문');
      return data;
    } catch (err) {
      console.error('fetchAllOpenOrders 에러:', err);
      setError(err instanceof Error ? err.message : '전체 주문 조회 중 오류 발생');
      return [];
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    if (token) {
      fetchBalance();
      fetchOrders();
    }
  }, [token, fetchBalance, fetchOrders]);

  // Exchange 주문 완료 이벤트 리스너
  useEffect(() => {
    const handleExchangeOrderPlaced = () => {
      if (token) {
        fetchOrders();
        fetchBalance();
      }
    };

    window.addEventListener('exchangeOrderPlaced', handleExchangeOrderPlaced);
    
    return () => {
      window.removeEventListener('exchangeOrderPlaced', handleExchangeOrderPlaced);
    };
  }, [token, fetchOrders, fetchBalance]);

  return {
    balance,
    orders,
    loading,
    error,
    selectedBet,
    setSelectedBet: setSelectedBetWithLog,
    fetchBalance,
    fetchOrders,
    placeOrder,
    placeMatchOrder,
    cancelOrder,
    fetchOrderbook,
    fetchAllOpenOrders,
    clearError: () => setError(null),
  };
}; 