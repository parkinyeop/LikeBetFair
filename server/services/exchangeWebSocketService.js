import { WebSocketServer } from 'ws';

class ExchangeWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // gameId -> Set of WebSocket connections
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      console.log('Exchange WebSocket 연결됨');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          switch (data.type) {
            case 'subscribe':
              this.subscribeToGame(ws, data.gameId);
              break;
            case 'unsubscribe':
              this.unsubscribeFromGame(ws, data.gameId);
              break;
            default:
              console.log('알 수 없는 메시지 타입:', data.type);
          }
        } catch (error) {
          console.error('WebSocket 메시지 처리 오류:', error);
        }
      });
      
      ws.on('close', () => {
        this.removeClient(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket 오류:', error);
        this.removeClient(ws);
      });
    });
    
    console.log('Exchange WebSocket 서비스 초기화 완료');
  }

  subscribeToGame(ws, gameId) {
    if (!this.clients.has(gameId)) {
      this.clients.set(gameId, new Set());
    }
    this.clients.get(gameId).add(ws);
    
    // 클라이언트에 구독 확인 메시지 전송
    ws.send(JSON.stringify({
      type: 'subscribed',
      gameId: gameId
    }));
    
    console.log(`클라이언트가 ${gameId} 경기에 구독`);
  }

  unsubscribeFromGame(ws, gameId) {
    if (this.clients.has(gameId)) {
      this.clients.get(gameId).delete(ws);
      if (this.clients.get(gameId).size === 0) {
        this.clients.delete(gameId);
      }
    }
    
    console.log(`클라이언트가 ${gameId} 경기 구독 해제`);
  }

  removeClient(ws) {
    // 모든 게임에서 클라이언트 제거
    for (const [gameId, clients] of this.clients.entries()) {
      if (clients.has(ws)) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.clients.delete(gameId);
        }
      }
    }
    
    console.log('WebSocket 클라이언트 연결 해제');
  }

  // 주문 업데이트 브로드캐스트
  broadcastOrderUpdate(gameId, orderData) {
    if (!this.clients.has(gameId)) return;
    
    const message = JSON.stringify({
      type: 'order_update',
      gameId: gameId,
      data: orderData
    });
    
    this.clients.get(gameId).forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  // 호가 업데이트 브로드캐스트
  broadcastOrderbookUpdate(gameId, market, line, orderbook) {
    if (!this.clients.has(gameId)) return;
    
    const message = JSON.stringify({
      type: 'orderbook_update',
      gameId: gameId,
      market: market,
      line: line,
      data: orderbook
    });
    
    this.clients.get(gameId).forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  // 정산 결과 브로드캐스트
  broadcastSettlement(gameId, settlementData) {
    if (!this.clients.has(gameId)) return;
    
    const message = JSON.stringify({
      type: 'settlement',
      gameId: gameId,
      data: settlementData
    });
    
    this.clients.get(gameId).forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

export default new ExchangeWebSocketService(); 