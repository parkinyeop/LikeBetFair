// File: components/GameCard.tsx
import React from 'react';

interface GameCardProps {
  teams: string;
  time: string;
  selectedTeam: string | null;
  onSelect: (match: string, team: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ teams, time, selectedTeam, onSelect }) => {
  const [teamA, teamB] = teams.split(" vs ");

  const handleClick = (team: string) => {
    // 같은 팀을 다시 클릭하면 선택 해제
    if (selectedTeam === team) {
      onSelect(teams, "");
    } else {
      // 다른 팀을 선택하면 이전 선택은 자동으로 해제되고 새로운 팀 선택
      onSelect(teams, team);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-gray-700 font-semibold mb-2">{teams}</div>
      <div className="text-sm text-gray-500 mb-4">{time}</div>
      <div className="flex space-x-4">
        {[teamA, teamB].map((team) => (
          <button
            key={team}
            onClick={() => handleClick(team)}
            className={`flex-1 px-4 py-2 rounded text-white font-bold transition-colors
              ${selectedTeam === team ? "bg-yellow-400" : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            {team}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GameCard;
