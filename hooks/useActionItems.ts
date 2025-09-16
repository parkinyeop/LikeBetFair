import { useState, useEffect, useCallback, useRef } from 'react';

interface ActionItem {
  id: string;
  type: 'warning' | 'danger' | 'info';
  icon: string;
  title: string;
  count: number;
  link: string;
  description: string;
}

interface UseActionItemsReturn {
  actionItems: ActionItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  isWebSocketConnected: boolean;
}

/**
 * 관리자 긴급 조치 항목을 관리하는 커스텀 훅
 * 자동 새로고침과 실시간 업데이트 기능 포함
 */
export const useActionItems = (): UseActionItemsReturn => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  /**
   * 액션 아이템 조회 함수
   */
  const fetchActionItems = useCallback(async () => {
    try {
      setError(null);

      // 세션에서 토큰 가져오기
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }


      const response = await fetch('http://localhost:5050/api/admin/action-items', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: 조회 실패`);
      }

      const data = await response.json();

      if (data.success) {
        setActionItems(data.actionItems || []);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || '조회 실패');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      console.error('❌ 액션 아이템 조회 실패:', errorMessage);
      setError(errorMessage);
      setActionItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 수동 새로고침 함수
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchActionItems();
  }, [fetchActionItems]);

  /**
   * WebSocket 연결 설정
   */
  const connectWebSocket = useCallback(() => {
    // 이미 연결 중이거나 연결되어 있으면 중복 연결 방지
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

      if (!token) {
        return;
      }

      isConnectingRef.current = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//localhost:5050`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setIsWebSocketConnected(true);
        setError(null);

        // 관리자 구독 요청
        ws.send(JSON.stringify({
          type: 'admin-subscribe',
          token: token
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'action-items-update') {
            fetchActionItems();
            setLastUpdated(new Date());
          }
        } catch (err) {
          console.error('WebSocket 메시지 파싱 실패:', err);
        }
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
        setIsWebSocketConnected(false);
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        setIsWebSocketConnected(false);
        wsRef.current = null;

        // 정상 종료가 아닌 경우에만 재연결 (최대 재시도 간격: 30초)
        if (event.code !== 1000 && event.code !== 1001) {
          const delay = Math.min(5000 + Math.random() * 5000, 30000); // 5-10초 랜덤 + 최대 30초
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };

    } catch (error) {
      isConnectingRef.current = false;
      setIsWebSocketConnected(false);
    }
  }, [fetchActionItems]);

  /**
   * WebSocket 연결 종료
   */
  const disconnectWebSocket = useCallback(() => {
    isConnectingRef.current = false;

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsWebSocketConnected(false);
  }, []);

  /**
   * 초기 로드 및 WebSocket 연결 설정
   */
  useEffect(() => {
    // 초기 데이터 로드
    fetchActionItems();

    // WebSocket 연결 시도
    connectWebSocket();

    // WebSocket가 실패할 경우를 대비한 폴백 새로고침 (10분마다)
    intervalRef.current = setInterval(() => {
      if (!isWebSocketConnected && !isConnectingRef.current) {
        fetchActionItems();
        connectWebSocket();
      }
    }, 10 * 60 * 1000); // 10분

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      disconnectWebSocket();
    };
  }, [fetchActionItems, connectWebSocket, disconnectWebSocket]);

  /**
   * 페이지 포커스시 새로고침
   */
  useEffect(() => {
    const handleFocus = () => {
      fetchActionItems();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchActionItems]);

  return {
    actionItems,
    loading,
    error,
    lastUpdated,
    refetch,
    isWebSocketConnected
  };
};

/**
 * 특정 액션 아이템의 상세 정보를 조회하는 훅
 */
export const useActionItemDetails = (itemId: string | null) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch(`http://localhost:5050/api/admin/action-items/${id}/details`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: 상세 정보 조회 실패`);
      }

      const data = await response.json();

      if (data.success) {
        setDetails(data.details);
      } else {
        throw new Error(data.message || '상세 정보 조회 실패');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      console.error(`❌ ${id} 상세 정보 조회 실패:`, errorMessage);
      setError(errorMessage);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (itemId) {
      fetchDetails(itemId);
    } else {
      setDetails(null);
      setError(null);
      setLoading(false);
    }
  }, [itemId, fetchDetails]);

  return {
    details,
    loading,
    error,
    refetch: itemId ? () => fetchDetails(itemId) : () => {}
  };
};

export default useActionItems;