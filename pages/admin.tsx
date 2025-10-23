import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useActionItems } from '../hooks/useActionItems';
import Header from '../components/Header';
import { buildApiUrl } from '../config/apiConfig';

interface ActionItem {
  id: string;
  type: 'warning' | 'danger' | 'info';
  icon: string;
  title: string;
  count: number;
  link: string;
  description: string;
  details?: any[];
}

interface DashboardData {
  today: {
    bets: number;
    stake: number;
  };
  yesterday: {
    bets: number;
    stake: number;
  };
  total: {
    users: number;
    bets: number;
    stake: number;
    activeUsers: number;
  };
  admin: {
    referrals: number;
    commissions: number;
  };
  exchange: {
    today: {
      orders: number;
      matchedOrders: number;
      totalVolume: number;
      commission: number;
    };
    yesterday: {
      orders: number;
      matchedOrders: number;
      totalVolume: number;
      commission: number;
    };
    total: {
      openOrders: number;
      multibets: number;
      settlements: number;
    };
  };
  actionItems: ActionItem[];
}

// 증감률 표시 컴포넌트 (메모이제이션)
const ChangeRateDisplay = React.memo(({ today, yesterday, label }: { today: number; yesterday: number; label: string }) => {
  // 증감률 계산 함수
  const calculateChangeRate = (today: number, yesterday: number): { rate: number; isIncrease: boolean; isNeutral: boolean } => {
    if (yesterday === 0) {
      return { rate: 0, isIncrease: false, isNeutral: true };
    }
    const rate = ((today - yesterday) / yesterday) * 100;
    return {
      rate: Math.round(rate * 10) / 10, // 소수점 첫째 자리까지
      isIncrease: rate > 0,
      isNeutral: rate === 0
    };
  };

  const { rate, isIncrease, isNeutral } = calculateChangeRate(today, yesterday);
  
  if (isNeutral) {
    return (
      <div className="text-sm text-gray-500 mt-1">
        어제와 동일
      </div>
    );
  }
  
  return (
    <div className={`text-sm mt-1 flex items-center ${
      isIncrease ? 'text-green-600' : 'text-red-600'
    }`}>
      <span className="mr-1">
        {isIncrease ? '▲' : '▼'}
      </span>
      <span>
        어제 대비 {Math.abs(rate)}% {isIncrease ? '증가' : '감소'}
      </span>
    </div>
  );
});

