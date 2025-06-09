// File: pages/index.tsx
import React from 'react';
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import GameCard from "../components/GameCard";

const sports = [
  "American Football", "Australian Rules", "Baseball", "Basketball", "Boxing", "Cricket", "Cycling",
  "Darts", "Esports", "Football", "Gaelic Games", "Golf", "Greyhound Racing", "Greyhounds - Today's Card",
  "Horse Racing", "Horse Racing - Today's Card", "Ice Hockey", "Mixed Martial Arts", "Motor Sport",
  "Politics", "Rugby League", "Rugby Union", "Snooker", "Special Bets", "Tennis", "Volleyball",
  "NBA", "Polish PLK", "Turkish TBSL"
];

const initialGameData: Record<string, { teams: string; time: string }[]> = Object.fromEntries(
  sports.map((s) => [s, []])
);

initialGameData["NBA"] = [
  { teams: "Oklahoma City Thunder vs Indiana Pacers", time: "13:00" },
];
initialGameData["Polish PLK"] = [
  { teams: "Start Lublin vs Legia Warszawa", time: "15:00" },
];
initialGameData["Turkish TBSL"] = [
  { teams: "Bahcesehir Koleji vs Fenerbahce Istanbul", time: "17:00" },
];

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState("NBA");
  const gameData = initialGameData;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: 고정된 높이 */}
      <div className="w-56 bg-gray-200 h-full">
        <Sidebar
          categories={sports}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Main content: 사이드바 옆에 위치하며 스크롤 가능 */}
      <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
        <h2 className="text-2xl font-bold mb-4">{selectedCategory}</h2>
        <div className="space-y-4">
          {gameData[selectedCategory]?.map((game, idx) => (
            <GameCard key={idx} teams={game.teams} time={game.time} />
          )) || <p className="text-gray-500">No match data available.</p>}
        </div>
      </main>
    </div>
  );
};

export default Home;