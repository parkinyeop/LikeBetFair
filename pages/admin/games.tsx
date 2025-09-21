import { buildApiUrl } from '../../config/apiConfig';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

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
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'leagues'>('games');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

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

  useEffect(() => {
    fetchGames();
    fetchLeagues();
  }, []);

  const fetchGames = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('buildApiUrl('/api/admin/games', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('경기 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('buildApiUrl('/api/admin/leagues', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setLeagues(data.leagues || []);
    } catch (error) {
      console.error('리그 데이터 로딩 실패:', error);
    }
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('buildApiUrl('/api/admin/games', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(newGame)
      });

      if (response.ok) {
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
        fetchGames();
      }
    } catch (error) {
      console.error('경기 추가 실패:', error);
    }
  };

  const handleUpdateGame = async (gameId: number, updates: Partial<Game>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`buildApiUrl('/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setEditingGame(null);
        fetchGames();
      }
    } catch (error) {
      console.error('경기 수정 실패:', error);
    }
  };

  const handleToggleLeague = async (sportKey: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('buildApiUrl('/api/admin/leagues', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ sport_key: sportKey, is_active: !isActive })
      });

      if (response.ok) {
        fetchLeagues();
      }
    } catch (error) {
      console.error('리그 상태 변경 실패:', error);
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSport = selectedSport === 'all' || game.sport_key === selectedSport;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'upcoming' && game.status === 'upcoming') ||
      (selectedStatus === 'live' && game.status === 'live') ||
      (selectedStatus === 'completed' && game.status === 'completed');
    const matchesSearch = searchTerm === '' || 
      game.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.away_team.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSport && matchesStatus && matchesSearch;
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      upcoming: { text: '예정', color: 'bg-blue-100 text-blue-800' },
      live: { text: '진행중', color: 'bg-green-100 text-green-800' },
      completed: { text: '완료', color: 'bg-gray-100 text-gray-800' }
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.upcoming;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page fixed inset-0 bg-gray-100 flex flex-col z-50">
      <Header />
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">경기 데이터 관리</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            관리자홈
          </button>
        </div>

        {/* 탭 메뉴 */}
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
            {/* 필터 및 검색 */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">스포츠</label>
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">전체</option>
                    {leagues.map(league => (
                      <option key={league.sport_key} value={league.sport_key}>
                        {league.sport_title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">전체</option>
                    <option value="upcoming">예정</option>
                    <option value="live">진행중</option>
                    <option value="completed">완료</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
                  <input
                    type="text"
                    placeholder="팀명 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  >
                    경기 추가
                  </button>
                </div>
              </div>
            </div>

            {/* 경기 목록 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        경기 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        배당률
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        활성화
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGames.map((game) => (
                      <tr key={game.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {game.home_team} vs {game.away_team}
                            </div>
                            <div className="text-sm text-gray-500">
                              {game.sport_title} • {formatDateTime(game.commence_time)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            <div>홈: {game.home_team_odds}</div>
                            <div>어웨이: {game.away_team_odds}</div>
                            {game.draw_odds && <div>무승부: {game.draw_odds}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(game.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            game.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {game.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setEditingGame(game)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleUpdateGame(game.id, { is_active: !game.is_active })}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            {game.is_active ? '비활성화' : '활성화'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'leagues' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">리그 활성화 관리</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {leagues.map((league) => (
                <div key={league.sport_key} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{league.sport_title}</div>
                    <div className="text-sm text-gray-500">경기 수: {league.game_count}개</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      league.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {league.is_active ? '활성' : '비활성'}
                    </span>
                    <button
                      onClick={() => handleToggleLeague(league.sport_key, league.is_active)}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        league.is_active
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {league.is_active ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 경기 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">새 경기 추가</h3>
                <form onSubmit={handleAddGame}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">스포츠</label>
                      <select
                        value={newGame.sport_key}
                        onChange={(e) => setNewGame({...newGame, sport_key: e.target.value, sport_title: e.target.options[e.target.selectedIndex].text})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      >
                        <option value="">선택하세요</option>
                        {leagues.map(league => (
                          <option key={league.sport_key} value={league.sport_key}>
                            {league.sport_title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">경기 시간</label>
                      <input
                        type="datetime-local"
                        value={newGame.commence_time}
                        onChange={(e) => setNewGame({...newGame, commence_time: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">홈팀</label>
                        <input
                          type="text"
                          value={newGame.home_team}
                          onChange={(e) => setNewGame({...newGame, home_team: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">어웨이팀</label>
                        <input
                          type="text"
                          value={newGame.away_team}
                          onChange={(e) => setNewGame({...newGame, away_team: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">홈팀 배당</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newGame.home_team_odds}
                          onChange={(e) => setNewGame({...newGame, home_team_odds: parseFloat(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">어웨이팀 배당</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newGame.away_team_odds}
                          onChange={(e) => setNewGame({...newGame, away_team_odds: parseFloat(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">무승부 배당</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newGame.draw_odds}
                          onChange={(e) => setNewGame({...newGame, draw_odds: parseFloat(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      추가
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 경기 수정 모달 */}
        {editingGame && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">경기 수정</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateGame(editingGame.id, editingGame);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">경기 시간</label>
                      <input
                        type="datetime-local"
                        value={editingGame.commence_time}
                        onChange={(e) => setEditingGame({...editingGame, commence_time: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">홈팀</label>
                        <input
                          type="text"
                          value={editingGame.home_team}
                          onChange={(e) => setEditingGame({...editingGame, home_team: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">어웨이팀</label>
                        <input
                          type="text"
                          value={editingGame.away_team}
                          onChange={(e) => setEditingGame({...editingGame, away_team: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">홈팀 배당</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingGame.home_team_odds}
                          onChange={(e) => setEditingGame({...editingGame, home_team_odds: parseFloat(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">어웨이팀 배당</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingGame.away_team_odds}
                          onChange={(e) => setEditingGame({...editingGame, away_team_odds: parseFloat(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">무승부 배당</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingGame.draw_odds || 0}
                          onChange={(e) => setEditingGame({...editingGame, draw_odds: parseFloat(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={editingGame.is_active}
                        onChange={(e) => setEditingGame({...editingGame, is_active: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        활성화
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingGame(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      수정
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
