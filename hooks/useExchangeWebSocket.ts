import { useEffect, useRef, useCallback } from 'react';
import { API_CONFIG } from '../config/apiConfig';

interface WebSocketMessage {
  type: string;
  gameId?: string;
  market?: string;
  line?: number;
  data?: any;
}

export const useExchangeWebSocket = (
  gameId: string,
  onOrderUpdate?: (data: any) => void,
  onOrderbookUpdate?: (data: any) => void,
  onSettlement?: (data: any) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // WebSocket URL은 BASE_URL에서 프로토콜만 ws(s)로 변환
      const wsBase = API_CONFIG.BASE_URL.replace(/^http/, 'ws');
      const ws = new WebSocket(wsBase);
      
      ws.onopen = () => {
        console.log('Exchange WebSocket 연결됨');
        
        // 경기 구독
        ws.send(JSON.stringify({
          type: 'subscribe',
          gameId: gameId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'subscribed':
              console.log(`경기 ${message.gameId} 구독 완료`);
              break;
            case 'order_update':
              onOrderUpdate?.(message.data);
              break;
            case 'orderbook_update':
              onOrderbookUpdate?.(message.data);
              break;
            case 'settlement':
              onSettlement?.(message.data);
              break;
            default:
              console.log('알 수 없는 WebSocket 메시지:', message);
          }
        } catch (error) {
          console.error('WebSocket 메시지 파싱 오류:', error);
        }
      };

      ws.onclose = () => {
        console.log('Exchange WebSocket 연결 해제');
        
        // 자동 재연결 (5초 후)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Exchange WebSocket 재연결 시도...');
          connect();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('Exchange WebSocket 오류:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
    }
  }, [gameId, onOrderUpdate, onOrderbookUpdate, onSettlement]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // 구독 해제
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          gameId: gameId
        }));
      }
      
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [gameId]);

  // 컴포넌트 마운트 시 연결
  useEffect(() => {
    connect();

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // gameId 변경 시 재연결
  useEffect(() => {
    disconnect();
    connect();
  }, [gameId]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect,
  };
}; 