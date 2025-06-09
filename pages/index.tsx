// File: pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import GameCard from "../components/GameCard";
import OddsList from "../components/OddsList";

const sportsTree = {
  축구: ["EPL", "라리가", "분데스리가", "세리에 A"],
  농구: ["NBA", "KBL"],
  야구: ["MLB", "KBO"],
  미식축구: ["NFL"],
  격투기: ["UFC", "ONE"],
  Tennis: [],
};

const sportKeyMap: Record<string, string> = {
  NBA: "basketball_nba",
  EPL: "soccer_epl",
  라리가: "soccer_la_liga",
  분데스리가: "soccer_bundesliga",
  세리에A: "soccer_serie_a",
  MLB: "baseball_mlb",
  KBO: "baseball_kbo",
  NFL: "americanfootball_nfl",
  UFC: "mma_mixed_martial_arts",
  ONE: "mma_one",
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
  const router = useRouter();
  const [selectedMain, setSelectedMain] = useState<string>("");
  const [selectedSub, setSelectedSub] = useState<string>("");
  const gameData = initialGameData;
  const currentCategory = selectedSub || selectedMain;
  const currentGames = gameData[currentCategory] || [];

  const handleCategoryClick = (category: string) => {
    const sportKey = getSportKey(category);
    if (sportKey) {
      // 라우팅 대신 현재 페이지에서 카드 정보 표시
      setSelectedMain(category.split(" > ")[0]);
      setSelectedSub(category);
    }
  };

  // 모든 카테고리를 하나의 배열로 변환
  const allCategories = Object.entries(sportsTree).flatMap(([main, subs]) => [
    main,
    ...subs.map(sub => `${main} > ${sub}`)
  ]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-64 bg-white shadow-lg">
        <Sidebar
          categories={allCategories}
          selected={selectedSub || selectedMain}
          onSelect={(category) => {
            if (category.includes(" > ")) {
              const [main, sub] = category.split(" > ");
              setSelectedMain(main);
              setSelectedSub(sub);
              handleCategoryClick(sub);
            } else {
              setSelectedMain(category);
              setSelectedSub("");
              handleCategoryClick(category);
            }
          }}
        />
      </div>
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">경기 목록 (index)</h1>
        <GameCard teams="LA Lakers vs Miami Heat" time="2025-06-11 10:00" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentGames.length > 0 ? (
            currentGames.map((game, index) => (
              <GameCard key={index} teams={game.teams} time={game.time} />
            ))
          ) : (
            <p className="col-span-full text-gray-500">해당 경기 정보가 없습니다.</p>
          )}
        </div>
      </main>
    </div>
  );
}