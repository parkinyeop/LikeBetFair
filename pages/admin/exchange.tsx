import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { formatToLocalDateTime } from '../../utils/timeUtils';
import { toast } from 'react-hot-toast';
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
  id: 'dashboard' | 'orders' | 'analytics';
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

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  link: string;
  count: number;
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

type OrderStatus = 'open' | 'matched' | 'partially_matched' | 'active' | 'settled' | 'cancelled';

// 취소 원인 파싱 함수
  const getCancellationReason = (settlementNote: string | null, paymentMemo?: string): string => {
    // settlementNote 우선 확인
    if (settlementNote) {
      if (settlementNote.includes('자동 취소') || settlementNote.includes('만료') || settlementNote.includes('미매칭되어 자동 환불')) return '만료';
      if (settlementNote.includes('경기 취소') || settlementNote.includes('연기')) return '경기';
      if (settlementNote.includes('Back 주문 취소로 인한') || settlementNote.includes('원주문 취소로 인한')) return '원주문';
      if (settlementNote.includes('사용자') || settlementNote.includes('취소 환불')) return '사용자';
    }
    
    // settlementNote가 없으면 paymentMemo 확인
    if (paymentMemo) {
      if (paymentMemo.includes('자동 환불') || paymentMemo.includes('만료')) return '만료';
      if (paymentMemo.includes('경기 취소') || paymentMemo.includes('연기')) return '경기';
      if (paymentMemo.includes('Back 주문 취소로 인한') || paymentMemo.includes('원주문 취소로 인한')) return '원주문';
      if (paymentMemo.includes('취소 환불')) return '사용자';
    }
    
    // 둘 다 없으면 사유 불명
    if (!settlementNote && !paymentMemo) return '사유 불명';
    
    // 나머지는 기타
    return '기타';
  };

// 취소 상태 표시 함수
const getCancellationDisplayText = (order: any): string => {
  if (order.status !== 'cancelled') {
    return order.status === 'settled' ? '정산완료' : 
           order.status === 'partially_matched' ? '부분 매칭' :
           order.status === 'active' ? '활성' :
           order.status;
  }
  
  const reason = getCancellationReason(order.settlementNote, order.paymentMemo);
  return `취소 (${reason})`;
};

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
    id: 'analytics',
    label: '통계 분석',
    icon: '📈',
    purpose: '상세 통계 및 분석',
    level: 'analysis'
  }
];

// 주문 상태별 필터 (활성 주문 관리용)
  const ORDER_STATUS_TABS = [
    { id: 'all', label: '전체 주문' },
    { id: 'open', label: '대기 중' },
    { id: 'matched', label: '매칭됨' },
    { id: 'partially_matched', label: '부분 매칭' },
    { id: 'active', label: '활성' },
    { id: 'settled', label: '정산완료' }
  ];

// 취소 사유별 필터 (취소 주문 분석용)
  const CANCELLED_REASON_TABS = [
    { id: 'cancelled', label: '전체 취소' },
    { id: 'cancelled_user', label: '사용자 취소' },
    { id: 'cancelled_game', label: '경기 취소' },
    { id: 'cancelled_expired', label: '만료 취소' },
    { id: 'cancelled_original', label: '원주문 취소' },
    { id: 'cancelled_unknown', label: '사유불명' },
    { id: 'cancelled_other', label: '기타 취소' }
  ];

