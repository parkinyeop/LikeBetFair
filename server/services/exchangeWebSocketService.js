import { WebSocketServer } from 'ws';

class ExchangeWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // gameId -> Set of WebSocket connections
    this.adminClients = new Set(); // 관리자 클라이언트들
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
            case 'admin-subscribe':
              this.subscribeAdmin(ws, data.token);
              break;
            case 'admin-unsubscribe':
              this.unsubscribeAdmin(ws);
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
        this.adminClients.delete(ws); // 관리자 클라이언트에서도 제거
      });

      ws.on('error', (error) => {
        console.error('WebSocket 오류:', error);
        this.removeClient(ws);
        this.adminClients.delete(ws); // 관리자 클라이언트에서도 제거
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

  // 🔐 관리자 클라이언트 구독
  async subscribeAdmin(ws, token) {
    try {
      // JWT 토큰 검증 (실제 환경에서는 JWT 라이브러리 사용)
      if (!token) {
        ws.send(JSON.stringify({
          type: 'error',
          message: '관리자 토큰이 필요합니다.'
        }));
        return;
      }

      // 토큰 검증 로직 (간단한 버전)
      // 실제로는 JWT 검증을 해야 함
      this.adminClients.add(ws);
      ws.isAdmin = true;

      ws.send(JSON.stringify({
        type: 'admin-subscribed',
        message: '관리자 알림 구독이 활성화되었습니다.',
        timestamp: new Date()
      }));

      console.log(`🔐 관리자 WebSocket 클라이언트 구독 (총 ${this.adminClients.size}명)`);

    } catch (error) {
      console.error('관리자 구독 실패:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '관리자 구독에 실패했습니다.'
      }));
    }
  }

  // 🔐 관리자 클라이언트 구독 해제
  unsubscribeAdmin(ws) {
    this.adminClients.delete(ws);
    ws.isAdmin = false;
    console.log(`🔐 관리자 WebSocket 클라이언트 구독 해제 (총 ${this.adminClients.size}명)`);
  }

  // 📡 관리자들에게 브로드캐스트
  emitToAdmins(eventType, data) {
    if (this.adminClients.size === 0) {
      console.log('📡 연결된 관리자 클라이언트가 없습니다.');
      return;
    }

    const message = JSON.stringify({
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    });

    let sentCount = 0;
    this.adminClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error('관리자 클라이언트 전송 실패:', error);
          this.adminClients.delete(client);
        }
      } else {
        // 연결이 끊어진 클라이언트 제거
        this.adminClients.delete(client);
      }
    });

    console.log(`📡 ${eventType} 이벤트를 ${sentCount}명의 관리자에게 전송`);
  }

  // 🔄 관리자 상태 조회
  getAdminStatus() {
    return {
      totalAdminClients: this.adminClients.size,
      activeConnections: Array.from(this.adminClients).filter(client => client.readyState === 1).length
    };
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