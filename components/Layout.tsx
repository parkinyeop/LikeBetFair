import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState } from "react";
import { useRouter } from "next/router";
import BetslipSidebar from "./BetslipSidebar";

const sportsTree = {
  축구: [
    "K리그",
    "J리그",
    "세리에 A",
    "브라질 세리에 A",
    "MLS",
    "아르헨티나 프리메라",
    "중국 슈퍼리그",
    "스페인 2부",
    "스웨덴 알스벤스칸"
  ],
  농구: [
    "NBA",
    "WNBA"
  ],
  야구: ["MLB", "KBO", "NCAA"],
  미식축구: ["CFL", "NCAAF", "NFL", "NFL 프리시즌"],
};

const sportKeyMap: Record<string, string> = {
  NBA: "basketball_nba",
  WNBA: "basketball_wnba",
  K리그: "soccer_korea_kleague1",
  J리그: "soccer_japan_j_league",
  "세리에 A": "soccer_italy_serie_a",
  "브라질 세리에 A": "soccer_brazil_campeonato",
  MLS: "soccer_usa_mls",
  "아르헨티나 프리메라": "soccer_argentina_primera_division",
  "중국 슈퍼리그": "soccer_china_superleague",
  "스페인 2부": "soccer_spain_segunda_division",
  "스웨덴 알스벤스칸": "soccer_sweden_allsvenskan",
  MLB: "baseball_mlb",
  KBO: "baseball_kbo",
  NCAA: "baseball_ncaa",
  CFL: "americanfootball_cfl",
  NCAAF: "americanfootball_ncaaf",
  NFL: "americanfootball_nfl",
  "NFL 프리시즌": "americanfootball_nfl_preseason",
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("NBA");

  const allCategories = Object.entries(sportsTree).flatMap(([main, subs]) => [
    main,
    ...subs.map((sub) => `${main} > ${sub}`),
  ]);

  const handleCategorySelect = (category: string) => {
    setSelected(category);
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      if (subCategory === "KBL") {
        alert("KBL은 준비중입니다.");
        return;
      }
      const sportKey = sportKeyMap[subCategory];
      if (sportKey) {
        router.push(`/odds/${sportKey}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-64 bg-white shadow-lg overflow-y-auto">
          <Sidebar
            categories={allCategories}
            selected={selected}
            onSelect={handleCategorySelect}
          />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4">
            {children}
          </div>
        </main>
        <div className="overflow-y-auto">
          <BetslipSidebar />
        </div>
      </div>
    </div>
  );
} 