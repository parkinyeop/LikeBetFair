// File: components/GameCard.tsx
import React from 'react';

interface GameCardProps {
  teams: string;
  time: string;
  odds?: [string, number][]; // 예: [["Home", 1.7], ["Away", 2.0]]
}

const GameCard: React.FC<GameCardProps> = ({ teams, time, odds = [["2", 2.0], ["1.7", 1.7]] }) => {
  const [home, away] = teams.split(" vs ");

  return (
    <div className="bg-gray-900 text-white rounded-md flex items-center justify-between px-4 py-3 shadow">
      {/* 왼쪽: 팀 이름 */}
      <div>
        <p className="text-sm font-medium">{home}</p>
        <p className="text-sm text-gray-300">{away}</p>
      </div>

      {/* 오른쪽: 시간 및 배당 */}
      <div className="flex flex-col items-end">
        <p className="text-xs font-semibold text-white">Today</p>
        <p className="text-xs text-gray-400 mb-1">{time}</p>
        <div className="flex gap-1">
          {odds.map(([label, value], idx) => (
            <div
              key={idx}
              className="bg-teal-700 px-2 py-1 rounded text-xs font-bold text-white"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
