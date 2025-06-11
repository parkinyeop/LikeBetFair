// File: pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/router";
import GameCard from "../components/GameCard";

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
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});

  const handleSelect = (match: string, team: string) => {
    setSelectedMatches((prev) => ({ ...prev, [match]: team }));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">경기 목록 (index)</h1>
      <div className="grid grid-cols-1 gap-4">
        <GameCard 
          teams="Chunichi Dragons vs Tohoku Rakuten Golden Eagles" 
          time="18:00" 
          selectedTeam={selectedMatches["Chunichi Dragons vs Tohoku Rakuten Golden Eagles"] || ""}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}