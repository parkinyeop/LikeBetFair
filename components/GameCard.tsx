// File: components/GameCard.tsx
import React from 'react';

interface GameCardProps {
  teams: string;
  time: string;
  selectedTeam: string | null;
  onSelect: (match: string, team: string) => void;
  bookmakers?: any[];
}

const GameCard: React.FC<GameCardProps> = ({ teams, time, selectedTeam, onSelect, bookmakers }) => {
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

  // 배당율 정보 추출
  const getOdds = (teamName: string) => {
    if (!bookmakers || bookmakers.length === 0) return null;
    for (const bookmaker of bookmakers) {
      const h2hMarket = bookmaker.markets?.find((market: any) => market.key === 'h2h');
      if (h2hMarket) {
        const outcome = h2hMarket.outcomes?.find((outcome: any) =>
          outcome.name.trim().toLowerCase() === teamName.trim().toLowerCase()
        );
        if (outcome) return outcome.price;
      }
    }
    return null;
  };

  const teamAOdds = getOdds(teamA);
  const teamBOdds = getOdds(teamB);

  // 경기 시작 시간 체크 (10분 전 마감)
  const now = new Date();
  const marginMinutes = 10;
  const maxDays = 7;
  const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
  const commenceTime = new Date(time);
  const isPastGame = commenceTime <= new Date(now.getTime() + marginMinutes * 60000);
  const isTooFar = commenceTime > maxDate;
  const isBettable = !isPastGame && !isTooFar;

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-gray-700 font-semibold mb-2">{teams}</div>
      <div className="text-sm text-gray-500 mb-4">{new Date(time).toLocaleString()}</div>
      <div className="flex space-x-4">
        {[teamA, teamB].map((team, index) => {
          const odds = index === 0 ? teamAOdds : teamBOdds;
          return (
            <button
              key={team}
              onClick={() => handleClick(team)}
              className={`flex-1 px-4 py-2 rounded text-white font-bold transition-colors
                ${selectedTeam === team ? "bg-yellow-400" : "bg-blue-600 hover:bg-blue-700"}
                ${isPastGame || isTooFar ? "opacity-50 cursor-not-allowed" : ""}
              `}
              disabled={isPastGame || isTooFar}
            >
              <div>{team}</div>
              {odds && (
                <div className="text-xs mt-1 opacity-90">
                  배당: {odds}
                </div>
              )}
              {isPastGame && (
                <div className="text-xs mt-1 text-red-400 font-semibold">마감</div>
              )}
              {isTooFar && (
                <div className="text-xs mt-1 text-gray-400 font-semibold">오픈 예정</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GameCard;
