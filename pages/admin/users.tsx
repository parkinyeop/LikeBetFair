import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import FilterBar from '../../components/admin/FilterBar';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import { useAdminApi, useAdminApiMutation } from '../../hooks/useAdminApi';

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  admin_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export default function UsersManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // 새 사용자 추가 폼 상태
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    admin_level: 0,
    balance: 0,
    is_active: true
  });

  // 편집 폼 상태
  const [editUser, setEditUser] = useState({
    id: '',
    username: '',
    email: '',
    admin_level: 0,
    balance: 0,
    is_active: true
  });

  // 서버사이드 필터링을 위한 쿼리 파라미터
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedStatus !== 'all') params.status = selectedStatus;
    return params;
  }, [searchTerm, selectedStatus]);

  // API 호출 (서버사이드 필터링 적용)
  const { data: usersData, loading: usersLoading, error: usersError, refetch: refetchUsers } = useAdminApi<{users: User[]}>('/api/admin/users', {
    queryParams
  });
  
  // API 뮤테이션 (성공 후 자동 새로고침)
  const { mutate: addUser, loading: addLoading } = useAdminApiMutation('/api/admin/users', 'POST', refetchUsers);
  const { mutate: updateUser, loading: updateLoading } = useAdminApiMutation('/api/admin/users', 'PUT', refetchUsers);
  const { mutate: deleteUser, loading: deleteLoading } = useAdminApiMutation('/api/admin/users', 'DELETE', refetchUsers);

  const users = usersData?.users || [];

  // 토큰 만료 감지 및 리디렉션
  useEffect(() => {
    if (usersError && usersError.includes('로그인이 만료되었습니다')) {
      // 토큰이 만료된 경우 로그인 페이지로 리디렉션
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);
    }
  }, [usersError]);

  // 서버사이드 필터링을 사용하므로 클라이언트 필터링 제거
  const filteredUsers = users;

  // 상태 옵션
  const statusOptions = [
    { value: 'all', label: '전체' },
    { value: 'active', label: '활성' },
    { value: 'inactive', label: '비활성' }
  ];

  // 사용자 테이블 컬럼 정의
  const userColumns = [
    {
      key: 'username',
      label: '사용자명',
      className: 'w-32'
    },
    {
      key: 'email',
      label: '이메일',
      className: 'w-48'
    },
    {
      key: 'balance',
      label: '잔액',
      render: (value: number) => `${value.toLocaleString()}원`,
      className: 'w-32'
    },
    {
      key: 'admin_level',
      label: '관리자 레벨',
      render: (value: number) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 0 ? 'bg-gray-100 text-gray-800' :
          value <= 2 ? 'bg-blue-100 text-blue-800' :
          value <= 4 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value === 0 ? '일반' : `레벨 ${value}`}
        </span>
      ),
      className: 'w-24'
    },
    {
      key: 'is_active',
      label: '상태',
      render: (value: boolean) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? '활성' : '비활성'}
        </span>
      ),
      className: 'w-20'
    },
    {
      key: 'created_at',
      label: '가입일',
      render: (value: string) => new Date(value).toLocaleDateString('ko-KR'),
      className: 'w-32'
    },
    {
      key: 'last_login',
      label: '최근 로그인',
      render: (value: string) => value ? new Date(value).toLocaleString('ko-KR') : '없음',
      className: 'w-40'
    },
    {
      key: 'actions',
      label: '작업',
      render: (_: any, user: User) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditUser(user)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            수정
          </button>
          <button
            onClick={() => handleDeleteUser(user)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            삭제
          </button>
        </div>
      ),
      className: 'w-24'
    }
  ];

  // 이벤트 핸들러들
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addUser(newUser);
    if (result) {
      setShowAddModal(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        admin_level: 0,
        balance: 0,
        is_active: true
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditUser({
      id: user.id,
      username: user.username,
      email: user.email,
      admin_level: user.admin_level,
      balance: user.balance,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateUser(editUser);
    if (result) {
      setShowEditModal(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setConfirmationModal({
      isOpen: true,
      title: '사용자 삭제',
      message: `"${user.username}" 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        const result = await deleteUser({ id: user.id });
        if (result) {
          setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        }
      }
    });
  };

  const handleResetFilters = () => {
    setSelectedStatus('all');
    setSearchTerm('');
  };

  return (
    <AdminLayout requiredLevel={2} title="사용자 관리">
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

      {/* 필터 바 */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="사용자명 또는 이메일 검색..."
        filters={[
          {
            key: 'status',
            label: '상태',
            value: selectedStatus,
            options: statusOptions,
            onChange: setSelectedStatus
          }
        ]}
        onReset={handleResetFilters}
      />

      {/* 액션 버튼 */}
      <div className="mb-4">
                                <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
          새 사용자 추가
                                </button>
                    </div>
                    
      {/* 에러 표시 */}
      {usersError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {usersError}
                      </div>
      )}

      {/* 사용자 테이블 */}
      <AdminTable
        data={filteredUsers}
        columns={userColumns}
        loading={usersLoading}
        emptyMessage="사용자 데이터가 없습니다."
      />

      {/* 새 사용자 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">새 사용자 추가</h3>
                  <div className="space-y-4">
                        <div>
                      <label className="block text-sm font-medium text-gray-700">사용자명</label>
                        <input
                          type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                        />
                            </div>
                            <div>
                      <label className="block text-sm font-medium text-gray-700">이메일</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                            </div>
                            <div>
                      <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                            </div>
                            <div>
                      <label className="block text-sm font-medium text-gray-700">관리자 레벨</label>
                        <select
                        value={newUser.admin_level}
                        onChange={(e) => setNewUser({...newUser, admin_level: parseInt(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value={0}>일반 사용자</option>
                        <option value={1}>레벨 1</option>
                        <option value={2}>레벨 2</option>
                        <option value={3}>레벨 3</option>
                        <option value={4}>레벨 4</option>
                        <option value={5}>최고 관리자</option>
                        </select>
                          </div>
                                    <div>
                      <label className="block text-sm font-medium text-gray-700">초기 잔액</label>
                        <input
                          type="number"
                        value={newUser.balance}
                        onChange={(e) => setNewUser({...newUser, balance: parseInt(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        min="0"
                        />
                      </div>
                      </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                    type="submit"
                    disabled={addLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                    {addLoading ? '추가 중...' : '추가'}
                        </button>
                        <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                    취소
                        </button>
                      </div>
              </form>
                    </div>
                  </div>
                </div>
              )}

      {/* 사용자 편집 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpdateUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">사용자 정보 수정</h3>
                      <div className="space-y-4">
                        <div>
                      <label className="block text-sm font-medium text-gray-700">사용자명</label>
                          <input
                            type="text"
                        value={editUser.username}
                        onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                        </div>
                        <div>
                      <label className="block text-sm font-medium text-gray-700">이메일</label>
                          <input
                        type="email"
                        value={editUser.email}
                        onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                        </div>
                        <div>
                      <label className="block text-sm font-medium text-gray-700">관리자 레벨</label>
                      <select
                        value={editUser.admin_level}
                        onChange={(e) => setEditUser({...editUser, admin_level: parseInt(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value={0}>일반 사용자</option>
                        <option value={1}>레벨 1</option>
                        <option value={2}>레벨 2</option>
                        <option value={3}>레벨 3</option>
                        <option value={4}>레벨 4</option>
                        <option value={5}>최고 관리자</option>
                      </select>
                      </div>
                        <div>
                      <label className="block text-sm font-medium text-gray-700">잔액</label>
                          <input
                            type="number"
                        value={editUser.balance}
                        onChange={(e) => setEditUser({...editUser, balance: parseInt(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            min="0"
                          />
                        </div>
                        <div>
                      <label className="flex items-center">
                          <input
                          type="checkbox"
                          checked={editUser.is_active}
                          onChange={(e) => setEditUser({...editUser, is_active: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">활성 상태</span>
                      </label>
                        </div>
                        </div>
                      </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                    type="submit"
                    disabled={updateLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                    {updateLoading ? '수정 중...' : '수정'}
                        </button>
                        <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    취소
                        </button>
                      </div>
              </form>
                    </div>
                  </div>
                </div>
              )}

      {/* 확인 모달 */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText="삭제"
        cancelText="취소"
        confirmButtonColor="red"
      />
    </AdminLayout>
  );
}
