import React, { ReactNode, useState, useEffect, memo, useMemo, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useRouter } from "next/router";
import BetslipSidebar from "./BetslipSidebar";
import ExchangeSidebar from "./ExchangeSidebar";
import ResizableMainLayout from "./ResizableMainLayout";
import { SPORTS_TREE, getSportKey, getDisplayNameFromSportKey, getAllCategories } from "../config/sportsMapping";
import { useBetStore } from '../stores/useBetStore';

interface LayoutProps {
  children: ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState("NBA");
  const [betslipTab, setBetslipTab] = useState<'betslip' | 'mybets'>('betslip'); // 배팅슬립 탭 상태 추가
  const [exchangeActiveTab, setExchangeActiveTab] = useState<'order' | 'history'>('order'); // Exchange 사이드바 탭 상태 추가
  const [resetToHome, setResetToHome] = useState(false); // 홈 리셋 상태
  const { setTabChangeCallback } = useBetStore();
  
  // 페이지 체크 메모화
  const isExchange = useMemo(() => router.pathname.startsWith("/exchange"), [router.pathname]);

  useEffect(() => {
    if ((router.pathname.startsWith("/odds/") || router.pathname.startsWith("/exchange/")) && router.query.sport) {
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
        setResetToHome(false); // 특정 스포츠 페이지로 이동 시 리셋 해제
      }
    } else if (router.pathname === "/" || router.pathname === "/exchange") {
      // 홈페이지 또는 Exchange 홈페이지일 때는 사이드바 모든 카테고리 닫기
      setResetToHome(true);
      setSelected(""); // 선택 해제
    }
  }, [router.pathname, router.query.sport]);

  // 카테고리 목록 메모화
  const allCategories = useMemo(() => getAllCategories(), []);

  // 카테고리 선택 핸들러 메모화
  const handleCategorySelect = useCallback((category: string) => {
    setSelected(category);
    setResetToHome(false); // 카테고리 선택 시 리셋 해제
    
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      if (subCategory === "KBL") {
        alert("KBL은 준비중입니다.");
        return;
      }
      const sportKey = getSportKey(subCategory);
      if (sportKey) {
        // 익스체인지 페이지에서는 익스체인지 하위 페이지로 이동
        if (isExchange) {
          router.push(`/exchange/${sportKey}`);
        } else {
          // 스포츠북 페이지에서는 스포츠북 하위 페이지로 이동
          router.push(`/odds/${sportKey}`);
        }
      }
    }
  }, [router, isExchange]);

  // 배팅 영역 선택 핸들러 (메모화)
  const handleBettingAreaSelect = useCallback(() => {
    setBetslipTab('betslip'); // 배팅슬립 탭으로 변경
  }, []);

  // useBetStore에 탭 변경 콜백 설정
  useEffect(() => {
    setTabChangeCallback(setBetslipTab);
  }, [setTabChangeCallback]);

  // 전역 이벤트 리스너 추가
  useEffect(() => {
    const handleBettingAreaSelected = () => {
      setBetslipTab('betslip');
    };

    const handleCategorySelected = (event: CustomEvent) => {
      const { category } = event.detail;
      setSelected(category);
      setResetToHome(false); // 카테고리 선택 시 리셋 해제
    };

    const handleSportsbookSelected = () => {
      // 헤더에서 스포츠북 선택 시 사이드바 리셋
      setResetToHome(true);
      setSelected("");
    };

    const handleExchangeHomeSelected = () => {
      // 헤더에서 Exchange 홈 선택 시 사이드바 리셋
      setResetToHome(true);
      setSelected("");
    };

    const handleExchangeSidebarTabChange = (event: CustomEvent) => {
      // Exchange 사이드바 탭 변경 요청 처리
      setExchangeActiveTab(event.detail.tab);
    };

    window.addEventListener('bettingAreaSelected', handleBettingAreaSelected);
    window.addEventListener('categorySelected', handleCategorySelected as EventListener);
    window.addEventListener('sportsbookSelected', handleSportsbookSelected);
    window.addEventListener('exchangeHomeSelected', handleExchangeHomeSelected);
    window.addEventListener('exchangeSidebarTabChange', handleExchangeSidebarTabChange as EventListener);
    
    return () => {
      window.removeEventListener('bettingAreaSelected', handleBettingAreaSelected);
      window.removeEventListener('categorySelected', handleCategorySelected as EventListener);
      window.removeEventListener('sportsbookSelected', handleSportsbookSelected);
      window.removeEventListener('exchangeHomeSelected', handleExchangeHomeSelected);
      window.removeEventListener('exchangeSidebarTabChange', handleExchangeSidebarTabChange as EventListener);
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
              resetToHome={resetToHome}
            />
          }
          center={
            <div className="h-full flex flex-col p-4">
              {isExchange ? (
                React.cloneElement(children as React.ReactElement, { selectedCategory: selected })
              ) : (
                children
              )}
            </div>
          }
          right={
            isExchange ? (
              <ExchangeSidebar 
                activeTab={exchangeActiveTab}
                onTabChange={setExchangeActiveTab}
              />
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