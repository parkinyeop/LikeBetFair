import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  adminLevel: number;
  referralCode: string | null;
  referredBy: string | null;
  referrerAdminId: string | null;
  lastLogin: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalBets: number;
  totalStake: number;
  totalWinnings: number;
}

interface ReferralInfo {
  referredBy: string;
  referrerAdmin: {
    id: string;
    username: string;
    adminLevel: number;
  } | null;
  referralCode: {
    id: string;
    code: string;
    commissionRate: number;
    isActive: boolean;
    currentUsers: number;
    maxUsers: number | null;
    expiresAt: string | null;
  } | null;
}

interface ReferredUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  isActive: boolean;
}

interface UserFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  adminLevel: 'all' | '0' | '1' | '2' | '3' | '4' | '5';
  sortBy: 'createdAt' | 'lastLogin' | 'balance' | 'username';
  sortOrder: 'asc' | 'desc';
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function AdminUsers() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    status: 'all',
    adminLevel: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [balanceEdit, setBalanceEdit] = useState({ isEditing: false, newBalance: 0, reason: '' });

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin || adminLevel < 2) {
      alert('사용자 관리 권한이 필요합니다.');
      router.push('/admin');
      return;
    }

    fetchUsers();
  }, [isLoggedIn, isAdmin, adminLevel, router, filters, pagination.currentPage]);

  const getAuthHeaders = useCallback(() => {
    const tabId = sessionStorage.getItem('tabId');
    const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: filters.search,
        status: filters.status,
        adminLevel: filters.adminLevel,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });
      
      const response = await fetch(`http://localhost:5050/api/admin/users?${queryParams}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination?.totalPages || 1,
          totalItems: data.pagination?.totalItems || 0
        }));
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || '사용자 목록을 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('사용자 목록 로딩 오류:', err);
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId: string) => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`http://localhost:5050/api/admin/users/${userId}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data.user);
        setUserStats(data.stats);
        setReferralInfo(data.referralInfo);
        setReferredUsers(data.referredUsers || []);
        setShowUserDetail(true);
      } else {
        const errorData = await response.json();
        alert(errorData.message || '사용자 정보를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('사용자 상세 정보 로딩 오류:', err);
      alert('서버 연결에 실패했습니다.');
    }
  };

  const updateUserBalance = async (userId: string, newBalance: number, reason: string) => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`http://localhost:5050/api/admin/users/${userId}/balance`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ balance: newBalance, reason })
      });

      if (response.ok) {
        alert('잔액이 성공적으로 수정되었습니다.');
        setBalanceEdit({ isEditing: false, newBalance: 0, reason: '' });
        fetchUsers(); // 목록 새로고침
        if (selectedUser?.id === userId) {
          fetchUserDetail(userId); // 상세 정보 새로고침
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || '잔액 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('잔액 수정 오류:', err);
      alert('서버 연결에 실패했습니다.');
    }
  };

  const updateUserStatus = async (userId: string, isActive: boolean, reason: string) => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`http://localhost:5050/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive, reason })
      });

      if (response.ok) {
        alert(`사용자 계정이 ${isActive ? '활성화' : '비활성화'}되었습니다.`);
        fetchUsers(); // 목록 새로고침
        if (selectedUser?.id === userId) {
          fetchUserDetail(userId); // 상세 정보 새로고침
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || '계정 상태 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('계정 상태 변경 오류:', err);
      alert('서버 연결에 실패했습니다.');
    }
  };

  // 서버에서 필터링된 데이터를 받으므로 클라이언트 사이드 필터링 제거

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleUserClick = (user: User) => {
    fetchUserDetail(user.id);
  };

  const handleBalanceEdit = (user: User) => {
    setBalanceEdit({
      isEditing: true,
      newBalance: parseFloat(user.balance.toString()),
      reason: ''
    });
  };

  const handleBalanceSave = () => {
    if (selectedUser && balanceEdit.reason.trim()) {
      updateUserBalance(selectedUser.id, balanceEdit.newBalance, balanceEdit.reason);
    } else {
      alert('수정 사유를 입력해주세요.');
    }
  };

  const handleStatusToggle = (user: User) => {
    const reason = prompt(`${user.isActive ? '비활성화' : '활성화'} 사유를 입력해주세요:`);
    if (reason) {
      updateUserStatus(user.id, !user.isActive, reason);
    }
  };

  if (!isLoggedIn || !isAdmin || adminLevel < 2) {
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
                    <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
                    <p className="text-gray-600 mt-2">사용자 목록 조회, 계정 관리, 잔액 수정</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    ← 어드민 홈
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">사용자 목록을 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  ❌ {error}
                  <div className="mt-2 text-sm">
                    <button 
                      onClick={fetchUsers} 
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
                        <input
                          type="text"
                          placeholder="사용자명, 이메일, 추천코드"
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">관리자 레벨</label>
                        <select
                          value={filters.adminLevel}
                          onChange={(e) => handleFilterChange('adminLevel', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">전체</option>
                          <option value="0">일반 사용자</option>
                          <option value="1">레벨 1</option>
                          <option value="2">레벨 2</option>
                          <option value="3">레벨 3</option>
                          <option value="4">레벨 4</option>
                          <option value="5">레벨 5</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">정렬 기준</label>
                        <select
                          value={filters.sortBy}
                          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="createdAt">가입일</option>
                          <option value="lastLogin">최근 로그인</option>
                          <option value="balance">잔액</option>
                          <option value="username">사용자명</option>
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
                    </div>
                  </div>

                  {/* 사용자 목록 */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        사용자 목록 ({pagination.totalItems}명)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">잔액</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리자</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">레퍼럴</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">최근 로그인</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-blue-600">
                                        {user.username.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                    {user.referralCode && (
                                      <div className="text-xs text-purple-600">코드: {user.referralCode}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">₩{parseFloat(user.balance.toString()).toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {user.isActive ? '활성' : '비활성'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {user.isAdmin ? (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    레벨 {user.adminLevel}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">일반</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {user.referredBy ? (
                                  <div className="text-sm">
                                    <div className="font-mono text-purple-600">{user.referredBy}</div>
                                    {user.referralCode && (
                                      <div className="text-xs text-gray-500">코드: {user.referralCode}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">없음</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ko-KR') : '없음'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleUserClick(user)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  상세보기
                                </button>
                                {adminLevel >= 4 && (
                                  <button
                                    onClick={() => handleBalanceEdit(user)}
                                    className="text-green-600 hover:text-green-900 mr-3"
                                  >
                                    잔액수정
                                  </button>
                                )}
                                {adminLevel >= 3 && (
                                  <button
                                    onClick={() => handleStatusToggle(user)}
                                    className={`${
                                      user.isActive 
                                        ? 'text-red-600 hover:text-red-900' 
                                        : 'text-green-600 hover:text-green-900'
                                    }`}
                                  >
                                    {user.isActive ? '비활성화' : '활성화'}
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
                            {pagination.totalItems}명 중 {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}명 표시
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

              {/* 사용자 상세 모달 */}
              {showUserDetail && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">사용자 상세 정보</h3>
                      <button
                        onClick={() => setShowUserDetail(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 기본 정보 */}
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-500">사용자명</label>
                              <p className="text-sm text-gray-900">{selectedUser.username}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">이메일</label>
                              <p className="text-sm text-gray-900">{selectedUser.email}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">추천코드</label>
                              <p className="text-sm text-gray-900">{selectedUser.referralCode || '없음'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">추천인 코드</label>
                              <p className="text-sm text-gray-900">{selectedUser.referredBy || '없음'}</p>
                            </div>
                          </div>
                        </div>

                        {/* 계정 정보 */}
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">계정 정보</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-500">잔액</label>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm text-gray-900">₩{parseFloat(selectedUser.balance.toString()).toLocaleString()}</p>
                                {adminLevel >= 4 && (
                                  <button
                                    onClick={() => handleBalanceEdit(selectedUser)}
                                    className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                                  >
                                    수정
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">계정 상태</label>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  selectedUser.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {selectedUser.isActive ? '활성' : '비활성'}
                                </span>
                                {adminLevel >= 3 && (
                                  <button
                                    onClick={() => handleStatusToggle(selectedUser)}
                                    className={`text-xs px-2 py-1 rounded ${
                                      selectedUser.isActive 
                                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                    }`}
                                  >
                                    {selectedUser.isActive ? '비활성화' : '활성화'}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">관리자 권한</label>
                              <p className="text-sm text-gray-900">
                                {selectedUser.isAdmin ? `레벨 ${selectedUser.adminLevel}` : '일반 사용자'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">가입일</label>
                              <p className="text-sm text-gray-900">{new Date(selectedUser.createdAt).toLocaleString('ko-KR')}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">최근 로그인</label>
                              <p className="text-sm text-gray-900">
                                {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString('ko-KR') : '없음'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 레퍼럴 정보 */}
                      {referralInfo && (
                        <div className="mt-6">
                          <h4 className="text-lg font-medium text-gray-900 mb-4">레퍼럴 정보</h4>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-purple-600">추천인 코드</label>
                                <p className="text-sm text-gray-900 font-mono">{referralInfo.referredBy}</p>
                              </div>
                              {referralInfo.referrerAdmin && (
                                <div>
                                  <label className="block text-sm font-medium text-purple-600">추천 관리자</label>
                                  <p className="text-sm text-gray-900">
                                    {referralInfo.referrerAdmin.username} (레벨 {referralInfo.referrerAdmin.adminLevel})
                                  </p>
                                </div>
                              )}
                              {referralInfo.referralCode && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-purple-600">수수료율</label>
                                    <p className="text-sm text-gray-900">{(referralInfo.referralCode.commissionRate * 100).toFixed(2)}%</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-purple-600">코드 상태</label>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      referralInfo.referralCode.isActive 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {referralInfo.referralCode.isActive ? '활성' : '비활성'}
                                    </span>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-purple-600">현재 사용자 수</label>
                                    <p className="text-sm text-gray-900">
                                      {referralInfo.referralCode.currentUsers}명
                                      {referralInfo.referralCode.maxUsers && ` / ${referralInfo.referralCode.maxUsers}명`}
                                    </p>
                                  </div>
                                  {referralInfo.referralCode.expiresAt && (
                                    <div>
                                      <label className="block text-sm font-medium text-purple-600">만료일</label>
                                      <p className="text-sm text-gray-900">
                                        {new Date(referralInfo.referralCode.expiresAt).toLocaleDateString('ko-KR')}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 추천한 사용자들 (관리자인 경우) */}
                      {referredUsers.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-medium text-gray-900 mb-4">추천한 사용자들 ({referredUsers.length}명)</h4>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="space-y-3">
                              {referredUsers.map((referredUser) => (
                                <div key={referredUser.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-xs font-medium text-blue-600">
                                        {referredUser.username.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{referredUser.username}</p>
                                      <p className="text-xs text-gray-500">{referredUser.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      referredUser.isActive 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {referredUser.isActive ? '활성' : '비활성'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(referredUser.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 베팅 통계 */}
                      {userStats && (
                        <div className="mt-6">
                          <h4 className="text-lg font-medium text-gray-900 mb-4">베팅 통계</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h5 className="text-sm font-medium text-blue-600">총 베팅 수</h5>
                              <p className="text-2xl font-bold text-blue-900">{userStats.totalBets}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <h5 className="text-sm font-medium text-green-600">총 베팅 금액</h5>
                              <p className="text-2xl font-bold text-green-900">₩{userStats.totalStake.toLocaleString()}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <h5 className="text-sm font-medium text-purple-600">총 당첨 금액</h5>
                              <p className="text-2xl font-bold text-purple-900">₩{userStats.totalWinnings.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 잔액 수정 모달 */}
              {balanceEdit.isEditing && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">잔액 수정</h3>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">사용자</label>
                        <p className="text-sm text-gray-900">{selectedUser.username} ({selectedUser.email})</p>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">현재 잔액</label>
                        <p className="text-sm text-gray-900">₩{parseFloat(selectedUser.balance.toString()).toLocaleString()}</p>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">새 잔액</label>
                        <input
                          type="number"
                          value={balanceEdit.newBalance}
                          onChange={(e) => setBalanceEdit(prev => ({ ...prev, newBalance: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">수정 사유</label>
                        <textarea
                          value={balanceEdit.reason}
                          onChange={(e) => setBalanceEdit(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="잔액 수정 사유를 입력해주세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setBalanceEdit({ isEditing: false, newBalance: 0, reason: '' })}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleBalanceSave}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          수정
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
