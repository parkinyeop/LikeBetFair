import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { buildApiUrl } from '../../config/apiConfig';
import Header from '../../components/Header';

interface ManualGameInput {
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  h2hHomeOdds: string;
  h2hAwayOdds: string;
  h2hDrawOdds: string;
  // 핸디캡
  spreadHomePoint: string;
  spreadHomeOdds: string;
  spreadAwayPoint: string;
  spreadAwayOdds: string;
  // 오버/언더
  totalPoint: string;
  totalOverOdds: string;
  totalUnderOdds: string;
}

const LEAGUES = [
  { key: 'basketball_kbl', title: 'KBL', hasDrawOdds: false },
];

export default function ManualOdds() {
  const { isLoggedIn, isAdmin, adminLevel } = useAuth();
  const router = useRouter();
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0]);
  const [saving, setSaving] = useState(false);

  const [gameInput, setGameInput] = useState<ManualGameInput>({
    sportKey: 'basketball_kbl',
    sportTitle: 'KBL',
    homeTeam: '',
    awayTeam: '',
    commenceTime: '',
    h2hHomeOdds: '',
    h2hAwayOdds: '',
    h2hDrawOdds: '',
    spreadHomePoint: '',
    spreadHomeOdds: '',
    spreadAwayPoint: '',
    spreadAwayOdds: '',
    totalPoint: '',
    totalOverOdds: '',
    totalUnderOdds: '',
  });

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

  // 리그 변경 시 sportKey, sportTitle 업데이트
  useEffect(() => {
    setGameInput(prev => ({
      ...prev,
      sportKey: selectedLeague.key,
      sportTitle: selectedLeague.title
    }));
  }, [selectedLeague]);

  // 배당율 저장
  const handleSaveOdds = async () => {
    // 유효성 검사
    if (!gameInput.homeTeam || !gameInput.awayTeam) {
      toast.error('홈팀과 어웨이팀을 입력해주세요.');
      return;
    }

    if (!gameInput.commenceTime) {
      toast.error('경기 시간을 선택해주세요.');
      return;
    }

    if (!gameInput.h2hHomeOdds || !gameInput.h2hAwayOdds) {
      toast.error('승/패 배당율을 입력해주세요.');
      return;
    }

    if (selectedLeague.hasDrawOdds && !gameInput.h2hDrawOdds) {
      toast.error('무승부 배당율을 입력해주세요.');
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

      // eventId 생성 (고유 ID)
      const eventId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 배당율 데이터 구조 생성
      const odds: any = {
        h2h: {
          home: parseFloat(gameInput.h2hHomeOdds),
          away: parseFloat(gameInput.h2hAwayOdds),
        }
      };

      if (selectedLeague.hasDrawOdds && gameInput.h2hDrawOdds) {
        odds.h2h.draw = parseFloat(gameInput.h2hDrawOdds);
      }

      // 핸디캡 데이터 추가
      if (gameInput.spreadHomePoint && gameInput.spreadHomeOdds &&
          gameInput.spreadAwayPoint && gameInput.spreadAwayOdds) {
        odds.spreads = [
          {
            team: gameInput.homeTeam,
            point: parseFloat(gameInput.spreadHomePoint),
            price: parseFloat(gameInput.spreadHomeOdds)
          },
          {
            team: gameInput.awayTeam,
            point: parseFloat(gameInput.spreadAwayPoint),
            price: parseFloat(gameInput.spreadAwayOdds)
          }
        ];
      }

      // 오버/언더 데이터 추가
      if (gameInput.totalPoint && gameInput.totalOverOdds && gameInput.totalUnderOdds) {
        odds.totals = [
          {
            name: 'Over',
            point: parseFloat(gameInput.totalPoint),
            price: parseFloat(gameInput.totalOverOdds)
          },
          {
            name: 'Under',
            point: parseFloat(gameInput.totalPoint),
            price: parseFloat(gameInput.totalUnderOdds)
          }
        ];
      }

      const payload = {
        sportKey: gameInput.sportKey,
        sportTitle: gameInput.sportTitle,
        eventId: eventId,
        homeTeam: gameInput.homeTeam,
        awayTeam: gameInput.awayTeam,
        commenceTime: new Date(gameInput.commenceTime).toISOString(),
        odds: odds
      };

      const response = await fetch(
        buildApiUrl('/api/admin/manual-odds'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        // 입력 폼 초기화
        setGameInput({
          sportKey: selectedLeague.key,
          sportTitle: selectedLeague.title,
          homeTeam: '',
          awayTeam: '',
          commenceTime: '',
          h2hHomeOdds: '',
          h2hAwayOdds: '',
          h2hDrawOdds: '',
          spreadHomePoint: '',
          spreadHomeOdds: '',
          spreadAwayPoint: '',
          spreadAwayOdds: '',
          totalPoint: '',
          totalOverOdds: '',
          totalUnderOdds: '',
        });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">수동 배당율 입력</h1>
              <p className="text-gray-600 mt-2">미래 경기의 배당율을 수동으로 설정합니다</p>
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

        {/* 경기 정보 입력 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">경기 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  홈팀 *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.homeTeam}
                  onChange={(e) => setGameInput({ ...gameInput, homeTeam: e.target.value })}
                  placeholder="예: 서울 SK"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  어웨이팀 *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.awayTeam}
                  onChange={(e) => setGameInput({ ...gameInput, awayTeam: e.target.value })}
                  placeholder="예: 부산 KT"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                경기 시간 *
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={gameInput.commenceTime}
                onChange={(e) => setGameInput({ ...gameInput, commenceTime: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* 승/패 배당율 입력 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">승/패 배당율 (필수)</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  홈팀 승리 배당율 *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.h2hHomeOdds}
                  onChange={(e) => setGameInput({ ...gameInput, h2hHomeOdds: e.target.value })}
                  placeholder="예: 1.95"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  어웨이팀 승리 배당율 *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.h2hAwayOdds}
                  onChange={(e) => setGameInput({ ...gameInput, h2hAwayOdds: e.target.value })}
                  placeholder="예: 2.10"
                />
              </div>
            </div>

            {selectedLeague.hasDrawOdds && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  무승부 배당율 *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.h2hDrawOdds}
                  onChange={(e) => setGameInput({ ...gameInput, h2hDrawOdds: e.target.value })}
                  placeholder="예: 3.50"
                />
              </div>
            )}
          </div>
        </div>

        {/* 핸디캡 배당율 입력 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">핸디캡 배당율 (선택)</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  홈팀 핸디캡
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.spreadHomePoint}
                  onChange={(e) => setGameInput({ ...gameInput, spreadHomePoint: e.target.value })}
                  placeholder="예: -5.5"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  홈팀 핸디캡 배당율
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.spreadHomeOdds}
                  onChange={(e) => setGameInput({ ...gameInput, spreadHomeOdds: e.target.value })}
                  placeholder="예: 1.90"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  어웨이팀 핸디캡
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.spreadAwayPoint}
                  onChange={(e) => setGameInput({ ...gameInput, spreadAwayPoint: e.target.value })}
                  placeholder="예: +5.5"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  어웨이팀 핸디캡 배당율
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.spreadAwayOdds}
                  onChange={(e) => setGameInput({ ...gameInput, spreadAwayOdds: e.target.value })}
                  placeholder="예: 1.90"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 오버/언더 배당율 입력 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">오버/언더 배당율 (선택)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기준점
              </label>
              <input
                type="number"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={gameInput.totalPoint}
                onChange={(e) => setGameInput({ ...gameInput, totalPoint: e.target.value })}
                placeholder="예: 165.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  오버 배당율
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.totalOverOdds}
                  onChange={(e) => setGameInput({ ...gameInput, totalOverOdds: e.target.value })}
                  placeholder="예: 1.95"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  언더 배당율
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={gameInput.totalUnderOdds}
                  onChange={(e) => setGameInput({ ...gameInput, totalUnderOdds: e.target.value })}
                  placeholder="예: 1.95"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveOdds}
            disabled={saving}
            className="px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
          >
            {saving ? '저장 중...' : '배당율 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
