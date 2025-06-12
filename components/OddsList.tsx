import React, { useEffect, useState } from 'react';
import { useBetStore } from '../stores/useBetStore';

interface OddsListProps {
  sportKey: string;
}

interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

const OddsList: React.FC<OddsListProps> = ({ sportKey }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selections, toggleSelection } = useBetStore();

  useEffect(() => {
    const fetchOdds = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5050/api/odds/${sportKey}`);
        if (!response.ok) {
          throw new Error('Failed to fetch odds');
        }
        const data = await response.json();
        setGames(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch odds');
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
    const interval = setInterval(fetchOdds, 5 * 60 * 1000); // 5분마다 갱신

    return () => clearInterval(interval);
  }, [sportKey]);

  const isTeamSelected = (team: string) => {
    return selections.some(selection => selection.team === team);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {games.map((game) => {
        const gameTime = new Date(game.commence_time);
        const now = new Date();
        const diffHours = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isSoon = diffHours < 168; // 7일 미만만 활성화
        return (
          <div key={game.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-500">
                {gameTime.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">{game.sport_title}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 홈팀 */}
              <button
                onClick={() => isSoon && toggleSelection({
                  team: game.home_team,
                  odds: game.bookmakers[0]?.markets[0]?.outcomes[0]?.price || 0,
                  desc: `${game.home_team} vs ${game.away_team}`,
                  commence_time: game.commence_time
                })}
                className={`p-3 rounded-lg text-center transition-colors ${
                  isTeamSelected(game.home_team)
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : isSoon ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                } text-white`}
                disabled={!isSoon}
              >
                <div className="font-bold">{game.home_team}</div>
                <div className="text-sm">
                  {game.bookmakers[0]?.markets[0]?.outcomes[0]?.price || 'N/A'}
                </div>
                {!isSoon && <div className="text-xs text-red-500 mt-1">준비중</div>}
              </button>

              {/* 원정팀 */}
              <button
                onClick={() => isSoon && toggleSelection({
                  team: game.away_team,
                  odds: game.bookmakers[0]?.markets[0]?.outcomes[1]?.price || 0,
                  desc: `${game.home_team} vs ${game.away_team}`,
                  commence_time: game.commence_time
                })}
                className={`p-3 rounded-lg text-center transition-colors ${
                  isTeamSelected(game.away_team)
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : isSoon ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                } text-white`}
                disabled={!isSoon}
              >
                <div className="font-bold">{game.away_team}</div>
                <div className="text-sm">
                  {game.bookmakers[0]?.markets[0]?.outcomes[1]?.price || 'N/A'}
                </div>
                {!isSoon && <div className="text-xs text-red-500 mt-1">준비중</div>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OddsList; 