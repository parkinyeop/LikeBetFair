import { buildApiUrl } from '../../config/apiConfig';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { parseScore, getScoreDisplay } from '../../utils/scoreParser';
import BetCancelModal from '../../components/admin/BetCancelModal';
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

// 베팅 관리 탭 구조 정의
interface BettingTabStructure {
  id: 'dashboard' | 'bets' | 'analytics' | 'management';
  label: string;
  icon: string;
  purpose: string;
  level: 'overview' | 'management' | 'analysis';
}

interface Bet {
  id: string;
  userId: string;
  stake: number;
  selections: any[];
  totalOdds: number;
  potentialWinnings: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  calculatedStatus?: 'pending' | 'won' | 'lost' | 'cancelled'; // API에서 계산된 실제 상태
  createdAt: string;
  updatedAt: string;
  User: {
    id: string;
    username: string;
    email: string;
    balance?: number;
  };
}

interface BetStats {
  summary: {
    totalBets: number;
    totalStake: number;
    totalPotentialWinnings: number;
    actualWinnings: number;
    netProfit: number;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
    totalStake: number;
    totalWinnings: number;
  }>;
}

interface BetFilters {
  status: 'all' | 'pending' | 'won' | 'lost' | 'cancelled';
  userId: string;
  startDate: string;
  endDate: string;
  sortBy: 'createdAt' | 'stake' | 'potentialWinnings' | 'status';
  sortOrder: 'asc' | 'desc';
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface AdminState {
  global: {
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
  };
  tabs: {
    dashboard: DashboardState;
    bets: BetsState;
    analytics: AnalyticsState;
    management: ManagementState;
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

interface BetsState {
  bets: Bet[];
  filters: BetFilters;
  selectedBet: Bet | null;
  loading: boolean;
  pagination: PaginationState;
}

interface AnalyticsState {
  realtime: RealtimeStats;
  daily: DailyStats[];
  monthly: MonthlyStats[];
  selectedPeriod: DateRange;
  loading: boolean;
}

interface ManagementState {
  pendingActions: PendingAction[];
  bulkOperations: BulkOperation[];
  loading: boolean;
}

interface GlobalFilters {
  dateRange: DateRange;
  status: string[];
  searchTerm: string;
}

interface SelectedItems {
  bets: string[];
}

interface ModalState {
  betDetail: boolean;
  betEdit: boolean;
  bulkAction: boolean;
}

interface KPIData {
  todayBets: number;
  todayStake: number;
  todayWinnings: number;
  totalBets: number;
}

interface ActivityItem {
  id: string;
  type: 'bet' | 'settlement' | 'alert';
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

interface RealtimeStats {
  activeBets: number;
  pendingBets: number;
  totalStake: number;
  totalWinnings: number;
  lastUpdate: Date;
}

interface DailyStats {
  date: string;
  bets: number;
  stake: number;
  winnings: number;
  profit: number;
}

interface MonthlyStats {
  month: string;
  bets: number;
  stake: number;
  winnings: number;
  profit: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface PendingAction {
  id: string;
  type: 'settlement' | 'refund' | 'adjustment';
  description: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

interface BulkOperation {
  id: string;
  type: 'settlement' | 'refund' | 'status_change';
  description: string;
  count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}


interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// 베팅 관리 탭 정의
const BETTING_TABS: BettingTabStructure[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: '📊',
    purpose: '스포츠북 현황 파악 및 빠른 액션',
    level: 'overview'
  },
  {
    id: 'bets',
    label: '스포츠북 관리',
    icon: '🎯',
    purpose: '모든 스포츠북 통합 관리',
    level: 'management'
  },
  {
    id: 'analytics',
    label: '통계 분석',
    icon: '📈',
    purpose: '상세 통계 및 분석',
    level: 'analysis'
  },
  {
    id: 'management',
    label: '관리 도구',
    icon: '⚙️',
    purpose: '스포츠북 결과 처리 및 관리',
    level: 'management'
  }
];

// 스포츠북 상태 서브탭
const BET_SUBTABS = [
  { id: 'all', label: '전체 스포츠북' },
  { id: 'pending', label: '대기 중' },
  { id: 'won', label: '당첨' },
  { id: 'lost', label: '낙첨' },
  { id: 'cancelled', label: '취소됨' }
];

export default function BettingAdmin() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  
  // 새로운 상태 관리 구조
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bets' | 'analytics' | 'management'>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  
  // 통합 상태 관리
  const [adminState, setAdminState] = useState<AdminState>({
    global: {
      loading: false,
      error: null,
      lastUpdated: null
    },
    tabs: {
      dashboard: {
        kpis: {
          todayBets: 0,
          todayStake: 0,
          todayWinnings: 0,
          totalBets: 0
        },
        recentActivity: [],
        alerts: [],
        loading: false
      },
      bets: {
        bets: [],
        filters: {
          status: 'all',
          userId: '',
          startDate: '',
          endDate: '',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        },
        selectedBet: null,
        loading: false,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20
        }
      },
      analytics: {
        realtime: {
          activeBets: 0,
          pendingBets: 0,
          totalStake: 0,
          totalWinnings: 0,
          lastUpdate: new Date()
        },
        daily: [],
        monthly: [],
        selectedPeriod: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        loading: false
      },
      management: {
        pendingActions: [],
        bulkOperations: [],
        loading: false
      }
    },
    shared: {
      filters: {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        status: [],
        searchTerm: ''
      },
      selectedItems: {
        bets: []
      },
      modals: {
        betDetail: false,
        betEdit: false,
        bulkAction: false
      }
    }
  });

  // 기존 상태들 (호환성을 위해 유지)
  const [bets, setBets] = useState<Bet[]>([]);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [betStats, setBetStats] = useState<BetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<BetFilters>({
    status: 'all',
    userId: '',
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [showBetDetail, setShowBetDetail] = useState(false);
  const [resultEdit, setResultEdit] = useState({ isEditing: false, newStatus: '', reason: '' });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // 🆕 수동 경기 결과 입력 관련 상태
  const [showManualInputModal, setShowManualInputModal] = useState(false);
  const [manualGameResults, setManualGameResults] = useState<any>({});
  
  // 베팅 취소 모달 상태
  const [showBetCancelModal, setShowBetCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  
  // 월별 필터 상태
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showCumulativeStats, setShowCumulativeStats] = useState(true);

  // 권한 체크
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin || adminLevel < 1) {
      alert('스포츠북 관리 권한이 필요합니다.');
      router.push('/admin');
      return;
    }

    fetchBettingData();

    // 🔄 5분마다 자동 갱신
    const intervalId = setInterval(() => {
      console.log('[Admin Bets] 자동 갱신 실행 (5분)');
      fetchBettingData();
    }, 5 * 60 * 1000); // 300,000ms = 5분

    return () => clearInterval(intervalId);
  }, [isLoggedIn, isAdmin, adminLevel, router]);

  // 월별 필터 변경 시 일별 통계 다시 조회
  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchDailyStats();
    }
  }, [selectedYear, selectedMonth, isLoggedIn, isAdmin]);

  // 수동 입력 모달이 닫힐 때 데이터 새로고침
  useEffect(() => {
    if (isLoggedIn && isAdmin && !showManualInputModal) {
      fetchBettingData();
    }
  }, [showManualInputModal, isLoggedIn, isAdmin]);

  // 인증 헤더 생성
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

  // 🆕 수동 경기 결과 입력 핸들러들
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
    if (!selectedBet) return;

    try {
      const headers = getAuthHeaders();
      
      // 선택된 경기들에서 데이터 추출 (스포츠북 베팅용)
      const gameResults = selectedBet.selections?.map((selection, index) => {
        const gameId = index + 1;
        const manualData = manualGameResults[gameId] || {};
        
        // desc에서 팀명 추출 (예: "LG Twins vs Doosan Bears")
        const teams = selection.desc?.split(' vs ') || [];
        const homeTeam = teams[0] || '';
        const awayTeam = teams[1] || '';
        
        return {
          gameId: gameId,
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          homeScore: parseInt(manualData.homeScore) || 0,
          awayScore: parseInt(manualData.awayScore) || 0,
          status: manualData.status || 'finished',
          result: manualData.result || null,
          commenceTime: selection.commence_time,
          sportKey: selectedBet.sport_key,
          sportTitle: selectedBet.sport_title,
          mainCategory: 'soccer',
          subCategory: selectedBet.sport_key?.replace('soccer_', '').toUpperCase() || 'MANUAL_INPUT'
        };
      }) || [];

      const response = await fetch(buildApiUrl('/api/admin/manual-game-result'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          betId: selectedBet.id,
          gameResults: gameResults
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowManualInputModal(false);
        setManualGameResults({});
        
        // 베팅 정보 새로고침 (모달 닫힌 후 자동으로 트리거됨)
      } else {
        const error = await response.json();
        toast.error(error.message || '저장 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('수동 경기 결과 저장 오류:', error);
      toast.error('저장 중 오류가 발생했습니다');
    }
  }, [selectedBet, manualGameResults, getAuthHeaders]);

  // 일별 통계 데이터
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);

  // 통합 데이터 로딩
  const fetchBettingData = useCallback(async () => {
    try {
      console.log('스포츠북 데이터 로딩 시작...');
      setAdminState(prev => ({
        ...prev,
        global: { ...prev.global, loading: true, error: null }
      }));

      const headers = getAuthHeaders();
      const baseUrl = buildApiUrl('/api/admin');

      // 병렬로 모든 데이터 로딩
      const [betsResponse, statsResponse] = await Promise.all([
        fetch(`${baseUrl}/bets?page=1&limit=1000&status=all`, { headers }),
        fetch(`${baseUrl}/bets/stats/summary`, { headers })
      ]);

      console.log('API 호출 완료');

      if (betsResponse.ok) {
        const betsData = await betsResponse.json();
        console.log('스포츠북 데이터:', betsData);
        setBets(betsData.bets || []);
        setPagination(prev => ({
          ...prev,
          totalPages: betsData.pagination?.totalPages || 1,
          totalItems: betsData.pagination?.totalItems || 0
        }));
        
        // 통계 계산
        const allBets = betsData.bets || [];
        const totalBets = allBets.length;
        const totalStake = allBets.reduce((sum: number, bet: Bet) => sum + parseFloat(bet.stake.toString()), 0);
        const totalPotentialWinnings = allBets.reduce((sum: number, bet: Bet) => sum + parseFloat(bet.potentialWinnings.toString()), 0);
        
        const wonBets = allBets.filter((bet: Bet) => bet.status === 'won');
        const actualWinnings = wonBets.reduce((sum: number, bet: Bet) => sum + parseFloat(bet.potentialWinnings.toString()), 0);
        
        const statusBreakdown = allBets.reduce((acc: any, bet: Bet) => {
          if (!acc[bet.status]) {
            acc[bet.status] = { count: 0, totalStake: 0, totalWinnings: 0 };
          }
          acc[bet.status].count++;
          acc[bet.status].totalStake += parseFloat(bet.stake.toString());
          acc[bet.status].totalWinnings += parseFloat(bet.potentialWinnings.toString());
          return acc;
        }, {});
        
        setBetStats({
          summary: {
            totalBets,
            totalStake,
            totalPotentialWinnings,
            actualWinnings,
            netProfit: totalStake - actualWinnings
          },
          statusBreakdown: Object.entries(statusBreakdown).map(([status, data]: [string, any]) => ({
            status,
            count: data.count,
            totalStake: data.totalStake,
            totalWinnings: data.totalWinnings
          }))
        });

        // 일별 통계 생성 (최근 30일)
        const dailyStatsData = generateDailyStats(allBets);
        setDailyStats(dailyStatsData);

        // 관리자 상태 업데이트
        setAdminState(prev => ({
          ...prev,
          tabs: {
            ...prev.tabs,
            dashboard: {
              ...prev.tabs.dashboard,
              kpis: {
                todayBets: totalBets,
                todayStake: totalStake,
                todayWinnings: actualWinnings,
                totalBets: totalBets
              },
              loading: false
            },
            bets: {
              ...prev.tabs.bets,
              bets: allBets,
              loading: false
            }
          },
          global: {
            ...prev.global,
            loading: false,
            lastUpdated: new Date()
          }
        }));
      } else {
        const errorData = await betsResponse.json();
        console.error('베팅 데이터 로딩 오류:', errorData);
        setError(errorData.message || '스포츠북 데이터를 불러올 수 없습니다.');
      }

      setLoading(false);
    } catch (err) {
      console.error('스포츠북 데이터 로딩 오류:', err);
      setError('서버 연결에 실패했습니다.');
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // 일별 통계 생성 함수
  const generateDailyStats = (bets: Bet[]): DailyStats[] => {
    const statsMap = new Map<string, DailyStats>();
    const today = new Date();
    
    // 최근 30일 데이터 생성
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      statsMap.set(dateStr, {
        date: dateStr,
        bets: 0,
        stake: 0,
        winnings: 0,
        profit: 0
      });
    }
    
    // 실제 베팅 데이터로 채우기
    bets.forEach(bet => {
      const betDate = new Date(bet.createdAt).toISOString().split('T')[0];
      if (statsMap.has(betDate)) {
        const stats = statsMap.get(betDate)!;
        stats.bets += 1;
        stats.stake += parseFloat(bet.stake.toString());
        
        if (bet.status === 'won') {
          stats.winnings += parseFloat(bet.potentialWinnings.toString());
        }
        
        stats.profit = stats.winnings - stats.stake;
      }
    });
    
    return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  // 일별 통계 조회 함수
  const fetchDailyStats = useCallback(async () => {
    try {
      console.log('일별 통계 로딩 시작...');
      const headers = getAuthHeaders();
      const url = `${buildApiUrl('/api/admin/bets/daily-stats')}?year=${selectedYear}&month=${selectedMonth}`;
      
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
      } else {
        console.error('일별 통계 로딩 실패:', response.status);
        // 폴백: 기존 베팅 데이터로 일별 통계 생성
        const dailyStatsData = generateDailyStats(bets);
        setDailyStats(dailyStatsData);
        setMonthlySummary(null);
      }
    } catch (err) {
      console.error('일별 통계 로딩 오류:', err);
      // 폴백 데이터 설정
      const dailyStatsData = generateDailyStats(bets);
      setDailyStats(dailyStatsData);
      setMonthlySummary(null);
    }
  }, [getAuthHeaders, selectedYear, selectedMonth, bets]);

  // 차트 데이터 준비
  const prepareChartData = () => {
    const labels = dailyStats.map(stat => {
      const date = new Date(stat.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    return {
      labels,
      datasets: [
        {
          label: '스포츠북 수',
          data: dailyStats.map(stat => stat.bets),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: '베팅 금액 (만원)',
          data: dailyStats.map(stat => stat.stake / 10000),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
        {
          label: '당첨 금액 (만원)',
          data: dailyStats.map(stat => stat.winnings / 10000),
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: 'rgba(245, 158, 11, 1)',
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
        text: `${selectedYear}년 ${selectedMonth}월 일별 베팅 현황`,
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 15
        }
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  // 고급 통계 차트 데이터 생성
  const generateAdvancedCharts = useCallback(() => {
    const chartData = {
      betsByStatus: {
        labels: ['대기중', '당첨', '낙첨', '취소'],
        datasets: [{
          data: [
            bets.filter(bet => bet.status === 'pending').length,
            bets.filter(bet => bet.status === 'won').length,
            bets.filter(bet => bet.status === 'lost').length,
            bets.filter(bet => bet.status === 'cancelled').length,
          ],
          backgroundColor: [
            'rgba(245, 158, 11, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(107, 114, 128, 0.8)',
          ],
          borderColor: [
            'rgba(245, 158, 11, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(107, 114, 128, 1)',
          ]
        }]
      },
      stakeByHour: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}시`),
        datasets: [{
          label: '베팅 금액',
          data: Array.from({ length: 24 }, (_, hour) => {
            return bets
              .filter(bet => new Date(bet.createdAt).getHours() === hour)
              .reduce((sum, bet) => sum + parseFloat(bet.stake.toString()), 0) / 10000;
          }),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgba(99, 102, 241, 1)'
        }]
      },
      profitTrend: {
        labels: dailyStats.map(stat => {
          const date = new Date(stat.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [{
          label: '순수익 (만원)',
          data: dailyStats.map(stat => stat.profit / 10000),
          backgroundColor: 'rgba(168, 85, 247, 0.5)',
          borderColor: 'rgba(168, 85, 247, 1)'
        }]
      }
    };
    
    return chartData;
  }, [bets, dailyStats]);

  // 알림 추가 함수
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
  }, []);

  // 탭 변경 핸들러
  const handleTabChange = useCallback((tabId: 'dashboard' | 'bets' | 'analytics' | 'management') => {
    setActiveTab(tabId);
    setActiveSubTab('all');
  }, []);

  // 서브탭 변경 핸들러
  const handleSubTabChange = useCallback((subTabId: string) => {
    setActiveSubTab(subTabId);
  }, []);

  // 베팅 클릭 핸들러
  // 베팅 취소 함수
  const handleBetCancel = useCallback(async (reason: string) => {
    if (!selectedBet) return;
    
    setCancelLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(buildApiUrl(`/api/admin/bets/${selectedBet.id}/cancel`), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('베팅이 성공적으로 취소되었습니다.');
        console.log('베팅 취소 완료:', data);
        
        // 베팅 목록 새로고침
        fetchBettingData();
        setShowBetCancelModal(false);
        setShowBetDetail(false);
        setSelectedBet(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || '베팅 취소에 실패했습니다.');
        console.error('베팅 취소 실패:', errorData);
      }
    } catch (error) {
      console.error('베팅 취소 오류:', error);
      toast.error('베팅 취소 중 오류가 발생했습니다.');
    } finally {
      setCancelLoading(false);
    }
  }, [selectedBet, getAuthHeaders, fetchBettingData]);

  const handleBetClick = useCallback(async (bet: Bet) => {
    try {
      // 🆕 경기 결과 포함된 상세 정보 조회
      const headers = getAuthHeaders();
      const response = await fetch(buildApiUrl(`/api/admin/bets/${bet.id}`), { headers });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 베팅 상세 정보 (gameResult 포함):', data.bet);
        setSelectedBet(data.bet);
        setShowBetDetail(true);
      } else {
        console.warn('⚠️ 베팅 상세 정보 조회 실패, 기본 데이터 사용');
        setSelectedBet(bet);
        setShowBetDetail(true);
      }
    } catch (error) {
      console.error('❌ 베팅 상세 정보 조회 오류:', error);
      setSelectedBet(bet);
      setShowBetDetail(true);
    }
  }, [getAuthHeaders]);


  // 상태별 색상 함수
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'won': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'won': return '당첨';
      case 'lost': return '낙첨';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

  if (!isLoggedIn || !isAdmin || adminLevel < 1) {
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
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">스포츠북 관리</h1>
                    <p className="text-gray-600 mt-2">스포츠북 모니터링, 결과 처리, 통계 분석</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    마지막 업데이트: {lastUpdate ? lastUpdate.toLocaleTimeString('ko-KR') : '없음'}
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
                    <span>관리자홈</span>
                  </button>
                </div>
              </div>

              {/* 새로운 계층적 탭 네비게이션 */}
              <div className="mb-6">
                <nav className="flex space-x-8">
                  {BETTING_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title={tab.purpose}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* 대시보드 탭 */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* 통계 필터 */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">통계 필터</h3>
                      <div className="flex items-center space-x-4">
                        {/* 통계 타입 토글 */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowCumulativeStats(true)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              showCumulativeStats 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            📊 전체 누적
                          </button>
                          <button
                            onClick={() => setShowCumulativeStats(false)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              !showCumulativeStats 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            📅 월별 통계
                          </button>
                        </div>
                        
                        {/* 월별 필터 (월별 통계 선택 시에만 표시) */}
                        {!showCumulativeStats && (
                          <>
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">년도:</label>
                              <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                  <option key={month} value={month}>{month}월</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 누적 통계 카드들 */}
                  {showCumulativeStats && betStats && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 전체 누적 통계</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow border border-blue-200">
                          <h3 className="text-sm font-medium text-blue-700">총 스포츠북 수</h3>
                          <p className="text-2xl font-bold text-blue-900">{betStats.summary.totalBets}</p>
                        </div>
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg shadow border border-green-200">
                          <h3 className="text-sm font-medium text-green-700">총 베팅 금액</h3>
                          <p className="text-2xl font-bold text-green-900">₩{Math.floor(betStats.summary.totalStake).toLocaleString()}</p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg shadow border border-purple-200">
                          <h3 className="text-sm font-medium text-purple-700">총 당첨 금액</h3>
                          <p className="text-2xl font-bold text-purple-900">₩{Math.floor(betStats.summary.actualWinnings).toLocaleString()}</p>
                        </div>
                        <div className={`p-6 rounded-lg shadow border ${betStats.summary.netProfit >= 0 ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'}`}>
                          <h3 className={`text-sm font-medium ${betStats.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>순수익</h3>
                          <p className={`text-2xl font-bold ${betStats.summary.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                            ₩{Math.floor(betStats.summary.netProfit).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 월별 KPI 카드들 */}
                  {!showCumulativeStats && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 {selectedYear}년 {selectedMonth}월 통계</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">스포츠북 수</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {monthlySummary ? monthlySummary.totalBets : 0}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">베팅 금액</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            ₩{monthlySummary ? monthlySummary.totalStake : '0'}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">당첨된 스포츠북</h3>
                          <p className="text-2xl font-bold text-green-600">
                            {monthlySummary ? monthlySummary.wonBets : 0}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">대기 중인 스포츠북</h3>
                          <p className="text-2xl font-bold text-yellow-600">
                            {monthlySummary ? monthlySummary.pendingBets : 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 일별 베팅 현황 차트 (월별 통계 선택 시에만 표시) */}
                  {!showCumulativeStats && (
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">{selectedYear}년 {selectedMonth}월 일별 베팅 현황</h3>
                      </div>
                      <div className="p-6">
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

                  {/* 고급 통계 차트들 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 베팅 상태별 분포 */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">스포츠북 상태별 분포</h4>
                      <div className="w-full h-64 relative">
                        <Bar 
                          data={generateAdvancedCharts().betsByStatus} 
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

                    {/* 시간대별 베팅량 */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">시간대별 스포츠북량</h4>
                      <div className="w-full h-64 relative">
                        <Bar 
                          data={generateAdvancedCharts().stakeByHour} 
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

                  {/* 순수익 트렌드 */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">순수익 트렌드</h4>
                    <div className="w-full h-64 relative">
                      <Bar 
                        data={generateAdvancedCharts().profitTrend} 
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

              {/* 베팅 관리 탭 */}
              {activeTab === 'bets' && (
                <div className="space-y-6">
                  {/* 탭별 액션 버튼들 */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">스포츠북 관리 액션</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          // TODO: 결과 처리 기능 구현
                          alert('결과 처리 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        ⚡ 결과 처리
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 환불 처리 기능 구현
                          alert('환불 처리 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        💰 환불 처리
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 스포츠북 내보내기 기능 구현
                          alert('스포츠북 내보내기 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        📤 스포츠북 내보내기
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 스포츠북 검증 기능 구현
                          alert('스포츠북 검증 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                      >
                        ✅ 스포츠북 검증
                      </button>
                    </div>
                  </div>

                  {/* 서브탭 */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      {BET_SUBTABS.map((subTab) => (
                        <button
                          key={subTab.id}
                          onClick={() => handleSubTabChange(subTab.id)}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeSubTab === subTab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {subTab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* 필터 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">전체</option>
                          <option value="pending">대기중</option>
                          <option value="won">당첨</option>
                          <option value="lost">낙첨</option>
                          <option value="cancelled">취소</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">사용자 ID</label>
                        <input
                          type="text"
                          placeholder="사용자 ID"
                          value={filters.userId}
                          onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 스포츠북 목록 */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        스포츠북 목록 ({pagination.totalItems}건)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">베팅 정보</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">베팅금액</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">당첨금액</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">베팅일시</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bets.map((bet) => (
                            <tr 
                              key={bet.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleBetClick(bet)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">#{bet.id.substring(0, 8)}</div>
                                <div className="text-sm text-gray-500">배당률: {bet.totalOdds}</div>
                                <div className="text-xs text-gray-400">선택: {bet.selections.length}개</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{bet.User.username}</div>
                                <div className="text-sm text-gray-500">{bet.User.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">₩{Math.floor(bet.stake).toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">₩{Math.floor(bet.potentialWinnings).toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bet.calculatedStatus || bet.status)}`}>
                                  {getStatusText(bet.calculatedStatus || bet.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(bet.createdAt).toLocaleDateString('ko-KR')}
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

                  {/* 통계 필터 */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">통계 필터</h3>
                      <div className="flex items-center space-x-4">
                        {/* 통계 타입 토글 */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowCumulativeStats(true)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              showCumulativeStats 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            📊 전체 누적
                          </button>
                          <button
                            onClick={() => setShowCumulativeStats(false)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              !showCumulativeStats 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            📅 월별 통계
                          </button>
                        </div>
                        
                        {/* 월별 필터 (월별 통계 선택 시에만 표시) */}
                        {!showCumulativeStats && (
                          <>
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">년도:</label>
                              <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                  <option key={month} value={month}>{month}월</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 누적 통계 카드들 */}
                  {showCumulativeStats && betStats && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 전체 누적 통계</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow border border-blue-200">
                          <h3 className="text-sm font-medium text-blue-700">총 스포츠북 수</h3>
                          <p className="text-2xl font-bold text-blue-900">{betStats.summary.totalBets}</p>
                        </div>
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg shadow border border-green-200">
                          <h3 className="text-sm font-medium text-green-700">총 베팅 금액</h3>
                          <p className="text-2xl font-bold text-green-900">₩{Math.floor(betStats.summary.totalStake).toLocaleString()}</p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg shadow border border-purple-200">
                          <h3 className="text-sm font-medium text-purple-700">총 당첨 금액</h3>
                          <p className="text-2xl font-bold text-purple-900">₩{Math.floor(betStats.summary.actualWinnings).toLocaleString()}</p>
                        </div>
                        <div className={`p-6 rounded-lg shadow border ${betStats.summary.netProfit >= 0 ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'}`}>
                          <h3 className={`text-sm font-medium ${betStats.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>순수익</h3>
                          <p className={`text-2xl font-bold ${betStats.summary.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                            ₩{Math.floor(betStats.summary.netProfit).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 월별 종합 통계 카드 */}
                  {!showCumulativeStats && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 {selectedYear}년 {selectedMonth}월 통계</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">스포츠북 수</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {monthlySummary ? monthlySummary.totalBets : 0}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">베팅 금액</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            ₩{monthlySummary ? monthlySummary.totalStake : '0'}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">당첨된 스포츠북</h3>
                          <p className="text-2xl font-bold text-green-600">
                            {monthlySummary ? monthlySummary.wonBets : 0}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                          <h3 className="text-sm font-medium text-gray-500">대기 중인 스포츠북</h3>
                          <p className="text-2xl font-bold text-yellow-600">
                            {monthlySummary ? monthlySummary.pendingBets : 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 일별 베팅 현황 차트 (월별 통계 선택 시에만 표시) */}
                  {!showCumulativeStats && (
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">{selectedYear}년 {selectedMonth}월 일별 베팅 현황</h3>
                      </div>
                      <div className="p-6">
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

                  {/* 고급 통계 차트들 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 베팅 상태별 분포 */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">스포츠북 상태별 분포</h4>
                      <div className="w-full h-64 relative">
                        <Bar 
                          data={generateAdvancedCharts().betsByStatus} 
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

                    {/* 시간대별 베팅량 */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">시간대별 스포츠북량</h4>
                      <div className="w-full h-64 relative">
                        <Bar 
                          data={generateAdvancedCharts().stakeByHour} 
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

                  {/* 순수익 트렌드 */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">순수익 트렌드</h4>
                    <div className="w-full h-64 relative">
                      <Bar 
                        data={generateAdvancedCharts().profitTrend} 
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

                  {/* 상태별 상세 통계 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">상태별 상세 통계</h3>
                    {betStats && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {betStats.statusBreakdown.map((item) => (
                          <div key={item.status} className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900">{getStatusText(item.status)}</h4>
                            <p className="text-2xl font-bold text-gray-900">{item.count}건</p>
                            <p className="text-sm text-gray-500">총 베팅: ₩{Math.floor(item.totalStake).toLocaleString()}</p>
                            <p className="text-sm text-gray-500">총 당첨: ₩{Math.floor(item.totalWinnings).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 관리 도구 탭 */}
              {activeTab === 'management' && (
                <div className="space-y-6">
                  {/* 탭별 액션 버튼들 */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">관리 도구 액션</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          // TODO: 시스템 상태 확인 기능 구현
                          alert('시스템 상태 확인 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        🔍 시스템 상태 확인
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 데이터베이스 백업 기능 구현
                          alert('데이터베이스 백업 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        💾 데이터베이스 백업
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 로그 분석 기능 구현
                          alert('로그 분석 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        📋 로그 분석
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 성능 최적화 기능 구현
                          alert('성능 최적화 기능은 추후 구현 예정입니다.');
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      >
                        ⚡ 성능 최적화
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">스포츠북 관리 도구</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h4 className="font-medium text-yellow-900">대기 중인 스포츠북</h4>
                        <p className="text-2xl font-bold text-yellow-900">
                          {bets.filter(bet => bet.status === 'pending').length}건
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900">당첨된 스포츠북</h4>
                        <p className="text-2xl font-bold text-green-900">
                          {bets.filter(bet => bet.status === 'won').length}건
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 로딩 상태 */}
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">스포츠북 데이터를 불러오는 중...</p>
                </div>
              )}

              {/* 에러 상태 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  ❌ {error}
                  <div className="mt-2 text-sm">
                    <button 
                      onClick={fetchBettingData} 
                      className="text-red-600 underline hover:text-red-800"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              )}

              {/* 베팅 상세 모달 */}
              {showBetDetail && selectedBet && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      {/* 모달 헤더 */}
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          베팅 상세 정보 - #{selectedBet.id}
                        </h3>
                        <button
                          onClick={() => setShowBetDetail(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 베팅자 정보 */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="text-md font-semibold text-gray-900 mb-3">베팅자 정보</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">사용자명:</span>
                              <span className="text-sm font-medium">{selectedBet.User.username}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">이메일:</span>
                              <span className="text-sm font-medium">{selectedBet.User.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">베팅 타입:</span>
                              <span className="text-sm font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                                스포츠북
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">총 배당률:</span>
                              <span className="text-sm font-medium">{selectedBet.totalOdds}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">베팅 금액:</span>
                              <span className="text-sm font-medium">₩{Math.floor(selectedBet.stake).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">예상 당첨금:</span>
                              <span className="text-sm font-medium text-green-600">₩{Math.floor(selectedBet.potentialWinnings).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">상태:</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedBet.calculatedStatus || selectedBet.status)}`}>
                                {getStatusText(selectedBet.calculatedStatus || selectedBet.status)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">베팅 시간:</span>
                              <span className="text-sm font-medium">
                                {new Date(selectedBet.createdAt).toLocaleString('ko-KR')}
                              </span>
                            </div>
                            {selectedBet.User.balance !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">현재 잔액:</span>
                                <span className="text-sm font-medium">₩{Math.floor(selectedBet.User.balance).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 선택된 경기들 */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-md font-semibold text-gray-900">선택된 경기들</h4>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500">{selectedBet.selections.length}개 선택</span>
                              
                              {/* 🆕 베팅 취소 버튼 */}
                              {(() => {
                                // 취소 가능한 상태인지 확인
                                const isCancellable = selectedBet.status === 'pending' || selectedBet.status === 'open';
                                
                                if (isCancellable) {
                                  return (
                                    <button
                                      onClick={() => setShowBetCancelModal(true)}
                                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                                    >
                                      베팅 취소
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                              
                              {/* 🆕 경기 결과 수동 입력 버튼 */}
                              {(() => {
                                // 베팅이 이미 정산 완료된 경우 버튼/배지 모두 표시 안 함
                                if (selectedBet.status === 'won' || selectedBet.status === 'lost' || selectedBet.status === 'cancelled') {
                                  return null;
                                }
                                
                                const hasMissingResults = selectedBet.selections.some((selection: any) => {
                                  // 경기 결과가 없거나, pending이거나, gameResult가 없는 경우
                                  if (!selection.result || selection.result === 'pending') {
                                    return true;
                                  }
                                  
                                  // gameResult 객체가 있는 경우 상세 검증
                                  if (selection.gameResult) {
                                    return !selection.gameResult.status || 
                                           !selection.gameResult.score || 
                                           selection.gameResult.score === 'N/A' ||
                                           !selection.gameResult.status || 
                                           selection.gameResult.status === 'pending';
                                  }
                                  
                                  return false;
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
                          </div>
                          <div className="space-y-3">
                            {selectedBet.selections.map((selection, index) => {
                              // 경기 결과 상태 결정 - selection.result 또는 selection.gameResult 기반
                              const getGameResult = (selection) => {
                                // 1. selection.result가 있으면 우선 사용 (정산 완료)
                                if (selection.result && selection.result !== 'pending') {
                                  if (selection.result === 'won' || selection.result === 'win') {
                                    return { 
                                      status: 'won', 
                                      result: `승리`, 
                                      color: 'bg-green-100 text-green-800' 
                                    };
                                  } else if (selection.result === 'lost' || selection.result === 'lose') {
                                    return { 
                                      status: 'lost', 
                                      result: `패배`, 
                                      color: 'bg-red-100 text-red-800' 
                                    };
                                  } else if (selection.result === 'cancelled') {
                                    return { 
                                      status: 'cancelled', 
                                      result: `취소됨`, 
                                      color: 'bg-gray-100 text-gray-800' 
                                    };
                                  }
                                }
                                
                                // 2. selection.result가 없거나 pending이면 gameResult 확인
                                if (selection.gameResult) {
                                  const gr = selection.gameResult;
                                  
                                  // 경기 완료 여부 확인
                                  if (gr.status === 'finished' && gr.score) {
                                    return { 
                                      status: 'finished', 
                                      result: `경기 완료 (정산 대기중)`, 
                                      color: 'bg-blue-100 text-blue-800' 
                                    };
                                  } else if (gr.status === 'cancelled') {
                                    return { 
                                      status: 'cancelled', 
                                      result: `경기 취소`, 
                                      color: 'bg-gray-100 text-gray-800' 
                                    };
                                  } else if (gr.status === 'postponed') {
                                    return { 
                                      status: 'postponed', 
                                      result: `경기 연기`, 
                                      color: 'bg-orange-100 text-orange-800' 
                                    };
                                  }
                                }
                                
                                // 3. 기본값: 대기중
                                return { 
                                  status: 'pending', 
                                  result: '경기 결과 대기중', 
                                  color: 'bg-yellow-100 text-yellow-800' 
                                };
                              };

                              const gameResult = getGameResult(selection);

                              return (
                                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {selection.desc}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        선택: <span className="font-medium text-blue-600">{selection.team}</span>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        마켓: <span className="font-medium">{selection.market}</span>
                                        {selection.point && <span> | 라인: {selection.point}</span>}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {selection.commence_time && new Date(selection.commence_time).toLocaleString('ko-KR')}
                                      </div>
                                      {/* 경기 결과 표시 */}
                                      <div className="mt-2">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gameResult.color}`}>
                                          {gameResult.status}
                                        </span>
                                        {/* 스코어 정보 표시 - 중앙화된 파싱 로직 사용 */}
                                        {(() => {
                                          const scoreDisplay = getScoreDisplay(
                                            selection.gameResult?.score,
                                            selection.gameResult?.homeTeam,
                                            selection.gameResult?.awayTeam,
                                            'labeled' // "스코어: 10 - 9" 형식
                                          );
                                          
                                          if (scoreDisplay === 'N/A') return null;
                                          
                                          return (
                                            <div className="mt-1 text-xs text-gray-600">
                                              {scoreDisplay}
                                            </div>
                                          );
                                        })()}
                                        {/* 경기 결과 세부 정보 (개선됨) */}
                                        {selection.gameResult && (
                                          <div className="mt-1 text-xs text-gray-500 space-y-1">
                                            {/* 경기 상태 */}
                                            {selection.gameResult.status && (
                                              <div>
                                                경기 상태: 
                                                <span className={`ml-1 font-medium ${
                                                  selection.gameResult.status === 'finished' ? 'text-green-600' :
                                                  selection.gameResult.status === 'cancelled' ? 'text-red-600' :
                                                  selection.gameResult.status === 'postponed' ? 'text-orange-600' :
                                                  'text-yellow-600'
                                                }`}>
                                                  {selection.gameResult.status === 'finished' ? '완료' :
                                                   selection.gameResult.status === 'cancelled' ? '취소' :
                                                   selection.gameResult.status === 'postponed' ? '연기' :
                                                   '예정'}
                                                </span>
                                              </div>
                                            )}
                                            {/* 경기 결과 */}
                                            {selection.gameResult.status && selection.gameResult.status !== 'pending' && (
                                              <div>
                                                경기 결과: 
                                                <span className="ml-1 font-medium">
                                                  {selection.gameResult.status === 'home_win' ? '홈팀 승리' :
                                                   selection.gameResult.status === 'away_win' ? '원정팀 승리' :
                                                   selection.gameResult.status === 'draw' ? '무승부' :
                                                   selection.gameResult.status}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-orange-600">
                                        {selection.odds}
                                      </div>
                                      <div className="text-xs text-gray-500">배당률</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 닫기 버튼 */}
                      <div className="flex justify-end mt-6">
                        <button
                          onClick={() => setShowBetDetail(false)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🆕 수동 경기 결과 입력 모달 */}
              {showManualInputModal && selectedBet && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      {/* 모달 헤더 */}
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          경기 결과 수동 입력 - 베팅 #{selectedBet.id}
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
                        {selectedBet.selections.map((selection, index) => {
                          const gameId = index + 1;
                          const manualData = manualGameResults[gameId] || {};
                          const teams = selection.desc?.split(' vs ') || [];
                          const homeTeam = teams[0] || '';
                          const awayTeam = teams[1] || '';
                          
                          return (
                            <div key={gameId} className="border rounded-lg p-4 bg-gray-50">
                              <h4 className="font-semibold text-lg mb-4">
                                경기 {gameId}: {selection.desc}
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {homeTeam} 스코어
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
                                    {awayTeam} 스코어
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

              {/* 🆕 베팅 취소 모달 */}
              {showBetCancelModal && selectedBet && (
                <BetCancelModal
                  isOpen={showBetCancelModal}
                  onClose={() => setShowBetCancelModal(false)}
                  onConfirm={handleBetCancel}
                  betId={selectedBet.id}
                  betInfo={{
                    userId: selectedBet.userId,
                    stake: selectedBet.stake,
                    status: selectedBet.status,
                    selections: selectedBet.selections
                  }}
                  loading={cancelLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}