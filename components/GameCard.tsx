// File: components/GameCard.tsx
import React from 'react';
import { useBetStore } from '../stores/useBetStore';

interface GameCardProps {
  id: string;
  teams: string;
  time: string;
}

const GameCard: React.FC<GameCardProps> = ({ id, teams, time }) => {
  const { selections, toggleSelection } = useBetStore();
  const isSelected = selections.some(selection => selection.team === teams);

  return (
    <div
      onClick={() => toggleSelection({ team: teams, odds: 1.5, desc: teams })}
      className={`p-4 border rounded-md shadow transition-colors cursor-pointer 
        ${isSelected ? 'bg-yellow-300 border-yellow-500' : 'bg-white hover:bg-gray-100'}`}
    >
      <div className="font-semibold mb-2">{teams}</div>
      <div className="text-sm text-gray-600">{time}</div>

      {/* 베팅 버튼 */}
      <button
        className={`mt-3 px-4 py-2 rounded-md font-medium text-white 
          ${isSelected ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isSelected ? '선택됨' : '베팅하기'}
      </button>
    </div>
  );
};

export default GameCard;