export default function ExchangeAdmin() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  
  // 새로운 상태 관리 구조
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'analytics'>('dashboard');
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
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  // 통합된 로딩 상태 (기존 loading 제거)
  // const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 정산 관리 모달 상태 - 제거됨
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettlementDetailModal, setShowSettlementDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<ExchangeOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showManualInputModal, setShowManualInputModal] = useState(false);
  const [manualGameResults, setManualGameResults] = useState({});
  
  // 드롭다운 상태 관리
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCancelledDropdownOpen, setIsCancelledDropdownOpen] = useState(false);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsDropdownOpen(false);
        setIsCancelledDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isCancelledDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isCancelledDropdownOpen]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin || adminLevel < 1) {
      toast.error('관리자 권한이 필요합니다.');
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

  // 정산 관련 함수들 - 제거됨

  // 정산 내역 내보내기
  const handleExportSettlements = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5050/api/exchange/settlements/export', {
        headers
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settlements_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('정산 내역이 다운로드되었습니다.');
      } else {
        toast.error('내보내기 실패했습니다.');
      }
    } catch (error) {
      console.error('내보내기 오류:', error);
      toast.error('내보내기 중 오류가 발생했습니다.');
    }
  }, [getAuthHeaders]);

  // 정산 상세 정보 조회
  const handleSettlementDetailClick = useCallback(async (settlement: any) => {
    // 정산 상세 정보 조회
    try {
      setSelectedSettlement(settlement);
      setLoadingSettlementDetail(true);

      const headers = getAuthHeaders();

      // commenceTime이 없으면 기본값 설정
      const commenceTime = settlement.commenceTime || new Date().toISOString();
      const gameKey = `${settlement.homeTeam}|${settlement.awayTeam}|${commenceTime}`;

      // API 호출 등 원본 로직...
    } catch (error) {
      console.error('정산 상세 정보 조회 오류:', error);
    } finally {
      setLoadingSettlementDetail(false);
    }
  }, [getAuthHeaders]);

  // 수동 경기 결과 입력 핸들러
  const handleManualScoreChange = useCallback((gameId: number, field: string, value: string) => {
    setManualGameResults(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [field]: value
      }
    }));
  }, []);

  const handleManualStatusChange = useCallback((gameId: number, status: string) => {
    setManualGameResults(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        status: status,
        result: status === 'finished' ? prev[gameId]?.result || '' : null
      }
    }));
  }, []);

  const handleManualResultChange = useCallback((gameId: number, result: string) => {
    setManualGameResults(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        result: result
      }
    }));
  }, []);

  const handleManualInputSave = useCallback(async () => {
    if (!selectedOrder) return;

    try {
      const headers = getAuthHeaders();
      
      // 선택된 경기들에서 데이터 추출
      const gameResults = selectedOrder.selectionDetails?.selections?.map((selection, index) => {
        const gameId = index + 1;
        const manualData = manualGameResults[gameId] || {};
        
        return {
          gameId: gameId,
          homeTeam: selection.homeTeam,
          awayTeam: selection.awayTeam,
          homeScore: parseInt(manualData.homeScore) || 0,
          awayScore: parseInt(manualData.awayScore) || 0,
          status: manualData.status || 'pending',
          result: manualData.result || null,
          commenceTime: selection.commenceTime
        };
      }) || [];

      const response = await fetch('/api/admin/manual-game-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          gameResults: gameResults
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowManualInputModal(false);
        setManualGameResults({});
        
        // 주문 상세 정보 새로고침 - handleOrderClick 대신 직접 API 호출
        try {
          const orderResponse = await fetch(`/api/admin/exchange/orders/${selectedOrder.id}`, {
            headers: getAuthHeaders()
          });
          
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            setSelectedOrder(orderData);
          }
        } catch (refreshError) {
          console.error('주문 정보 새로고침 오류:', refreshError);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || '저장 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('수동 경기 결과 저장 오류:', error);
      toast.error('저장 중 오류가 발생했습니다');
    }
  }, [selectedOrder, manualGameResults, getAuthHeaders]);

  // 정산 검증 - 제거됨

  // Phase 1: API 호출 최적화 - 병렬 로딩
  // Action Items 데이터 생성
  const generateActionItems = useCallback((): ActionItem[] => {
    const items: ActionItem[] = [];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Action Items 생성 중...', { 
        settlements: settlements.length, 
        orders: orders.length, 
        exchangeStats: exchangeStats 
      });
    }
    
    // 수동 정산이 필요한 경기 (활성 주문들)
    const pendingSettlements = orders.filter(o => o.status === 'active');
    if (pendingSettlements.length > 0) {
      items.push({
        id: 'pending-settlements',
        title: '수동 정산이 필요한 경기',
        description: '결과가 입력되지 않은 경기들이 있습니다',
        priority: 'high',
        icon: '⚠️',
        link: '#orders',
        count: pendingSettlements.length
      });
    }
    
    // 긴급 환불이 필요한 주문
    const urgentRefunds = orders.filter(o => 
      o.status === 'cancelled' && 
      new Date(o.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    if (urgentRefunds.length > 0) {
      items.push({
        id: 'urgent-refunds',
        title: '긴급 환불이 필요한 주문',
        description: '최근 24시간 내 취소된 주문들',
        priority: 'high',
        icon: '💸',
        link: '#orders',
        count: urgentRefunds.length
      });
    }
    
    // 높은 취소율 경고
    const totalOrders = (exchangeStats?.total?.openOrders || 0) + (exchangeStats?.total?.settlements || 0);
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const cancelRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('취소율 체크:', { totalOrders, cancelledOrders, cancelRate, shouldShow: cancelRate > 30 });
    }
    
    if (cancelRate > 30) {
      items.push({
        id: 'high-cancel-rate',
        title: '높은 취소율 경고',
        description: `현재 취소율이 ${Math.round(cancelRate)}%입니다`,
        priority: 'medium',
        icon: '🔒',
        link: '#analytics',
        count: Math.round(cancelRate)
      });
    }
    
    // 경기 시간이 지났는데 결과가 없는 주문
    const now = new Date();
    const overdueOrders = orders.filter(order => {
      // 경기 시간이 지났는지 확인
      const gameTime = new Date(order.commenceTime);
      const isOverdue = gameTime < now;
      
      // 정산되지 않은 상태인지 확인
      const isNotSettled = order.status !== 'settled' && order.status !== 'cancelled';
      
      return isOverdue && isNotSettled;
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('경과된 주문 체크:', { 
        totalOrders: orders.length, 
        overdueOrders: overdueOrders.length,
        shouldShow: overdueOrders.length > 0 
      });
    }
    
    if (overdueOrders.length > 0) {
      items.push({
        id: 'overdue-games',
        title: '경기 시간 경과 미정산 주문',
        description: `${overdueOrders.length}개 주문의 경기 시간이 지났지만 결과가 없습니다`,
        priority: 'high',
        icon: '⏰',
        link: '#orders',
        count: overdueOrders.length
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('생성된 Action Items:', items);
    }
    
    return items;
  }, [settlements, orders, exchangeStats]);

  const fetchExchangeData = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Exchange 데이터 로딩 시작...');
      }
      setAdminState(prev => ({
        ...prev,
        global: { ...prev.global, loading: true, error: null }
      }));

      const headers = getAuthHeaders();
      const baseUrl = 'http://localhost:5050/api/admin/exchange';

      if (process.env.NODE_ENV === 'development') {
        console.log('API 호출 시작:', baseUrl);
      }

      // 병렬로 모든 데이터 로딩
      const [statsResponse, ordersResponse, settlementsResponse] = await Promise.all([
        fetch(`${baseUrl}/stats`, { headers }),
        fetch(`${baseUrl}/orders`, { headers }),
        fetch(`${baseUrl}/settlements`, { headers })
      ]);

      if (process.env.NODE_ENV === 'development') {
        console.log('API 응답 상태:', {
        stats: statsResponse.status,
        orders: ordersResponse.status,
        settlements: settlementsResponse.status
        });
      }

      // 응답 처리
      const [statsData, ordersData, settlementsData] = await Promise.all([
        statsResponse.ok ? statsResponse.json() : null,
        ordersResponse.ok ? ordersResponse.json() : null,
        settlementsResponse.ok ? settlementsResponse.json() : null
      ]);

      if (process.env.NODE_ENV === 'development') {
        console.log('API 응답 데이터:', { statsData, ordersData, settlementsData });
      }

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

      // Action Items 업데이트
      const newActionItems = generateActionItems();
      setActionItems(newActionItems);

      setAdminState(prev => ({
        ...prev,
        global: { 
          ...prev.global, 
          loading: false, 
          error: null,
          lastUpdated: new Date()
        }
      }));

      // 통합된 로딩 상태 사용 (setLoading 제거)

      if (process.env.NODE_ENV === 'development') {
        console.log('Exchange 데이터 로딩 완료');
      }

    } catch (err) {
      console.error('Exchange 데이터 로딩 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.';
      
      // 통합된 에러 처리
      setAdminState(prev => ({
        ...prev,
        global: { 
          ...prev.global, 
          loading: false, 
          error: errorMessage
        }
      }));
      
      // 사용자에게 에러 알림
      toast.error(`데이터 로딩 실패: ${errorMessage}`);
    }
  }, [getAuthHeaders]);

  // 기존 fetchDailyStats 함수는 유지하되 최적화
  const fetchDailyStats = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('일별 통계 로딩 시작...');
      }
      const headers = getAuthHeaders();
      const url = `http://localhost:5050/api/admin/exchange/daily-stats?year=${selectedYear}&month=${selectedMonth}`;
      
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('일별 통계 데이터:', data);
        }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('일별 통계 로딩 완료');
        }
      } else {
        console.warn('일별 통계 API 응답 실패:', response.status);
        // 폴백 데이터 설정
        setDailyStats([]);
        setMonthlySummary(null);
      }
    } catch (err) {
      console.error('일별 통계 로딩 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '일별 통계를 불러오는 중 오류가 발생했습니다.';
      
      // 폴백 데이터 설정
      setDailyStats([]);
      setMonthlySummary(null);
      
      // 사용자에게 에러 알림
      toast.error(`일별 통계 로딩 실패: ${errorMessage}`);
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
          setActiveTab('orders');
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
        if (process.env.NODE_ENV === 'development') {
          console.log('WebSocket 연결됨');
        }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('WebSocket 연결 종료');
        }
        setIsRealtimeConnected(false);
        
        // 재연결 시도 (5초 후)
        setTimeout(() => {
          if (isLoggedIn && isAdmin) {
            // 재연결은 useEffect가 다시 실행되도록 함
            if (process.env.NODE_ENV === 'development') {
              console.log('WebSocket 재연결 시도');
            }
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
    if (tabId === 'settlements') {
      setActiveTab('orders'); // settlements는 orders 탭으로 리다이렉트
    } else {
      setActiveTab(tabId as 'dashboard' | 'orders' | 'analytics');
    }
    
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
    const cancelledOrdersData = dailyStats.map(stat => 0); // cancelledOrders 속성이 없으므로 0으로 설정

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
          label: '정산완료 주문',
          data: settledOrdersData,
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 1,
        },
        {
          label: '취소된 주문',
          data: cancelledOrdersData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
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
      
      // 매치된 주문들 및 경기 결과 조회
      const matchedOrdersResponse = await fetch(`http://localhost:5050/api/admin/exchange/orders/${order.id}/matches`, { headers });
      let matchedOrders = [];
      let gameResults = {};
      let gameResult = null;
      let refundInfo = [];

      if (matchedOrdersResponse.ok) {
        const matchedData = await matchedOrdersResponse.json();
        matchedOrders = matchedData.matchedOrders || [];
        gameResults = matchedData.gameResults || {}; // 멀티배팅용 경기 결과들
        gameResult = matchedData.originalOrder?.gameResult || null; // 단일 경기용 경기 결과
        refundInfo = matchedData.refundInfo || []; // 환불 정보
      }
      
      // 주문 상세 정보 설정
      const orderWithMatches = {
        ...order,
        matchedOrders: matchedOrders,
        gameResults: gameResults, // 멀티배팅용 경기 결과들
        gameResult: gameResult, // 단일 경기용 경기 결과
        refundInfo: refundInfo // 환불 정보
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
        labels: ['오픈', '매칭됨', '부분 매칭', '활성', '정산됨', '취소됨'],
        datasets: [{
          data: [
            orders.filter(o => o.status === 'open').length,
            orders.filter(o => o.status === 'matched').length,
            orders.filter(o => o.status === 'partially_matched').length,
            orders.filter(o => o.status === 'active').length,
            orders.filter(o => o.status === 'settled').length,
            orders.filter(o => o.status === 'cancelled').length
          ],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#6B7280', '#EF4444']
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
        toast.success('주문 상태가 변경되었습니다.');
      } else {
        toast.error('주문 상태 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('주문 상태 변경 오류:', err);
      toast.error('주문 상태 변경 중 오류가 발생했습니다.');
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
        toast.success('경기 정산이 완료되었습니다.');
      } else {
        toast.error('경기 정산에 실패했습니다.');
      }
    } catch (err) {
      console.error('경기 정산 오류:', err);
      toast.error('경기 정산 중 오류가 발생했습니다.');
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
      
      // 상태 필터 (취소 원인별 필터링 포함)
      let matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      // 취소 원인별 필터링
      if (statusFilter.startsWith('cancelled_') && order.status === 'cancelled') {
        const reason = getCancellationReason((order as any).settlementNote, (order as any).paymentMemo);
        const filterReason = statusFilter.replace('cancelled_', '');
        matchesStatus = (filterReason === 'user' && reason === '사용자') ||
                       (filterReason === 'game' && reason === '경기') ||
                       (filterReason === 'expired' && reason === '만료') ||
                       (filterReason === 'original' && reason === '원주문') ||
                       (filterReason === 'unknown' && reason === '사유 불명') ||
                       (filterReason === 'other' && reason === '기타');
      }
      
      // 멀티배팅 필터
      const matchesMultibet = adminState.tabs.orders.filters.isMultibet === undefined || 
        order.isMultibet === adminState.tabs.orders.filters.isMultibet;
      
      // 서브탭 필터 (취소 원인별 필터링 포함)
      let matchesSubTab = activeSubTab === 'all' || order.status === activeSubTab;
      
      // 취소 원인별 서브탭 필터링
      if (activeSubTab.startsWith('cancelled_') && order.status === 'cancelled') {
        const reason = getCancellationReason((order as any).settlementNote, (order as any).paymentMemo);
        const tabReason = activeSubTab.replace('cancelled_', '');
        matchesSubTab = (tabReason === 'user' && reason === '사용자') ||
                       (tabReason === 'game' && reason === '경기') ||
                       (tabReason === 'expired' && reason === '만료') ||
                       (tabReason === 'original' && reason === '원주문') ||
                       (tabReason === 'unknown' && reason === '사유 불명') ||
                       (tabReason === 'other' && reason === '기타');
      }
      
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
                              toast('알림 패널을 표시합니다.', { icon: 'ℹ️' });
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
                
                {/* 주문 관리 필터 - 2개 드롭다운으로 분리 */}
                {activeTab === 'orders' && (
                  <div className="mt-4 flex gap-4">
                    {/* 주문 상태 필터 */}
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-200 transition-colors"
                      >
                        <span>📊 {ORDER_STATUS_TABS.find(tab => tab.id === activeSubTab)?.label || '주문 상태'}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              주문 상태
                            </div>
                            {ORDER_STATUS_TABS.map(subTab => (
                              <button
                                key={subTab.id}
                                onClick={() => {
                                  handleSubTabChange(subTab.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                  activeSubTab === subTab.id
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-700'
                                }`}
                              >
                                {subTab.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 취소 사유 필터 */}
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setIsCancelledDropdownOpen(!isCancelledDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200 hover:bg-red-200 transition-colors"
                      >
                        <span>❌ {CANCELLED_REASON_TABS.find(tab => tab.id === activeSubTab)?.label || '취소 사유'}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform ${isCancelledDropdownOpen ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isCancelledDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              취소 사유
                            </div>
                            {CANCELLED_REASON_TABS.map(subTab => (
                              <button
                                key={subTab.id}
                                onClick={() => {
                                  handleSubTabChange(subTab.id);
                                  setIsCancelledDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                  activeSubTab === subTab.id
                                    ? 'bg-red-50 text-red-700 font-medium'
                                    : 'text-gray-700'
                                }`}
                              >
                                {subTab.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {adminState.global.loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                  <p className="mt-2 text-sm text-gray-500">API 서버에 연결 중...</p>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-sm text-gray-600">데이터를 불러오는 중...</span>
                  </div>
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
                              `₩${(adminState.tabs.dashboard.kpis.todayVolume || 0).toLocaleString()}`
                            )}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">수수료 수익</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {adminState.tabs.dashboard.loading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                            ) : (
                              `₩${(adminState.tabs.dashboard.kpis.todayCommission || 0).toLocaleString()}`
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

                      {/* Action Items 섹션 */}
                      {(actionItems.length > 0 || true) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                          <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                            <span className="mr-2">⚠️</span>
                            긴급 조치 필요 항목 (Action Items)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* 테스트용 Action Items */}
                            {actionItems.length === 0 && (
                              <>
                                <div className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md bg-red-50 border-red-200 hover:bg-red-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">🔒</span>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      44건
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-gray-900 mb-1">높은 취소율 경고</h4>
                                  <p className="text-sm text-gray-600">현재 취소율이 44%입니다</p>
                                </div>
                                <div className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md bg-orange-50 border-orange-200 hover:bg-orange-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">📊</span>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      38건
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-gray-900 mb-1">낮은 정산율 경고</h4>
                                  <p className="text-sm text-gray-600">현재 정산율이 38%입니다</p>
                                </div>
                              </>
                            )}
                            {actionItems.map((item) => (
                              <div
                                key={item.id}
                                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                  item.priority === 'high' 
                                    ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                                    : item.priority === 'medium'
                                    ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                }`}
                                onClick={() => {
                                  if (item.link.startsWith('#')) {
                                    const tabId = item.link.substring(1);
                                    setActiveTab(tabId as any);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-2xl">{item.icon}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    item.priority === 'high' 
                                      ? 'bg-red-100 text-red-800' 
                                      : item.priority === 'medium'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {item.count}건
                                  </span>
                                </div>
                                <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                                <p className="text-sm text-gray-600">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 전체 통계 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">오픈 주문</h3>
                          <p className="text-2xl font-bold text-gray-900">{exchangeStats?.total?.openOrders || 0}</p>
                          <div className="mt-2 text-sm text-gray-600">
                            대기 중인 주문
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">정산 완료</h3>
                          <p className="text-2xl font-bold text-green-600">{exchangeStats?.total?.settlements || 0}</p>
                          <div className="mt-2 text-sm text-gray-600">
                            총 정산 금액: ₩{settlements.reduce((sum, s) => sum + (s.totalVolume || 0), 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">취소된 주문</h3>
                          <p className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</p>
                          <div className="mt-2 text-sm text-gray-600">
                            취소율: {orders.length > 0 ?
                              Math.round((orders.filter(o => o.status === 'cancelled').length / orders.length) * 100) : 0}%
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">정산율</h3>
                          <p className="text-2xl font-bold text-blue-600">
                            {orders.length > 0 ?
                              Math.round(((exchangeStats?.total?.settlements || 0) / orders.length) * 100) : 0}%
                          </p>
                          <div className="mt-2 text-sm text-gray-600">
                            정산 완료 / 전체 주문
                          </div>
                        </div>
                      </div>

                      {/* 주문 상태별 분포 */}
                      <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">주문 상태별 분포</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-600">{exchangeStats?.total?.openOrders || 0}</div>
                            <div className="text-sm text-gray-500">오픈</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{exchangeStats?.total?.settlements || 0}</div>
                            <div className="text-sm text-gray-500">정산완료</div>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</div>
                            <div className="text-sm text-gray-500">취소됨</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
                            <div className="text-sm text-gray-500">전체</div>
                          </div>
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
                              <div className="text-sm text-gray-600">정산완료 주문</div>
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
                            onClick={handleExportSettlements}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                          >
                            📤 정산 내역 내보내기
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
                <option value="partially_matched">부분 매칭</option>
                <option value="active">활성</option>
                <option value="settled">정산완료</option>
                <option value="cancelled">취소됨</option>
                <option value="cancelled_user">취소 (사용자)</option>
                <option value="cancelled_game">취소 (경기)</option>
                <option value="cancelled_expired">취소 (만료)</option>
                <option value="cancelled_original">취소 (원주문)</option>
                <option value="cancelled_unknown">취소 (사유불명)</option>
                <option value="cancelled_other">취소 (기타)</option>
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
                                    ₩{(order.amount || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      order.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                      order.status === 'matched' ? 'bg-green-100 text-green-800' :
                                      order.status === 'partially_matched' ? 'bg-yellow-100 text-yellow-800' :
                                      order.status === 'active' ? 'bg-indigo-100 text-indigo-800' :
                                      order.status === 'settled' ? 'bg-purple-100 text-purple-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {getCancellationDisplayText(order)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {(order.status === 'open' || order.status === 'partially_matched' || order.status === 'active') && (
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
                              toast('리포트 생성 기능은 추후 구현 예정입니다.', { icon: 'ℹ️' });
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            📊 리포트 생성
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 데이터 내보내기 기능 구현
                              toast('데이터 내보내기 기능은 추후 구현 예정입니다.', { icon: 'ℹ️' });
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                          >
                            📤 데이터 내보내기
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 실시간 모니터링 기능 구현
                              toast('실시간 모니터링 기능은 추후 구현 예정입니다.', { icon: 'ℹ️' });
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            📈 실시간 모니터링
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 예측 분석 기능 구현
                              toast('예측 분석 기능은 추후 구현 예정입니다.', { icon: 'ℹ️' });
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
                              <div className="text-sm text-gray-600">정산완료 주문</div>
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
                              <span className="text-sm font-medium">₩{(selectedOrder.amount || 0).toLocaleString()}</span>
                            </div>
                            {selectedOrder.status === 'matched' && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">체결 금액:</span>
                                  <span className="text-sm font-medium text-green-600">₩{(selectedOrder.filledAmount || selectedOrder.amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">매치 비율:</span>
                                  <span className="text-sm font-medium text-blue-600">
                                    {selectedOrder.filledAmount 
                                      ? `${((selectedOrder.filledAmount / (selectedOrder.originalAmount || selectedOrder.amount)) * 100).toFixed(1)}%`
                                      : '0%'
                                    }
                                  </span>
                                </div>
                                {selectedOrder.remainingAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">남은 금액:</span>
                                    <span className="text-sm font-medium text-orange-600">₩{(selectedOrder.remainingAmount || 0).toLocaleString()}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">상태:</span>
                              <span className={`text-sm font-medium px-2 py-1 rounded ${
                                selectedOrder.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                selectedOrder.status === 'matched' ? 'bg-green-100 text-green-800' :
                                selectedOrder.status === 'partially_matched' ? 'bg-yellow-100 text-yellow-800' :
                                selectedOrder.status === 'active' ? 'bg-indigo-100 text-indigo-800' :
                                selectedOrder.status === 'settled' ? 'bg-purple-100 text-purple-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {getCancellationDisplayText(selectedOrder)}
                              </span>
                            </div>
                            {/* 환불 정보 표시 */}
                            {selectedOrder.refundInfo && selectedOrder.refundInfo.length > 0 && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">환불:</span>
                                <div className="text-right">
                                  {selectedOrder.refundInfo.map((refund, index) => (
                                    <div key={index} className="text-sm font-medium text-orange-600">
                                      ₩{refund.amount.toLocaleString()}
                                      <div className="text-xs text-gray-500 mt-1">
                                        {new Date(refund.refundedAt).toLocaleDateString('ko-KR', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 경기 정보 또는 선택된 경기들 */}
                        {selectedOrder.isMultibet && selectedOrder.selectionDetails && selectedOrder.selectionDetails.selections && selectedOrder.selectionDetails.selections.length > 0 ? (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-md font-semibold text-gray-900">선택된 경기들</h4>
                              {/* 경기 결과가 없는 경우에만 수동 입력 버튼 표시 */}
                              {(() => {
                                const hasMissingResults = selectedOrder.selectionDetails.selections.some((selection, index) => {
                                  const gameKey = selection.homeTeam + ' vs ' + selection.awayTeam;
                                  return !selectedOrder.gameResults || !selectedOrder.gameResults[gameKey] || 
                                         !selectedOrder.gameResults[gameKey].status || 
                                         selectedOrder.gameResults[gameKey].status === 'pending';
                                });
                                
                                return hasMissingResults ? (
                                  <button
                                    onClick={() => setShowManualInputModal(true)}
                                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
                                  >
                                    경기 결과 수동 입력
                                  </button>
                                ) : (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-md">
                                    모든 경기 결과 완료
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="space-y-3">
                              {selectedOrder.selectionDetails.selections.map((selection, index) => {
                                // 경기 결과 상태 결정
                                const getGameResult = (selection) => {
                                  if (!selectedOrder.gameResults || !selectedOrder.gameResults[selection.homeTeam + ' vs ' + selection.awayTeam]) {
                                    return { status: 'pending', result: '경기 결과 대기중', color: 'bg-yellow-100 text-yellow-800' };
                                  }
                                  
                                  const gameResult = selectedOrder.gameResults[selection.homeTeam + ' vs ' + selection.awayTeam];
                                  const isHomeWin = gameResult.result === 'home_win';
                                  const isAwayWin = gameResult.result === 'away_win';
                                  const isDraw = gameResult.result === 'draw';
                                  
                                  // 선택한 팀이 승리했는지 확인
                                  const selectedTeam = selection.selection;
                                  const isWinner = (isHomeWin && selectedTeam === selection.homeTeam) || 
                                                 (isAwayWin && selectedTeam === selection.awayTeam) ||
                                                 (isDraw && selectedTeam === 'Draw');
                                  
                                  if (isWinner) {
                                    return { 
                                      status: 'win', 
                                      result: `승리 (${gameResult.score})`, 
                                      color: 'bg-green-100 text-green-800' 
                                    };
                                  } else {
                                    return { 
                                      status: 'lose', 
                                      result: `패배 (${gameResult.score})`, 
                                      color: 'bg-red-100 text-red-800' 
                                    };
                                  }
                                };
                                
                                const gameResult = getGameResult(selection);
                                
                                return (
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
                                          {formatToLocalDateTime(selection.commenceTime)}
                                        </div>
                                        {/* 경기 결과 표시 */}
                                        <div className="mt-2">
                                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gameResult.color}`}>
                                            {gameResult.result}
                                          </span>
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
                                );
                              })}
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
                                <span className="text-sm text-gray-600">선택:</span>
                                <span className="text-sm font-medium">{selectedOrder.selection}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">경기 시간:</span>
                                <span className="text-sm font-medium">
                                  {formatToLocalDateTime(selectedOrder.commenceTime)}
                                </span>
                              </div>
                              {/* 경기 결과 표시 */}
                              {selectedOrder.gameResult && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">경기 결과:</span>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    selectedOrder.gameResult.result === 'home_win' && selectedOrder.selection === selectedOrder.homeTeam ? 'bg-green-100 text-green-800' :
                                    selectedOrder.gameResult.result === 'away_win' && selectedOrder.selection === selectedOrder.awayTeam ? 'bg-green-100 text-green-800' :
                                    selectedOrder.gameResult.result === 'draw' && selectedOrder.selection === 'Draw' ? 'bg-green-100 text-green-800' :
                                    selectedOrder.gameResult.result === 'home_win' || selectedOrder.gameResult.result === 'away_win' || selectedOrder.gameResult.result === 'draw' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {selectedOrder.gameResult.result === 'home_win' && selectedOrder.selection === selectedOrder.homeTeam ? `승리 (${selectedOrder.gameResult.score})` :
                                     selectedOrder.gameResult.result === 'away_win' && selectedOrder.selection === selectedOrder.awayTeam ? `승리 (${selectedOrder.gameResult.score})` :
                                     selectedOrder.gameResult.result === 'draw' && selectedOrder.selection === 'Draw' ? `승리 (${selectedOrder.gameResult.score})` :
                                     selectedOrder.gameResult.result === 'home_win' || selectedOrder.gameResult.result === 'away_win' || selectedOrder.gameResult.result === 'draw' ? `패배 (${selectedOrder.gameResult.score})` :
                                     '경기 결과 대기중'}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">주문 생성:</span>
                                <span className="text-sm font-medium">
                                  {formatToLocalDateTime(selectedOrder.createdAt)}
                                </span>
                              </div>
                              {selectedOrder.settledAt && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">정산 시간:</span>
                                  <span className="text-sm font-medium">
                                    {formatToLocalDateTime(selectedOrder.settledAt)}
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
                                      {formatToLocalDateTime(match.createdAt)}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        match.status === 'matched' ? 'bg-green-100 text-green-800' :
                                        match.status === 'partially_matched' ? 'bg-yellow-100 text-yellow-800' :
                                        match.status === 'active' ? 'bg-indigo-100 text-indigo-800' :
                                        match.status === 'settled' ? 'bg-purple-100 text-purple-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {getCancellationDisplayText(match)}
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
                                toast('매칭 정보를 상세히 보여줍니다.', { icon: 'ℹ️' });
                              }}
                              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                            >
                              매칭 정보 상세 보기
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // 사용자 프로필로 이동
                              toast('사용자 프로필을 보여줍니다.', { icon: 'ℹ️' });
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

              {/* 수동 경기 결과 입력 모달 */}
              {showManualInputModal && selectedOrder && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      {/* 모달 헤더 */}
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          경기 결과 수동 입력 - 주문 #{selectedOrder.id}
                        </h3>
                        <button
                          onClick={() => setShowManualInputModal(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>

                      {/* 경기별 입력 폼 */}
                      <div className="space-y-6">
                        {selectedOrder.selectionDetails?.selections?.map((selection, index) => {
                          const gameId = index + 1;
                          const manualData = manualGameResults[gameId] || {};
                          
                          return (
                            <div key={gameId} className="border rounded-lg p-4 bg-gray-50">
                              <h4 className="font-semibold text-lg mb-4">
                                경기 {gameId}: {selection.homeTeam} vs {selection.awayTeam}
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {selection.homeTeam} 스코어
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={manualData.homeScore || ''}
                                    onChange={(e) => handleManualScoreChange(gameId, 'homeScore', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {selection.awayTeam} 스코어
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={manualData.awayScore || ''}
                                    onChange={(e) => handleManualScoreChange(gameId, 'awayScore', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  경기 상태
                                </label>
                                <select
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={manualData.status || 'pending'}
                                  onChange={(e) => handleManualStatusChange(gameId, e.target.value)}
                                >
                                  <option value="pending">대기중</option>
                                  <option value="finished">완료</option>
                                  <option value="cancelled">취소</option>
                                  <option value="postponed">연기</option>
                                </select>
                              </div>
                              {manualData.status === 'finished' && (
                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    경기 결과
                                  </label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={manualData.result || ''}
                                    onChange={(e) => handleManualResultChange(gameId, e.target.value)}
                                  >
                                    <option value="">선택하세요</option>
                                    <option value="home_win">홈팀 승리</option>
                                    <option value="away_win">어웨이팀 승리</option>
                                    <option value="draw">무승부</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowManualInputModal(false)}
                          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleManualInputSave}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          결과 저장
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

      {/* 수동 정산 모달 - 제거됨 */}
      {false && showManualSettlementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">수동 정산 처리</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  정산할 경기 선택
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAvailableGames}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-left bg-white hover:bg-gray-50"
                  >
                    {selectedGame 
                      ? `${selectedGame.homeTeam} vs ${selectedGame.awayTeam} (${formatToLocalDateTime(selectedGame.commenceTime)})`
                      : '경기 목록 불러오기'
                    }
                  </button>
                  {selectedGame && (
                    <button
                      onClick={() => {
                        setSelectedGame(null);
                        setHomeScore('');
                        setAwayScore('');
                      }}
                      className="px-3 py-2 bg-red-100 text-red-600 border border-red-300 rounded-md hover:bg-red-200"
                    >
                      선택 해제
                    </button>
                  )}
                </div>
                {availableGames.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                    {availableGames.map((game, index) => {
                      const gameKey = `${game.homeTeam}|${game.awayTeam}|${game.commenceTime}`;
                      const selectedKey = selectedGame ? `${selectedGame.homeTeam}|${selectedGame.awayTeam}|${selectedGame.commenceTime}` : '';
                      const isSelected = selectedKey === gameKey;
                      
                      return (
                        <label
                          key={gameKey}
                          className={`flex items-center w-full px-3 py-3 text-left hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                            isSelected ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="selectedGame"
                            value={gameKey}
                            checked={isSelected}
                            onChange={() => setSelectedGame(game)}
                            className="mr-3 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {game.homeTeam} vs {game.awayTeam}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatToLocalDateTime(game.commenceTime)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {gameKey.split('|').pop()?.slice(0, 19)}...
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 선택된 경기 정보 표시 */}
              {selectedGame && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">선택된 경기</h4>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">{selectedGame.homeTeam} vs {selectedGame.awayTeam}</div>
                    <div className="text-blue-600 mt-1">
                      경기 시간: {formatToLocalDateTime(selectedGame.commenceTime)}
                    </div>
                    <div className="text-blue-600">
                      고유 ID: {`${selectedGame.homeTeam}|${selectedGame.awayTeam}|${selectedGame.commenceTime}`.slice(0, 50)}...
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  경기 결과 (점수 입력)
                </label>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {selectedGame ? selectedGame.homeTeam : '홈팀'} 점수
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-gray-400">vs</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {selectedGame ? selectedGame.awayTeam : '어웨이팀'} 점수
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {homeScore && awayScore && (
                  <div className="mt-2 text-center">
                    <span className="text-sm text-gray-600">
                      최종 결과: {homeScore} : {awayScore}
                      {parseInt(homeScore) > parseInt(awayScore) && ' (홈팀 승리)'}
                      {parseInt(homeScore) < parseInt(awayScore) && ' (어웨이팀 승리)'}
                      {parseInt(homeScore) === parseInt(awayScore) && ' (무승부)'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowManualSettlementModal(false);
                  setSelectedGame(null);
                  setHomeScore('');
                  setAwayScore('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleManualSettlement}
                disabled={!selectedGame || !homeScore || !awayScore || isProcessingSettlement}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {isProcessingSettlement ? '처리 중...' : '정산 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정산 통계 모달 - 제거됨 */}
      {false && showStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">정산 통계</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-700">총 정산 경기</h4>
                <p className="text-2xl font-bold text-blue-900">{settlements.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-700">총 정산 주문</h4>
                <p className="text-2xl font-bold text-green-900">
                  {settlements.reduce((sum, s) => sum + s.settledOrders, 0)}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-700">총 거래량</h4>
                <p className="text-2xl font-bold text-purple-900">
                  ₩{settlements.reduce((sum, s) => sum + (s.totalVolume || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">최근 정산 내역</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {settlements.slice(0, 10).map((settlement, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center p-2 bg-white rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSettlementDetailClick(settlement)}
                  >
                    <span className="text-sm">{settlement.homeTeam} vs {settlement.awayTeam}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {settlement.settledOrders || 0}개 주문 • ₩{(settlement.totalVolume || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-blue-600">클릭하여 상세보기</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정산 상세 정보 모달 - 제거됨 */}
      {false && showSettlementDetailModal && settlementDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  정산 상세 정보
                </h2>
                <button
                  onClick={() => setShowSettlementDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 경기 기본 정보 */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">경기 정보</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">경기:</span>
                    <div className="text-blue-800">{settlementDetail.homeTeam} vs {settlementDetail.awayTeam}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">경기 시간:</span>
                    <div className="text-blue-800">{formatToLocalDateTime(settlementDetail.commenceTime)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">정산 시간:</span>
                    <div className="text-blue-800">{formatToLocalDateTime(settlementDetail.settledAt)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">총 주문 수:</span>
                    <div className="text-blue-800">{settlementDetail.totalOrders}개</div>
                  </div>
                </div>
              </div>

              {/* 정산 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-700">백 배팅 거래량</h4>
                  <p className="text-2xl font-bold text-green-800">₩{settlementDetail.totalBackVolume?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-700">레이 매칭 거래량</h4>
                  <p className="text-2xl font-bold text-red-800">₩{settlementDetail.totalLayVolume?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-700">승리자 수익</h4>
                  <p className="text-2xl font-bold text-green-800">₩{settlementDetail.totalWinningAmount?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-700">패배자 손실</h4>
                  <p className="text-2xl font-bold text-red-800">₩{settlementDetail.totalLosingAmount?.toLocaleString() || 0}</p>
                </div>
              </div>

              {/* 매칭 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-700">완전 매칭</h4>
                  <p className="text-2xl font-bold text-blue-800">{settlementDetail.fullMatches || 0}개</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-700">부분 매칭</h4>
                  <p className="text-2xl font-bold text-yellow-800">{settlementDetail.partialMatches || 0}개</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700">승리자 수</h4>
                  <p className="text-2xl font-bold text-gray-800">{settlementDetail.totalWinners || 0}명</p>
                </div>
              </div>

              {/* 주문 상세 목록 */}
              <div className="bg-white border rounded-lg">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">주문 상세 내역</h3>
                  <p className="text-sm text-gray-600">각 주문의 매칭 정보와 수익/손실</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문자</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">타입</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">배당</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결과</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">매칭</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수익/손실</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {settlementDetail.orders?.map((order: any, index: number) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.username}</div>
                            <div className="text-sm text-gray-500">{order.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.side === 'back' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {order.side === 'back' ? '백 배팅' : '레이 매칭'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.odds?.toFixed(2)}배
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₩{order.stakeAmount?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.isWinner && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                승리
                              </span>
                            )}
                            {order.isLoser && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                패배
                              </span>
                            )}
                            {!order.isWinner && !order.isLoser && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                대기
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.isPartialMatch ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                부분매칭
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                풀매칭
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {order.actualProfit > 0 ? (
                              <span className="text-green-600">+₩{order.actualProfit.toLocaleString()}</span>
                            ) : order.actualProfit < 0 ? (
                              <span className="text-red-600">₩{order.actualProfit.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-600">₩0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 매칭 상세 정보 */}
              {settlementDetail.orders?.some((order: any) => order.matches?.length > 0) && (
                <div className="mt-6 bg-white border rounded-lg">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">매칭 상세 정보</h3>
                    <p className="text-sm text-gray-600">각 주문의 매칭 상대 정보</p>
                  </div>
                  <div className="p-6">
                    {settlementDetail.orders?.map((order: any) => (
                      order.matches?.length > 0 && (
                        <div key={order.id} className="mb-6 border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">
                              주문 #{order.id} - {order.username} ({order.side === 'back' ? '백 배팅' : '레이 매칭'})
                            </h4>
                            <span className="text-sm text-gray-500">
                              {order.isPartialMatch ? '부분매칭' : '풀매칭'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {order.matches.map((match: any) => (
                              <div key={match.id} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                                <div>
                                  <span className="font-medium text-gray-700">{match.matchedUsername}</span>
                                  <span className="text-sm text-gray-500 ml-2">({match.matchedSide === 'back' ? '백 배팅' : '레이 매칭'})</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    ₩{match.matchedStakeAmount?.toLocaleString() || 0}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {match.matchedOdds?.toFixed(2)}배
                                  </div>
                                </div>
                                <div className="text-right">
                                  {match.isMatchedWinner ? (
                                    <span className="text-green-600 font-medium">+₩{match.matchedProfit?.toLocaleString() || 0}</span>
                                  ) : match.isMatchedLoser ? (
                                    <span className="text-red-600 font-medium">₩{match.matchedProfit?.toLocaleString() || 0}</span>
                                  ) : (
                                    <span className="text-gray-600">₩0</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowSettlementDetailModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
