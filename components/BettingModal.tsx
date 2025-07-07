import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface BettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (betData: BetData) => void;
  selection: {
    team: string;
    price: number;
    type: 'back' | 'lay';
  };
}

interface BetData {
  team: string;
  price: number;
  amount: number;
  type: 'back' | 'lay';
  potentialProfit: number;
  totalStake: number;
}

export default function BettingModal({ isOpen, onClose, onConfirm, selection }: BettingModalProps) {
  const { balance } = useAuth();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setAmount(value);
      setError('유효한 금액을 입력해주세요.');
      return;
    }
    
    setAmount(value);
    setError('');
  };

  const calculateProfit = () => {
    const stake = parseFloat(amount);
    if (isNaN(stake) || stake <= 0) return 0;
    
    if (selection.type === 'back') {
      return (stake * selection.price) - stake;
    } else {
      return stake - (stake / selection.price);
    }
  };

  const handleConfirm = () => {
    const stake = parseFloat(amount);
    if (isNaN(stake) || stake <= 0) {
      setError('유효한 금액을 입력해주세요.');
      return;
    }

    if (stake < 1000) {
      setError('최소 배팅 금액은 1,000원입니다.');
      return;
    }

    if (balance && stake > balance) {
      setError('잔액이 부족합니다.');
      return;
    }

    const betData: BetData = {
      team: selection.team,
      price: selection.price,
      amount: stake,
      type: selection.type,
      potentialProfit: calculateProfit(),
      totalStake: selection.type === 'back' ? stake : stake / selection.price
    };

    onConfirm(betData);
    onClose();
  };

  const profit = calculateProfit();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {selection.type === 'back' ? 'Back' : 'Lay'} 배팅
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* 선택 정보 */}
          <div className="bg-gray-50 p-4 rounded">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{selection.team}</span>
              <span className={`font-bold text-lg ${
                selection.type === 'back' ? 'text-blue-600' : 'text-pink-600'
              }`}>
                {selection.price.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {selection.type === 'back' ? '승리 시 배당' : '레이 배당'}
            </div>
          </div>

          {/* 배팅 금액 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              배팅 금액 (원)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="배팅 금액을 입력하세요"
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1000"
              step="1000"
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          {/* 배팅 정보 */}
          {amount && !error && (
            <div className="bg-blue-50 p-4 rounded">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>배팅 금액:</span>
                  <span className="font-semibold">{parseFloat(amount).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>배당율:</span>
                  <span className="font-semibold">{selection.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>예상 수익:</span>
                  <span className="font-semibold text-green-600">
                    {profit.toFixed(0)}원
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>총 반환금:</span>
                  <span className="font-semibold">
                    {(parseFloat(amount) + profit).toFixed(0)}원
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 사용자 잔액 */}
          {balance && (
            <div className="text-sm text-gray-600">
              현재 잔액: {balance.toLocaleString()}원
            </div>
          )}

          {/* 버튼 */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!amount || !!error}
              className={`flex-1 px-4 py-2 rounded font-semibold transition-colors ${
                !amount || !!error
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : selection.type === 'back'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-pink-600 text-white hover:bg-pink-700'
              }`}
            >
              {selection.type === 'back' ? 'Back' : 'Lay'} 배팅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 