import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
import Header from '../../components/Header';

// 새로운 계층적 타입 정의
interface AdminTabStructure {
  id: 'dashboard' | 'orders' | 'settlements' | 'analytics';
  label: string;
  icon: string;
  purpose: string;
  level: 'overview' | 'management' | 'analysis';
}

interface ExchangeStats {
  today: {
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
}

// 새로운 상태 관리 구조
interface AdminState {
  global: {
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
  };
  tabs: {
    dashboard: DashboardState;
    orders: OrdersState;
    settlements: SettlementsState;
    analytics: AnalyticsState;
  };
  shared: {
    filters: GlobalFilters;
    selectedItems: SelectedItems;
    modals: ModalState;
  };
}

interface DashboardState {
  kpis: KPIData;
  recentActivity: ActivityItem[];
  alerts: Alert[];
  loading: boolean;
}

interface OrdersState {
  orders: ExchangeOrder[];
  filters: OrderFilters;
  selectedOrder: ExchangeOrder | null;
  loading: boolean;
  pagination: PaginationState;
}

interface SettlementsState {
  pending: SettlementPending[];
  completed: SettlementHistory[];
  selectedSettlement: SettlementHistory | null;
  loading: boolean;
}

interface AnalyticsState {
  realtime: RealtimeStats;
  daily: DailyStats[];
  monthly: MonthlyStats[];
  selectedPeriod: DateRange;
  loading: boolean;
}

interface GlobalFilters {
  dateRange: DateRange;
  status: OrderStatus[];
  sport: string[];
  searchTerm: string;
}

interface SelectedItems {
  orders: number[];
  settlements: string[];
}

interface ModalState {
  orderDetail: boolean;
  settlementDetail: boolean;
  reportExport: boolean;
}

interface KPIData {
  todayOrders: number;
  todayVolume: number;
  todayCommission: number;
  openOrders: number;
}

interface ActivityItem {
  id: string;
  type: 'order' | 'settlement' | 'alert';
  message: string;
  timestamp: Date;
  data: any;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  action?: () => void;
}

interface OrderFilters {
  status: OrderStatus[];
  dateRange: DateRange;
  sport: string[];
  searchTerm: string;
  isMultibet?: boolean;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

interface SettlementPending {
  gameKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: 'pending' | 'ready' | 'processing';
  ordersCount: number;
  totalVolume: number;
}

interface RealtimeStats {
  activeOrders: number;
  matchedOrders: number;
  totalVolume: number;
  commission: number;
  lastUpdate: Date;
}

interface DateRange {
  start: Date;
  end: Date;
}

type OrderStatus = 'open' | 'matched' | 'settled' | 'cancelled';

// Phase 2: 드릴다운 네비게이션을 위한 새로운 타입들
interface BreadcrumbItem {
  label: string;
  path: string;
  level: number;
  clickable: boolean;
}

interface NavigationContext {
  currentPath: string[];
  breadcrumbs: BreadcrumbItem[];
  contextData: {
    selectedOrder?: ExchangeOrder;
    selectedSettlement?: SettlementHistory;
    filters?: GlobalFilters;
    searchTerm?: string;
  };
}


// Phase 3: 실시간 업데이트를 위한 타입들
interface RealtimeUpdate {
  type: 'order' | 'settlement' | 'stats' | 'alert';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
}

interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: () => void;
}

interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  dateRange: DateRange;
  filters: GlobalFilters;
  includeCharts: boolean;
}

interface ExchangeOrder {
  id: number;
  userId: string;
  gameId: string;
  market: string;
  side: 'back' | 'lay';
  price: number;
  amount: number;
  status: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  sportKey: string;
  isMultibet: boolean;
  selectionDetails?: any;
  createdAt: string;
  stakeAmount: number;
  potentialProfit: number;
  actualProfit?: number;
  settledAt?: string;
  matchedOrders?: ExchangeOrder[];
}

interface SettlementHistory {
  gameKey: string;
  homeTeam: string;
  awayTeam: string;
  settledAt: string;
  settledOrders: number;
  totalVolume: number;        // 총 거래량
  totalCommission: number;    // 총 수수료
  winningAmount: number;      // 승리한 베터들의 총 수익
  losingAmount: number;       // 패배한 베터들의 총 손실
  orders: any[];
}

interface DailyStats {
  date: string;
  totalOrders: number;
  matchedOrders: number;
  openOrders: number;
  settledOrders: number;
  multibets: number;
  volume: number;
}

interface MonthlySummary {
  totalOrders: number;
  totalVolume: number;
  totalMultibets: number;
  matchedOrders: number;
  openOrders: number;
  settledOrders: number;
}

// 새로운 탭 구조 정의
const ADMIN_TABS: AdminTabStructure[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: '📊',
    purpose: '전체 현황 파악 및 빠른 액션',
    level: 'overview'
  },
  {
    id: 'orders',
    label: '주문 관리',
    icon: '📋',
    purpose: '모든 주문 통합 관리',
    level: 'management'
  },
  {
    id: 'settlements',
    label: '정산 관리',
    icon: '💰',
    purpose: '정산 처리 및 내역 관리',
    level: 'management'
  },
  {
    id: 'analytics',
    label: '통계 분석',
    icon: '📈',
    purpose: '상세 통계 및 분석',
    level: 'analysis'
  }
];

// 주문 관리 서브탭
const ORDER_SUBTABS = [
  { id: 'all', label: '전체 주문' },
  { id: 'open', label: '대기 중' },
  { id: 'matched', label: '매칭됨' },
  { id: 'settled', label: '정산됨' },
  { id: 'cancelled', label: '취소됨' }
];

