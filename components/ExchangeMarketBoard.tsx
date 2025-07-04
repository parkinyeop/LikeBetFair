import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';

interface Order {
  id: string;
  side: 'back' | 'lay';
  price: number;
  amount: number;
}

const dummyMarkets = [
  {
    name: 'Moneyline',
    selections: [
      { team: 'Texas Rangers', back: { price: 2.16, amount: 19 }, lay: { price: 2.2, amount: 15 } },
      { team: 'Baltimore Orioles', back: { price: 1.83, amount: 155 }, lay: { price: 1.87, amount: 141 } },
    ],
  },
  {
    name: 'Handicap',
    selections: [
      { team: 'Texas Rangers +1.5', back: { price: 1.51, amount: 134 }, lay: { price: 1.65, amount: 67 } },
      { team: 'Baltimore Orioles -1.5', back: { price: 2.52, amount: 86 }, lay: { price: 2.96, amount: 68 } },
    ],
  },
  {
    name: 'Total Runs',
    selections: [
      { team: 'Under 9.5', back: { price: 1.98, amount: 91 }, lay: { price: 2.08, amount: 197 } },
      { team: 'Over 9.5', back: { price: 1.93, amount: 118 }, lay: { price: 2.02, amount: 291 } },
    ],
  },
];

export default function ExchangeMarketBoard() {
  const { isLoggedIn } = useAuth();
  const { fetchOrderbook } = useExchange();
  
  const [selectedMarket, setSelectedMarket] = useState(0);
  const market = dummyMarkets[selectedMarket];
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [selectedGame, setSelectedGame] = useState('xxx');
  const [selectedLine, setSelectedLine] = useState(8.5);

  // 호가 데이터 로드
  useEffect(() => {
    if (isLoggedIn) {
      fetchOrderbook(selectedGame, 'totals', selectedLine).then(setOrderbook);
    }
  }, [isLoggedIn, selectedGame, selectedLine, fetchOrderbook]);

  return (
    <div className="h-full flex flex-col">
      {/* 호가 (미체결 주문) - 상단 */}
      <div className="bg-white rounded shadow p-6 mb-4">
        <h3 className="text-lg font-bold mb-4">호가 (미체결 주문)</h3>
        {!isLoggedIn ? (
          <div className="text-center py-8">
            <p className="text-gray-600">호가를 보려면 로그인이 필요합니다.</p>
          </div>
        ) : orderbook.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">미체결 주문이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderbook.map((order, index) => (
              <div key={order.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <span className={`font-semibold px-3 py-1 rounded text-sm ${order.side === 'back' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {order.side === 'back' ? 'Back' : 'Lay'}
                  </span>
                  <span className="font-mono text-lg font-bold">{order.price}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{order.amount.toLocaleString()}원</div>
                  <div className="text-sm text-gray-500">미체결</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 시장 보드 - 하단 */}
      <div className="bg-white rounded shadow p-6 flex-1">
        <h2 className="text-xl font-bold mb-2">Texas Rangers @ Baltimore Orioles</h2>
        <div className="flex space-x-2 mb-4">
          {dummyMarkets.map((m, idx) => (
            <button
              key={m.name}
              onClick={() => setSelectedMarket(idx)}
              className={`px-4 py-2 rounded-t font-semibold border-b-2 transition-colors ${selectedMarket === idx ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
        <table className="w-full text-center border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2">팀/선택</th>
              <th className="py-2">Back<br/><span className="text-xs text-gray-400">(베팅)</span></th>
              <th className="py-2">Lay<br/><span className="text-xs text-gray-400">(레이)</span></th>
            </tr>
          </thead>
          <tbody>
            {market.selections.map((sel, i) => (
              <tr key={sel.team} className="border-t">
                <td className="py-2 font-medium">{sel.team}</td>
                <td>
                  <button className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 font-bold">
                    {sel.back.price} <span className="text-xs">({sel.back.amount})</span>
                  </button>
                </td>
                <td>
                  <button className="px-3 py-1 bg-pink-100 hover:bg-pink-200 rounded text-pink-700 font-bold">
                    {sel.lay.price} <span className="text-xs">({sel.lay.amount})</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 