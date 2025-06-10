import { useEffect, useState } from "react";

interface Outcome {
  name: string;
  price: number;
}

interface Market {
  key: string;
  outcomes: Outcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

interface OddsListProps {
  sportKey: string;
}

export default function OddsList({ sportKey }: OddsListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOdds = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/odds/${sportKey}`);
        if (!response.ok) {
          throw new Error("Failed to fetch odds");
        }
        const data = await response.json();
        setGames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
  }, [sportKey]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (games.length === 0) return <div>No games available</div>;

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4">
        {games.map((game) => {
          const outcomes = game.bookmakers[0]?.markets[0]?.outcomes || [];
          const homeOdds = outcomes[0]?.price;
          const awayOdds = outcomes[1]?.price;

          return (
            <div key={game.id} className="bg-white text-black rounded-md p-4 shadow">
              {/* 팀과 배당 정보 */}
              <div className="flex flex-col gap-3">
                {/* 홈팀 */}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium">{game.home_team}</p>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500">
                      {new Date(game.commence_time).toLocaleString("ko-KR")}
                    </p>
                    <button className="bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors">
                      {homeOdds}
                    </button>
                  </div>
                </div>

                {/* 원정팀 */}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium">{game.away_team}</p>
                  <button className="bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors">
                    {awayOdds}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 