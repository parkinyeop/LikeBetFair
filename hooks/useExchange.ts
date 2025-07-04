import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface ExchangeOrder {
  id: number;
  userId: number;
  gameId: string;
  market: string;
  line: number;
  side: 'back' | 'lay';
  price: number;
  amount: number;
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

export const useExchange = () => {
  const { token, balance, setBalance } = useAuth();
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const placeOrder = useCallback(async (
    gameId: string,
    market: string,
    line: number,
    form: OrderForm
  ) => {
    if (!token) throw new Error('로그인이 필요합니다');
    
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5050/api/exchange/order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gameId,
          market,
          line,
          ...form,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '주문 등록 실패');
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
      setError(err instanceof Error ? err.message : '주문 등록 중 오류 발생');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchBalance, fetchOrders]);

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
    if (!token) return [];
    
    try {
      const response = await fetch(
        `http://localhost:5050/api/exchange/orderbook?gameId=${gameId}&market=${market}&line=${line}`,
        { headers }
      );
      
      if (!response.ok) throw new Error('호가 조회 실패');
      
      const data: { orders: ExchangeOrder[] } = await response.json();
      return data.orders;
    } catch (err) {
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
    fetchBalance,
    fetchOrders,
    placeOrder,
    cancelOrder,
    fetchOrderbook,
    clearError: () => setError(null),
  };
}; 