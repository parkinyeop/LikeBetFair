import { useEffect, useState, useRef } from 'react';
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

export default function ExchangeAdmin() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'multibets' | 'settlements'>('overview');
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

  const fetchExchangeData = async () => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      
      if (!token) {
        setError('로그인 토큰이 없습니다.');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Exchange 통계 조회
      const statsResponse = await fetch('http://localhost:5050/api/admin/exchange/stats', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setExchangeStats(statsData);
      }

      // 전체 주문 조회
      const ordersResponse = await fetch('http://localhost:5050/api/admin/exchange/orders', { headers });
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      }

      // 정산 내역 조회
      const settlementsResponse = await fetch('http://localhost:5050/api/admin/exchange/settlements', { headers });
      if (settlementsResponse.ok) {
        const settlementsData = await settlementsResponse.json();
        console.log('정산 데이터:', settlementsData);
        setSettlements(settlementsData.settlements || []);
      }

      // 일별 통계 조회
      await fetchDailyStats();

      setError('');
    } catch (err) {
      console.error('Exchange 데이터 로딩 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyStats = async () => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const url = `http://localhost:5050/api/admin/exchange/daily-stats?year=${selectedYear}&month=${selectedMonth}`;
      
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setDailyStats(data.dailyStats || []);
        setMonthlySummary(data.monthlySummary || null);
        console.log('일별 통계 데이터:', data);
      }
    } catch (err) {
      console.error('일별 통계 로딩 오류:', err);
    }
  };

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

  const handleOrderClick = async (order: ExchangeOrder) => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      // 매치된 주문들 조회
      const matchedOrdersResponse = await fetch(`http://localhost:5050/api/admin/exchange/orders/${order.id}/matches`, { headers });
      let matchedOrders = [];
      
      if (matchedOrdersResponse.ok) {
        const matchedData = await matchedOrdersResponse.json();
        matchedOrders = matchedData.matchedOrders || [];
      }
      
      // 주문 상세 정보 설정
      setSelectedOrder({
        ...order,
        matchedOrders: matchedOrders
      });
      setShowOrderModal(true);
    } catch (err) {
      console.error('주문 상세 정보 로딩 오류:', err);
    }
  };

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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.homeTeam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.awayTeam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.gameId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const multibetOrders = orders.filter(order => order.isMultibet);

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

              {/* 탭 네비게이션 */}
              <div className="mb-6">
                <nav className="flex space-x-8">
                  {[
                    { id: 'overview', label: '개요', icon: '📊' },
                    { id: 'orders', label: '주문 관리', icon: '📋' },
                    { id: 'multibets', label: '멀티배팅', icon: '🎯' },
                    { id: 'settlements', label: '정산 관리', icon: '💰' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  ❌ {error}
                  <div className="mt-2 text-sm">
                    <button 
                      onClick={fetchExchangeData} 
                      className="text-red-600 underline hover:text-red-800"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 개요 탭 */}
                  {activeTab === 'overview' && exchangeStats && (
                    <div className="space-y-6">
                      {/* 통계 카드 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">오늘 주문 수</h3>
                          <p className="text-2xl font-bold text-gray-900">{exchangeStats.today.orders}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">매칭된 주문</h3>
                          <p className="text-2xl font-bold text-gray-900">{exchangeStats.today.matchedOrders}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">총 거래량</h3>
                          <p className="text-2xl font-bold text-gray-900">₩{exchangeStats.today.totalVolume.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">수수료 수익</h3>
                          <p className="text-2xl font-bold text-gray-900">₩{exchangeStats.today.commission.toLocaleString()}</p>
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

                  {/* 주문 관리 탭 */}
                  {activeTab === 'orders' && (
                    <div className="space-y-6">
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
                          <div>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">경기</th>
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
                                      <div className="font-medium">{order.homeTeam} vs {order.awayTeam}</div>
                                      <div className="text-gray-500 text-xs">{order.sportKey}</div>
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

                  {/* 멀티배팅 탭 */}
                  {activeTab === 'multibets' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900">멀티배팅 주문</h3>
                          <p className="text-sm text-gray-500">복합 선택이 포함된 주문들</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문 ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">선택 수</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 배당률</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">베팅 금액</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">예상 수익</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생성일</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {multibetOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{order.id}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.selectionDetails?.selections?.length || 0}개
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.selectionDetails?.totalOdds?.toFixed(2) || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ₩{order.stakeAmount.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ₩{order.potentialProfit.toLocaleString()}
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
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 정산 관리 탭 */}
                  {activeTab === 'settlements' && (
                    <div className="space-y-6">
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



                      {/* 모달 푸터 */}
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={() => setShowOrderModal(false)}
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