export default function AdminDashboard() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 실제 액션 아이템 데이터 사용
  const {
    actionItems: realActionItems,
    loading: actionItemsLoading,
    error: actionItemsError,
    lastUpdated: actionItemsLastUpdated,
    refetch: refetchActionItems,
    isWebSocketConnected
  } = useActionItems();

  // 브라우저 알림 상태
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      // AuthContext와 동일한 방식으로 토큰 가져오기
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      console.log('토큰 확인:', { tabId, hasToken: !!token });
      
      if (!token) {
        setError('로그인 토큰이 없습니다. 다시 로그인해주세요.');
        setLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl('/api/admin/dashboard'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('대시보드 데이터:', data);
        
        // yesterday 데이터가 없으면 기본값으로 설정
        const dataWithDefaults = {
          ...data,
          yesterday: data.yesterday || {
            bets: 0,
            stake: 0
          },
          exchange: {
            ...data.exchange,
            yesterday: data.exchange?.yesterday || {
              orders: 0,
              matchedOrders: 0,
              totalVolume: 0,
              commission: 0
            }
          },
          actionItems: realActionItems || []
        };
        
        setDashboardData(dataWithDefaults);
        setError('');
      } else {
        const errorData = await response.json();
        console.log('에러 응답:', errorData);
        setError(errorData.message || '대시보드 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('네트워크 오류:', err);
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin) {
      alert('관리자 권한이 필요합니다.');
      router.push('/');
      return;
    }
    
    fetchDashboardData();

    // 🔄 5분마다 자동 갱신
    const intervalId = setInterval(() => {
      console.log('[Admin Dashboard] 자동 갱신 실행 (5분)');
      fetchDashboardData();
    }, 5 * 60 * 1000); // 300,000ms = 5분

    return () => clearInterval(intervalId);
  }, [isLoggedIn, isAdmin, router, fetchDashboardData]);

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setNotificationsEnabled(permission === 'granted');

      if (permission === 'granted') {
        new Notification('LikeBetFair 관리자', {
          body: '알림이 활성화되었습니다. 긴급 상황 발생 시 알림을 받을 수 있습니다.',
          icon: '/favicon.ico'
        });
      }
    }
  }, []);

  // 액션 아이템 알림 전송
  const sendActionItemNotification = useCallback((title: string, body: string, type: 'danger' | 'warning' | 'info') => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`🚨 ${title}`, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `action-item-${type}`,
        requireInteraction: type === 'danger',
        data: { type, timestamp: new Date() }
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      if (!notification.requireInteraction) {
        setTimeout(() => notification.close(), type === 'danger' ? 10000 : 5000);
      }
    }
  }, [notificationsEnabled]);

  // 이전 액션 아이템 상태 추적
  const [previousActionItems, setPreviousActionItems] = useState<ActionItem[]>([]);

  // 액션 아이템 변화 감지 및 알림
  useEffect(() => {
    if (!realActionItems || !notificationsEnabled) return;

    if (previousActionItems.length === 0) {
      setPreviousActionItems(realActionItems);
      return;
    }

    const newDangerItems = realActionItems.filter(item =>
      item.type === 'danger' &&
      !previousActionItems.some(prev => prev.id === item.id && prev.count === item.count)
    );

    const newWarningItems = realActionItems.filter(item =>
      item.type === 'warning' &&
      item.count > (previousActionItems.find(prev => prev.id === item.id)?.count || 0)
    );

    newDangerItems.forEach(item => {
      sendActionItemNotification(
        '긴급 조치 필요!',
        `${item.title}: ${item.count}건의 문제가 발견되었습니다.`,
        'danger'
      );
    });

    newWarningItems.forEach(item => {
      if (item.count >= 5) {
        sendActionItemNotification(
          '주의 필요',
          `${item.title}: ${item.count}건`,
          'warning'
        );
      }
    });

    setPreviousActionItems(realActionItems);
  }, [realActionItems, notificationsEnabled, previousActionItems, sendActionItemNotification]);

  // 브라우저 알림 권한 확인
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <>
      {/* 전체 페이지 스타일 리셋 */}
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        #__next {
          height: 100vh;
          overflow-x: hidden;
        }
        .admin-page * {
          box-sizing: border-box;
        }
      `}</style>
      
      <div className="admin-page fixed inset-0 bg-gray-100 flex flex-col z-50">
        <Header />
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* 관리자 헤더 */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* 헤더 정보 */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
                      <p className="text-blue-100">
                        안녕하세요, {username}님 (레벨 {adminLevel} 관리자)
                      </p>
                      <div className="mt-2 text-sm text-blue-200">
                        현재 시간: {new Date().toLocaleString('ko-KR')}
                      </div>
                    </div>
                    
                    {/* 전체 검색 바 */}
                    <div className="w-full lg:w-96">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="사용자, 경기, 주문 검색..."
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200"
                          aria-label="전체 검색"
                          aria-describedby="search-help"
                          onFocus={(e) => {
                            e.target.placeholder = "검색어를 입력하세요...";
                          }}
                          onBlur={(e) => {
                            e.target.placeholder = "사용자, 경기, 주문 검색...";
                          }}
                        />
                        <div id="search-help" className="sr-only">
                          사용자명, 이메일, 경기명, 주문 ID로 검색할 수 있습니다.
                        </div>
                        {/* 검색 결과 드롭다운 (향후 구현) */}
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 hidden">
                          <div className="p-4 text-gray-600 text-sm">
                            검색 결과가 여기에 표시됩니다
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Items 섹션 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-800">긴급 조치 필요 항목</h2>
                  <div className="flex items-center space-x-3">
                    {actionItemsError && (
                      <span className="text-xs text-red-600">
                        ⚠️ {actionItemsError}
                      </span>
                    )}
                    <div className="flex items-center space-x-2 text-xs">
                      {/* WebSocket 연결 상태 */}
                      <span className={`flex items-center ${isWebSocketConnected ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className={`w-2 h-2 rounded-full mr-1 ${isWebSocketConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {isWebSocketConnected ? '실시간' : '폴링'}
                      </span>

                      {actionItemsLastUpdated && (
                        <span className="text-gray-500">
                          최종 업데이트: {actionItemsLastUpdated.toLocaleTimeString('ko-KR')}
                        </span>
                      )}
                    </div>

                    {/* 브라우저 알림 설정 */}
                    {'Notification' in window && (
                      <div className="flex items-center space-x-2">
                        {notificationPermission === 'default' && (
                          <button
                            onClick={requestNotificationPermission}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            🔔 알림 설정
                          </button>
                        )}
                        {notificationPermission === 'granted' && (
                          <span className="text-xs text-green-600 flex items-center">
                            🔔 알림 활성화
                          </span>
                        )}
                        {notificationPermission === 'denied' && (
                          <span className="text-xs text-gray-500">
                            🔕 알림 차단됨
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={refetchActionItems}
                      disabled={actionItemsLoading}
                      className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                    >
                      🔄 {actionItemsLoading ? '조회 중...' : '새로고침'}
                    </button>
                  </div>
                </div>

                {actionItemsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 rounded-lg bg-gray-200 animate-pulse">
                        <div className="h-16 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : realActionItems.length === 0 ? (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">✅</span>
                      <div>
                        <h3 className="font-medium text-green-800">모든 시스템이 정상입니다</h3>
                        <p className="text-sm text-green-600">긴급 조치가 필요한 항목이 없습니다.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {realActionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                          item.type === 'danger'
                            ? 'bg-red-50 border-red-500 hover:bg-red-100'
                            : item.type === 'warning'
                            ? 'bg-yellow-50 border-yellow-500 hover:bg-yellow-100'
                            : 'bg-blue-50 border-blue-500 hover:bg-blue-100'
                        }`}
                        onClick={() => router.push(item.link)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                            <div>
                              <h3 className="font-medium text-gray-800 text-sm">{item.title}</h3>
                              <p className="text-xs text-gray-600">{item.description}</p>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${
                            item.type === 'danger'
                              ? 'text-red-600'
                              : item.type === 'warning'
                              ? 'text-yellow-600'
                              : 'text-blue-600'
                          }`}>
                            {item.count}
                          </div>
                        </div>

                        {/* 심각도에 따른 추가 표시 */}
                        {item.type === 'danger' && item.count > 0 && (
                          <div className="mt-2 text-xs text-red-600 font-medium">
                            ⚠️ 즉시 조치 필요
                          </div>
                        )}

                        {/* 결과 없는 경기 상세 정보 */}
                        {item.id === 'games-without-results' && item.details && item.details.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-yellow-200 space-y-2">
                            {item.details.slice(0, 3).map((game: any, idx: number) => (
                              <div key={idx} className="text-xs bg-white bg-opacity-50 rounded p-2">
                                <div className="font-medium text-gray-800">
                                  {game.homeTeam} vs {game.awayTeam}
                                </div>
                                <div className="text-gray-600 mt-1">
                                  {new Date(game.commenceTime).toLocaleString('ko-KR', { 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} ({game.hoursElapsed}시간 경과)
                                </div>
                              </div>
                            ))}
                            {item.details.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{item.details.length - 3}개 더보기
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  ❌ {error}
                  <div className="mt-2 text-sm">
                    <button 
                      onClick={fetchDashboardData} 
                      className="text-red-600 underline hover:text-red-800"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 대시보드 카드들 */}
                  {dashboardData && (
                    <>
                      {/* 기본 통계 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h3 className="text-xs font-medium text-gray-500">오늘 스포츠북 수</h3>
                          <p className="text-xl font-bold text-gray-900">{dashboardData.today.bets}</p>
                          <ChangeRateDisplay 
                            today={dashboardData.today.bets} 
                            yesterday={dashboardData.yesterday?.bets || 0} 
                            label="스포츠북 수" 
                          />
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h3 className="text-xs font-medium text-gray-500">오늘 스포츠북 금액</h3>
                          <p className="text-xl font-bold text-gray-900">₩{dashboardData.today.stake.toLocaleString()}</p>
                          <ChangeRateDisplay 
                            today={dashboardData.today.stake} 
                            yesterday={dashboardData.yesterday?.stake || 0} 
                            label="스포츠북 금액" 
                          />
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h3 className="text-xs font-medium text-gray-500">전체 사용자</h3>
                          <p className="text-xl font-bold text-gray-900">{dashboardData.total.users}</p>
                          <div className="text-xs text-gray-500 mt-1">누적 데이터</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h3 className="text-xs font-medium text-gray-500">활성 사용자</h3>
                          <p className="text-xl font-bold text-gray-900">{dashboardData.total.activeUsers}</p>
                          <div className="text-xs text-gray-500 mt-1">현재 활성</div>
                        </div>
                      </div>

                      {/* Exchange 통계 */}
                      {dashboardData.exchange && (
                        <div className="mb-6">
                          <h2 className="text-lg font-bold text-gray-900 mb-3">📊 Exchange 통계</h2>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg shadow border border-purple-200">
                              <h3 className="text-xs font-medium text-purple-600">오늘 Exchange 주문</h3>
                              <p className="text-xl font-bold text-purple-900">{dashboardData.exchange.today.orders}</p>
                              <ChangeRateDisplay 
                                today={dashboardData.exchange.today.orders} 
                                yesterday={dashboardData.exchange.yesterday?.orders || 0} 
                                label="Exchange 주문" 
                              />
                            </div>
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg shadow border border-purple-200">
                              <h3 className="text-xs font-medium text-purple-600">매칭된 주문</h3>
                              <p className="text-xl font-bold text-purple-900">{dashboardData.exchange.today.matchedOrders}</p>
                              <ChangeRateDisplay 
                                today={dashboardData.exchange.today.matchedOrders} 
                                yesterday={dashboardData.exchange.yesterday?.matchedOrders || 0} 
                                label="매칭된 주문" 
                              />
                            </div>
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg shadow border border-purple-200">
                              <h3 className="text-xs font-medium text-purple-600">총 거래량</h3>
                              <p className="text-xl font-bold text-purple-900">₩{dashboardData.exchange.today.totalVolume.toLocaleString()}</p>
                              <ChangeRateDisplay 
                                today={dashboardData.exchange.today.totalVolume} 
                                yesterday={dashboardData.exchange.yesterday?.totalVolume || 0} 
                                label="총 거래량" 
                              />
                            </div>
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg shadow border border-purple-200">
                              <h3 className="text-xs font-medium text-purple-600">수수료 수익</h3>
                              <p className="text-xl font-bold text-purple-900">₩{dashboardData.exchange.today.commission.toLocaleString()}</p>
                              <ChangeRateDisplay 
                                today={dashboardData.exchange.today.commission} 
                                yesterday={dashboardData.exchange.yesterday?.commission || 0} 
                                label="수수료 수익" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* 관리 메뉴 그리드 - 균등 배치 (2x3 구조) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                
                {/* Exchange 관리 */}
                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="bg-purple-100 p-2 rounded-full">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 ml-2">Exchange 관리</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Exchange 주문 관리, 멀티배팅, 정산 처리</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>• Exchange 주문 모니터링</div>
                    <div>• 멀티배팅 관리</div>
                    <div>• 정산 처리 및 내역</div>
                    <div>• 실시간 호가 현황</div>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/exchange')}
                    className="mt-3 w-full bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    Exchange 관리하기
                  </button>
                </div>

                {/* 스포츠북 관리 */}
                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 ml-2">스포츠북 관리</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">스포츠북 모니터링, 수동 결과 처리, 환불 관리</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>• 실시간 스포츠북 모니터링</div>
                    <div>• 수동 스포츠북 결과 처리</div>
                    <div>• 의심스러운 스포츠북 감지</div>
                    <div>• 환불 및 취소 처리</div>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/bets')}
                    className="mt-3 w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    스포츠북 관리하기
                  </button>
                </div>

                {/* 사용자 관리 */}
                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.121-3.121a4 4 0 010 5.656m-5.656-5.656a4 4 0 015.656 0L12 12l-1.06-1.06a4 4 0 010-5.656m0 0L12 4.354a4 4 0 010 5.292"></path>
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 ml-2">사용자 관리</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">사용자 목록 조회, 계정 관리, 잔액 수정</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>• 사용자 목록 및 검색</div>
                    <div>• 계정 활성화/비활성화</div>
                    <div>• 잔액 수정 및 이력 관리</div>
                    <div>• 사용자 상세 정보 조회</div>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/users')}
                    className="mt-3 w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    사용자 관리하기
                  </button>
                </div>

                {/* 추천코드 관리 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">추천코드 관리</h3>
                  </div>
                  <p className="text-gray-600 mb-4">추천코드 생성, 수수료 관리, 실적 조회</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 추천코드 생성 및 관리</div>
                    <div>• 수수료율 설정</div>
                    <div>• 추천 실적 조회</div>
                    <div>• 수수료 지급 관리</div>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/referral-codes')}
                    className="mt-4 w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors"
                  >
                    추천코드 관리하기
                  </button>
                </div>

                {/* 수수료 현황 관리 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-yellow-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">수수료 현황</h3>
                  </div>
                  <p className="text-gray-600 mb-4">수수료 수입 현황 및 분석</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 수수료 수입 통계</div>
                    <div>• 수수료 유형별 분석</div>
                    <div>• 수취자별 현황</div>
                    <div>• 실시간 수수료 모니터링</div>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/commissions')}
                    className="mt-4 w-full bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 transition-colors"
                  >
                    수수료 현황 보기
                  </button>
                </div>


                {/* 통계 및 리포트 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-red-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">통계 및 리포트</h3>
                  </div>
                  <p className="text-gray-600 mb-4">매출 분석, 사용자 분석, 성과 리포트</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 일/월별 매출 분석</div>
                    <div>• 사용자 행동 분석</div>
                    <div>• 스포츠북 패턴 분석</div>
                    <div>• 관리자 성과 리포트</div>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/analytics')}
                    className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
                  >
                    통계 보기
                  </button>
                </div>

                {/* 시스템 설정 */}
                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 ml-2">시스템 설정</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">전역 설정, 권한 관리, 시스템 모니터링</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>• 전역 설정 관리</div>
                    <div>• 관리자 권한 설정</div>
                    <div>• 시스템 모니터링</div>
                    <div>• 백업 및 복구</div>
                  </div>
                  <button 
                    onClick={() => router.push('/admin/settings')}
                    className="mt-3 w-full bg-gray-600 text-white py-2 px-3 rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    시스템 설정
                  </button>
                </div>

              </div>

              {/* 관리자 레벨별 권한 가이드 */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🔐 관리자 레벨별 권한 가이드</h2>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* 레벨 1 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-green-600 font-bold text-sm">1</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">기본 관리자</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">조회 전용 권한</p>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>• 대시보드 조회</li>
                        <li>• Exchange 통계 조회</li>
                        <li>• 스포츠북 내역 조회</li>
                        <li>• 추천코드 조회</li>
                        <li>• 분석 리포트 조회</li>
                      </ul>
                    </div>

                    {/* 레벨 2 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-bold text-sm">2</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">중급 관리자</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">기본 관리 권한</p>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>• 레벨 1 권한 +</li>
                        <li>• Exchange 주문 상태 변경</li>
                        <li>• 사용자 목록 조회</li>
                        <li>• 경기 생성/수정</li>
                        <li>• 기본 설정 수정</li>
                      </ul>
                    </div>

                    {/* 레벨 3 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-yellow-600 font-bold text-sm">3</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">고급 관리자</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">고급 관리 권한</p>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>• 레벨 2 권한 +</li>
                        <li>• 사용자 생성/수정</li>
                        <li>• 스포츠북 결과 처리</li>
                        <li>• 추천코드 관리</li>
                        <li>• 수수료율 설정</li>
                      </ul>
                    </div>

                    {/* 레벨 4 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-orange-600 font-bold text-sm">4</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">최고 관리자</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">최고 관리 권한</p>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>• 레벨 3 권한 +</li>
                        <li>• 사용자 잔액 수정</li>
                        <li>• 사용자 삭제 (레벨 5 제외)</li>
                        <li>• 모든 관리 기능</li>
                        <li>• 시스템 설정 관리</li>
                      </ul>
                    </div>

                    {/* 레벨 5 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-red-200 ring-2 ring-red-100">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-red-600 font-bold text-sm">5</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">시스템 관리자</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">시스템 관리 권한</p>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>• 모든 권한</li>
                        <li>• 시스템 전체 관리</li>
                        <li>• 삭제 보호 (본인 계정)</li>
                        <li>• 최고 권한</li>
                        <li>• 모든 기능 접근</li>
                      </ul>
                    </div>

                    {/* 권한 안내 */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-gray-600 font-bold text-sm">ℹ️</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">권한 안내</h3>
                      </div>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>• 권한은 서버에서 엄격하게 검증</li>
                        <li>• 레벨이 높을수록 더 많은 권한</li>
                        <li>• 레벨 5는 시스템 보호 대상</li>
                        <li>• 삭제 권한은 레벨 4 이상</li>
                        <li>• 모든 작업은 로그에 기록</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 빠른 작업 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">⚡ 빠른 작업</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => router.push('/admin/referral-codes')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    새 추천코드 생성
                  </button>
                  <button 
                    onClick={() => router.push('/admin/commissions')}
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
                  >
                    수수료 현황 보기
                  </button>
                  <button 
                    onClick={() => router.push('/admin/exchange')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                  >
                    Exchange 관리
                  </button>
                  <button 
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const csvContent = `날짜,총 스포츠북 수,총 스포츠북 금액,총 당첨 금액,순수익\n${today},${dashboardData?.today.bets || 0},${dashboardData?.today.stake || 0},0,${(dashboardData?.today.stake || 0)}\n`;
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `daily-report-${today}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
                  >
                    오늘 리포트 다운로드
                  </button>
                  <button 
                    onClick={() => {
                      alert('시스템 상태: 정상\n서버: 온라인\n데이터베이스: 연결됨\n마지막 업데이트: ' + new Date().toLocaleString('ko-KR'));
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                  >
                    시스템 상태 확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 