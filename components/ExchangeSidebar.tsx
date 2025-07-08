import React, { useState } from 'react';
import { useExchange, ExchangeOrder, OrderForm } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';

function OrderPanel() {
  const { 
    loading, 
    error, 
    placeOrder, 
    clearError
  } = useExchange();
  const { selectedBet, setSelectedBet } = useExchangeContext();
  const { balance } = useAuth();
  
  // 디버깅용 로그
  console.log('OrderPanel selectedBet:', selectedBet);
  console.log('OrderPanel selectedBet type:', typeof selectedBet);
  console.log('OrderPanel selectedBet keys:', selectedBet ? Object.keys(selectedBet) : 'null');
  
  const [form, setForm] = useState<OrderForm>({ side: 'back', price: 1.91, amount: 10000 });
  
  // selectedBet이 변경될 때 form의 price 업데이트
  React.useEffect(() => {
    if (selectedBet) {
      setForm(prev => ({ ...prev, price: selectedBet.price }));
    }
  }, [selectedBet]);
  const [selectedGame, setSelectedGame] = useState('xxx');
  const [selectedLine, setSelectedLine] = useState(8.5);

  const handleOrder = async () => {
    if (!selectedBet) {
      alert('배팅을 선택해주세요.');
      return;
    }
    
    try {
      const orderData = {
        gameId: selectedBet.gameId || selectedGame,
        market: selectedBet.market || 'totals',
        line: selectedBet.line || selectedLine,
        side: selectedBet.type,
        price: selectedBet.price,
        amount: form.amount,
        selection: selectedBet.team // 팀명을 selection으로 전달
      };
      
      await placeOrder(orderData);
    } catch (err) {
      console.error('주문 실패:', err);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* 선택된 배팅 정보 */}
      <div className="bg-gray-50 p-3 rounded mb-3 border border-gray-200">
        <h3 className="font-semibold mb-2 text-sm text-gray-700">선택된 배팅</h3>
        {selectedBet ? (
          <div className="space-y-2 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-gray-800 mb-1">{selectedBet.team}</div>
              {selectedBet.market && (
                <div className="text-gray-500 text-xs">{selectedBet.market}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">유형:</span>
                <span className={`font-medium ${selectedBet.type === 'back' ? 'text-blue-600' : 'text-pink-600'}`}>
                  {selectedBet.type === 'back' ? 'Back (베팅)' : 'Lay (레이)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">배당:</span>
                <span className="font-medium">{selectedBet.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">상태:</span>
              <span className="font-medium text-red-600">미선택</span>
            </div>
            <p className="text-sm text-gray-500">중앙에서 Back/Lay 버튼을 클릭하여 배팅을 선택하세요.</p>
          </div>
        )}
      </div>

      {/* Exchange 주문 폼 */}
      <div className="bg-gray-50 p-3 rounded mb-3">
        <h3 className="font-semibold mb-2 text-sm text-gray-700">Exchange 주문</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium mb-1">Odds (배당률)</label>
            <input 
              type="number" 
              step="0.01"
              value={form.price} 
              onChange={e => {
                const newPrice = +e.target.value;
                setForm(f => ({ ...f, price: newPrice }));
                if (selectedBet) {
                  setSelectedBet({ ...selectedBet, price: newPrice });
                }
              }} 
              className="w-full p-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (원)</label>
            <input 
              type="text" 
              value={form.amount.toLocaleString()} 
              onChange={e => {
                const value = e.target.value.replace(/,/g, '');
                const numValue = parseInt(value) || 0;
                setForm(f => ({ ...f, amount: numValue }));
              }}
              className="w-full p-1 border rounded text-sm"
              placeholder="0"
            />
          </div>
          <button 
            onClick={handleOrder}
            disabled={loading || !selectedBet}
            className="w-full bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {loading ? '처리중...' : '주문'}
          </button>
        </div>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
          {error}
          <button onClick={clearError} className="float-right font-bold">&times;</button>
        </div>
      )}
      
      {/* 디버깅 정보 */}
      <div className="bg-yellow-50 p-2 rounded mb-3 border border-yellow-200 text-xs">
        <h4 className="font-semibold text-yellow-700 mb-1">디버깅 정보</h4>
        <div className="space-y-1">
          <div>selectedBet 존재: {selectedBet ? 'YES' : 'NO'}</div>
          <div>selectedBet 타입: {typeof selectedBet}</div>
          <div>selectedBet 값: {JSON.stringify(selectedBet, null, 2)}</div>
        </div>
      </div>
    </div>
  );
}

function OrderHistoryPanel() {
  const { orders: userOrders } = useExchange();

  return (
    <div className="h-full overflow-y-auto">
      <div className="bg-gray-50 p-3 rounded">
        <h3 className="font-semibold mb-2 text-sm text-gray-700">내 주문 내역</h3>
        {userOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">주문 내역이 없습니다.</p>
        ) : (
          <div className="space-y-1">
            {userOrders.slice(0, 15).map((order) => (
              <div key={order.id} className="flex justify-between items-center p-1 bg-white rounded border text-sm">
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
  const { isLoggedIn, balance } = useAuth();
  const [tab, setTab] = useState<'order' | 'history'>('order');

  const handleTabChange = (newTab: 'order' | 'history') => {
    setTab(newTab);
  };

  if (!isLoggedIn) {
    return (
      <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200 flex items-center justify-center min-h-full">
        <span className="text-gray-500 text-base font-semibold">로그인 후 Exchange 기능을 사용할 수 있습니다</span>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">EXCHANGE</h2>
        <span className="text-sm font-semibold text-blue-600">잔액: {balance !== null ? Number(balance).toLocaleString() : '-'}원</span>
      </div>
      <div className="flex space-x-2 mb-2">
        <button
          className={`flex-1 py-1 rounded ${tab === 'order' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => handleTabChange('order')}
        >
          주문
        </button>
        <button
          className={`flex-1 py-1 rounded ${tab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => handleTabChange('history')}
        >
          주문내역
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'order' ? <OrderPanel /> : <OrderHistoryPanel />}
      </div>
    </aside>
  );
} 