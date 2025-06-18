import React, { useState } from 'react';
import { useBetStore } from '../stores/useBetStore';
import { useAuth } from '../contexts/AuthContext';

const BetSelectionPanel = () => {
  const { selections, stake, setStake, removeSelection, clearAll } = useBetStore();
  const { isLoggedIn, setBalance } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const expectedReturn = stake * totalOdds;

  // 베팅 가능 시간 체크 (10분 전 마감)
  const now = new Date();
  const marginMinutes = 10;
  const hasPastGame = selections.some(sel => !sel.commence_time || new Date(sel.commence_time) <= new Date(now.getTime() + marginMinutes * 60000));

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, ''); // 콤마 제거 후 숫자 변환
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setStake(value === '' ? 0 : parseFloat(value));
    }
  };

  // 입력란에 표시할 값 (천 단위 콤마)
  const stakeDisplay = stake === 0 ? '' : stake.toLocaleString();

  const handleBet = async () => {
    if (!isLoggedIn) {
      setMessage('로그인 후 이용 가능합니다.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5050/api/bet/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          selections,
          stake,
          totalOdds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('베팅이 성공적으로 저장되었습니다!');
        if (data.balance !== undefined) setBalance(Number(data.balance));
        clearAll();
        // 배팅 완료 이벤트 발생
        window.dispatchEvent(new Event('betPlaced'));
      } else {
        setMessage(data.message || '베팅 저장 실패');
      }
    } catch (err) {
      setMessage('서버 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">베팅 선택</h2>
        <button className="text-sm text-red-500" onClick={clearAll}>전체 삭제</button>
      </div>
      <ul className="space-y-2 mb-4">
        {selections.map((sel) => (
          <li key={sel.team} className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{sel.team}</p>
              <p className="text-xs text-gray-500">{sel.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{sel.odds.toFixed(2)}</span>
              <button onClick={() => removeSelection(sel.team)} className="text-red-500 text-xs">X</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mb-3">
        <label className="text-sm">배팅 금액</label>
        <input
          type="text"
          value={stakeDisplay}
          onChange={handleStakeChange}
          placeholder="0"
          className="w-full mt-1 border rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="text-sm">
        <p className="mb-1">총 배당률: <span className="font-semibold">{totalOdds.toFixed(2)}</span></p>
        <p className="mb-1">예상 수익: <span className="font-semibold">{expectedReturn.toLocaleString()} ₩</span></p>
      </div>
      <button
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        disabled={selections.length === 0 || stake <= 0 || loading || hasPastGame}
        onClick={handleBet}
      >
        {loading ? '베팅 중...' : '베팅하기'}
      </button>
      {hasPastGame && (
        <div className="mt-2 text-center text-sm text-red-600">이미 시작된 경기가 포함되어 있어 베팅이 불가합니다.</div>
      )}
      {message && <div className="mt-2 text-center text-sm text-blue-600">{message}</div>}
    </div>
  );
};

export default BetSelectionPanel; 