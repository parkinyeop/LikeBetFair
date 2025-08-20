import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { getGameInfo, getSeasonInfo, getSeasonStatusStyle, getSeasonStatusBadge, SPORT_CATEGORIES, getDisplayNameFromSportKey } from '../config/sportsMapping';
import { convertUTCToKST, convertUtcToLocal, getCurrentLocalTime } from '../utils/timeUtils';

import { API_CONFIG, buildApiUrl } from '../config/apiConfig';
import { normalizeTeamNameForComparison } from '../utils/matchSportsbookGame';

// 알림 설정 관리 유틸리티
const NotificationUtils = {
  // 특정 알림 숨김 설정
  hideNotification: (key: string, message?: string) => {
    const hiddenNotifications = JSON.parse(localStorage.getItem('hiddenNotifications') || '{}');
    hiddenNotifications[key] = {
      hidden: true,
      timestamp: Date.now(),
      message: message || '사용자가 숨김 설정'
    };
    localStorage.setItem('hiddenNotifications', JSON.stringify(hiddenNotifications));
  },

  // 특정 알림 표시 설정 복원
  showNotification: (key: string) => {
    const hiddenNotifications = JSON.parse(localStorage.getItem('hiddenNotifications') || '{}');
    delete hiddenNotifications[key];
    localStorage.setItem('hiddenNotifications', JSON.stringify(hiddenNotifications));
  },

  // 모든 알림 설정 초기화
  resetAllNotifications: () => {
    localStorage.removeItem('hiddenNotifications');
  },

  // 숨겨진 알림 목록 조회
  getHiddenNotifications: () => {
    return JSON.parse(localStorage.getItem('hiddenNotifications') || '{}');
  },

  // 특정 알림이 숨겨져 있는지 확인
  isNotificationHidden: (key: string) => {
    const hiddenNotifications = JSON.parse(localStorage.getItem('hiddenNotifications') || '{}');
    return !!hiddenNotifications[key];
  }
};

// 간단한 Toast 알림 컴포넌트
const Toast = ({ message, type = 'info', onClose, notificationKey }: { 
  message: string; 
  type?: 'info' | 'warning' | 'success'; 
  onClose: () => void;
  notificationKey?: string; // 알림 식별자 추가
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // 이미 "다시 보지 않기"로 설정된 알림인지 확인
    if (notificationKey) {
      const hiddenNotifications = JSON.parse(localStorage.getItem('hiddenNotifications') || '{}');
      if (hiddenNotifications[notificationKey]) {
        onClose(); // 즉시 닫기
        return;
      }
    }

    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose, notificationKey]);

  const handleClose = () => {
    // "다시 보지 않기" 체크된 경우 localStorage에 저장
    if (dontShowAgain && notificationKey) {
      const hiddenNotifications = JSON.parse(localStorage.getItem('hiddenNotifications') || '{}');
      hiddenNotifications[notificationKey] = {
        hidden: true,
        timestamp: Date.now(),
        message: message
      };
      localStorage.setItem('hiddenNotifications', JSON.stringify(hiddenNotifications));
      console.log(`[Toast] 알림 "${notificationKey}"을(를) 다시 보지 않기로 설정했습니다.`);
    }
    onClose();
  };

  const bgColor = type === 'warning' ? 'bg-yellow-100 border-yellow-400' : 
                  type === 'success' ? 'bg-green-100 border-green-400' : 
                  'bg-blue-100 border-blue-400';
  const textColor = type === 'warning' ? 'text-yellow-800' : 
                   type === 'success' ? 'text-green-800' : 
                   'text-blue-800';

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 border rounded-lg shadow-lg ${bgColor} ${textColor} max-w-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className="text-sm font-medium">{message}</span>
          
          {/* "다시 보지 않기" 체크박스 */}
          {notificationKey && (
            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id={`dontShow_${notificationKey}`}
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor={`dontShow_${notificationKey}`} className="ml-2 text-xs text-gray-600">
                다시 보지 않기
              </label>
            </div>
          )}
        </div>
        <button onClick={handleClose} className="ml-2 text-gray-500 hover:text-gray-700 mt-1">
          ×
        </button>
      </div>
    </div>
  );
};