export default function ExchangeAdmin() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  
  // 새로운 상태 관리 구조
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'settlements' | 'analytics'>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  
  // Phase 2: 네비게이션 컨텍스트
  const [navigationContext, setNavigationContext] = useState<NavigationContext>({
    currentPath: ['dashboard'],
    breadcrumbs: [
      { label: '대시보드', path: '/admin/exchange', level: 1, clickable: true }
    ],
    contextData: {}
  });

  // Phase 3: 실시간 업데이트 상태
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [adminState, setAdminState] = useState<AdminState>({
    global: {
      loading: true,
      error: null,
      lastUpdated: null
    },
    tabs: {
      dashboard: {
        kpis: {
          todayOrders: 0,
          todayVolume: 0,
          todayCommission: 0,
          openOrders: 0
        },
        recentActivity: [],
        alerts: [],
        loading: true
      },
      orders: {
        orders: [],
        filters: {
          status: [],
          dateRange: {
            start: new Date(new Date().setDate(new Date().getDate() - 7)),
            end: new Date()
          },
          sport: [],
          searchTerm: '',
          isMultibet: undefined
        },
        selectedOrder: null,
        loading: true,
        pagination: {
          page: 1,
          limit: 50,
          total: 0
        }
      },
      settlements: {
        pending: [],
        completed: [],
        selectedSettlement: null,
        loading: true
      },
      analytics: {
        realtime: {
          activeOrders: 0,
          matchedOrders: 0,
          totalVolume: 0,
          commission: 0,
          lastUpdate: new Date()
        },
        daily: [],
        monthly: [],
        selectedPeriod: {
          start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          end: new Date()
        },
        loading: true
      }
    },
    shared: {
      filters: {
        dateRange: {
          start: new Date(new Date().setDate(new Date().getDate() - 7)),
          end: new Date()
        },
        status: [],
        sport: [],
        searchTerm: ''
      },
      selectedItems: {
        orders: [],
        settlements: []
      },
      modals: {
        orderDetail: false,
        settlementDetail: false,
        reportExport: false
      }
    }
  });

  // 기존 상태들 (호환성을 위해 유지)
  const [exchangeStats, setExchangeStats] = useState<ExchangeStats | null>(null);
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [settlements, setSettlements] = useState<SettlementHistory[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<ExchangeOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin || adminLevel < 1) {
      alert('관리자 권한이 필요합니다.');
      router.push('/');
      return;
    }

    fetchExchangeData();
  }, [isLoggedIn, isAdmin, adminLevel, router]);

  // 월별 필터 변경 시 일별 통계 다시 조회
  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchDailyStats();
    }
  }, [selectedYear, selectedMonth, isLoggedIn, isAdmin]);

  // 새로운 최적화된 데이터 로딩 함수들
  const getAuthHeaders = useCallback(() => {
    const tabId = sessionStorage.getItem('tabId');
    const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
    
    if (!token) {
      throw new Error('로그인 토큰이 없습니다.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Phase 1: API 호출 최적화 - 병렬 로딩
  const fetchExchangeData = useCallback(async () => {
    try {
      console.log('Exchange 데이터 로딩 시작...');
      setAdminState(prev => ({
        ...prev,
        global: { ...prev.global, loading: true, error: null }
      }));

      const headers = getAuthHeaders();
      const baseUrl = 'http://localhost:5050/api/admin/exchange';

      console.log('API 호출 시작:', baseUrl);

      // 병렬로 모든 데이터 로딩
      const [statsResponse, ordersResponse, settlementsResponse] = await Promise.all([
        fetch(`${baseUrl}/stats`, { headers }),
        fetch(`${baseUrl}/orders`, { headers }),
        fetch(`${baseUrl}/settlements`, { headers })
      ]);

      console.log('API 응답 상태:', {
        stats: statsResponse.status,
        orders: ordersResponse.status,
        settlements: settlementsResponse.status
      });

      // 응답 처리
      const [statsData, ordersData, settlementsData] = await Promise.all([
        statsResponse.ok ? statsResponse.json() : null,
        ordersResponse.ok ? ordersResponse.json() : null,
        settlementsResponse.ok ? settlementsResponse.json() : null
      ]);

      console.log('API 응답 데이터:', { statsData, ordersData, settlementsData });

      // 상태 업데이트
      if (statsData) {
        setExchangeStats(statsData);
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            dashboard: {
              ...prev.tabs.dashboard,
              kpis: {
                todayOrders: statsData.today.orders,
                todayVolume: statsData.today.totalVolume,
                todayCommission: statsData.today.commission,
                openOrders: statsData.total.openOrders
              },
              loading: false
            }
          }
        }));
      } else {
        console.warn('통계 데이터를 받지 못했습니다. 폴백 데이터를 사용합니다.');
        // 폴백 데이터 설정
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            dashboard: {
              ...prev.tabs.dashboard,
              kpis: {
                todayOrders: 0,
                todayVolume: 0,
                todayCommission: 0,
                openOrders: 0
              },
              loading: false
            }
          }
        }));
      }

      if (ordersData) {
        setOrders(ordersData.orders || []);
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            orders: {
              ...prev.tabs.orders,
              orders: ordersData.orders || [],
              pagination: {
                ...prev.tabs.orders.pagination,
                total: ordersData.orders?.length || 0
              },
              loading: false
            }
          }
        }));
      } else {
        console.warn('주문 데이터를 받지 못했습니다. 빈 배열을 사용합니다.');
        setOrders([]);
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            orders: {
              ...prev.tabs.orders,
              orders: [],
              loading: false
            }
          }
        }));
      }

      if (settlementsData) {
        setSettlements(settlementsData.settlements || []);
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            settlements: {
              ...prev.tabs.settlements,
              completed: settlementsData.settlements || [],
              loading: false
            }
          }
        }));
      } else {
        console.warn('정산 데이터를 받지 못했습니다. 빈 배열을 사용합니다.');
        setSettlements([]);
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            settlements: {
              ...prev.tabs.settlements,
              completed: [],
              loading: false
            }
          }
        }));
      }

      // 일별 통계는 별도로 로딩
      await fetchDailyStats();

      setAdminState(prev => ({
        ...prev,
        global: { 
          ...prev.global, 
          loading: false, 
          error: null,
          lastUpdated: new Date()
        }
      }));

      // 기존 loading 상태도 false로 설정
      setLoading(false);

      console.log('Exchange 데이터 로딩 완료');

    } catch (err) {
      console.error('Exchange 데이터 로딩 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.';
      
      setError(errorMessage);
      setAdminState(prev => ({
        ...prev,
        global: { 
          ...prev.global, 
          loading: false, 
          error: errorMessage
        }
      }));
      
      // 기존 상태도 업데이트하여 로딩 상태 해제
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // 기존 fetchDailyStats 함수는 유지하되 최적화
  const fetchDailyStats = useCallback(async () => {
    try {
      console.log('일별 통계 로딩 시작...');
      const headers = getAuthHeaders();
      const url = `http://localhost:5050/api/admin/exchange/daily-stats?year=${selectedYear}&month=${selectedMonth}`;
      
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        console.log('일별 통계 데이터:', data);
        setDailyStats(data.dailyStats || []);
        setMonthlySummary(data.monthlySummary || null);
        
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            analytics: {
              ...prev.tabs.analytics,
              daily: data.dailyStats || [],
              loading: false
            }
          }
        }));
        console.log('일별 통계 로딩 완료');
      } else {
        console.warn('일별 통계 API 응답 실패:', response.status);
        // 폴백 데이터 설정
        setDailyStats([]);
        setMonthlySummary(null);
      }
    } catch (err) {
      console.error('일별 통계 로딩 오류:', err);
      // 폴백 데이터 설정
      setDailyStats([]);
      setMonthlySummary(null);
    }
  }, [getAuthHeaders, selectedYear, selectedMonth]);

  // 알림 추가 함수 (다른 함수들보다 먼저 정의)
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // 최대 10개 유지
  }, []);

  // 주문 업데이트 처리
  const handleOrderUpdate = useCallback((update: RealtimeUpdate) => {
    if (update.action === 'create' || update.action === 'update') {
      setOrders(prev => {
        const existingIndex = prev.findIndex(order => order.id === update.data.id);
        if (existingIndex >= 0) {
          // 기존 주문 업데이트
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...update.data };
          return updated;
        } else {
          // 새 주문 추가
          return [update.data, ...prev];
        }
      });
      
      // 알림 추가
      addNotification({
        type: 'info',
        title: '주문 업데이트',
        message: `주문 #${update.data.id}이 ${update.action === 'create' ? '생성' : '업데이트'}되었습니다.`,
        action: () => {
          setActiveTab('orders');
          setSelectedOrder(update.data);
          setShowOrderModal(true);
        }
      });
    }
  }, [addNotification]);

  // 정산 업데이트 처리
  const handleSettlementUpdate = useCallback((update: RealtimeUpdate) => {
    if (update.action === 'create' || update.action === 'update') {
      setSettlements(prev => {
        const existingIndex = prev.findIndex(settlement => settlement.gameKey === update.data.gameKey);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...update.data };
          return updated;
        } else {
          return [update.data, ...prev];
        }
      });
      
      addNotification({
        type: 'success',
        title: '정산 완료',
        message: `${update.data.homeTeam} vs ${update.data.awayTeam} 경기가 정산되었습니다.`,
        action: () => {
          setActiveTab('settlements');
        }
      });
    }
  }, [addNotification]);

  // 통계 업데이트 처리
  const handleStatsUpdate = useCallback((update: RealtimeUpdate) => {
    setAdminState(prev => ({
      ...prev,
      tabs: {
        ...prev.tabs,
        dashboard: {
          ...prev.tabs.dashboard,
          kpis: {
            ...prev.tabs.dashboard.kpis,
            ...update.data
          }
        }
      }
    }));
  }, []);

  // 알림 업데이트 처리
  const handleAlertUpdate = useCallback((update: RealtimeUpdate) => {
    addNotification({
      type: update.data.severity || 'warning',
      title: update.data.title || '시스템 알림',
      message: update.data.message,
      action: update.data.action
    });
  }, [addNotification]);

  // 실시간 업데이트 처리 함수 (useEffect보다 먼저 정의)
  const handleRealtimeUpdate = useCallback((update: RealtimeUpdate) => {
    setLastUpdate(new Date());
    
    switch (update.type) {
      case 'order':
        handleOrderUpdate(update);
        break;
      case 'settlement':
        handleSettlementUpdate(update);
        break;
      case 'stats':
        handleStatsUpdate(update);
        break;
      case 'alert':
        handleAlertUpdate(update);
        break;
    }
  }, [handleOrderUpdate, handleSettlementUpdate, handleStatsUpdate, handleAlertUpdate]);

  // Phase 3: 실시간 업데이트 훅
  useEffect(() => {
    if (!isLoggedIn || !isAdmin) return;

    // WebSocket 연결 (개발 환경에서는 mock)
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-domain.com/ws/admin/exchange'
      : 'ws://localhost:5050/ws/admin/exchange';
    
    let ws: WebSocket | null = null;
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket 연결됨');
        setIsRealtimeConnected(true);
        
        // 인증 토큰 전송
        const tabId = sessionStorage.getItem('tabId');
        const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
        if (token) {
          ws?.send(JSON.stringify({ type: 'auth', token }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data);
          handleRealtimeUpdate(update);
        } catch (err) {
          console.error('WebSocket 메시지 파싱 오류:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket 연결 종료');
        setIsRealtimeConnected(false);
        
        // 재연결 시도 (5초 후)
        setTimeout(() => {
          if (isLoggedIn && isAdmin) {
            // 재연결은 useEffect가 다시 실행되도록 함
            console.log('WebSocket 재연결 시도');
          }
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 오류:', error);
        setIsRealtimeConnected(false);
      };
      
    } catch (err) {
      console.error('WebSocket 연결 실패:', err);
      setIsRealtimeConnected(false);
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isLoggedIn, isAdmin, handleRealtimeUpdate]);

  // Phase 2: 브레드크럼 업데이트 함수
  const updateBreadcrumbs = useCallback((path: string[], contextData?: any) => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: '대시보드', path: '/admin/exchange', level: 1, clickable: true }
    ];

    if (path.includes('orders')) {
      breadcrumbs.push({ label: '주문 관리', path: '/admin/exchange/orders', level: 2, clickable: true });
      
      if (path.includes('order-detail') && contextData?.selectedOrder) {
        breadcrumbs.push({ 
          label: `주문 #${contextData.selectedOrder.id}`, 
          path: `/admin/exchange/orders/${contextData.selectedOrder.id}`, 
          level: 3, 
          clickable: false 
        });
        
        if (path.includes('matches')) {
          breadcrumbs.push({ 
            label: '매칭 정보', 
            path: `/admin/exchange/orders/${contextData.selectedOrder.id}/matches`, 
            level: 4, 
            clickable: false 
          });
        }
      }
    } else if (path.includes('settlements')) {
      breadcrumbs.push({ label: '정산 관리', path: '/admin/exchange/settlements', level: 2, clickable: true });
      
      if (path.includes('settlement-detail') && contextData?.selectedSettlement) {
        breadcrumbs.push({ 
          label: `정산 #${contextData.selectedSettlement.gameKey}`, 
          path: `/admin/exchange/settlements/${contextData.selectedSettlement.gameKey}`, 
          level: 3, 
          clickable: false 
        });
      }
    } else if (path.includes('analytics')) {
      breadcrumbs.push({ label: '통계 분석', path: '/admin/exchange/analytics', level: 2, clickable: true });
    }

    setNavigationContext(prev => ({
      ...prev,
      currentPath: path,
      breadcrumbs,
      contextData: contextData || prev.contextData
    }));
  }, []);

  // 탭 변경 핸들러 (브레드크럼 포함)
  const handleTabChange = useCallback((tabId: 'dashboard' | 'orders' | 'settlements' | 'analytics') => {
    setActiveTab(tabId);
    
    // 브레드크럼 업데이트
    updateBreadcrumbs([tabId]);
    
    // 탭별 데이터 로딩 (지연 로딩)
    if (tabId === 'analytics' && adminState.tabs.analytics.daily.length === 0) {
      fetchDailyStats();
    }
  }, [adminState.tabs.analytics.daily.length, fetchDailyStats, updateBreadcrumbs]);

  // 서브탭 변경 핸들러
  const handleSubTabChange = useCallback((subTabId: string) => {
    setActiveSubTab(subTabId);
    
    // 서브탭에 따른 필터 적용
    setAdminState(prev => ({
      ...prev,
      tabs: {
        ...prev.tabs,
        orders: {
          ...prev.tabs.orders,
          filters: {
            ...prev.tabs.orders.filters,
            status: subTabId === 'all' ? [] : [subTabId as OrderStatus]
          }
        }
      }
    }));
  }, []);

  // 차트 데이터 준비
  const prepareChartData = () => {
    const labels = dailyStats.map(stat => {
      const date = new Date(stat.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const totalOrdersData = dailyStats.map(stat => stat.totalOrders);
    const matchedOrdersData = dailyStats.map(stat => stat.matchedOrders);
    const openOrdersData = dailyStats.map(stat => stat.openOrders);
    const settledOrdersData = dailyStats.map(stat => stat.settledOrders);

    return {
      labels,
      datasets: [
        {
          label: '전체 주문',
          data: totalOrdersData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: '매칭된 주문',
          data: matchedOrdersData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
        {
          label: '대기 중인 주문',
          data: openOrdersData,
          backgroundColor: 'rgba(251, 191, 36, 0.8)',
          borderColor: 'rgba(251, 191, 36, 1)',
          borderWidth: 1,
        },
        {
          label: '정산된 주문',
          data: settledOrdersData,
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${selectedYear}년 ${selectedMonth}월 일별 Exchange 주문 현황`,
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Phase 2: 드릴다운 네비게이션을 위한 주문 클릭 핸들러
  const handleOrderClick = useCallback(async (order: ExchangeOrder) => {
    try {
      const headers = getAuthHeaders();
      
      // 매치된 주문들 조회
      const matchedOrdersResponse = await fetch(`http://localhost:5050/api/admin/exchange/orders/${order.id}/matches`, { headers });
      let matchedOrders = [];
      
      if (matchedOrdersResponse.ok) {
        const matchedData = await matchedOrdersResponse.json();
        matchedOrders = matchedData.matchedOrders || [];
      }
      
      // 주문 상세 정보 설정
      const orderWithMatches = {
        ...order,
        matchedOrders: matchedOrders
      };
      
      setSelectedOrder(orderWithMatches);
      setShowOrderModal(true);
      
      // 브레드크럼 업데이트 (주문 상세)
      updateBreadcrumbs(['orders', 'order-detail'], { selectedOrder: orderWithMatches });
      
      // 상태 업데이트
      setAdminState(prev => ({
        ...prev,
        tabs: {
          ...prev.tabs,
          orders: {
            ...prev.tabs.orders,
            selectedOrder: orderWithMatches
          }
        }
      }));
      
    } catch (err) {
      console.error('주문 상세 정보 로딩 오류:', err);
    }
  }, [getAuthHeaders, updateBreadcrumbs]);


  // Phase 3: 데이터 내보내기 기능
  const exportData = useCallback(async (options: ExportOptions) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5050/api/admin/exchange/export', {
        method: 'POST',
        headers,
        body: JSON.stringify(options)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exchange-data-${new Date().toISOString().split('T')[0]}.${options.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        addNotification({
          type: 'success',
          title: '내보내기 완료',
          message: `${options.format.toUpperCase()} 파일이 다운로드되었습니다.`
        });
      } else {
        throw new Error('내보내기 실패');
      }
    } catch (err) {
      console.error('데이터 내보내기 오류:', err);
      addNotification({
        type: 'error',
        title: '내보내기 실패',
        message: '데이터 내보내기 중 오류가 발생했습니다.'
      });
    }
  }, [getAuthHeaders, addNotification]);

  // 고급 통계 차트 데이터 생성
  const generateAdvancedCharts = useCallback(() => {
    const chartData = {
      ordersByStatus: {
        labels: ['오픈', '매칭됨', '정산됨', '취소됨'],
        datasets: [{
          data: [
            orders.filter(o => o.status === 'open').length,
            orders.filter(o => o.status === 'matched').length,
            orders.filter(o => o.status === 'settled').length,
            orders.filter(o => o.status === 'cancelled').length
          ],
          backgroundColor: ['#3B82F6', '#10B981', '#6B7280', '#EF4444']
        }]
      },
      volumeByHour: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: '거래량',
          data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 1000000)),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)'
        }]
      },
      commissionTrend: {
        labels: dailyStats.map(stat => new Date(stat.date).toLocaleDateString('ko-KR')),
        datasets: [{
          label: '수수료 수익',
          data: dailyStats.map(stat => stat.volume * 0.05), // 5% 수수료 가정
          backgroundColor: 'rgba(168, 85, 247, 0.5)',
          borderColor: 'rgba(168, 85, 247, 1)'
        }]
      }
    };
    
    return chartData;
  }, [orders, dailyStats]);

  const handleOrderStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      
      if (!token) return;

      const response = await fetch(`http://localhost:5050/api/admin/exchange/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchExchangeData(); // 데이터 새로고침
        alert('주문 상태가 변경되었습니다.');
      } else {
        alert('주문 상태 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('주문 상태 변경 오류:', err);
      alert('주문 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleSettleGame = async (gameResultId: string) => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      
      if (!token) return;

      const response = await fetch(`http://localhost:5050/api/exchange/settle/${gameResultId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchExchangeData(); // 데이터 새로고침
        alert('경기 정산이 완료되었습니다.');
      } else {
        alert('경기 정산에 실패했습니다.');
      }
    } catch (err) {
      console.error('경기 정산 오류:', err);
      alert('경기 정산 중 오류가 발생했습니다.');
    }
  };

  // 새로운 통합 필터링 로직
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 검색어 필터
      const matchesSearch = !searchTerm || 
        order.homeTeam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.awayTeam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.gameId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 상태 필터
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      // 멀티배팅 필터
      const matchesMultibet = adminState.tabs.orders.filters.isMultibet === undefined || 
        order.isMultibet === adminState.tabs.orders.filters.isMultibet;
      
      // 서브탭 필터
      const matchesSubTab = activeSubTab === 'all' || order.status === activeSubTab;
      
      return matchesSearch && matchesStatus && matchesMultibet && matchesSubTab;
    });
  }, [orders, searchTerm, statusFilter, adminState.tabs.orders.filters.isMultibet, activeSubTab]);

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <>
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
              {/* 헤더 */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-lg shadow-lg">
                  <h1 className="text-3xl font-bold mb-2">Exchange 관리</h1>
                  <p className="text-purple-100">
                    안녕하세요, {username}님 (레벨 {adminLevel} 관리자)
                  </p>
                  <div className="mt-2 text-sm text-purple-200">
                    Exchange 주문 및 정산 관리
                  </div>
                </div>
              </div>

              {/* Phase 2: 브레드크럼 */}
              {navigationContext.breadcrumbs.length > 1 && (
                <div className="mb-6">
                  <nav className="flex items-center space-x-2 text-sm">
                    {navigationContext.breadcrumbs.map((breadcrumb, index) => (
                      <div key={breadcrumb.path} className="flex items-center">
                        {index > 0 && (
                          <svg className="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        )}
                        {breadcrumb.clickable ? (
                          <button
                            onClick={() => {
                              if (breadcrumb.label === '대시보드') {
                                handleTabChange('dashboard');
                              } else if (breadcrumb.label === '주문 관리') {
                                handleTabChange('orders');
                              } else if (breadcrumb.label === '정산 관리') {
                                handleTabChange('settlements');
                              } else if (breadcrumb.label === '통계 분석') {
                                handleTabChange('analytics');
                              }
                            }}
                            className="text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            {breadcrumb.label}
                          </button>
                        ) : (
                          <span className="text-gray-600">{breadcrumb.label}</span>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              )}

              {/* Phase 3: 실시간 상태 표시 */}
              <div className="mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                          {isRealtimeConnected ? '실시간 연결됨' : '연결 끊김'}
                        </span>
                      </div>
                      {lastUpdate && (
                        <div className="text-xs text-gray-500">
                          마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                        </div>
                      )}
                    </div>
                    
                    {/* 알림 카운터 */}
                    {notifications.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <button
                            onClick={() => {
                              // 알림 패널 토글
                              alert('알림 패널을 표시합니다.');
                            }}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                          >
                            🔔
                            {notifications.filter(n => !n.read).length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {notifications.filter(n => !n.read).length}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* 홈으로 가기 버튼 */}
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <div></div>
                  <button
                    onClick={() => {
                      window.location.href = '/admin';
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span>🏠</span>
                    <span>홈으로 가기</span>
                  </button>
                </div>
              </div>

              {/* 새로운 계층적 탭 네비게이션 */}
              <div className="mb-6">
                <nav className="flex space-x-8">
                  {ADMIN_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                      title={tab.purpose}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
                
                {/* 주문 관리 서브탭 */}
                {activeTab === 'orders' && (
                  <div className="mt-4">
                    <nav className="flex space-x-4">
                      {ORDER_SUBTABS.map(subTab => (
                        <button
                          key={subTab.id}
                          onClick={() => handleSubTabChange(subTab.id)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            activeSubTab === subTab.id
                              ? 'bg-purple-100 text-purple-700 border border-purple-300'
                              : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          {subTab.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}
              </div>

              {(loading || adminState.global.loading) ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                  <p className="mt-2 text-sm text-gray-500">API 서버에 연결 중...</p>
                  <p className="mt-1 text-xs text-gray-400">
                    로딩 상태: loading={loading.toString()}, global.loading={adminState.global.loading.toString()}
                  </p>
                </div>
              ) : (error || adminState.global.error) ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  ❌ {error || adminState.global.error}
                  <div className="mt-2 text-sm">
                    <p>API 서버 연결을 확인해주세요. (http://localhost:5050)</p>
                    <button 
                      onClick={fetchExchangeData} 
                      className="text-red-600 underline hover:text-red-800 mt-2"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 대시보드 탭 */}
                  {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                      {/* KPI 카드 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">오늘 주문 수</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {adminState.tabs.dashboard.loading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                            ) : (
                              adminState.tabs.dashboard.kpis.todayOrders
                            )}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">총 거래량</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {adminState.tabs.dashboard.loading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                            ) : (
                              `₩${adminState.tabs.dashboard.kpis.todayVolume.toLocaleString()}`
                            )}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">수수료 수익</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {adminState.tabs.dashboard.loading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                            ) : (
                              `₩${adminState.tabs.dashboard.kpis.todayCommission.toLocaleString()}`
                            )}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">대기 중인 주문</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {adminState.tabs.dashboard.loading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                            ) : (
                              adminState.tabs.dashboard.kpis.openOrders
                            )}
                          </p>
                        </div>
                      </div>

                      {/* 전체 통계 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">오픈 주문</h3>
                          <p className="text-2xl font-bold text-gray-900">{exchangeStats.total.openOrders}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">멀티배팅</h3>
                          <p className="text-2xl font-bold text-gray-900">{exchangeStats.total.multibets}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">정산 완료</h3>
                          <p className="text-2xl font-bold text-gray-900">{exchangeStats.total.settlements}</p>
                        </div>
                      </div>

                      {/* 일별 주문 현황 차트 */}
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">일별 주문 현황</h3>
                          
                          {/* 월별 필터 */}
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">년도:</label>
                              <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                  <option key={year} value={year}>{year}년</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">월:</label>
                              <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                  <option key={month} value={month}>{month}월</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* 월별 요약 통계 */}
                        {monthlySummary && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{monthlySummary.totalOrders}</div>
                              <div className="text-sm text-gray-600">총 주문</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{monthlySummary.matchedOrders}</div>
                              <div className="text-sm text-gray-600">매칭된 주문</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600">{monthlySummary.openOrders}</div>
                              <div className="text-sm text-gray-600">대기 중인 주문</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">{monthlySummary.settledOrders}</div>
                              <div className="text-sm text-gray-600">정산된 주문</div>
                            </div>
                          </div>
                        )}

                        {/* 차트 */}
                        <div className="w-full h-96 relative">
                          {dailyStats.length > 0 ? (
                            <Bar data={prepareChartData()} options={chartOptions} />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <div className="text-center">
                                <div className="text-4xl mb-2">📊</div>
                                <div>해당 기간의 데이터가 없습니다.</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 주문 관리 탭 (통합된 주문 관리) */}
                  {activeTab === 'orders' && (
                    <div className="space-y-6">
                      {/* 탭별 액션 버튼들 */}
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">주문 관리 액션</h3>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              // TODO: 새 주문 생성 기능 구현
                              alert('새 주문 생성 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            📝 새 주문 생성
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 일괄 취소 기능 구현
                              alert('일괄 취소 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          >
                            🗑️ 일괄 취소
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 주문 내보내기 기능 구현
                              alert('주문 내보내기 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                          >
                            📤 주문 내보내기
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 주문 검증 기능 구현
                              alert('주문 검증 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                          >
                            ✅ 주문 검증
                          </button>
                        </div>
                      </div>

                      {/* 필터 */}
                      <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="팀명 또는 게임 ID로 검색..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="all">모든 상태</option>
                              <option value="open">오픈</option>
                              <option value="matched">매칭됨</option>
                              <option value="settled">정산됨</option>
                              <option value="cancelled">취소됨</option>
                            </select>
                            <select
                              value={adminState.tabs.orders.filters.isMultibet === undefined ? 'all' : adminState.tabs.orders.filters.isMultibet ? 'multibet' : 'single'}
                              onChange={(e) => {
                                const value = e.target.value === 'all' ? undefined : e.target.value === 'multibet';
                                setAdminState(prev => ({
                                  ...prev,
                                  tabs: {
                                    ...prev.tabs,
                                    orders: {
                                      ...prev.tabs.orders,
                                      filters: {
                                        ...prev.tabs.orders.filters,
                                        isMultibet: value
                                      }
                                    }
                                  }
                                }));
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="all">모든 주문</option>
                              <option value="single">단일 주문</option>
                              <option value="multibet">멀티배팅</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* 주문 목록 */}
                      <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문 ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">경기/선택</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마켓</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">타입</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생성일</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredOrders.map((order) => (
                                <tr 
                                  key={order.id} 
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => handleOrderClick(order)}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{order.id}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div>
                                      {order.isMultibet ? (
                                        <div>
                                          <div className="font-medium text-purple-600">
                                            멀티배팅 ({order.selectionDetails?.selections?.length || 0}개 선택)
                                          </div>
                                          <div className="text-gray-500 text-xs">
                                            총 배당률: {order.selectionDetails?.totalOdds?.toFixed(2) || 'N/A'}
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="font-medium">{order.homeTeam} vs {order.awayTeam}</div>
                                          <div className="text-gray-500 text-xs">{order.sportKey}</div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.market}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      order.side === 'back' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {order.side === 'back' ? 'Back' : 'Lay'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.price.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ₩{order.amount.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      order.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                      order.status === 'matched' ? 'bg-green-100 text-green-800' :
                                      order.status === 'settled' ? 'bg-gray-100 text-gray-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {order.status === 'open' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOrderStatusChange(order.id, 'cancelled');
                                        }}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        취소
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 통계 분석 탭 */}
                  {activeTab === 'analytics' && (
                    <div className="space-y-6">
                      {/* 탭별 액션 버튼들 */}
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">통계 분석 액션</h3>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              // TODO: 리포트 생성 기능 구현
                              alert('리포트 생성 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            📊 리포트 생성
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 데이터 내보내기 기능 구현
                              alert('데이터 내보내기 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                          >
                            📤 데이터 내보내기
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 실시간 모니터링 기능 구현
                              alert('실시간 모니터링 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            📈 실시간 모니터링
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 예측 분석 기능 구현
                              alert('예측 분석 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                          >
                            🔮 예측 분석
                          </button>
                        </div>
                      </div>

                      {/* Phase 3: 고급 통계 헤더 */}
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">고급 통계 분석</h3>
                          
                          <div className="flex items-center space-x-4">
                            {/* 내보내기 버튼 */}
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">형식:</label>
                              <select
                                onChange={(e) => {
                                  const format = e.target.value as 'excel' | 'pdf' | 'csv';
                                  exportData({
                                    format,
                                    dateRange: {
                                      start: new Date(selectedYear, selectedMonth - 1, 1),
                                      end: new Date(selectedYear, selectedMonth, 0)
                                    },
                                    filters: adminState.shared.filters,
                                    includeCharts: true
                                  });
                                }}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="">내보내기 선택</option>
                                <option value="excel">Excel</option>
                                <option value="pdf">PDF</option>
                                <option value="csv">CSV</option>
                              </select>
                            </div>
                            
                            {/* 월별 필터 */}
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">년도:</label>
                              <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                  <option key={year} value={year}>{year}년</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">월:</label>
                              <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                  <option key={month} value={month}>{month}월</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* 월별 요약 통계 */}
                        {monthlySummary && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{monthlySummary.totalOrders}</div>
                              <div className="text-sm text-gray-600">총 주문</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{monthlySummary.matchedOrders}</div>
                              <div className="text-sm text-gray-600">매칭된 주문</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600">{monthlySummary.openOrders}</div>
                              <div className="text-sm text-gray-600">대기 중인 주문</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">{monthlySummary.settledOrders}</div>
                              <div className="text-sm text-gray-600">정산된 주문</div>
                            </div>
                          </div>
                        )}

                        {/* 기존 일별 차트 */}
                        <div className="w-full h-96 relative">
                          {dailyStats.length > 0 ? (
                            <Bar data={prepareChartData()} options={chartOptions} />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <div className="text-center">
                                <div className="text-4xl mb-2">📊</div>
                                <div>해당 기간의 데이터가 없습니다.</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Phase 3: 고급 통계 차트들 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 주문 상태별 분포 */}
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">주문 상태별 분포</h4>
                          <div className="w-full h-64 relative">
                            <Bar 
                              data={generateAdvancedCharts().ordersByStatus} 
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false }
                                }
                              }} 
                            />
                          </div>
                        </div>

                        {/* 시간대별 거래량 */}
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">시간대별 거래량</h4>
                          <div className="w-full h-64 relative">
                            <Bar 
                              data={generateAdvancedCharts().volumeByHour} 
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false }
                                },
                                scales: {
                                  x: {
                                    ticks: {
                                      maxRotation: 45,
                                      minRotation: 0
                                    }
                                  }
                                }
                              }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* 수수료 트렌드 */}
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">수수료 수익 트렌드</h4>
                        <div className="w-full h-64 relative">
                          <Bar 
                            data={generateAdvancedCharts().commissionTrend} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false }
                              }
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 정산 관리 탭 */}
                  {activeTab === 'settlements' && (
                    <div className="space-y-6">
                      {/* 탭별 액션 버튼들 */}
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">정산 관리 액션</h3>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              // TODO: 수동 정산 처리 기능 구현
                              alert('수동 정산 처리 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            💰 수동 정산 처리
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 정산 내역 내보내기 기능 구현
                              alert('정산 내역 내보내기 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                          >
                            📤 정산 내역 내보내기
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 정산 검증 기능 구현
                              alert('정산 검증 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                          >
                            ✅ 정산 검증
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 정산 통계 기능 구현
                              alert('정산 통계 기능은 추후 구현 예정입니다.');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            📊 정산 통계
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900">정산 내역</h3>
                          <p className="text-sm text-gray-500">완료된 경기의 정산 기록</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">경기</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결과</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">정산 주문 수</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 거래량</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">승리 수익</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">정산일</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {settlements.length > 0 ? (
                                settlements.map((settlement, index) => (
                                  <tr key={settlement.gameKey || index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {settlement.homeTeam} vs {settlement.awayTeam}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      정산 완료
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {settlement.settledOrders}개
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      ₩{settlement.totalVolume.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                      ₩{settlement.winningAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {settlement.settledAt ? new Date(settlement.settledAt).toLocaleDateString('ko-KR') : 'N/A'}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                    정산된 경기가 없습니다.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 주문 상세 모달 */}
              {showOrderModal && selectedOrder && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      {/* 모달 헤더 */}
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          주문 상세 정보 - #{selectedOrder.id}
                        </h3>
                        <button
                          onClick={() => setShowOrderModal(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 주문자 정보 */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="text-md font-semibold text-gray-900 mb-3">주문자 정보</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">사용자명:</span>
                              <span className="text-sm font-medium">{selectedOrder.user?.username || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">이메일:</span>
                              <span className="text-sm font-medium">{selectedOrder.user?.email || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">주문 타입:</span>
                              <span className={`text-sm font-medium px-2 py-1 rounded ${
                                selectedOrder.side === 'back' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {selectedOrder.side === 'back' ? 'Back' : 'Lay'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">배당률:</span>
                              <span className="text-sm font-medium">{selectedOrder.price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">주문 금액:</span>
                              <span className="text-sm font-medium">₩{selectedOrder.amount.toLocaleString()}</span>
                            </div>
                            {selectedOrder.status === 'matched' && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">체결 금액:</span>
                                  <span className="text-sm font-medium text-green-600">₩{selectedOrder.filledAmount?.toLocaleString() || selectedOrder.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">매치 비율:</span>
                                  <span className="text-sm font-medium text-blue-600">
                                    {selectedOrder.filledAmount && selectedOrder.originalAmount 
                                      ? `${((selectedOrder.filledAmount / selectedOrder.originalAmount) * 100).toFixed(1)}%`
                                      : '100%'
                                    }
                                  </span>
                                </div>
                                {selectedOrder.remainingAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">남은 금액:</span>
                                    <span className="text-sm font-medium text-orange-600">₩{selectedOrder.remainingAmount.toLocaleString()}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">상태:</span>
                              <span className={`text-sm font-medium px-2 py-1 rounded ${
                                selectedOrder.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                selectedOrder.status === 'matched' ? 'bg-green-100 text-green-800' :
                                selectedOrder.status === 'settled' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {selectedOrder.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 경기 정보 또는 선택된 경기들 */}
                        {selectedOrder.isMultibet && selectedOrder.selectionDetails && selectedOrder.selectionDetails.selections && selectedOrder.selectionDetails.selections.length > 0 ? (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">선택된 경기들</h4>
                            <div className="space-y-3">
                              {selectedOrder.selectionDetails.selections.map((selection, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {selection.homeTeam} vs {selection.awayTeam}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1">
                                          {selection.market}
                                        </span>
                                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                          {selection.selection}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {new Date(selection.commenceTime).toLocaleString('ko-KR')}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-orange-600">
                                        {selection.odds?.toFixed(2) || 'N/A'}
                                      </div>
                                      <div className="text-xs text-gray-500">배당률</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : !selectedOrder.isMultibet ? (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">경기 정보</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">경기:</span>
                                <span className="text-sm font-medium">{selectedOrder.homeTeam} vs {selectedOrder.awayTeam}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">스포츠:</span>
                                <span className="text-sm font-medium">{selectedOrder.sportKey}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">마켓:</span>
                                <span className="text-sm font-medium">{selectedOrder.market}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">경기 시간:</span>
                                <span className="text-sm font-medium">
                                  {new Date(selectedOrder.commenceTime).toLocaleString('ko-KR')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">주문 생성:</span>
                                <span className="text-sm font-medium">
                                  {new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}
                                </span>
                              </div>
                              {selectedOrder.settledAt && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">정산 시간:</span>
                                  <span className="text-sm font-medium">
                                    {new Date(selectedOrder.settledAt).toLocaleString('ko-KR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* 매치배팅자 정보 */}
                      {selectedOrder.matchedOrders && selectedOrder.matchedOrders.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold text-gray-900 mb-3">매치배팅자 정보</h4>
                          <div className="bg-white border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">사용자명</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">매치 금액</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">매치 시간</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedOrder.matchedOrders.map((match) => (
                                  <tr key={match.id}>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                      {match.user?.username || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      {match.user?.email || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      <div className="space-y-1">
                                        <div className="font-medium">₩{match.filledAmount?.toLocaleString() || match.amount.toLocaleString()}</div>
                                        {match.filledAmount && match.originalAmount && match.filledAmount !== match.originalAmount && (
                                          <div className="text-xs text-gray-500">
                                            전체: ₩{match.originalAmount.toLocaleString()} 
                                            ({((match.filledAmount / match.originalAmount) * 100).toFixed(1)}%)
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      {new Date(match.createdAt).toLocaleString('ko-KR')}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        match.status === 'matched' ? 'bg-green-100 text-green-800' :
                                        match.status === 'settled' ? 'bg-gray-100 text-gray-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {match.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}



                      {/* Phase 2: 드릴다운 액션 버튼들 */}
                      <div className="mt-6 flex justify-between">
                        <div className="flex space-x-3">
                          {selectedOrder.matchedOrders && selectedOrder.matchedOrders.length > 0 && (
                            <button
                              onClick={() => {
                                // 매칭 정보로 드릴다운
                                updateBreadcrumbs(['orders', 'order-detail', 'matches'], { selectedOrder });
                                // 매칭 정보 섹션으로 스크롤하거나 별도 뷰 표시
                                alert('매칭 정보를 상세히 보여줍니다.');
                              }}
                              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                            >
                              매칭 정보 상세 보기
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // 사용자 프로필로 이동
                              alert('사용자 프로필을 보여줍니다.');
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                          >
                            사용자 프로필
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setShowOrderModal(false);
                            // 브레드크럼을 주문 관리로 되돌리기
                            updateBreadcrumbs(['orders']);
                          }}
                          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
