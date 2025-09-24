import React, { useState, useMemo } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import FilterBar from '../../components/admin/FilterBar';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import { useAdminApi, useAdminApiMutation } from '../../hooks/useAdminApi';

interface Game {
  id: number;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_team_odds: number;
  away_team_odds: number;
  draw_odds?: number;
  status: 'upcoming' | 'live' | 'completed';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface League {
  sport_key: string;
  sport_title: string;
  is_active: boolean;
  game_count: number;
}

export default function GamesManagement() {
  const [activeTab, setActiveTab] = useState<'games' | 'leagues'>('games');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
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

  // 새 경기 추가 폼 상태
  const [newGame, setNewGame] = useState({
    sport_key: '',
    sport_title: '',
    commence_time: '',
    home_team: '',
    away_team: '',
    home_team_odds: 0,
    away_team_odds: 0,
    draw_odds: 0,
    is_active: true
  });

  // API 호출
  const { data: gamesData, loading: gamesLoading, refetch: refetchGames } = useAdminApi<{games: Game[]}>('/api/admin/games');
  const { data: leaguesData, loading: leaguesLoading, refetch: refetchLeagues } = useAdminApi<{leagues: League[]}>('/api/admin/leagues');
  
  // API 뮤테이션
  const { mutate: addGame, loading: addLoading } = useAdminApiMutation('/api/admin/games', 'POST');
  const { mutate: updateGame, loading: updateLoading } = useAdminApiMutation('/api/admin/games', 'PUT');
  const { mutate: toggleLeague, loading: toggleLoading } = useAdminApiMutation('/api/admin/leagues', 'PATCH');

  const games = gamesData?.games || [];
  const leagues = leaguesData?.leagues || [];

  // 필터링된 게임 목록
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSport = selectedSport === 'all' || game.sport_key === selectedSport;
      const matchesStatus = selectedStatus === 'all' || game.status === selectedStatus;
      const matchesSearch = searchTerm === '' || 
        game.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.sport_title.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSport && matchesStatus && matchesSearch;
    });
  }, [games, selectedSport, selectedStatus, searchTerm]);

  // 스포츠 옵션 (리그에서 가져오기)
  const sportOptions = useMemo(() => {
    const options = [{ value: 'all', label: '전체' }];
    leagues.forEach(league => {
      options.push({ value: league.sport_key, label: league.sport_title });
    });
    return options;
  }, [leagues]);

  // 상태 옵션
  const statusOptions = [
    { value: 'all', label: '전체' },
    { value: 'upcoming', label: '예정' },
    { value: 'live', label: '진행중' },
    { value: 'completed', label: '완료' }
  ];

  // 게임 테이블 컬럼 정의
  const gameColumns = [
    {
      key: 'sport_title',
      label: '스포츠',
      className: 'w-32'
    },
    {
      key: 'home_team',
      label: '홈팀',
      className: 'w-40'
    },
    {
      key: 'away_team',
      label: '어웨이팀',
      className: 'w-40'
    },
    {
      key: 'commence_time',
      label: '경기시간',
      render: (value: string) => new Date(value).toLocaleString('ko-KR'),
      className: 'w-48'
    },
    {
      key: 'status',
      label: '상태',
      render: (value: string) => {
        const statusMap = {
          'upcoming': '예정',
          'live': '진행중',
          'completed': '완료'
        };
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            value === 'upcoming' ? 'bg-blue-100 text-blue-800' :
            value === 'live' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {statusMap[value as keyof typeof statusMap]}
          </span>
        );
      },
      className: 'w-20'
    },
    {
      key: 'home_team_odds',
      label: '홈팀 오즈',
      render: (value: number) => value.toFixed(2),
      className: 'w-24'
    },
    {
      key: 'away_team_odds',
      label: '어웨이팀 오즈',
      render: (value: number) => value.toFixed(2),
      className: 'w-24'
    },
    {
      key: 'is_active',
      label: '활성',
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
      key: 'actions',
      label: '작업',
      render: (_: any, game: Game) => (
        <div className="flex space-x-2">
          <button
            onClick={() => setEditingGame(game)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            수정
          </button>
          <button
            onClick={() => handleDeleteGame(game)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            삭제
          </button>
        </div>
      ),
      className: 'w-24'
    }
  ];

  // 리그 테이블 컬럼 정의
  const leagueColumns = [
    {
      key: 'sport_title',
      label: '스포츠',
      className: 'w-48'
    },
    {
      key: 'game_count',
      label: '경기 수',
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
      key: 'actions',
      label: '작업',
      render: (_: any, league: League) => (
        <button
          onClick={() => handleToggleLeague(league)}
          className={`px-3 py-1 text-xs rounded ${
            league.is_active 
              ? 'bg-red-100 text-red-800 hover:bg-red-200' 
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
          disabled={toggleLoading}
        >
          {league.is_active ? '비활성화' : '활성화'}
        </button>
      ),
      className: 'w-24'
    }
  ];

  // 이벤트 핸들러들
  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addGame(newGame);
    if (result) {
      setShowAddModal(false);
      setNewGame({
        sport_key: '',
        sport_title: '',
        commence_time: '',
        home_team: '',
        away_team: '',
        home_team_odds: 0,
        away_team_odds: 0,
        draw_odds: 0,
        is_active: true
      });
      refetchGames();
    }
  };

  const handleUpdateGame = async (gameId: number, updates: Partial<Game>) => {
    const result = await updateGame({ id: gameId, ...updates });
    if (result) {
      setEditingGame(null);
      refetchGames();
    }
  };

  const handleDeleteGame = (game: Game) => {
    setConfirmationModal({
      isOpen: true,
      title: '경기 삭제',
      message: `"${game.home_team} vs ${game.away_team}" 경기를 삭제하시겠습니까?`,
      onConfirm: async () => {
        // 삭제 로직 구현
        setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        refetchGames();
      }
    });
  };

  const handleToggleLeague = async (league: League) => {
    const result = await toggleLeague({ 
      sport_key: league.sport_key, 
      is_active: !league.is_active 
    });
    if (result) {
      refetchLeagues();
    }
  };

  const handleResetFilters = () => {
    setSelectedSport('all');
    setSelectedStatus('all');
    setSearchTerm('');
  };

  return (
    <AdminLayout requiredLevel={2} title="경기 데이터 관리">
      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('games')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'games'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              경기 관리
            </button>
            <button
              onClick={() => setActiveTab('leagues')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leagues'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              리그 관리
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'games' && (
        <>
          {/* 필터 바 */}
          <FilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="팀명 또는 스포츠 검색..."
            filters={[
              {
                key: 'sport',
                label: '스포츠',
                value: selectedSport,
                options: sportOptions,
                onChange: setSelectedSport
              },
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
              새 경기 추가
            </button>
          </div>

          {/* 게임 테이블 */}
          <AdminTable
            data={filteredGames}
            columns={gameColumns}
            loading={gamesLoading}
            emptyMessage="경기 데이터가 없습니다."
          />
        </>
      )}

      {activeTab === 'leagues' && (
        <>
          {/* 액션 버튼 */}
          <div className="mb-4">
            <button
              onClick={() => refetchLeagues()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              리그 목록 새로고침
            </button>
          </div>

          {/* 리그 테이블 */}
          <AdminTable
            data={leagues}
            columns={leagueColumns}
            loading={leaguesLoading}
            emptyMessage="리그 데이터가 없습니다."
          />
        </>
      )}

      {/* 새 경기 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddGame}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">새 경기 추가</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">스포츠</label>
                      <input
                        type="text"
                        value={newGame.sport_title}
                        onChange={(e) => setNewGame({...newGame, sport_title: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">홈팀</label>
                      <input
                        type="text"
                        value={newGame.home_team}
                        onChange={(e) => setNewGame({...newGame, home_team: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">어웨이팀</label>
                      <input
                        type="text"
                        value={newGame.away_team}
                        onChange={(e) => setNewGame({...newGame, away_team: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">경기시간</label>
                      <input
                        type="datetime-local"
                        value={newGame.commence_time}
                        onChange={(e) => setNewGame({...newGame, commence_time: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
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