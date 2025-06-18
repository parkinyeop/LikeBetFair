import Link from "next/link";

const sportsList = [
  { name: "K리그", key: "soccer_korea_kleague1" },
  { name: "EPL", key: "soccer_epl" },
  { name: "라리가", key: "soccer_spain_la_liga" },
  { name: "분데스리가", key: "soccer_germany_bundesliga" },
  { name: "세리에 A", key: "soccer_italy_serie_a" },
  { name: "리그 1", key: "soccer_france_ligue_1" },
  { name: "J리그", key: "soccer_japan_j_league" },
  { name: "MLS", key: "soccer_usa_mls" },
  { name: "NBA", key: "basketball_nba" },
  { name: "MLB", key: "baseball_mlb" },
  { name: "KBO", key: "baseball_kbo" },
  { name: "NFL", key: "americanfootball_nfl" },
  { name: "NHL", key: "icehockey_nhl" },
  { name: "UFC", key: "mma_mixed_martial_arts" },
  { name: "테니스 ATP", key: "tennis_atp_singles" },
  { name: "테니스 WTA", key: "tennis_wta_singles" },
  { name: "CS2", key: "esports_cs2" },
  { name: "LoL", key: "esports_lol" },
  { name: "Dota 2", key: "esports_dota2" },
  { name: "Valorant", key: "esports_valorant" },
];

export default function SportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">스포츠 목록</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sportsList.map((sport) => (
          <div key={sport.key} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Link href={`/odds/${sport.key}`} className="block text-blue-600 hover:text-blue-800 font-medium">
              {sport.name} 배당 정보 보기 →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
} 