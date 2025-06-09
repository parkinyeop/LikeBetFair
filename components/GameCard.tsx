// File: components/GameCard.tsx
import React from 'react';

type GameCardProps = {
  teams: string;
  time: string;
};

const GameCard = ({ teams, time }: GameCardProps) => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="font-semibold">{teams}</p>
      <p className="text-sm text-gray-600">Start time: {time}</p>
      <div className="mt-2 flex gap-2">
        <button className="bg-blue-500 text-white px-3 py-1 rounded">1.85</button>
        <button className="bg-red-500 text-white px-3 py-1 rounded">2.15</button>
        <select className="ml-auto border px-2 py-1 rounded">
          <option>Multiples</option>
        </select>
      </div>
    </div>
  );
};

export default GameCard;
