import Sidebar from "./Sidebar";
import { useState } from "react";
import { useRouter } from "next/router";

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

const allCategories = Object.entries(sportsTree).flatMap(([main, subs]) => [
  main,
  ...subs.map((sub) => `${main} > ${sub}`),
]);

export default function Layout({ children }) {
  const router = useRouter();
  const [selected, setSelected] = useState("NBA");

  const handleCategorySelect = (category: string) => {
    setSelected(category);
    
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      const sportKey = sportKeyMap[subCategory];
      if (sportKey) {
        router.push(`/odds/${sportKey}`);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-64 bg-white shadow-lg">
        <Sidebar
          categories={allCategories}
          selected={selected}
          onSelect={handleCategorySelect}
        />
      </div>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
} 