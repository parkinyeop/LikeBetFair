import Link from "next/link";

const sportsList = [
  { name: "K리그", key: "soccer_korea_kleague1" },
  { name: "NBA", key: "basketball_nba" },
  { name: "EPL", key: "soccer_epl" },
  { name: "MLB", key: "baseball_mlb" },
  { name: "NFL", key: "americanfootball_nfl" },
  { name: "UFC", key: "mma_mixed_martial_arts" },
];

export default function SportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">스포츠 목록</h1>
      <ul className="space-y-3">
        {sportsList.map((sport) => (
          <li key={sport.key}>
            <Link href={`/odds/${sport.key}`} className="text-blue-600 hover:underline">
              {sport.name} 배당 정보 보기 →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 