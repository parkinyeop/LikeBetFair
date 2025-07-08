import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';

export interface ExchangeOrder {
  id: number;
  userId: number;
  gameId: string;
  market: string;
  line: number;
  side: 'back' | 'lay';
  price: number;
  amount: number;
  selection?: string; // 선택한 팀/선수명
  status: 'open' | 'matched' | 'settled' | 'cancelled';
  matchedOrderId?: number;
  createdAt: string;
  updatedAt: string;
}

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
}

export const useExchange = () => {
  const { token, balance, setBalance } = useAuth();
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
      const response = await fetch('http://localhost:5050/api/exchange/balance', { headers });
      if (!response.ok) throw new Error('잔고 조회 실패');
      
      const data: ExchangeBalance = await response.json();
      setBalance(data.balance);
    } catch (err) {
      console.error('잔고 조회 중 오류:', err);
    }
  }, [token, setBalance]);

  // 주문 내역 조회
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5050/api/exchange/orders', { headers });
      if (!response.ok) throw new Error('주문 내역 조회 실패');
      
      const data: { orders: ExchangeOrder[] } = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 내역 조회 중 오류 발생');
    } finally {
      setLoading(false);
    }
  }, [token]);

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
        throw new Error('주문 생성 실패');
      }

      const result = await response.json();
      console.log('✅ 주문 생성 완료:', result);
      return result;
    } catch (error) {
      console.error('❌ 주문 생성 오류:', error);
      throw error;
    }
  }, [token]);

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
      const response = await fetch(`http://localhost:5050/api/exchange/cancel/${orderId}`, {
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

  // 호가 조회
  const fetchOrderbook = useCallback(async (
    gameId: string,
    market: string,
    line: number
  ) => {
    if (!token) {
      console.log('fetchOrderbook: 토큰이 없습니다.');
      return [];
    }
    
    try {
      const encodedGameId = encodeURIComponent(gameId);
      const encodedMarket = encodeURIComponent(market);
      const encodedLine = encodeURIComponent(line.toString());
      
      console.log('fetchOrderbook 호출:', {
        original: { gameId, market, line },
        encoded: { encodedGameId, encodedMarket, encodedLine }
      });
      
      const url = `http://localhost:5050/api/exchange/orderbook?gameId=${encodedGameId}&market=${encodedMarket}&line=${encodedLine}`;
      console.log('fetchOrderbook URL:', url);
      
      const response = await fetch(url, { headers });
      
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
  }, [token]);

  // 초기 데이터 로드
  useEffect(() => {
    if (token) {
      fetchBalance();
      fetchOrders();
    }
  }, [token, fetchBalance, fetchOrders]);

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
    clearError: () => setError(null),
  };
}; 