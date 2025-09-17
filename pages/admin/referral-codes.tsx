import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

interface ReferralCode {
  id: string;
  adminId: string;
  code: string;
  commissionRate: number;
  isActive: boolean;
  maxUsers: number | null;
  currentUsers: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  admin: {
    id: string;
    username: string;
    email: string;
    adminLevel: number;
  };
}

interface ReferralCodeStats {
  summary: {
    totalCodes: number;
    activeCodes: number;
    totalUsers: number;
    avgCommissionRate: number;
    minCommissionRate: number;
    maxCommissionRate: number;
  };
}

interface ReferralCodeFilters {
  status: 'all' | 'active' | 'inactive';
  adminId: string;
  sortBy: 'createdAt' | 'code' | 'commissionRate' | 'currentUsers';
  sortOrder: 'asc' | 'desc';
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function AdminReferralCodes() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  const [referralCodeStats, setReferralCodeStats] = useState<ReferralCodeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ReferralCodeFilters>({
    status: 'all',
    adminId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [showCodeDetail, setShowCodeDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: '',
    commissionRate: 0.05,
    maxUsers: '',
    expiresAt: ''
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin || adminLevel < 1) {
      alert('추천코드 관리 권한이 필요합니다.');
      router.push('/admin');
      return;
    }

    fetchCodes();
    fetchStats();
  }, [isLoggedIn, isAdmin, adminLevel, router, filters, pagination.currentPage]);

  const getAuthHeaders = useCallback(() => {
    const tabId = sessionStorage.getItem('tabId');
    const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        status: filters.status,
        adminId: filters.adminId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });
      
      const response = await fetch(`http://localhost:5050/api/admin/referral-codes?${queryParams}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination?.totalPages || 1,
          totalItems: data.pagination?.totalItems || 0
        }));
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || '추천코드 목록을 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('추천코드 목록 로딩 오류:', err);
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch('http://localhost:5050/api/admin/referral-codes/stats/summary', {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setReferralCodeStats(data);
      }
    } catch (err) {
      console.error('추천코드 통계 로딩 오류:', err);
    }
  };

  const fetchCodeDetail = async (codeId: string) => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`http://localhost:5050/api/admin/referral-codes/${codeId}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedCode(data.code);
        setShowCodeDetail(true);
      } else {
        const errorData = await response.json();
        alert(errorData.message || '추천코드 정보를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('추천코드 상세 정보 로딩 오류:', err);
      alert('서버 연결에 실패했습니다.');
    }
  };

