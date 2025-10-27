import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { buildApiUrl } from '../../config/apiConfig';
import Header from '../../components/Header';

interface Game {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  score?: any;
  hasOdds?: boolean;
  existingOdds?: any;
}

interface OddsInput {
  h2h: {
    home: string;
    away: string;
    draw?: string;
  };
  spreads?: {
    team: string;
    point: string;
    price: string;
  }[];
  totals?: {
    name: string;
    point: string;
    price: string;
  }[];
}

const LEAGUES = [
  { key: 'basketball_kbl', title: 'KBL', hasDrawOdds: false },
];

export default function ManualOdds() {
  const { isLoggedIn, isAdmin, adminLevel } = useAuth();
  const router = useRouter();
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [oddsInput, setOddsInput] = useState<OddsInput>({
    h2h: { home: '', away: '', draw: '' },
    spreads: [],
    totals: []
  });
  const [saving, setSaving] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }

    if (!isAdmin || adminLevel < 2) {
      alert('수동 배당율 입력 권한이 필요합니다. (레벨 2 이상)');
      router.push('/admin');
      return;
    }
  }, [isLoggedIn, isAdmin, adminLevel, router]);

  // 경기 목록 불러오기
  const fetchGames = async () => {
    setLoading(true);
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

      if (!token) {
        toast.error('로그인 토큰이 없습니다.');
        return;
      }

      const response = await fetch(
        buildApiUrl(`/api/admin/manual-odds/games/${selectedLeague.key}?days=7`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
        toast.success(`${data.totalGames}개 경기를 불러왔습니다.`);
      } else {
        const error = await response.json();
        toast.error(error.message || '경기 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('경기 목록 불러오기 오류:', error);
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 리그 변경 시 경기 목록 다시 불러오기
  useEffect(() => {
    if (isLoggedIn && isAdmin && adminLevel >= 2) {
      fetchGames();
    }
  }, [selectedLeague]);

  // 경기 선택
  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);

    // 기존 배당율이 있으면 불러오기
    if (game.existingOdds && game.existingOdds.length > 0) {
      const bookmaker = game.existingOdds[0];
      const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');

      if (h2hMarket) {
        const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === game.homeTeam);
        const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === game.awayTeam);
        const drawOutcome = h2hMarket.outcomes.find((o: any) => o.name === 'Draw');

        setOddsInput({
          h2h: {
            home: homeOutcome?.price?.toString() || '',
            away: awayOutcome?.price?.toString() || '',
            draw: drawOutcome?.price?.toString() || ''
          },
          spreads: [],
          totals: []
        });
      }
    } else {
      // 기본값으로 초기화
      setOddsInput({
        h2h: { home: '', away: '', draw: '' },
        spreads: [],
        totals: []
      });
    }
  };

  // 배당율 저장
  const handleSaveOdds = async () => {
    if (!selectedGame) return;

    // 유효성 검증
    if (!oddsInput.h2h.home || !oddsInput.h2h.away) {
      toast.error('홈/어웨이 배당율은 필수입니다.');
      return;
    }

    if (selectedLeague.hasDrawOdds && !oddsInput.h2h.draw) {
      toast.error('무승부 배당율은 필수입니다.');
      return;
    }

    setSaving(true);
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

      if (!token) {
        toast.error('로그인 토큰이 없습니다.');
        return;
      }

      const requestBody = {
        sportKey: selectedLeague.key,
        sportTitle: selectedLeague.title,
        eventId: selectedGame.eventId,
        homeTeam: selectedGame.homeTeam,
        awayTeam: selectedGame.awayTeam,
        commenceTime: selectedGame.commenceTime,
        odds: {
          h2h: {
            home: oddsInput.h2h.home,
            away: oddsInput.h2h.away,
            ...(selectedLeague.hasDrawOdds && { draw: oddsInput.h2h.draw })
          }
        }
      };

      const response = await fetch(
        buildApiUrl('/api/admin/manual-odds'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setSelectedGame(null);
        fetchGames(); // 목록 새로고침
      } else {
        const error = await response.json();
        toast.error(error.message || '저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('배당율 저장 오류:', error);
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 배당율 삭제
  const handleDeleteOdds = async (eventId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

      if (!token) {
        toast.error('로그인 토큰이 없습니다.');
        return;
      }

      const response = await fetch(
        buildApiUrl(`/api/admin/manual-odds/${eventId}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('배당율이 삭제되었습니다.');
        fetchGames(); // 목록 새로고침
      } else {
        const error = await response.json();
        toast.error(error.message || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('배당율 삭제 오류:', error);
      toast.error('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">수동 배당율 입력</h1>
              <p className="text-gray-600 mt-2">OddsAPI가 제공하지 않는 리그의 배당율을 수동으로 설정합니다</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              대시보드로
            </button>
          </div>
        </div>

        {/* 리그 선택 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">리그 선택</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LEAGUES.map((league) => (
              <button
                key={league.key}
                onClick={() => setSelectedLeague(league)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedLeague.key === league.key
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{league.title}</div>
                <div className="text-xs text-gray-500 mt-1">{league.key}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 경기 목록 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {selectedLeague.title} 경기 목록 ({games.length}개)
            </h2>
            <button
              onClick={fetchGames}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '불러오는 중...' : '새로고침'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">경기 목록을 불러오는 중...</div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-gray-500">경기가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.eventId}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    game.hasOdds ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {game.homeTeam} vs {game.awayTeam}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(game.commenceTime).toLocaleString('ko-KR')}
                      </div>
                      {game.hasOdds && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ 배당율 입력됨
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSelectGame(game)}
                        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                      >
                        {game.hasOdds ? '수정' : '입력'}
                      </button>
                      {game.hasOdds && (
                        <button
                          onClick={() => handleDeleteOdds(game.eventId)}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 배당율 입력 모달 */}
        {selectedGame && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* 모달 헤더 */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    배당율 입력: {selectedGame.homeTeam} vs {selectedGame.awayTeam}
                  </h3>
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                {/* 승/패 배당율 입력 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedGame.homeTeam} 승리 배당율
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={oddsInput.h2h.home}
                      onChange={(e) => setOddsInput({
                        ...oddsInput,
                        h2h: { ...oddsInput.h2h, home: e.target.value }
                      })}
                      placeholder="예: 1.95"
                    />
                  </div>

                  {selectedLeague.hasDrawOdds && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        무승부 배당율
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        value={oddsInput.h2h.draw}
                        onChange={(e) => setOddsInput({
                          ...oddsInput,
                          h2h: { ...oddsInput.h2h, draw: e.target.value }
                        })}
                        placeholder="예: 3.50"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedGame.awayTeam} 승리 배당율
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={oddsInput.h2h.away}
                      onChange={(e) => setOddsInput({
                        ...oddsInput,
                        h2h: { ...oddsInput.h2h, away: e.target.value }
                      })}
                      placeholder="예: 2.10"
                    />
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveOdds}
                    disabled={saving}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
