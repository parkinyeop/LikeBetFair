import { useRouter } from "next/router";
import OddsList from "../../components/OddsList";

export default function SportOddsPage() {
  const router = useRouter();
  const { sport } = router.query;

  if (!sport || typeof sport !== "string") return <p>Loading...</p>;

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">{sport.toUpperCase()} 배당 정보</h1>
      <div className="flex-1 min-h-0">
        <OddsList sportKey={sport} />
      </div>
    </div>
  );
} 