  const createCode = async () => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch('http://localhost:5050/api/admin/referral-codes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: createForm.code,
          commissionRate: createForm.commissionRate,
          maxUsers: createForm.maxUsers ? parseInt(createForm.maxUsers) : null,
          expiresAt: createForm.expiresAt || null
        })
      });

      if (response.ok) {
        alert('추천코드가 성공적으로 생성되었습니다.');
        setShowCreateModal(false);
        setCreateForm({ code: '', commissionRate: 0.05, maxUsers: '', expiresAt: '' });
        fetchCodes();
        fetchStats();
      } else {
        const errorData = await response.json();
        alert(errorData.message || '추천코드 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('추천코드 생성 오류:', err);
      alert('서버 연결에 실패했습니다.');
    }
  };

  const updateCodeStatus = async (codeId: string, isActive: boolean) => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`http://localhost:5050/api/admin/referral-codes/${codeId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        alert(`추천코드가 ${isActive ? '활성화' : '비활성화'}되었습니다.`);
        fetchCodes();
        fetchStats();
        if (selectedCode?.id === codeId) {
          fetchCodeDetail(codeId);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || '추천코드 상태 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('추천코드 상태 변경 오류:', err);
      alert('서버 연결에 실패했습니다.');
    }
  };

  const handleFilterChange = (key: keyof ReferralCodeFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleCodeClick = (code: ReferralCode) => {
    fetchCodeDetail(code.id);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.code.trim()) {
      createCode();
    } else {
      alert('추천코드를 입력해주세요.');
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm(prev => ({ ...prev, code: result }));
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

              {/* 헤더 */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">추천코드 관리</h1>
                    <p className="text-gray-600 mt-2">추천코드 생성, 수수료 관리, 실적 조회</p>
                  </div>
                  <div className="flex space-x-3">
                    {adminLevel >= 3 && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                      >
                        + 새 추천코드
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 추천코드 통계 */}
              {referralCodeStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">총 추천코드</h3>
                    <p className="text-2xl font-bold text-gray-900">{referralCodeStats.summary.totalCodes}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">활성 코드</h3>
                    <p className="text-2xl font-bold text-green-600">{referralCodeStats.summary.activeCodes}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">총 추천 사용자</h3>
                    <p className="text-2xl font-bold text-gray-900">{referralCodeStats.summary.totalUsers}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">평균 수수료율</h3>
                    <p className="text-2xl font-bold text-gray-900">{(referralCodeStats.summary.avgCommissionRate * 100).toFixed(2)}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">최소 수수료율</h3>
                    <p className="text-2xl font-bold text-gray-900">{(referralCodeStats.summary.minCommissionRate * 100).toFixed(2)}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">최대 수수료율</h3>
                    <p className="text-2xl font-bold text-gray-900">{(referralCodeStats.summary.maxCommissionRate * 100).toFixed(2)}%</p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">추천코드 목록을 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  ❌ {error}
                  <div className="mt-2 text-sm">
                    <button 
                      onClick={fetchCodes} 
                      className="text-red-600 underline hover:text-red-800"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 필터 및 검색 */}
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                        <select
                          value={filters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">전체</option>
                          <option value="active">활성</option>
                          <option value="inactive">비활성</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">정렬 기준</label>
                        <select
                          value={filters.sortBy}
                          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="createdAt">생성일</option>
                          <option value="code">코드</option>
                          <option value="commissionRate">수수료율</option>
                          <option value="currentUsers">사용자 수</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">정렬 순서</label>
                        <select
                          value={filters.sortOrder}
                          onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="desc">내림차순</option>
                          <option value="asc">오름차순</option>
                        </select>
                      </div>
                      {adminLevel >= 3 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">관리자 ID</label>
                          <input
                            type="text"
                            placeholder="관리자 ID"
                            value={filters.adminId}
                            onChange={(e) => handleFilterChange('adminId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 추천코드 목록 */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        추천코드 목록 ({pagination.totalItems}개)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">코드</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리자</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수수료율</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자 수</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">만료일</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {codes.map((code) => (
                            <tr key={code.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 font-mono">{code.code}</div>
                                <div className="text-xs text-gray-500">#{code.id.substring(0, 8)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{code.admin.username}</div>
                                <div className="text-sm text-gray-500">레벨 {code.admin.adminLevel}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{(code.commissionRate * 100).toFixed(2)}%</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {code.currentUsers}명
                                  {code.maxUsers && ` / ${code.maxUsers}명`}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  code.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {code.isActive ? '활성' : '비활성'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString('ko-KR') : '무제한'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleCodeClick(code)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  상세보기
                                </button>
                                {adminLevel >= 3 && (
                                  <button
                                    onClick={() => updateCodeStatus(code.id, !code.isActive)}
                                    className={`${
                                      code.isActive 
                                        ? 'text-red-600 hover:text-red-900' 
                                        : 'text-green-600 hover:text-green-900'
                                    }`}
                                  >
                                    {code.isActive ? '비활성화' : '활성화'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* 페이지네이션 */}
                    {pagination.totalPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            {pagination.totalItems}개 중 {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}개 표시
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                              disabled={pagination.currentPage === 1}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              이전
                            </button>
                            
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                              const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                              if (pageNum > pagination.totalPages) return null;
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setPagination(prev => ({ ...prev, currentPage: pageNum }))}
                                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                                    pageNum === pagination.currentPage
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
                              disabled={pagination.currentPage === pagination.totalPages}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              다음
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 추천코드 생성 모달 */}
              {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">새 추천코드 생성</h3>
                    </div>
                    <form onSubmit={handleCreateSubmit} className="p-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">추천코드</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={createForm.code}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="추천코드 입력"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={20}
                          />
                          <button
                            type="button"
                            onClick={generateRandomCode}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                          >
                            랜덤
                          </button>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">수수료율 (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="20"
                          value={createForm.commissionRate * 100}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) / 100 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">최대 사용자 수 (선택사항)</label>
                        <input
                          type="number"
                          min="1"
                          value={createForm.maxUsers}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, maxUsers: e.target.value }))}
                          placeholder="무제한"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">만료일 (선택사항)</label>
                        <input
                          type="datetime-local"
                          value={createForm.expiresAt}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowCreateModal(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                        >
                          생성
                        </button>
                      </div>
                    </form>
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
