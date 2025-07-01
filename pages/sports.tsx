import Link from "next/link";
import { SEASON_SCHEDULES, getSeasonInfo, getSeasonStatusStyle, getSeasonStatusBadge, SPORT_CATEGORIES } from "../config/sportsMapping";

// 실제로 배당율을 제공하는 리그들 (백엔드와 일치)
const sportsList = Object.entries(SPORT_CATEGORIES).map(([displayName, config]) => {
  const seasonInfo = getSeasonInfo(config.sportKey);
  return {
    name: displayName,
    key: config.sportKey,
    category: config.sportKey.includes('soccer') ? '축구' : 
              config.sportKey.includes('basketball') ? '농구' :
              config.sportKey.includes('baseball') ? '야구' : '미식축구',
    status: seasonInfo?.status || 'active',
    seasonInfo
  };
});

// 카테고리별 그룹화
const sportsByCategory = sportsList.reduce((acc, sport) => {
  if (!acc[sport.category]) acc[sport.category] = [];
  acc[sport.category].push(sport);
  return acc;
}, {} as Record<string, typeof sportsList>);

// 날짜 포맷팅 함수
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { 
    month: 'long', 
    day: 'numeric',
    weekday: 'short'
  });
};

export default function SportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">스포츠 목록</h1>
      <div className="space-y-8">
        {Object.entries(sportsByCategory).map(([category, sports]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sports.map((sport) => {
                const statusBadge = getSeasonStatusBadge(sport.status);
                return (
                  <div 
                    key={sport.key} 
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${getSeasonStatusStyle(sport.status)}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-900">{sport.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.className}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    
                    {/* 시즌 정보 표시 */}
                    {sport.seasonInfo && (
                      <div className="mb-3 text-sm text-gray-600">
                        <p className="font-medium">{sport.seasonInfo.description}</p>
                        {sport.seasonInfo.nextSeasonStart && (
                          <p className="text-xs mt-1">
                            다음 시즌: {formatDate(sport.seasonInfo.nextSeasonStart)}
                          </p>
                        )}
                        {sport.seasonInfo.breakPeriod && (
                          <p className="text-xs mt-1">
                            재개: {formatDate(sport.seasonInfo.breakPeriod.end)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <Link 
                      href={`/odds/${sport.key}`} 
                      className={`block text-sm font-medium transition-colors ${
                        sport.status === 'active' 
                          ? 'text-blue-600 hover:text-blue-800' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {sport.status === 'active' ? '배당 정보 보기 →' : '시즌 정보 보기 →'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">📊 리그 상태 안내</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span><strong>진행중:</strong> 현재 시즌이 진행되어 배당율이 제공됩니다.</p>
          <p><span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span><strong>휴식기:</strong> 시즌 중반 휴식기이며 곧 재개됩니다.</p>
          <p><span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span><strong>시즌오프:</strong> 현재 시즌이 종료되었거나 다음 시즌 준비 중입니다.</p>
        </div>
      </div>
    </div>
  );
} 