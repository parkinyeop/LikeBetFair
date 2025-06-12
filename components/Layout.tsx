import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState } from "react";
import { useRouter } from "next/router";
import BetslipSidebar from "./BetslipSidebar";

const sportsTree = {
  축구: ["EPL", "라리가", "분데스리가", "세리에 A"],
  농구: ["NBA", "KBL"],
  야구: ["MLB", "KBO"],
  미식축구: ["NFL"],
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