import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

export default function ExchangePage() {
  const { isLoggedIn } = useAuth();
  const { fetchOrderbook } = useExchange();
  const router = useRouter();
  
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [selectedGame, setSelectedGame] = useState('xxx');
  const [selectedLine, setSelectedLine] = useState(8.5);

  // 더미 호가 데이터 생성
  const generateDummyOrderbook = (): ExchangeOrder[] => {
    const dummyOrders: ExchangeOrder[] = [];
    
    // Back 주문들 (더 낮은 가격부터)
    for (let i = 0; i < 5; i++) {
      dummyOrders.push({
        id: i + 1,
        userId: 1,
        gameId: 'dummy_game',
        market: 'totals',
        line: 8.5,
        side: 'back',
        price: 1.80 - (i * 0.05),
        amount: Math.floor(Math.random() * 50000) + 10000,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Lay 주문들 (더 높은 가격부터)
    for (let i = 0; i < 5; i++) {
      dummyOrders.push({
        id: i + 6,
        userId: 2,
        gameId: 'dummy_game',
        market: 'totals',
        line: 8.5,
        side: 'lay',
        price: 1.90 + (i * 0.05),
        amount: Math.floor(Math.random() * 50000) + 10000,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // 가격순으로 정렬 (Back은 내림차순, Lay는 오름차순)
    return dummyOrders.sort((a, b) => {
      if (a.side === 'back' && b.side === 'back') {
        return b.price - a.price; // Back은 높은 가격이 위로
      } else if (a.side === 'lay' && b.side === 'lay') {
        return a.price - b.price; // Lay는 낮은 가격이 위로
      } else {
        return a.side === 'back' ? -1 : 1; // Back이 Lay보다 위로
      }
    });
  };

  // 호가 데이터 로드
  useEffect(() => {
    if (isLoggedIn) {
      // 실제 호가 데이터를 가져오되, 없으면 더미 데이터 생성
      fetchOrderbook(selectedGame, 'totals', selectedLine).then((orders) => {
        if (orders.length === 0) {
          // 더미 호가 데이터 생성
          const dummyOrders = generateDummyOrderbook();
          setOrderbook(dummyOrders);
        } else {
          setOrderbook(orders);
        }
      });
    } else {
      // 로그인하지 않은 경우에도 더미 데이터 표시
      setOrderbook(generateDummyOrderbook());
    }
  }, [isLoggedIn, selectedGame, selectedLine, fetchOrderbook]);

  return (
    <div className="h-full flex flex-col">
      {/* 호가창 (미체결 주문) - 상단 */}
      <div className="bg-white rounded shadow p-6 mb-4">
        <h3 className="text-lg font-bold mb-4">호가창 (미체결 주문)</h3>
        {!isLoggedIn ? (
          <div className="text-center py-8">
            <p className="text-gray-600">호가를 보려면 로그인이 필요합니다.</p>
          </div>
        ) : orderbook.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">미체결 주문이 없습니다.</p>
          </div>
        ) : (
          <div>
            {/* 호가 테이블 헤더 */}
            <div className="grid grid-cols-3 gap-4 mb-3 text-sm font-semibold text-gray-600 border-b pb-2">
              <div>가격</div>
              <div>거래량</div>
              <div>유형</div>
            </div>
            
            {/* Back 주문들 (높은 가격부터) */}
            <div className="space-y-1 mb-4">
              <div className="text-xs font-semibold text-blue-600 mb-2">Back (베팅)</div>
              {orderbook.filter(order => order.side === 'back').map((order, index) => (
                <div key={order.id} className="grid grid-cols-3 gap-4 p-2 bg-blue-50 rounded border-l-4 border-blue-400 hover:bg-blue-100 transition-colors">
                  <div className="font-mono font-bold text-blue-700">{order.price.toFixed(2)}</div>
                  <div className="text-right">{order.amount.toLocaleString()}원</div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-blue-200 text-blue-700 rounded text-xs font-semibold">Back</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Lay 주문들 (낮은 가격부터) */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-pink-600 mb-2">Lay (레이)</div>
              {orderbook.filter(order => order.side === 'lay').map((order, index) => (
                <div key={order.id} className="grid grid-cols-3 gap-4 p-2 bg-pink-50 rounded border-l-4 border-pink-400 hover:bg-pink-100 transition-colors">
                  <div className="font-mono font-bold text-pink-700">{order.price.toFixed(2)}</div>
                  <div className="text-right">{order.amount.toLocaleString()}원</div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-pink-200 text-pink-700 rounded text-xs font-semibold">Lay</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 경기 선택 - 하단 */}
      <div className="bg-white rounded shadow p-4 flex-1">
        <h3 className="text-lg font-bold mb-3">경기 선택 (1주일 범위)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* 스포츠 카테고리 버튼들 */}
          {[
            { id: 'kbo', name: 'KBO', sport: 'baseball_kbo', count: 5 },
            { id: 'kleague', name: 'K리그', sport: 'soccer_korea_kleague1', count: 3 },
            { id: 'mlb', name: 'MLB', sport: 'baseball_mlb', count: 4 },
            { id: 'nba', name: 'NBA', sport: 'basketball_nba', count: 6 },
            { id: 'nfl', name: 'NFL', sport: 'americanfootball_nfl', count: 2 },
            { id: 'kbl', name: 'KBL', sport: 'basketball_kbl', count: 3 }
          ].map((sport) => (
            <button
              key={sport.id}
              onClick={() => router.push(`/exchange/${sport.sport}`)}
              className="p-3 rounded border text-left transition-colors border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-blue-300"
            >
              <div className="font-semibold text-sm text-blue-600">{sport.name}</div>
              <div className="text-xs text-gray-500 mt-1">{sport.count}경기</div>
              <div className="text-xs text-blue-500 mt-1">클릭하여 보기 →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 