// 알림 설정 관리 컴포넌트
const NotificationSettings = ({ onClose }: { onClose: () => void }) => {
  const [hiddenNotifications, setHiddenNotifications] = useState(NotificationUtils.getHiddenNotifications());

  const handleResetAll = () => {
    if (confirm('모든 알림 설정을 초기화하시겠습니까?')) {
      NotificationUtils.resetAllNotifications();
      setHiddenNotifications({});
      alert('모든 알림 설정이 초기화되었습니다.');
    }
  };

  const handleShowNotification = (key: string) => {
    NotificationUtils.showNotification(key);
    setHiddenNotifications(NotificationUtils.getHiddenNotifications());
  };

  const hiddenCount = Object.keys(hiddenNotifications).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">알림 설정 관리</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        {hiddenCount === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🔔</div>
            <p className="text-gray-600">숨겨진 알림이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">모든 알림이 정상적으로 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-3">
              숨겨진 알림: {hiddenCount}개
            </div>
            
            {Object.entries(hiddenNotifications).map(([key, data]: [string, any]) => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      {key === 'order_cancellation_warning' ? '주문 취소 알림' : key}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      숨김 설정: {new Date(data.timestamp).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleShowNotification(key)}
                    className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                  >
                    복원
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button
            onClick={handleResetAll}
            disabled={hiddenCount === 0}
            className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            모든 설정 초기화
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ExchangePage() {
  const { isLoggedIn, token, userId } = useAuth();
  const { fetchOrderbook, placeMatchOrder, orders, fetchAllOpenOrders } = useExchange();
  const router = useRouter();
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [sportGameCounts, setSportGameCounts] = useState<{[key: string]: number}>({});
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'success' } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
  // 🆕 투데이 베팅 스타일 상태 추가
  const [todayGames, setTodayGames] = useState<Record<string, any[]>>({});
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayFlatGames, setTodayFlatGames] = useState<any[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<{ [gameId: string]: 'Win/Loss' | 'Over/Under' | 'Handicap' }>({});
  
  // 🆕 실시간 호가 현황 상태
  const [recentOrders, setRecentOrders] = useState<ExchangeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // 🆕 투데이 베팅 데이터 로드 (스포츠북 홈과 동일한 로직)
  useEffect(() => {
    const fetchTodayGames = async () => {
      try {
        setTodayLoading(true);
        const activeLeagues = Object.entries(SPORT_CATEGORIES);

        const gamesData: Record<string, any[]> = {};
        
        for (const [displayName, config] of activeLeagues) {
          let apiUrl = '';
          try {
            apiUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${config.sportKey}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
              const data = await response.json();
              
              const now = getCurrentLocalTime();
              const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
              const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              const bettingDeadlineMinutes = 10;
              
              const filteredGames = data.filter((game: any) => {
                const localGameTime = convertUtcToLocal(game.commence_time);
                const isValid = localGameTime >= oneDayAgo && localGameTime <= sevenDaysLater;
                return isValid;
              });
              
              const uniqueGamesMap = new Map();
              filteredGames.forEach((game: any) => {
                const key = `${game.home_team}|${game.away_team}|${game.commence_time}`;
                if (!uniqueGamesMap.has(key)) {
                  uniqueGamesMap.set(key, game);
                } else {
                  const prev = uniqueGamesMap.get(key);
                  const prevBookmakersCount = Array.isArray(prev.bookmakers) ? prev.bookmakers.length : 0;
                  const currBookmakersCount = Array.isArray(game.bookmakers) ? game.bookmakers.length : 0;
                  if (currBookmakersCount > prevBookmakersCount) {
                    uniqueGamesMap.set(key, game);
                  }
                }
              });
              const uniqueGames = Array.from(uniqueGamesMap.values());
              
              const categorizedGames = uniqueGames.map((game: any) => {
                const localGameTime = convertUtcToLocal(game.commence_time);
                const bettingDeadline = new Date(localGameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
                const isBettable = now < bettingDeadline;
                
                let officialOdds = game.officialOdds;
                if (!officialOdds && game.bookmakers && Array.isArray(game.bookmakers)) {
                  officialOdds = {};
                  
                  const h2hOutcomes: Record<string, { count: number; totalPrice: number }> = {};
                  game.bookmakers.forEach((bookmaker: any) => {
                    const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
                    if (h2hMarket) {
                      h2hMarket.outcomes?.forEach((outcome: any) => {
                        if (!h2hOutcomes[outcome.name]) {
                          h2hOutcomes[outcome.name] = { count: 0, totalPrice: 0 };
                        }
                        h2hOutcomes[outcome.name].count++;
                        h2hOutcomes[outcome.name].totalPrice += outcome.price;
                      });
                    }
                  });
                  
                  if (Object.keys(h2hOutcomes).length > 0) {
                    officialOdds.h2h = {};
                    Object.entries(h2hOutcomes).forEach(([name, data]) => {
                      officialOdds.h2h[name] = {
                        count: data.count,
                        averagePrice: data.totalPrice / data.count
                      };
                    });
                  }
                }
                
                return {
                  ...game,
                  sport_key: game.sport || config.sportKey,
                  sportTitle: displayName,
                  sport_title: displayName,
                  officialOdds: officialOdds || game.officialOdds,
                  isBettable,
                  gameTime: localGameTime,
                  bettingDeadline
                };
              });
              
              const sortedGames = categorizedGames.sort((a, b) => {
                const currentTime = now.getTime();
                const aTime = a.gameTime.getTime();
                const bTime = b.gameTime.getTime();
                
                const aIsFuture = aTime >= currentTime;
                const bIsFuture = bTime >= currentTime;
                
                if (aIsFuture && !bIsFuture) return -1;
                if (!aIsFuture && bIsFuture) return 1;
                
                if (aIsFuture && bIsFuture) {
                  return aTime - bTime;
                }
                
                return bTime - aTime;
              });
              
              if (sortedGames.length > 0) {
                gamesData[displayName] = sortedGames;
              }
            }
          } catch (err) {
            console.error(`Error fetching ${displayName}:`, err);
          }
        }
        
        setTodayGames(gamesData);
        setTodayLoading(false);
      } catch (err) {
        console.error('Error fetching today games:', err);
        setTodayLoading(false);
      }
    };

    fetchTodayGames();
    
    if (typeof document !== 'undefined') {
      const interval = setInterval(() => {
        console.log('[Exchange Today] 주기적 경기 데이터 갱신 시도');
        fetchTodayGames();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, []);

  // 🆕 todayGames를 평탄화하여 전체 경기 리스트로 변환
  useEffect(() => {
    const allGames: any[] = Object.values(todayGames).flat();
    
    const now = getCurrentLocalTime();
    const sortedAllGames = allGames.sort((a, b) => {
      const currentTime = now.getTime();
      const aTime = a.gameTime.getTime();
      const bTime = b.gameTime.getTime();
      
      const aIsFuture = aTime >= currentTime;
      const bIsFuture = bTime >= currentTime;
      
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;
      
      if (aIsFuture && bIsFuture) {
        return aTime - bTime;
      }
      
      return bTime - aTime;
    });
    
    setTodayFlatGames(sortedAllGames);
  }, [todayGames]);

  // 🆕 실시간 호가 현황 로드
  useEffect(() => {
    const loadRecentOrders = async () => {
      try {
        setOrdersLoading(true);
        const orders = await fetchAllOpenOrders();
        
        const recentOrders = orders
          .filter(order => 
            order.status === 'open' || 
            (order.status === 'partially_matched' && (order.remainingAmount || 0) > 0)
          )
          .slice(0, 5);
        
        setRecentOrders(recentOrders);
      } catch (error) {
        console.error('실시간 호가 현황 로드 실패:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadRecentOrders();
    
    const interval = setInterval(loadRecentOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchAllOpenOrders]);

  // 🆕 각 스포츠의 경기 개수 가져오기
  useEffect(() => {
    const fetchSportGameCounts = async () => {
      const sports = [
        { id: 'kleague', sport: 'soccer_korea_kleague1' },
        { id: 'jleague', sport: 'soccer_japan_j_league' },
        { id: 'seriea', sport: 'soccer_italy_serie_a' },
        { id: 'brasileirao', sport: 'soccer_brazil_campeonato' },
        { id: 'mls', sport: 'soccer_usa_mls' },
        { id: 'argentina', sport: 'soccer_argentina_primera_division' },
        { id: 'csl', sport: 'soccer_china_superleague' },
        { id: 'laliga', sport: 'soccer_spain_primera_division' },
        { id: 'bundesliga', sport: 'soccer_germany_bundesliga' },
        { id: 'nba', sport: 'basketball_nba' },
        { id: 'kbl', sport: 'basketball_kbl' },
        { id: 'mlb', sport: 'baseball_mlb' },
        { id: 'kbo', sport: 'baseball_kbo' },
        { id: 'nfl', sport: 'americanfootball_nfl' }
      ];

      const counts: {[key: string]: number} = {};
      
      for (const { id, sport } of sports) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/odds/${sport}`);
          if (response.ok) {
            const data = await response.json();
            const now = new Date();
            const futureGames = data.filter((game: any) => {
              const gameTime = new Date(game.commence_time);
              return gameTime > now;
            });
            counts[id] = futureGames.length;
          } else {
            counts[id] = 0;
          }
        } catch (error) {
          console.error(`Error fetching ${sport} games:`, error);
          counts[id] = 0;
        }
      }
      
      setSportGameCounts(counts);
    };

    fetchSportGameCounts();
    
    const interval = setInterval(() => {
      console.log('[Exchange] 주기적 스포츠 게임 수 갱신 시도');
      fetchSportGameCounts();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🆕 Page Visibility API - 탭 활성화시 즉시 갱신
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Exchange] 탭 활성화 - 스포츠 게임 수 즉시 갱신');
        const fetchSportGameCounts = async () => {
          const sports = [
            { id: 'kleague', sport: 'soccer_korea_kleague1' },
            { id: 'jleague', sport: 'soccer_japan_j_league' },
            { id: 'seriea', sport: 'soccer_italy_serie_a' },
            { id: 'brasileirao', sport: 'soccer_brazil_campeonato' },
            { id: 'mls', sport: 'soccer_usa_mls' },
            { id: 'argentina', sport: 'soccer_argentina_primera_division' },
            { id: 'csl', sport: 'soccer_china_superleague' },
            { id: 'laliga', sport: 'soccer_spain_primera_division' },
            { id: 'bundesliga', sport: 'soccer_germany_bundesliga' },
            { id: 'nba', sport: 'basketball_nba' },
            { id: 'kbl', sport: 'basketball_kbl' },
            { id: 'mlb', sport: 'baseball_mlb' },
            { id: 'kbo', sport: 'baseball_kbo' },
            { id: 'nfl', sport: 'americanfootball_nfl' }
          ];

          const counts: {[key: string]: number} = {};
          
          for (const { id, sport } of sports) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/odds/${sport}`);
              if (response.ok) {
                const data = await response.json();
                const now = new Date();
                const futureGames = data.filter((game: any) => {
                  const gameTime = new Date(game.commence_time);
                  return gameTime > now;
                });
                counts[id] = futureGames.length;
              } else {
                counts[id] = 0;
              }
            } catch (error) {
              console.error(`Error fetching ${sport} games:`, error);
              counts[id] = 0;
            }
          }
          
          setSportGameCounts(counts);
        };
        fetchSportGameCounts();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  // 취소된 주문 확인 및 알림
  const checkCancelledOrders = async () => {
    if (!isLoggedIn || !token) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/exchange/orders?status=cancelled`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const orders = await response.json();
        
        orders.forEach((order: any) => {
          if (order.settlementNote?.includes('매칭되지 않아')) {
            setToast({
              type: 'warning',
              message: `⚠️ ${order.homeTeam} vs ${order.awayTeam} 주문이 매칭되지 않아 자동 취소되었습니다.`
            });
          }
        });
      }
    } catch (error) {
      console.error('취소된 주문 확인 중 오류:', error);
    }
  };

  // 페이지 로드 시 취소된 주문 확인
  useEffect(() => {
    checkCancelledOrders();
  }, [isLoggedIn]);

  // 각 스포츠의 경기 개수 가져오기
  useEffect(() => {
    const fetchSportGameCounts = async () => {
      // 스포츠북의 모든 리그 가져오기 (사이드바 SPORTS_TREE 순서와 일치)
      const sports = [
        // 축구
        { id: 'kleague', sport: 'soccer_korea_kleague1' },
        { id: 'jleague', sport: 'soccer_japan_j_league' },
        { id: 'seriea', sport: 'soccer_italy_serie_a' },
        { id: 'brasileirao', sport: 'soccer_brazil_campeonato' },
        { id: 'mls', sport: 'soccer_usa_mls' },
        { id: 'argentina', sport: 'soccer_argentina_primera_division' },
        { id: 'csl', sport: 'soccer_china_superleague' },
        { id: 'laliga', sport: 'soccer_spain_primera_division' },
        { id: 'bundesliga', sport: 'soccer_germany_bundesliga' },
        // 농구
        { id: 'nba', sport: 'basketball_nba' },
        { id: 'kbl', sport: 'basketball_kbl' },
        // 야구
        { id: 'mlb', sport: 'baseball_mlb' },
        { id: 'kbo', sport: 'baseball_kbo' },
        // 미식축구
        { id: 'nfl', sport: 'americanfootball_nfl' }
      ];

      const counts: {[key: string]: number} = {};
      
      for (const { id, sport } of sports) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/odds/${sport}`);
          if (response.ok) {
            const data = await response.json();
            // 현재 시간 이후의 경기만 카운트
            const now = new Date();
            const futureGames = data.filter((game: any) => {
              const gameTime = new Date(game.commence_time);
              return gameTime > now;
            });
            counts[id] = futureGames.length;
          } else {
            counts[id] = 0;
          }
        } catch (error) {
          console.error(`Error fetching ${sport} games:`, error);
          counts[id] = 0;
        }
      }
      
      setSportGameCounts(counts);
    };

    fetchSportGameCounts();
    
    // 5분마다 경기 개수 업데이트 (백그라운드에서도 동작하도록 강화)
    const interval = setInterval(() => {
      console.log('[Exchange] 주기적 스포츠 게임 수 갱신 시도');
      fetchSportGameCounts();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Page Visibility API - 탭 활성화시 즉시 갱신
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Exchange] 탭 활성화 - 스포츠 게임 수 즉시 갱신');
        const fetchSportGameCounts = async () => {
          // 기존 코드와 동일한 sports 배열 사용
          const sports = [
            // 축구
            { id: 'kleague', sport: 'soccer_korea_kleague1' },
            { id: 'jleague', sport: 'soccer_japan_j_league' },
            { id: 'seriea', sport: 'soccer_italy_serie_a' },
            { id: 'brasileirao', sport: 'soccer_brazil_campeonato' },
            { id: 'mls', sport: 'soccer_usa_mls' },
            { id: 'argentina', sport: 'soccer_argentina_primera_division' },
            { id: 'csl', sport: 'soccer_china_superleague' },
            { id: 'laliga', sport: 'soccer_spain_primera_division' },
            { id: 'bundesliga', sport: 'soccer_germany_bundesliga' },
            // 농구
            { id: 'nba', sport: 'basketball_nba' },
            { id: 'kbl', sport: 'basketball_kbl' },
            // 야구
            { id: 'mlb', sport: 'baseball_mlb' },
            { id: 'kbo', sport: 'baseball_kbo' },
            // 미식축구
            { id: 'nfl', sport: 'americanfootball_nfl' }
          ];

          const counts: {[key: string]: number} = {};
          
          for (const { id, sport } of sports) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/odds/${sport}`);
              if (response.ok) {
                const data = await response.json();
                // 현재 시간 이후의 경기만 카운트
                const now = new Date();
                const futureGames = data.filter((game: any) => {
                  const gameTime = new Date(game.commence_time);
                  return gameTime > now;
                });
                counts[id] = futureGames.length;
              } else {
                counts[id] = 0;
              }
            } catch (error) {
              console.error(`Error fetching ${sport} games:`, error);
              counts[id] = 0;
            }
          }
          
          setSportGameCounts(counts);
        };
        fetchSportGameCounts();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  // 대표 경기의 호가 데이터 로드 (실제 데이터가 있는 게임 ID)
  useEffect(() => {
    if (isLoggedIn && token) {
      // 실제 오픈 상태인 주문들의 게임 ID를 동적으로 가져오기
      const fetchActiveGameId = async () => {
        try {
          // 먼저 사용자의 열린 주문을 확인
          const userOpenOrders = orders.filter(order => order.status === 'open');
          
          if (userOpenOrders.length > 0) {
            // 사용자의 열린 주문이 있으면 해당 gameId 사용
            const activeGameId = userOpenOrders[0].gameId;
            console.log('🏠 Exchange 홈 - 사용자 열린 주문에서 활성 게임 ID:', activeGameId);
            const info = getGameInfo(activeGameId);
            setGameInfo(info);
            
            fetchOrderbook(activeGameId, '승패', 0).then((orders) => {
              console.log('🏠 Exchange 홈 - 호가 데이터 로드:', orders);
              setOrderbook(orders);
            });
          } else {
            // 사용자의 열린 주문이 없으면 전체 열린 주문 조회
            console.log('🏠 Exchange 홈 - 사용자 열린 주문 없음, 전체 열린 주문 조회');
            
            // 전체 열린 주문 조회
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/exchange/all-orders`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const allOrders = await response.json();
              if (allOrders.length > 0) {
                const activeGameId = allOrders[0].gameId;
                console.log('🏠 Exchange 홈 - 전체 열린 주문에서 활성 게임 ID:', activeGameId);
                const info = getGameInfo(activeGameId);
                setGameInfo(info);
                
                fetchOrderbook(activeGameId, '승패', 0).then((orders) => {
                  console.log('🏠 Exchange 홈 - 호가 데이터 로드:', orders);
                  setOrderbook(orders);
                });
              } else {
                console.log('🏠 Exchange 홈 - 전체 열린 주문도 없음');
                setOrderbook([]);
                setGameInfo(null);
              }
            } else {
              console.log('🏠 Exchange 홈 - 전체 열린 주문 조회 실패');
              setOrderbook([]);
              setGameInfo(null);
            }
          }
        } catch (error) {
          console.error('활성 게임 ID 가져오기 실패:', error);
          // 에러 시 기본 게임 ID 사용
          const defaultGameId = 'bae04692-964e-46f5-bc45-386225b7ec50';
          const info = getGameInfo(defaultGameId);
          setGameInfo(info);
          
          fetchOrderbook(defaultGameId, '승패', 0).then((orders) => {
            console.log('🏠 Exchange 홈 - 기본 호가 데이터 로드:', orders);
            setOrderbook(orders);
          });
        }
      };
      
      fetchActiveGameId();
    } else {
      setOrderbook([]);
      setGameInfo(null);
    }
  }, [isLoggedIn, token, fetchOrderbook, orders]);

  // 매치 주문 핸들러
  const handleMatchOrder = async (existingOrder: ExchangeOrder) => {
    if (!isLoggedIn || !token) {
      // 로그인 필요 시 사이드바의 주문하기 탭으로 안내
      console.log('🔐 로그인 필요 - 주문하기 UI로 안내');
      return;
    }

    // 프론트엔드에서도 자기 주문인지 한 번 더 확인
    if (String(userId) === String(existingOrder.userId)) {
      console.log('🚫 프론트엔드 방어: 자기 주문 매칭 시도 차단');
      return;
    }

    try {
      // 기존 주문의 반대편으로 매치 주문 생성
      const oppositeSide: 'back' | 'lay' = existingOrder.side === 'back' ? 'lay' : 'back';
      const matchPrice = existingOrder.price; // 기존 주문 가격으로 매치
      
      const orderData = {
        gameId: existingOrder.gameId,
        market: existingOrder.market,
        line: existingOrder.line,
        side: oppositeSide,
        price: matchPrice,
        amount: existingOrder.amount // 전액 매치
      };

      console.log('🎯 홈에서 매치 주문 실행:', orderData);
      console.log('🎯 매칭 대상 주문 userId:', existingOrder.userId, '내 userId:', userId);
      
      const result = await placeMatchOrder(orderData);
      
      if (result.success) {
        console.log(`✅ 매치 성공! 매치된 금액: ${result.totalMatched.toLocaleString()}원, 매치 개수: ${result.matches}개`);
        
        // 매칭 성공 시 사이드바를 주문하기 탭으로 자동 이동 (Layout.tsx에서 처리)
        
        // 성공 메시지를 Toast로 표시
        setToast({
          type: 'success',
          message: `🎯 매칭 성공! ${result.totalMatched.toLocaleString()}원이 매칭되었습니다.`
        });
        
        // 호가창 데이터 새로고침 (동적으로 활성 게임 ID 가져오기)
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/exchange/orderbook-test?gameId=bae04692-964e-46f5-bc45-386225b7ec50&market=승패&line=0`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            const orders = data.orders || [];
            const activeGameId = orders.length > 0 ? orders[0].gameId : 'bae04692-964e-46f5-bc45-386225b7ec50';
            const updatedOrderbook = await fetchOrderbook(activeGameId, '승패', 0);
            setOrderbook(updatedOrderbook);
          }
        } catch (error) {
          console.error('호가창 새로고침 실패:', error);
        }
      } else {
        console.error('매치 실패:', result.error || '알 수 없는 오류');
        // 실패 메시지를 Toast로 표시
        setToast({
          type: 'warning',
          message: `❌ 매칭 실패: ${result.error || '알 수 없는 오류'}`
        });
      }
    } catch (error) {
      console.error('❌ 홈에서 매치 주문 오류:', error);
    }
  };

  if (orderbook.length > 0) {
    const order = orderbook[0];
    // order 객체에서 직접 정보 추출
    const info = {
      homeTeam: order.homeTeam || 'Unknown',
      awayTeam: order.awayTeam || 'Unknown',
      gameDate: order.commenceTime ? new Date(order.commenceTime).toLocaleString('ko-KR') : 'Unknown',
      sport: order.sportKey ? order.sportKey.split('_')[0] : 'Unknown',
      displayName: `${order.homeTeam || 'Unknown'} vs ${order.awayTeam || 'Unknown'}`
    };
    console.log('실제 order 객체:', JSON.stringify(order, null, 2));
    console.log('getGameInfo 반환:', info);
  }

  // 🆕 투데이 베팅 뷰 컴포넌트
  const TodayBettingView = () => {
    if (todayLoading) return <div className="text-center py-8">Loading...</div>;
    if (todayFlatGames.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📅 No Games Scheduled for Today</h3>
          <p className="text-gray-600 mb-4">No games found for today and tomorrow in active leagues.</p>
        </div>
      );
    }

    const bettableGames = todayFlatGames.filter(game => game.isBettable);
    const totalGames = todayFlatGames.length;
    
    return (
      <div className="space-y-4">
        {/* 배팅 가능한 경기 수 표시 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{bettableGames.length}</div>
                <div className="text-sm text-blue-700">Betting Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{totalGames}</div>
                <div className="text-sm text-gray-700">Total Games</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                📅 {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
              <div className="text-xs text-gray-500">Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
        
        {todayFlatGames?.map((game: any) => {
          const gameTime = new Date(game.commence_time);
          const isBettable = game.isBettable !== undefined ? game.isBettable : true;
          
          if (!selectedMarkets[game.id]) {
            setSelectedMarkets((prev: any) => ({ ...prev, [game.id]: 'Win/Loss' }));
          }
          
          const selectedMarket = selectedMarkets[game.id] || 'Win/Loss';
          const marketKeyMap = { 'Win/Loss': 'h2h', 'Over/Under': 'totals', 'Handicap': 'spreads' };
          const marketKey = marketKeyMap[selectedMarket];
          const officialOdds = game.officialOdds || {};
          const marketOdds = officialOdds[marketKey] || {};

          return (
            <div key={game.id} className={`bg-white rounded-lg shadow p-4 ${!isBettable ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex-1">
                  <span className="text-lg font-bold">🏟️ {game.home_team} vs {game.away_team}</span>
                  <div className="text-sm text-gray-600 mt-1">
                    {(() => {
                      const leagueName = getDisplayNameFromSportKey(game.sport_key) || game.sportTitle || game.sport_title || 'Unknown League';
                      
                      let sportIcon = '🏆';
                      if (game.sport_key?.includes('soccer')) sportIcon = '⚽';
                      else if (game.sport_key?.includes('basketball')) sportIcon = '🏀';
                      else if (game.sport_key?.includes('baseball')) sportIcon = '⚾';
                      else if (game.sport_key?.includes('americanfootball')) sportIcon = '🏈';
                      else if (game.sport_key?.includes('football')) sportIcon = '🏈';
                      
                      return `${sportIcon} ${leagueName}`;
                    })()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm">📅 {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  {!isBettable && (
                    <div className="text-xs text-red-500 mt-1">
                      ⏰ Betting Closed (10 min before game)
                    </div>
                  )}
                </div>
              </div>

              {/* 마켓 탭 */}
              <div className="flex gap-2 mb-3">
                {['Win/Loss', 'Over/Under', 'Handicap'].map(marketTab => (
                  <button
                    key={marketTab}
                    className={`px-3 py-1 rounded ${selectedMarket === marketTab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setSelectedMarkets((prev: any) => ({ ...prev, [game.id]: marketTab }))}
                  >
                    {marketTab}
                  </button>
                ))}
              </div>



              {/* 마켓별 선택 영역 */}
              {selectedMarket === 'Win/Loss' && (
                <div className="space-y-2">
                  {(() => {
                    const h2hOdds = officialOdds.h2h || {};
                    const isSoccer = game.sport_key?.includes('soccer') ||
                                   game.sport_key?.includes('korea_kleague') ||
                                   game.sport_key?.includes('england_premier_league') ||
                                   game.sport_key?.includes('italy_serie_a') ||
                                   game.sport_key?.includes('germany_bundesliga') ||
                                   game.sport_key?.includes('spain_la_liga') ||
                                   game.sport_key?.includes('usa_mls') ||
                                   game.sport_key?.includes('argentina_primera') ||
                                   game.sport_key?.includes('china_super_league');
                    let outcomes;
                    if (isSoccer) {
                      const homeOdds = h2hOdds[game.home_team];
                      const awayOdds = h2hOdds[game.away_team];
                      const drawOdds = Object.entries(h2hOdds).find(([name, _]) => 
                        name.toLowerCase().includes('draw') || name === 'Draw' || name === 'Tie'
                      );
                      outcomes = [
                        { name: game.home_team, price: (homeOdds as any)?.averagePrice },
                        { name: 'Draw', price: (drawOdds?.[1] as any)?.averagePrice },
                        { name: game.away_team, price: (awayOdds as any)?.averagePrice }
                      ].filter(outcome => outcome.price !== undefined);
                    } else {
                      outcomes = Object.entries(h2hOdds).map(([outcomeName, oddsData]) => ({
                        name: outcomeName,
                        price: (oddsData as any).averagePrice
                      }));
                    }
                    if (outcomes.length === 0) {
                      return (
                        <div className="text-center text-gray-500 py-6">
                          <div>No Win/Loss odds available</div>
                          <div className="text-xs mt-1">
                            {game.sport_key} | {game.sportTitle}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-base font-bold text-gray-800 text-center">Win/Loss</div>
                        {(() => {
                          const sortedOutcomes = outcomes.sort((a, b) => {
                            if (a.name === game.home_team) return -1;
                            if (b.name === game.home_team) return 1;
                            if (a.name.toLowerCase() === 'draw') return -1;
                            if (b.name.toLowerCase() === 'draw') return 1;
                            return 0;
                          });
                          
                          return sortedOutcomes.map((outcome) => {
                            let label = outcome.name;
                            if (outcome.name.toLowerCase() === 'draw') label = 'Draw';
                            else if (outcome.name === game.home_team) label = game.home_team;
                            else if (outcome.name === game.away_team) label = game.away_team;
                            return (
                                                                                              <button
                                  key={outcome.name}
                                                                    onClick={() => {
                                    if (isBettable && outcome.price) {
                                      // 🆕 선택된 경기 정보를 전역 상태로 저장 (사이드바에서 사용)
                                      const gameInfo = {
                                        gameId: game.id,
                                        homeTeam: game.home_team,
                                        awayTeam: game.away_team,
                                        sportKey: game.sport_key,
                                        market: selectedMarket,
                                        selection: outcome.name,
                                        odds: outcome.price,
                                        commenceTime: game.commence_time
                                      };
                                      localStorage.setItem('selectedGameForOrder', JSON.stringify(gameInfo));
                                      
                                      // 🆕 오른쪽 주문하기 탭으로 이동 (더 확실하게)
                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', { 
                                          detail: { tab: 'order' } 
                                        }));
                                        
                                        // 🆕 추가로 강제로 탭 변경 이벤트 발생
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent('exchangeSidebarTabChange', { 
                                            detail: { tab: 'order' } 
                                          }));
                                        }, 200);
                                      }, 100);
                                      
                                      console.log('🎯 배당율 카드 클릭됨:', gameInfo);
                                    }
                                  }}
                                  className={`flex-1 p-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                                    isBettable && outcome.price 
                                      ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-lg hover:shadow-xl' 
                                      : 'bg-gray-300 cursor-not-allowed'
                                  } text-white`}
                                  disabled={!isBettable || !outcome.price}
                                  title={isBettable && outcome.price ? `클릭하여 ${outcome.name} 주문하기` : '베팅 마감됨'}
                                >
                                  <div className="font-bold">{label}</div>
                                  <div className="text-sm">{outcome.price ? outcome.price.toFixed(2) : 'N/A'}</div>
                                  {!isBettable && <div className="text-xs text-red-500 mt-1">Betting Closed</div>}
                                  {isBettable && outcome.price && (
                                    <div className="text-xs text-blue-100 mt-1">클릭하여 주문하기</div>
                                  )}
                                </button>
                            );
                          });
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Over/Under와 Handicap 마켓도 동일하게 구현... */}
              {/* (코드 길이를 위해 생략, 필요시 추가) */}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* Toast 알림 */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            notificationKey={toast.type === 'warning' ? 'order_cancellation_warning' : undefined}
          />
        )}
        
        {/* 🆕 투데이 베팅 스타일로 변경된 헤더 */}
        <div className="bg-white rounded shadow p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Sports Exchange</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowNotificationSettings(true)}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
              >
                <span>🔔</span>
                <span>알림 설정</span>
              </button>
          </div>
          </div>
          
          {/* 🆕 사용자 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-blue-500 text-xl">💡</div>
              <div>
                <h3 className="text-sm font-semibold text-blue-800 mb-1">빠른 주문 방법</h3>
                <p className="text-xs text-blue-700">
                  원하는 배당율을 클릭하면 오른쪽 주문하기 탭으로 자동 이동됩니다. 
                  경기, 마켓, 선택이 자동으로 입력되어 즉시 주문할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
          
          {/* 🆕 투데이 베팅 뷰 */}
          <TodayBettingView />
        </div>

        {/* 🆕 실시간 호가 현황 - 간소화된 버전 */}
        <div className="bg-white rounded shadow p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">🔥 실시간 호가 현황</h3>
            <button
              onClick={() => router.push('/exchange/orderbook')}
              className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition-colors flex items-center space-x-1"
            >
              <span>📊</span>
              <span>전체 호가보기</span>
            </button>
          </div>
          
          {!isLoggedIn ? (
            <div className="text-center py-8">
              <p className="text-gray-600">로그인 후 실시간 호가 정보를 확인할 수 있습니다.</p>
            </div>
          ) : ordersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">호가 정보를 불러오는 중...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">현재 등록된 호가가 없습니다.</p>
              <p className="text-sm text-gray-400">위의 경기를 선택해서 새로운 호가를 등록해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-3">
                최근 {recentOrders.length}개 호가 (30초마다 자동 새로고침)
              </div>
              {recentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="bg-gray-50 border border-gray-200 rounded p-4 shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-semibold text-base text-gray-800">
                        {order.homeTeam} vs {order.awayTeam}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.commenceTime ? 
                          convertUTCToKST(order.commenceTime) : '시간 미정'
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.selection} - {order.sportKey}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className={`text-xs font-semibold mb-1 ${
                        order.side === 'back' ? 'text-blue-600' : 'text-pink-600'
                      }`}>
                        {order.side.toUpperCase()}
                      </div>
                      <div className={`font-bold text-lg ${
                        order.side === 'back' ? 'text-blue-700' : 'text-pink-700'
                      }`}>
                        {order.price.toFixed(2)}
                      </div>
                      <div className={`text-sm ${
                        order.side === 'back' ? 'text-blue-600' : 'text-pink-600'
                      }`}>
                        {order.displayAmount ? order.displayAmount.toLocaleString() : order.amount.toLocaleString()}원
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className="text-xs text-gray-500 mb-2">
                        {order.status === 'open' ? '🔄 대기중' : 
                         order.status === 'partially_matched' ? '🔄 부분 체결' : 
                         order.status === 'matched' ? '✅ 체결됨' : 
                         order.status === 'cancelled' ? '❌ 취소됨' : '📋 정산됨'}
                      </div>
                      
                      {order.status === 'open' || order.status === 'partially_matched' ? (
                        <button
                          onClick={() => {
                            if (!userId || String(userId) === String(order.userId)) {
                              return;
                            }
                            router.push('/exchange/orderbook');
                          }}
                          className={`px-4 py-2 text-white text-xs rounded transition-colors ${
                            !userId || String(userId) === String(order.userId)
                              ? 'bg-gray-400 cursor-not-allowed'
                              : order.side === 'back' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          disabled={!userId || String(userId) === String(order.userId)}
                        >
                          {order.side === 'back' ? '📉 Lay로 매칭' : '🎯 Back으로 매칭'}
                        </button>
                      ) : (
                        <div className="text-gray-400 text-xs">매칭 불가</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 알림 설정 모달 */}
        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}
      </div>

      {/* 🆕 사이드바는 Layout.tsx에서 자동으로 렌더링됨 */}
    </div>
  );
} 