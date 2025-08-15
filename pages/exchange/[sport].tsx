import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ExchangeMarketBoard from '../../components/ExchangeMarketBoard';
import { getDisplayNameFromSportKey } from '../../config/sportsMapping';

export default function ExchangeSportPage() {
  const router = useRouter();
  const { sport } = router.query;
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    if (sport && typeof sport === 'string') {
      const displayName = getDisplayNameFromSportKey(sport);
      console.log(`[ExchangeSportPage] sport: ${sport}, displayName: ${displayName}`);
      
      if (displayName) {
        // 해당 스포츠가 속한 메인 카테고리를 찾아서 트리 형태로 선택 (스포츠북의 전체 리그)
        const parentCategory = Object.entries({
          "축구": ["K League", "J League", "Serie A", "Brasileirao", "MLS", "Argentina Primera", "Chinese Super League", "La Liga", "Bundesliga"],
          "야구": ["MLB", "KBO"],
          "농구": ["NBA", "KBL"],
          "미식축구": ["NFL"]
        }).find(([main, subs]) => 
          subs.includes(displayName)
        );
        
        let category = displayName;
        if (parentCategory) {
          // "축구 > K League" 형태로 설정
          category = `${parentCategory[0]} > ${displayName}`;
        }
        
        console.log(`[ExchangeSportPage] selectedCategory 설정: ${category}`);
        setSelectedCategory(category);
      }
    }
  }, [sport]);

  // router.query가 준비되지 않은 경우 로딩 표시
  if (!router.isReady) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!sport || !selectedCategory) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">스포츠 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">{typeof sport === 'string' ? sport.toUpperCase() : 'EXCHANGE'}</h1>
      <div className="flex-1 min-h-0">
        <ExchangeMarketBoard 
          selectedCategory={selectedCategory}
          onSidebarTabChange={(tab: 'order' | 'history') => {
            // 전역 이벤트로 사이드바 탭 변경 요청
            window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', { 
              detail: { tab } 
            }));
          }}
        />
      </div>
    </div>
  );
} 