import React, { useState } from "react";
import BetSelectionPanel from "./BetSelectionPanel";
import { useAuth } from '../contexts/AuthContext';

function MyBetsPanel() {
  // TODO: 실제 배팅내역을 불러오는 로직으로 교체
  return (
    <div className="w-full p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold mb-3">배팅내역</h2>
      <p className="text-gray-500 text-sm">최근 배팅내역이 여기에 표시됩니다.</p>
    </div>
  );
}

export default function BetslipSidebar() {
  const { isLoggedIn, balance } = useAuth();
  const [tab, setTab] = useState<'betslip' | 'mybets'>('betslip');

  if (!isLoggedIn) {
    return (
      <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200 flex items-center justify-center min-h-full">
        <span className="text-gray-500 text-base font-semibold">로그인 후 배팅이 가능합니다</span>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">BET</h2>
        <span className="text-sm font-semibold text-blue-600">잔액: {balance !== null ? Number(balance).toLocaleString() : '-'}원</span>
      </div>
      <div className="flex space-x-2 mb-2">
        <button
          className={`flex-1 py-1 rounded ${tab === 'betslip' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setTab('betslip')}
        >
          베팅슬립
        </button>
        <button
          className={`flex-1 py-1 rounded ${tab === 'mybets' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setTab('mybets')}
        >
          배팅내역
        </button>
      </div>
      {tab === 'betslip' ? <BetSelectionPanel /> : <MyBetsPanel />}
    </aside>
  );
} 