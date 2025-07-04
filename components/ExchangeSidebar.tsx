import React, { useState } from 'react';
import { useExchange, ExchangeOrder, OrderForm } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';

function OrderPanel() {
  const { 
    balance, 
    loading, 
    error, 
    placeOrder, 
    clearError 
  } = useExchange();
  
  const [form, setForm] = useState<OrderForm>({ side: 'back', price: 1.91, amount: 10000 });
  const [selectedGame, setSelectedGame] = useState('xxx');
  const [selectedLine, setSelectedLine] = useState(8.5);

  const handleOrder = async () => {
    try {
      await placeOrder(selectedGame, 'totals', selectedLine, form);
    } catch (err) {
      console.error('주문 실패:', err);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Exchange 잔고 */}
      <div className="bg-gray-50 p-3 rounded mb-3">
        <h3 className="font-semibold mb-1 text-xs text-gray-700">Exchange 잔고</h3>
        <p className="text-lg font-bold text-blue-600">{balance?.toLocaleString()}원</p>
      </div>
      
      {/* Exchange 주문 폼 */}
      <div className="bg-gray-50 p-3 rounded mb-3">
        <h3 className="font-semibold mb-2 text-xs text-gray-700">Exchange 주문</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium mb-1">Side</label>
            <select 
              value={form.side} 
              onChange={e => setForm(f => ({ ...f, side: e.target.value as 'back' | 'lay' }))}
              className="w-full p-1 border rounded text-xs"
            >
              <option value="back">Back (베팅)</option>
              <option value="lay">Lay (레이)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Price</label>
            <input 
              type="number" 
              step="0.01"
              value={form.price} 
              onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} 
              className="w-full p-1 border rounded text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Amount (원)</label>
            <input 
              type="number" 
              value={form.amount} 
              onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} 
              className="w-full p-1 border rounded text-xs"
            />
          </div>
          <button 
            onClick={handleOrder}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-700 disabled:bg-gray-400 text-xs font-medium"
          >
            {loading ? '처리중...' : '주문'}
          </button>
        </div>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-xs">
          {error}
          <button onClick={clearError} className="float-right font-bold">&times;</button>
        </div>
      )}
    </div>
  );
}

function OrderHistoryPanel() {
  const { orders: userOrders } = useExchange();

  return (
    <div className="h-full overflow-y-auto">
      <div className="bg-gray-50 p-3 rounded">
        <h3 className="font-semibold mb-2 text-xs text-gray-700">내 주문 내역</h3>
        {userOrders.length === 0 ? (
          <p className="text-gray-500 text-xs">주문 내역이 없습니다.</p>
        ) : (
          <div className="space-y-1">
            {userOrders.slice(0, 15).map((order) => (
              <div key={order.id} className="flex justify-between items-center p-1 bg-white rounded border text-xs">
                <div>
                  <span className={`font-semibold ${order.side === 'back' ? 'text-blue-600' : 'text-pink-600'}`}>
                    {order.side === 'back' ? 'Back' : 'Lay'}
                  </span>
                  <span className="text-gray-500 ml-1">{order.price}</span>
                </div>
                <div className="text-right">
                  <div>{order.amount.toLocaleString()}원</div>
                  <div className={`${
                    order.status === 'open' ? 'text-yellow-600' :
                    order.status === 'matched' ? 'text-green-600' :
                    order.status === 'settled' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    {order.status === 'open' ? '미체결' :
                     order.status === 'matched' ? '체결' :
                     order.status === 'settled' ? '정산' :
                     '취소'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExchangeSidebar() {
  const { isLoggedIn } = useAuth();
  const [tab, setTab] = useState<'order' | 'history'>('order');

  const handleTabChange = (newTab: 'order' | 'history') => {
    setTab(newTab);
  };

  if (!isLoggedIn) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center text-gray-500">
        <div>
          <p className="text-sm">Exchange 기능을 사용하려면 로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-2 p-4 pb-2">
        <h2 className="text-lg font-bold">EXCHANGE</h2>
      </div>
      <div className="flex space-x-2 mb-2 px-4">
        <button
          className={`flex-1 py-1 rounded text-xs font-medium ${tab === 'order' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => handleTabChange('order')}
        >
          주문
        </button>
        <button
          className={`flex-1 py-1 rounded text-xs font-medium ${tab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => handleTabChange('history')}
        >
          주문내역
        </button>
      </div>
      <div className="flex-1 min-h-0 p-4 pt-0">
        {tab === 'order' ? <OrderPanel /> : <OrderHistoryPanel />}
      </div>
    </div>
  );
} 