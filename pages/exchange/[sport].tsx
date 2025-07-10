import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ExchangeMarketBoard from '../../components/ExchangeMarketBoard';
import { getDisplayNameFromSportKey } from '../../config/sportsMapping';

export default function ExchangeSportPage() {
  const router = useRouter();
  const { sport } = router.query;
  const [selectedCategory, setSelectedCategory] = useState<string>("NBA");

  useEffect(() => {
    if (sport && typeof sport === 'string') {
      const displayName = getDisplayNameFromSportKey(sport);
      if (displayName) {
        // 해당 스포츠가 속한 메인 카테고리를 찾아서 트리 형태로 선택 (스포츠북의 전체 리그)
        const parentCategory = Object.entries({
          "축구": ["K리그", "J리그", "세리에A", "브라질세리에A", "MLS", "아르헨티나프리메라", "중국슈퍼리그", "라리가", "분데스리가"],
          "야구": ["MLB", "KBO"],
          "농구": ["NBA", "KBL"],
          "미식축구": ["NFL"]
        }).find(([main, subs]) => 
          subs.includes(displayName)
        );
        
        if (parentCategory) {
          // "축구 > K리그" 형태로 설정
          setSelectedCategory(`${parentCategory[0]} > ${displayName}`);
        } else {
          // 메인 카테고리에 속하지 않는 경우
          setSelectedCategory(displayName);
        }
      }
    }
  }, [sport]);

  if (!sport) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">스포츠를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <ExchangeMarketBoard selectedCategory={selectedCategory} />
  );
} 