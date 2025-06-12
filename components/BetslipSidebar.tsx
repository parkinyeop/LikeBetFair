import React, { useState, useEffect } from "react";
import BetSelectionPanel from "./BetSelectionPanel";
import { useAuth } from '../contexts/AuthContext';

function MyBetsPanel() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openBetIds, setOpenBetIds] = useState<{ [id: string]: boolean }>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');
  const { setBalance } = useAuth();

  useEffect(() => {
    const fetchBets = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5050/api/bet/history', {
          headers: { 'x-auth-token': token || '' },
        });
        const data = await res.json();
        if (res.ok) {
          setBets(data);
        } else {
          setError(data.message || '배팅내역 불러오기 실패');
        }
      } catch (err) {
        setError('서버 오류');
      } finally {
        setLoading(false);
      }
    };
    fetchBets();
  }, []);

  const toggleBet = (id: string) => {
    setOpenBetIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 필터링된 배팅만 표시
  const filteredBets = filter === 'all' ? bets : bets.filter((bet) => bet.status === filter);

  // 상태 한글 변환
  const statusLabel = (status: string) => {
    if (status === 'pending') return '진행중';
    if (status === 'won') return '적중';
    if (status === 'lost') return '미적중';
    return status;
  };

  if (loading) return <div className="p-4">불러오는 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!bets.length) return <div className="p-4 text-gray-500 text-sm">최근 배팅내역이 없습니다.</div>;

  return (
    <div className="w-full p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold mb-3">배팅내역</h2>
      {/* 필터 버튼 */}
      <div className="flex gap-2 mb-2">
        {[
          { key: 'all', label: '전체' },
          { key: 'pending', label: '진행중' },
          { key: 'won', label: '적중' },
          { key: 'lost', label: '미적중' },
        ].map(btn => (
          <button
            key={btn.key}
            className={`px-3 py-1 rounded text-sm font-semibold border ${filter === btn.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
            onClick={() => setFilter(btn.key as any)}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {/* 배팅내역 리스트 */}
      <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filteredBets.map((bet) => {
          let dateStr = '-';
          if (bet.createdAt) {
            try {
              const dateObj = new Date(bet.createdAt);
              dateStr = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : '날짜 정보 없음';
            } catch {
              dateStr = '날짜 정보 없음';
            }
          }
          let expectedResultDate: string | null = null;
          if (Array.isArray(bet.selections)) {
            const times = bet.selections
              .map((sel: any) => sel.commence_time)
              .filter((t: any) => !!t)
              .map((t: string) => new Date(t))
              .filter((d: Date) => !isNaN(d.getTime()));
            if (times.length > 0) {
              const maxDate = new Date(Math.max(...times.map(d => d.getTime())));
              expectedResultDate = maxDate.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            }
          }
          const isOpen = openBetIds[bet.id] || false;
          // 요약 줄
          return (
            <li key={bet.id} className="border-b pb-2 mb-2">
              {/* 1줄: 날짜 | 상태 */}
              <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                <span>{dateStr}</span>
                <span className={`font-semibold ${bet.status === 'pending' ? 'text-blue-600' : bet.status === 'won' ? 'text-green-600' : 'text-gray-500'}`}>{statusLabel(bet.status)}</span>
              </div>
              {/* 2줄: 배팅금/예상수익/펼치기 */}
              <div className="flex justify-between items-center">
                <span>
                  <b className="text-base text-black">{Number(bet.stake).toLocaleString()}</b>
                  <span className="text-xs text-gray-500 ml-1">원</span>
                  <span className="mx-1 text-gray-400">/</span>
                  <b className="text-base text-black">{Math.floor(Number(bet.potentialWinnings)).toLocaleString()}</b>
                  <span className="text-xs text-gray-500 ml-1">원</span>
                </span>
                <button className="ml-2 px-2 py-0.5 text-xs border rounded text-blue-600 border-blue-300 hover:bg-blue-50" onClick={e => { e.stopPropagation(); toggleBet(bet.id); }}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>
              {/* 상세 내역 */}
              {isOpen && (
                <div className="mt-2">
                  <div className="flex items-center mb-1">
                    <span className="text-sm">🧾 멀티베팅 {Array.isArray(bet.selections) ? bet.selections.length : 0}건</span>
                  </div>
                  {expectedResultDate && (
                    <div className="text-xs text-blue-600 font-semibold mb-1">정산예정일: {expectedResultDate}</div>
                  )}
                  <div className="text-gray-300 text-xs mb-2">────────────────────────</div>
                  <div className="mb-2 space-y-1">
                    {Array.isArray(bet.selections)
                      ? bet.selections.map((sel: any, idx: number) => {
                          let icon = '⏳', color = 'text-gray-400', label = '대기';
                          if (sel.result === 'won') { icon = '✔️'; color = 'text-green-600'; label = '적중'; }
                          else if (sel.result === 'lost') { icon = '❌'; color = 'text-red-500'; label = '실패'; }
                          return (
                            <div key={idx} className="flex items-center text-sm">
                              <span className={`mr-2 ${color}`}>{icon}</span>
                              <span className={`font-semibold ${color}`}>{sel.team}</span>
                              <span className="ml-2 text-gray-600">@ {sel.odds}</span>
                              <span className={`ml-2 text-xs ${color}`}>{label}</span>
                            </div>
                          );
                        })
                      : '-'}
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>💰 배팅금: <b>{Number(bet.stake).toLocaleString()}원</b></div>
                    <div>📈 배당률: <b>{Number(bet.totalOdds).toFixed(2)}</b></div>
                    <div className="flex items-center gap-2">
                      <span>🏆 예상수익: <b>{Math.floor(Number(bet.potentialWinnings)).toLocaleString()}원</b></span>
                      {bet.status === 'pending' && Array.isArray(bet.selections) && bet.selections.every((sel: any) => sel.result === 'pending' || !sel.result) && (
                        <button
                          className="px-2 py-0.5 text-xs border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors ml-1"
                          onClick={async () => {
                            if (!window.confirm('정말 이 베팅을 취소하시겠습니까?')) return;
                            const token = localStorage.getItem('token');
                            const res = await fetch(`http://localhost:5050/api/bet/${bet.id}/cancel`, {
                              method: 'POST',
                              headers: { 'x-auth-token': token || '' },
                            });
                            const data = await res.json();
                            if (res.ok) {
                              alert('베팅이 취소되었습니다.');
                              if (data.balance !== undefined) setBalance(Number(data.balance));
                              setBets((prev: any[]) => prev.filter(b => b.id !== bet.id));
                            } else {
                              alert(data.message || '취소 실패');
                            }
                          }}
                        >
                          베팅취소
                        </button>
                      )}
                    </div>
                  </div>
                  {bet.status === 'pending' && Array.isArray(bet.selections) && !bet.selections.every((sel: any) => sel.result === 'pending' || !sel.result) && (
                    <div className="mt-2 text-xs text-gray-400">이미 일부 경기가 시작되어 취소할 수 없습니다.</div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function BetslipSidebar() {
  const { isLoggedIn, balance } = useAuth();
  const [tab, setTab] = useState<'betslip' | 'mybets'>('betslip');

  if (!isLoggedIn) {
    return (
      <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200 flex items-center justify-center min-h-full">
        <span className="text-gray-500 text-base font-semibold">로그인 후 배팅이 가능합니다</span>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">BET</h2>
        <span className="text-sm font-semibold text-blue-600">잔액: {balance !== null ? Number(balance).toLocaleString() : '-'}원</span>
      </div>
      <div className="flex space-x-2 mb-2">
        <button
          className={`flex-1 py-1 rounded ${tab === 'betslip' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setTab('betslip')}
        >
          베팅슬립
        </button>
        <button
          className={`flex-1 py-1 rounded ${tab === 'mybets' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setTab('mybets')}
        >
          배팅내역
        </button>
      </div>
      {tab === 'betslip' ? <BetSelectionPanel /> : <MyBetsPanel />}
    </aside>
  );
} 