import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import { buildApiUrl } from '../../config/apiConfig';

interface CommissionSummary {
  totalCommissions: number;
  totalCount: number;
  byType: {
    type: string;
    count: number;
    totalAmount: number;
    avgAmount: number;
  }[];
}

interface RecentCommission {
  id: string;
  type: string;
  amount: number;
  rate: number;
  status: string;
  createdAt: string;
  user: {
    email: string;
    username: string;
  } | null;
}

interface DailyStat {
  date: string;
  type: string;
  count: number;
  totalAmount: number;
}

interface AdminStat {
  adminId: string;
  admin: {
    email: string;
    username: string;
  } | null;
  count: number;
  totalAmount: number;
}

interface CommissionData {
  summary: CommissionSummary;
  recentCommissions: RecentCommission[];
  dailyStats: DailyStat[];
  adminStats: AdminStat[];
}

export default function AdminCommissions() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    period: '7d',
    type: 'all'
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin || adminLevel < 1) {
      alert('수수료 현황 조회 권한이 필요합니다.');
      router.push('/admin');
      return;
    }

    fetchCommissionData();

    // 🔄 5분마다 자동 갱신
    const intervalId = setInterval(() => {
      console.log('[Admin Commissions] 자동 갱신 실행 (5분)');
      fetchCommissionData();
    }, 5 * 60 * 1000); // 300,000ms = 5분

    return () => clearInterval(intervalId);
  }, [isLoggedIn, isAdmin, adminLevel, router, filters]);

  const getAuthHeaders = useCallback(() => {
    const tabId = sessionStorage.getItem('tabId');
    const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        period: filters.period,
        type: filters.type
      });
      
      const response = await fetch(buildApiUrl(`/api/admin/commissions?${params}`), {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('수수료 현황 조회에 실패했습니다.');
      }
      
      const result = await response.json();
      if (result.success) {
        setCommissionData(result.data);
      } else {
        throw new Error(result.error || '수수료 현황 조회에 실패했습니다.');
      }
    } catch (err) {
      console.error('수수료 현황 조회 오류:', err);
      setError(err instanceof Error ? err.message : '수수료 현황 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exchange': return '익스체인지 수수료';
      case 'sportsbook': return '스포츠북 수수료';
      case 'referral': return '추천인 수수료';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exchange': return 'bg-blue-100 text-blue-800';
      case 'sportsbook': return 'bg-green-100 text-green-800';
      case 'referral': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">수수료 현황을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">오류: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 브레드크럼 */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <button
              onClick={() => router.push('/admin')}
              className="hover:text-gray-700 transition-colors"
            >
              관리자홈
            </button>
            <span>›</span>
            <span>수수료 현황</span>
          </div>
        </div>

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">수수료 현황</h1>
              <p className="text-gray-600 mt-2">수수료 수입 현황 및 분석</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                관리자홈
              </button>
              <button
                onClick={fetchCommissionData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">오늘</option>
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
                <option value="">전체</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수수료 유형</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                <option value="exchange">익스체인지</option>
                <option value="sportsbook">스포츠북</option>
                <option value="referral">추천인</option>
              </select>
            </div>
          </div>
        </div>

        {/* 수수료 요약 */}
        {commissionData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 수수료</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(commissionData.summary.totalCommissions)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 건수</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {commissionData.summary.totalCount.toLocaleString()}건
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">평균 수수료</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {commissionData.summary.totalCount > 0 
                      ? formatCurrency(commissionData.summary.totalCommissions / commissionData.summary.totalCount)
                      : '₩0'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">수취자 수</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {commissionData.adminStats.length}명
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 수수료 유형별 통계 */}
        {commissionData && commissionData.summary.byType.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">수수료 유형별 통계</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {commissionData.summary.byType.map((typeStat) => (
                <div key={typeStat.type} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(typeStat.type)}`}>
                      {getTypeLabel(typeStat.type)}
                    </span>
                    <span className="text-sm text-gray-500">{typeStat.count}건</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">
                    {formatCurrency(typeStat.totalAmount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    평균: {formatCurrency(typeStat.avgAmount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 수수료 내역 */}
        {commissionData && commissionData.recentCommissions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">최근 수수료 내역</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수수료율
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      일시
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissionData.recentCommissions.map((commission) => (
                    <tr key={commission.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(commission.type)}`}>
                          {getTypeLabel(commission.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.user ? commission.user.email : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(commission.rate * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(commission.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          commission.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {commission.status === 'paid' ? '지급완료' : '대기중'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(commission.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 수수료 수취자별 통계 */}
        {commissionData && commissionData.adminStats.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">수수료 수취자별 통계</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      관리자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      건수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총 수수료
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      평균 수수료
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissionData.adminStats.map((adminStat) => (
                    <tr key={adminStat.adminId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {adminStat.admin ? adminStat.admin.email : '알 수 없음'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {adminStat.count.toLocaleString()}건
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(adminStat.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {adminStat.count > 0 
                          ? formatCurrency(adminStat.totalAmount / adminStat.count)
                          : '₩0'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
