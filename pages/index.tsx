// File: pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import GameCard from "../components/GameCard";
import { SPORTS_TREE, getSportKey } from "../config/sportsMapping";
import { API_CONFIG, TIME_CONFIG, buildApiUrl, isBettingAllowed } from "../config/apiConfig";

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
  const router = useRouter();

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
        const apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${sportKey}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch games for ${selectedCategory}`);
        }
        
        const data = await response.json();
        
        // 정책: 오늘 00:00~7일 후 경기만 노출 (설정 기준)
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const maxDate = new Date(now.getTime() + TIME_CONFIG.BETTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const filteredGames = data.filter((game: any) => {
          const gameTime = new Date(game.commence_time);
          return gameTime >= startOfToday && gameTime <= maxDate;
        });
        
        // 중복 게임 제거 (home_team, away_team, commence_time 기준, 정보가 더 많은 쪽 우선)
        const uniqueGamesMap = new Map();
        filteredGames.forEach((game: any) => {
          const key = `${game.home_team}|${game.away_team}|${game.commence_time}`;
          if (!uniqueGamesMap.has(key)) {
            uniqueGamesMap.set(key, game);
          } else {
            // 기존 값과 비교해서 bookmakers가 더 많은 쪽을 남김
            const prev = uniqueGamesMap.get(key);
            if (
              (!prev.bookmakers && game.bookmakers) ||
              (Array.isArray(game.bookmakers) && Array.isArray(prev.bookmakers) && game.bookmakers.length > prev.bookmakers.length)
            ) {
              uniqueGamesMap.set(key, game);
            }
          }
        });
        const uniqueGames = Array.from(uniqueGamesMap.values());
        // 시작 시간순으로 정렬
        uniqueGames.sort((a: any, b: any) => {
          return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
        });
        
        if (selectedCategory === "KBO" && filteredGames.length > 0) {
          console.log("KBO bookmakers 구조 sample:", filteredGames[0].bookmakers);
        }
        setGames(uniqueGames);
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

  // 경기 클릭 시 상세 페이지로 이동
  const handleGameClick = (game: any) => {
    const sportKey = getSportKey(selectedCategory);
    if (sportKey) {
      router.push(`/odds/${sportKey}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
        홈화면은 정보 제공용입니다. 경기를 클릭하면 상세 페이지로 이동합니다.
      </div>
      <h1 className="text-2xl font-bold mb-6">경기 목록</h1>
      
      {/* 카테고리 선택 버튼들 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(SPORTS_TREE).map(([mainCategory, subCategories]) => (
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
            <div key={index} onClick={() => handleGameClick(game)} style={{ cursor: 'pointer' }}>
              <GameCard 
                teams={`${game.home_team} vs ${game.away_team}`}
                time={game.commence_time}
                selectedTeam={""}
                onSelect={() => {}} // 선택 불가
                bookmakers={game.bookmakers}
                infoOnly={true}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}