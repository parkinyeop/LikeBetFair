import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { getGameInfo, getSeasonInfo, getSeasonStatusStyle, getSeasonStatusBadge } from '../config/sportsMapping';

// 간단한 Toast 알림 컴포넌트
const Toast = ({ message, type = 'info', onClose }: { message: string; type?: 'info' | 'warning' | 'success'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'warning' ? 'bg-yellow-100 border-yellow-400' : 
                  type === 'success' ? 'bg-green-100 border-green-400' : 
                  'bg-blue-100 border-blue-400';
  const textColor = type === 'warning' ? 'text-yellow-800' : 
                   type === 'success' ? 'text-green-800' : 
                   'text-blue-800';

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 border rounded-lg shadow-lg ${bgColor} ${textColor} max-w-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>
    </div>
  );
};

export default function ExchangePage() {
  const { isLoggedIn } = useAuth();
  const { fetchOrderbook, placeMatchOrder } = useExchange();
  const router = useRouter();
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [sportGameCounts, setSportGameCounts] = useState<{[key: string]: number}>({});
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'success' } | null>(null);

  // 취소된 주문 확인 및 알림
  const checkCancelledOrders = async () => {
    if (!isLoggedIn) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/exchange/orders?status=cancelled`);
      if (response.ok) {
        const orders = await response.json();
        
        orders.forEach((order: any) => {
          if (order.settlementNote?.includes('매칭되지 않아')) {
            setToast({
              type: 'warning',
              message: `${order.homeTeam} vs ${order.awayTeam} 주문이 매칭되지 않아 취소되었습니다.`
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
    
    // 5분마다 경기 개수 업데이트
    const interval = setInterval(fetchSportGameCounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 대표 경기의 호가 데이터 로드 (실제 데이터가 있는 게임 ID)
  useEffect(() => {
    if (isLoggedIn) {
      const gameId = 'bae04692-964e-46f5-bc45-386225b7ec50';
      const info = getGameInfo(gameId);
      setGameInfo(info);
      
      fetchOrderbook(gameId, '승패', 0).then((orders) => {
        console.log('🏠 Exchange 홈 - 호가 데이터 로드:', orders);
        setOrderbook(orders);
      });
    } else {
      setOrderbook([]);
      setGameInfo(null);
    }
  }, [isLoggedIn, fetchOrderbook]);

  // 매치 주문 핸들러
  const handleMatchOrder = async (existingOrder: ExchangeOrder) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
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
      
      const result = await placeMatchOrder(orderData);
      
      if (result.success) {
        alert(`✅ 매치 성공!\n매치된 금액: ${result.totalMatched.toLocaleString()}원\n매치 개수: ${result.matches}개`);
        
        // 호가창 데이터 새로고침
        const gameId = 'bae04692-964e-46f5-bc45-386225b7ec50';
        const updatedOrderbook = await fetchOrderbook(gameId, '승패', 0);
        setOrderbook(updatedOrderbook);
      } else {
        alert('매치 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('❌ 홈에서 매치 주문 오류:', error);
      alert('매치 주문 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  if (orderbook.length > 0) {
    const order = orderbook[0];
    const info = getGameInfo(order.gameId) || {};
    console.log('실제 order 객체:', JSON.stringify(order, null, 2));
    console.log('getGameInfo 반환:', info);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toast 알림 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* 실시간 호가 현황 - 상단 */}
      <div className="bg-white rounded shadow p-6 mb-4">
        <h3 className="text-lg font-bold mb-4">🔥 실시간 호가 현황</h3>
        {!isLoggedIn ? (
          <div className="text-center py-8">
            <p className="text-gray-600">로그인 후 실시간 호가 정보를 확인할 수 있습니다.</p>
          </div>
        ) : orderbook.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">현재 등록된 호가가 없습니다.</p>
            <p className="text-sm text-gray-400">아래 스포츠를 선택해서 새로운 호가를 등록해보세요!</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-3">
              {orderbook.length > 0 ? (() => {
                const order = orderbook[0];
                const info = getGameInfo(order.gameId) || {};
                const homeTeam = (!info.homeTeam || info.homeTeam === 'Unknown') ? order.homeTeam ?? "Unknown" : info.homeTeam;
                const awayTeam = (!info.awayTeam || info.awayTeam === 'Unknown') ? order.awayTeam ?? "Unknown" : info.awayTeam;
                const commenceTime = order.commenceTime ?? null;
                const displayName = (info.displayName && !info.displayName.startsWith('Unknown'))
                  ? info.displayName
                  : ((homeTeam && awayTeam && homeTeam !== "Unknown" && awayTeam !== "Unknown")
                      ? `${homeTeam} vs ${awayTeam}`
                      : "Unknown Game");
                return (
                  <>
                    <strong>🏀 {displayName} - 승패 마켓</strong>
                    <div className="text-xs text-gray-500 mt-1">
                      📅 {commenceTime ? new Date(commenceTime).toLocaleString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '경기일 미정'}
                    </div>
                    <div className="text-xs text-blue-500 mt-1">
                      🏀 {homeTeam} vs {awayTeam}
                    </div>
                  </>
                );
              })() : (
                <strong>🏀 경기 정보 로딩 중...</strong>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Back 주문들 */}
              <div>
                <h4 className="text-sm font-semibold text-blue-600 mb-2 text-center">Back (베팅)</h4>
                <div className="space-y-1">
                  {orderbook
                    .filter(order => order.side === 'back' && order.status === 'open')
                    .sort((a, b) => b.price - a.price) // 높은 가격부터
                    .slice(0, 3) // 상위 3개만 표시
                    .map((order) => (
                      <div key={order.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-blue-700">{order.price.toFixed(2)}</span>
                          <span className="text-right text-blue-600">{order.amount.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleMatchOrder(order)}
                            className="px-2 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600 transition-colors"
                          >
                            Lay로 매치
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Lay 주문들 */}
              <div>
                <h4 className="text-sm font-semibold text-pink-600 mb-2 text-center">Lay (레이)</h4>
                <div className="space-y-1">
                  {orderbook
                    .filter(order => order.side === 'lay' && order.status === 'open')
                    .sort((a, b) => a.price - b.price) // 낮은 가격부터
                    .slice(0, 3) // 상위 3개만 표시
                    .map((order) => (
                      <div key={order.id} className="bg-pink-50 border border-pink-200 rounded p-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-pink-700">{order.price.toFixed(2)}</span>
                          <span className="text-right text-pink-600">{order.amount.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleMatchOrder(order)}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                          >
                            Back으로 매치
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => router.push('/exchange/basketball_nba')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                전체 호가 보기 →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 경기 선택 - 하단 */}
      <div className="bg-white rounded shadow p-4 flex-1">
        <h3 className="text-lg font-bold mb-3">스포츠 선택 (Exchange 거래)</h3>
        <div className="text-center mb-4">
          <p className="text-gray-600 text-sm">원하는 스포츠를 선택하여 호가 거래를 시작하세요.</p>
        </div>
        <div className="space-y-6">
          {/* 카테고리별로 그룹핑해서 표시 */}
          {Object.entries({
            '축구': [
              { id: 'kleague', name: 'K리그', sport: 'soccer_korea_kleague1', emoji: '⚽' },
              { id: 'jleague', name: 'J리그', sport: 'soccer_japan_j_league', emoji: '⚽' },
              { id: 'seriea', name: '세리에 A', sport: 'soccer_italy_serie_a', emoji: '⚽' },
              { id: 'brasileirao', name: '브라질 세리에 A', sport: 'soccer_brazil_campeonato', emoji: '⚽' },
              { id: 'mls', name: 'MLS', sport: 'soccer_usa_mls', emoji: '⚽' },
              { id: 'argentina', name: '아르헨티나 프리메라', sport: 'soccer_argentina_primera_division', emoji: '⚽' },
              { id: 'csl', name: '중국 슈퍼리그', sport: 'soccer_china_superleague', emoji: '⚽' },
              { id: 'laliga', name: '라리가', sport: 'soccer_spain_primera_division', emoji: '⚽' },
              { id: 'bundesliga', name: '분데스리가', sport: 'soccer_germany_bundesliga', emoji: '⚽' }
            ],
            '농구': [
              { id: 'nba', name: 'NBA', sport: 'basketball_nba', emoji: '🏀' },
              { id: 'kbl', name: 'KBL', sport: 'basketball_kbl', emoji: '🏀' }
            ],
            '야구': [
              { id: 'mlb', name: 'MLB', sport: 'baseball_mlb', emoji: '⚾' },
              { id: 'kbo', name: 'KBO', sport: 'baseball_kbo', emoji: '⚾' }
            ],
            '미식축구': [
              { id: 'nfl', name: 'NFL', sport: 'americanfootball_nfl', emoji: '🏈' }
            ]
          }).map(([categoryName, sports]) => (
            <div key={categoryName} className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
                {categoryName}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {sports.map((sport) => {
                  const count = sportGameCounts[sport.id] ?? 0;
                  const seasonInfo = getSeasonInfo(sport.sport);
                  // 시즌 정보와 경기 개수를 모두 고려하여 활성 상태 결정
                  const isAvailable = count > 0 || (seasonInfo?.status === 'active');
                  const hasGames = count > 0;
                  const statusStyle = seasonInfo ? getSeasonStatusStyle(seasonInfo.status) : { color: '#6B7280', backgroundColor: '#F3F4F6' };
                  const statusBadge = seasonInfo ? getSeasonStatusBadge(seasonInfo.status) : '알 수 없음';
                  
                  return (
                    <button
                      key={sport.id}
                      onClick={() => router.push(`/exchange/${sport.sport}`)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        isAvailable 
                          ? 'border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md' 
                          : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                      }`}
                      disabled={!isAvailable}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-2xl">{sport.emoji}</div>
                        <div 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={statusStyle}
                        >
                          {statusBadge}
                        </div>
                      </div>
                      <div className={`font-semibold text-sm ${isAvailable ? 'text-blue-600' : 'text-gray-500'}`}>
                        {sport.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {hasGames 
                          ? `${count}경기 예정` 
                          : seasonInfo?.status === 'active' 
                          ? '경기 일정 확인중...'
                          : '경기 없음'
                        }
                      </div>
                      {seasonInfo && (
                        <div className="text-xs text-gray-400 mt-1">
                          {seasonInfo.status === 'active' 
                            ? `${seasonInfo.currentSeason}시즌 진행중`
                            : seasonInfo.status === 'offseason'
                            ? (seasonInfo.nextSeasonStart && seasonInfo.nextSeasonStart !== 'TBD' 
                               ? `시즌오프 (${new Date(seasonInfo.nextSeasonStart).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 시작예정)`
                               : '시즌오프 (일정 미정)')
                            : `휴식기${seasonInfo.breakPeriod ? ` (${new Date(seasonInfo.breakPeriod.end).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 재개)` : ''}`
                          }
                        </div>
                      )}
                      <div className="text-xs text-blue-500 mt-1">
                        {hasGames 
                          ? '클릭하여 보기 →' 
                          : seasonInfo?.status === 'active' 
                          ? '클릭하여 보기 →'
                          : seasonInfo?.status === 'offseason'
                          ? '시즌 준비중'
                          : '준비 중'
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 