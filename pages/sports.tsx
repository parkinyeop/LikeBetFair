import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SPORT_CATEGORIES, getSportKey, getSeasonInfo, getSeasonStatusBadge, getSeasonStatusStyle } from "../config/sportsMapping";

interface SportCategory {
  name: string;
  leagues: {
    name: string;
    key: string;
    gameCount?: number;
  }[];
}

const sportCategories: SportCategory[] = [
  {
    name: "축구",
    leagues: [
      { name: "K리그", key: "soccer_korea_kleague1" },
      { name: "J리그", key: "soccer_japan_j_league" },
      { name: "세리에 A", key: "soccer_italy_serie_a" },
      { name: "브라질 세리에 A", key: "soccer_brazil_campeonato" },
      { name: "MLS", key: "soccer_usa_mls" },
      { name: "아르헨티나 프리메라", key: "soccer_argentina_primera_division" },
      { name: "중국 슈퍼리그", key: "soccer_china_superleague" },
      { name: "라리가", key: "soccer_spain_primera_division" },
      { name: "분데스리가", key: "soccer_germany_bundesliga" },
      { name: "프리미어리그", key: "soccer_england_premier_league" },
    ]
  },
  {
    name: "농구",
    leagues: [
      { name: "NBA", key: "basketball_nba" },
      { name: "KBL", key: "basketball_kbl" },
    ]
  },
  {
    name: "야구",
    leagues: [
      { name: "MLB", key: "baseball_mlb" },
      { name: "KBO", key: "baseball_kbo" },
    ]
  },
  {
    name: "미식축구",
    leagues: [
      { name: "NFL", key: "americanfootball_nfl" },
    ]
  }
];

export default function SportsPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [leagueData, setLeagueData] = useState<Record<string, { gameCount: number; sampleOdds?: any }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // 리그별 경기 수와 샘플 배당율 가져오기
  const fetchLeagueData = async (leagueKey: string) => {
    if (leagueData[leagueKey]) return; // 이미 로드된 경우 스킵
    
    setLoading(prev => ({ ...prev, [leagueKey]: true }));
    
    try {
      // API URL 결정
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                    (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                     ? 'http://localhost:5050' 
                     : 'https://likebetfair-api.onrender.com');
      
      const response = await fetch(`${apiUrl}/api/odds/${leagueKey}`);
      if (response.ok) {
        const data = await response.json();
        
        // 오늘부터 7일 후까지의 경기만 필터링
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const filteredGames = data.filter((game: any) => {
          const gameTime = new Date(game.commence_time);
          return gameTime >= startOfToday && gameTime <= maxDate;
        });

        // 샘플 배당율 추출 (첫 번째 경기의 h2h 배당율)
        let sampleOdds = null;
        if (filteredGames.length > 0 && filteredGames[0].officialOdds?.h2h) {
          const h2hOdds = filteredGames[0].officialOdds.h2h;
          const firstTeam = Object.keys(h2hOdds)[0];
          if (firstTeam) {
            sampleOdds = h2hOdds[firstTeam].averagePrice;
          }
        }

        setLeagueData(prev => ({
          ...prev,
          [leagueKey]: {
            gameCount: filteredGames.length,
            sampleOdds
          }
        }));
      }
    } catch (error) {
      console.error(`Error fetching ${leagueKey}:`, error);
      setLeagueData(prev => ({
        ...prev,
        [leagueKey]: { gameCount: 0 }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [leagueKey]: false }));
    }
  };

  // 카테고리 토글
  const toggleCategory = (categoryName: string) => {
    if (expandedCategory === categoryName) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryName);
      
      // 카테고리가 열릴 때 해당 리그들의 데이터 로드
      const category = sportCategories.find(cat => cat.name === categoryName);
      if (category) {
        category.leagues.forEach(league => {
          fetchLeagueData(league.key);
        });
      }
    }
  };

  // 리그 상태 가져오기
  const getLeagueStatus = (leagueKey: string) => {
    const seasonInfo = getSeasonInfo(leagueKey);
    return seasonInfo?.status || 'offseason';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">🏈 스포츠북 리그별 보기</h1>
      
      <div className="space-y-4">
        {sportCategories.map((category) => {
          const isExpanded = expandedCategory === category.name;
          
          return (
            <div key={category.name} className="bg-white rounded-lg shadow-md border border-gray-200">
              {/* 카테고리 헤더 */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-semibold text-gray-900">{category.name}</span>
                  <span className="text-sm text-gray-500">({category.leagues.length}개 리그)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* 리그 목록 */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 space-y-3">
                  {category.leagues.map((league) => {
                    const status = getLeagueStatus(league.key);
                    const statusStyle = getSeasonStatusStyle(status);
                    const statusBadge = getSeasonStatusBadge(status);
                    const data = leagueData[league.key];
                    const isLoading = loading[league.key];

                    return (
                      <div key={league.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Link 
                            href={`/odds/${league.key}`}
                            className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {league.name}
                          </Link>
                          <span 
                            className="px-2 py-1 text-xs rounded-full"
                            style={{ 
                              color: statusStyle.color, 
                              backgroundColor: statusStyle.backgroundColor 
                            }}
                          >
                            {statusBadge}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          {/* 경기 수 */}
                          <div className="text-gray-600">
                            {isLoading ? (
                              <span className="text-gray-400">로딩중...</span>
                            ) : data ? (
                              <span>{data.gameCount}경기</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                          
                          {/* 샘플 배당율 */}
                          <div className="text-gray-600">
                            {isLoading ? (
                              <span className="text-gray-400">로딩중...</span>
                            ) : data?.sampleOdds ? (
                              <span className="font-medium text-green-600">
                                배당 {data.sampleOdds.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">배당 없음</span>
                            )}
                          </div>
                          
                          {/* 이동 버튼 */}
                          <Link 
                            href={`/odds/${league.key}`}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                          >
                            보기 →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 사용법 안내 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 사용법</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 상위 카테고리를 클릭하면 하위 리그들이 표시됩니다</li>
          <li>• 각 리그의 경기 수와 샘플 배당율을 확인할 수 있습니다</li>
          <li>• "보기 →" 버튼을 클릭하면 해당 리그의 상세 배당 정보로 이동합니다</li>
        </ul>
      </div>
    </div>
  );
} 