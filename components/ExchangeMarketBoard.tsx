import React, { useState, useEffect } from 'react';

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
  const [selectedMarket, setSelectedMarket] = useState(0);
  const market = dummyMarkets[selectedMarket];
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ side: 'back', price: 1.91, amount: 10000 });

  useEffect(() => {
    fetch('/api/exchange/orderbook?gameId=xxx&market=totals&line=8.5')
      .then(res => res.json())
      .then(data => setOrders(data.orders));
  }, []);

  const handleOrder = async () => {
    await fetch('/api/exchange/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, userId: 1, gameId: 'xxx', market: 'totals', line: 8.5 })
    });
    // 주문 후 호가 갱신
    fetch('/api/exchange/orderbook?gameId=xxx&market=totals&line=8.5')
      .then(res => res.json())
      .then(data => setOrders(data.orders));
  };

  return (
    <div className="bg-white rounded shadow p-6 w-full max-w-3xl mx-auto">
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
      <h2>Exchange 주문</h2>
      <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
        <option value="back">Back</option>
        <option value="lay">Lay</option>
      </select>
      <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} />
      <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} />
      <button onClick={handleOrder}>주문</button>
      <h3>호가(미체결 주문)</h3>
      <ul>
        {orders.map(o => (
          <li key={o.id}>{o.side} {o.price} {o.amount}</li>
        ))}
      </ul>
    </div>
  );
} 