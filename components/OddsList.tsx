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
    setLoading(true);
    setError(null);
    
    fetch(`/api/odds/${sportKey}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        return data;
      })
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch odds data");
        setLoading(false);
        console.error("Error fetching odds:", err);
      });
  }, [sportKey]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading odds data...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return <div className="p-4 text-gray-500">No games available</div>;
  }

  return (
    <div className="p-4">
      {games.map((game) => (
        <div key={game.id} className="bg-white p-4 mb-4 rounded shadow">
          <h3 className="font-bold text-lg">
            {game.home_team} vs {game.away_team}
          </h3>
          <p className="text-sm text-gray-500">
            {new Date(game.commence_time).toLocaleString()}
          </p>
          {game.bookmakers[0]?.markets[0]?.outcomes.map((o) => (
            <button
              key={o.name}
              className="bg-blue-500 text-white px-3 py-1 rounded m-1"
            >
              {o.name}: {o.price}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
} 