import React from 'react';
import { useBetStore } from '../stores/useBetStore';

const BetSelectionPanel = () => {
  const { selections, stake, setStake, removeSelection, clearAll } = useBetStore();

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const expectedReturn = (stake * totalOdds).toFixed(2);

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 빈 문자열이거나 숫자인 경우에만 값을 설정
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setStake(value === '' ? 0 : parseFloat(value));
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
          value={stake === 0 ? '' : stake}
          onChange={handleStakeChange}
          placeholder="0"
          className="w-full mt-1 border rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="text-sm">
        <p className="mb-1">총 배당률: <span className="font-semibold">{totalOdds.toFixed(2)}</span></p>
        <p className="mb-1">예상 수익: <span className="font-semibold">{expectedReturn} ₩</span></p>
      </div>
      <button
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700"
        disabled={selections.length === 0 || stake <= 0}
      >
        베팅하기
      </button>
    </div>
  );
};

export default BetSelectionPanel; 