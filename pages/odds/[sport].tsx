import { useRouter } from "next/router";
import OddsList from "../../components/OddsList";
import { useCallback } from "react";

export default function SportOddsPage() {
  const router = useRouter();
  const { sport } = router.query;

  // 배팅 영역 선택 핸들러
  const handleBettingAreaSelect = useCallback(() => {
    // 전역 이벤트를 발생시켜 Layout에서 처리하도록 함
    window.dispatchEvent(new CustomEvent('bettingAreaSelected'));
  }, []);

  if (!sport || typeof sport !== "string") return <p>Loading...</p>;

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">{sport.toUpperCase()} Odds</h1>
      <div className="flex-1 min-h-0">
        <OddsList sportKey={sport} onBettingAreaSelect={handleBettingAreaSelect} />
      </div>
    </div>
  );
} 