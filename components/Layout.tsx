import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import BetslipSidebar from "./BetslipSidebar";
import ResizableMainLayout from "./ResizableMainLayout";

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
  ],
  야구: ["MLB", "KBO"],
  미식축구: ["NCAAF", "NFL"],
};

const sportKeyMap: Record<string, string> = {
  NBA: "basketball_nba",
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
  NCAAF: "americanfootball_ncaaf",
  NFL: "americanfootball_nfl",
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("NBA");
  const isExchange = router.pathname === "/exchange";

  useEffect(() => {
    if (router.pathname.startsWith("/odds/") && router.query.sport) {
      const sportKey = router.query.sport as string;
      const found = Object.entries(sportKeyMap).find(([label, key]) => key === sportKey);
      if (found) {
        setSelected(found[0]);
      }
    }
  }, [router.pathname, router.query.sport]);

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
    <div className="h-screen bg-gray-100 flex flex-col">
      <Header />
      <div className="flex-1 h-0">
        <ResizableMainLayout
          left={
            <Sidebar
              categories={allCategories}
              selected={selected}
              onSelect={handleCategorySelect}
            />
          }
          center={
            <div className="p-4">{children}</div>
          }
          right={
            isExchange ? (
              <div className="flex items-center justify-center min-h-full p-8 text-center text-gray-500">
                <div>
                  <h2 className="text-xl font-bold mb-2">Exchange 준비중</h2>
                  <p>이 영역은 곧 Exchange 기능으로 대체됩니다.</p>
                </div>
              </div>
            ) : (
              <BetslipSidebar />
            )
          }
        />
      </div>
    </div>
  );
} 