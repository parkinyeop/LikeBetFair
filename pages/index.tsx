// File: pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import GameCard from "../components/GameCard";

const sportsTree = {
  축구: [
    "K리그",
    "EPL",
    "라리가",
    "분데스리가",
    "세리에 A",
    "리그 1",
    "J리그",
    "MLS",
    "아르헨티나 프리메라",
    "중국 슈퍼리그",
    "스페인 2부",
    "스웨덴 알스벤스칸",
    "브라질 세리에 A"
  ],
  농구: ["NBA"],
  야구: ["MLB", "KBO"],
  미식축구: ["NFL"],
  아이스하키: ["NHL"]
};

const sportKeyMap: Record<string, string> = {
  NBA: "basketball_nba",
  K리그: "soccer_korea_kleague1",
  EPL: "soccer_epl",
  라리가: "soccer_spain_la_liga",
  분데스리가: "soccer_germany_bundesliga",
  "세리에 A": "soccer_italy_serie_a",
  "리그 1": "soccer_france_ligue_1",
  J리그: "soccer_japan_j_league",
  MLS: "soccer_usa_mls",
  "아르헨티나 프리메라": "soccer_argentina_primera_division",
  "중국 슈퍼리그": "soccer_china_superleague",
  "스페인 2부": "soccer_spain_segunda_division",
  "스웨덴 알스벤스칸": "soccer_sweden_allsvenskan",
  "브라질 세리에 A": "soccer_brazil_campeonato",
  MLB: "baseball_mlb",
  KBO: "baseball_kbo",
  NFL: "americanfootball_nfl",
  NHL: "icehockey_nhl"
};

const getSportKey = (category: string) => sportKeyMap[category] || "";

const initialGameData: Record<string, { teams: string; time: string }[]> = {
  "EPL": [
    { teams: "맨체스터 유나이티드 vs 리버풀", time: "2024-03-20 20:00" },
    { teams: "아스널 vs 첼시", time: "2024-03-21 19:45" },
  ],
  "NBA": [
    { teams: "LA 레이커스 vs 골든스테이트", time: "2024-03-20 11:30" },
    { teams: "보스턴 vs 마이애미", time: "2024-03-21 08:00" },
  ],
  "MLB": [
    { teams: "LA 다저스 vs 뉴욕 양키스", time: "2024-03-20 10:00" },
    { teams: "시카고 컵스 vs 세인트루이스", time: "2024-03-21 09:00" },
  ],
};

export default function Home() {
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("KBO");
  const [currentSportKey, setCurrentSportKey] = useState<string>("");

  useEffect(() => {
    const fetchGames = async () => {
      if (selectedCategory === currentSportKey) return; // 이미 로드된 데이터면 스킵
      
      try {
        setLoading(true);
        const sportKey = getSportKey(selectedCategory);
        if (!sportKey) {
          setError('Invalid sport category');
          setLoading(false);
          return;
        }

        console.log(`Fetching data for ${selectedCategory} with sportKey: ${sportKey}`);
        const response = await fetch(`http://localhost:5050/api/odds/${sportKey}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch games for ${selectedCategory}`);
        }
        
        const data = await response.json();
        
        // 현재 시간 이후의 경기만 필터링
        const now = new Date();
        const filteredGames = data.filter((game: any) => {
          const gameTime = new Date(game.commence_time);
          return gameTime > now;
        });
        
        // 시작 시간순으로 정렬
        filteredGames.sort((a: any, b: any) => {
          return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
        });
        
        if (selectedCategory === "KBO" && filteredGames.length > 0) {
          console.log("KBO bookmakers 구조 sample:", filteredGames[0].bookmakers);
        }
        setGames(filteredGames);
        setCurrentSportKey(selectedCategory);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchGames();
  }, [selectedCategory, currentSportKey]);

  const handleSelect = (match: string, team: string) => {
    setSelectedMatches((prev) => ({ ...prev, [match]: team }));
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">경기 목록</h1>
      
      {/* 카테고리 선택 버튼들 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(sportsTree).map(([mainCategory, subCategories]) => (
          <div key={mainCategory} className="flex flex-wrap gap-1">
            {subCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* 현재 선택된 카테고리 표시 */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          현재 선택: {selectedCategory}
        </h2>
        <p className="text-sm text-gray-500">
          총 {games.length}개의 경기가 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {games.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {selectedCategory}에 대한 경기 데이터가 없습니다.
          </div>
        ) : (
          games.map((game, index) => (
            <GameCard 
              key={index}
              teams={`${game.home_team} vs ${game.away_team}`}
              time={game.commence_time}
              selectedTeam={selectedMatches[`${game.home_team} vs ${game.away_team}`] || ""}
              onSelect={handleSelect}
              bookmakers={game.bookmakers}
            />
          ))
        )}
      </div>
    </div>
  );
}