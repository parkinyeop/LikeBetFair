import { ReactNode, useState, useEffect, memo, useMemo, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useRouter } from "next/router";
import BetslipSidebar from "./BetslipSidebar";
import ExchangeSidebar from "./ExchangeSidebar";
import ResizableMainLayout from "./ResizableMainLayout";
import { SPORTS_TREE, getSportKey, getDisplayNameFromSportKey, getAllCategories } from "../config/sportsMapping";

interface LayoutProps {
  children: ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState("NBA");
  const [betslipTab, setBetslipTab] = useState<'betslip' | 'mybets'>('betslip'); // 배팅슬립 탭 상태 추가
  
  // 페이지 체크 메모화
  const isExchange = useMemo(() => router.pathname === "/exchange", [router.pathname]);

  useEffect(() => {
    if (router.pathname.startsWith("/odds/") && router.query.sport) {
      const sportKey = router.query.sport as string;
      const displayName = getDisplayNameFromSportKey(sportKey);
      if (displayName) {
        // 해당 스포츠가 속한 메인 카테고리를 찾아서 트리 형태로 선택
        const parentCategory = Object.entries(SPORTS_TREE).find(([main, subs]) => 
          subs.includes(displayName)
        );
        
        if (parentCategory) {
          // "축구 > K리그" 형태로 설정
          setSelected(`${parentCategory[0]} > ${displayName}`);
        } else {
          // 메인 카테고리에 속하지 않는 경우 (예외적인 경우)
          setSelected(displayName);
        }
      }
    }
  }, [router.pathname, router.query.sport]);

  // 카테고리 목록 메모화
  const allCategories = useMemo(() => getAllCategories(), []);

  // 카테고리 선택 핸들러 메모화
  const handleCategorySelect = useCallback((category: string) => {
    setSelected(category);
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      if (subCategory === "KBL") {
        alert("KBL은 준비중입니다.");
        return;
      }
      const sportKey = getSportKey(subCategory);
      if (sportKey) {
        router.push(`/odds/${sportKey}`);
      }
    }
  }, [router]);

  // 배팅 영역 선택 핸들러 (메모화)
  const handleBettingAreaSelect = useCallback(() => {
    setBetslipTab('betslip'); // 배팅슬립 탭으로 변경
  }, []);

  // 전역 이벤트 리스너 추가
  useEffect(() => {
    const handleBettingAreaSelected = () => {
      setBetslipTab('betslip');
    };

    const handleCategorySelected = (event: CustomEvent) => {
      const { category } = event.detail;
      setSelected(category);
    };

    window.addEventListener('bettingAreaSelected', handleBettingAreaSelected);
    window.addEventListener('categorySelected', handleCategorySelected as EventListener);
    
    return () => {
      window.removeEventListener('bettingAreaSelected', handleBettingAreaSelected);
      window.removeEventListener('categorySelected', handleCategorySelected as EventListener);
    };
  }, []);

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <Header />
      <div className="flex-1 min-h-0">
        <ResizableMainLayout
          left={
            <Sidebar
              categories={allCategories}
              selected={selected}
              onSelect={handleCategorySelect}
            />
          }
          center={
            <div className="h-full flex flex-col p-4">
              {children}
            </div>
          }
          right={
            isExchange ? (
              <ExchangeSidebar />
            ) : (
              <div className="h-full flex flex-col">
                <BetslipSidebar 
                  activeTab={betslipTab}
                  onTabChange={setBetslipTab}
                  onBettingAreaSelect={handleBettingAreaSelect}
                />
              </div>
            )
          }
        />
      </div>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout; 