import React, { useState, useEffect } from "react";
import BetSelectionPanel from "./BetSelectionPanel";
import { useAuth } from '../contexts/AuthContext';
import { normalizeOption } from '../server/normalizeUtils';

function MyBetsPanel() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openBetIds, setOpenBetIds] = useState<{ [id: string]: boolean }>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');
  const [hidePastResults, setHidePastResults] = useState(false);
  const { setBalance } = useAuth();

  const fetchBets = async () => {
    console.log('[클라이언트] 베팅 내역 fetch 시작');
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      console.log('[클라이언트] 토큰 확인:', token ? '있음' : '없음');
      
      console.log('[클라이언트] API 요청 시작: http://localhost:5050/api/bet/history');
      const res = await fetch('http://localhost:5050/api/bet/history', {
        headers: { 'x-auth-token': token || '' },
      });
      
      console.log('[클라이언트] API 응답 상태:', res.status, res.statusText);
      const data = await res.json();
      console.log('[클라이언트] API 응답 데이터:', data);
      
      if (res.ok) {
        console.log('[클라이언트] 베팅 내역 업데이트:', data.length, '개의 베팅');
        data.forEach((bet: any, index: number) => {
          console.log(`[클라이언트] 베팅 ${index + 1}:`, {
            id: bet.id,
            status: bet.status,
            selections: bet.selections?.length || 0,
            selections_detail: bet.selections?.map((sel: any) => ({
              desc: sel.desc,
              team: sel.team,
              result: sel.result,
              commence_time: sel.commence_time
            }))
          });
          
          // 각 베팅의 selections 상세 정보 출력
          if (bet.selections && Array.isArray(bet.selections)) {
            bet.selections.forEach((sel: any, selIndex: number) => {
              console.log(`[클라이언트] 베팅 ${index + 1} - 선택 ${selIndex + 1}:`, {
                desc: sel.desc,
                team: sel.team,
                odds: sel.odds,
                result: sel.result,
                commence_time: sel.commence_time,
                market: sel.market
              });
            });
          }
        });
        setBets(data);
      } else {
        console.error('[클라이언트] API 에러:', data.message);
        setError(data.message || '배팅내역 불러오기 실패');
      }
    } catch (err) {
      console.error('[클라이언트] fetch 에러:', err);
      setError('서버 오류');
    } finally {
      console.log('[클라이언트] 베팅 내역 fetch 완료');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
    
    // 30초마다 배팅 내역 새로고침 (진행중인 배팅이 있을 때만)
    const interval = setInterval(() => {
      const hasPendingBets = bets.some(bet => bet.status === 'pending');
      if (hasPendingBets) {
        fetchBets();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [bets.length]); // bets.length를 의존성으로 추가하여 배팅이 추가/제거될 때마다 새로고침

  // 전역 이벤트 리스너로 배팅 완료 시 새로고침
  useEffect(() => {
    const handleBetUpdate = () => {
      fetchBets();
    };

    window.addEventListener('betPlaced', handleBetUpdate);
    window.addEventListener('betCancelled', handleBetUpdate);

    return () => {
      window.removeEventListener('betPlaced', handleBetUpdate);
      window.removeEventListener('betCancelled', handleBetUpdate);
    };
  }, []);

  const toggleBet = (id: string) => {
    setOpenBetIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 필터링된 배팅만 표시
  let filteredBets = bets;
  if (filter === 'all') {
    // 전체
    filteredBets = bets;
  } else if (filter === 'lost') {
    // 미적중: lost 또는 cancelled
    filteredBets = bets.filter((bet) => bet.status === 'lost' || bet.status === 'cancelled');
  } else {
    filteredBets = bets.filter((bet) => bet.status === filter);
  }
  if (hidePastResults) {
    filteredBets = filteredBets.filter(bet => bet.status === 'pending');
  }

  // filteredBets를 createdAt 기준 내림차순 정렬
  filteredBets = filteredBets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 상태 한글 변환 및 색상
  const statusLabel = (status: string) => {
    if (status === 'pending') return '진행중';
    if (status === 'won') return '적중';
    if (status === 'lost') return '실패';
    if (status === 'cancelled') return '배팅취소';
    return status;
  };
  const statusColor = (status: string) => {
    if (status === 'pending') return 'text-blue-600';
    if (status === 'won') return 'text-green-600';
    if (status === 'lost') return 'text-red-500';
    if (status === 'cancelled') return 'text-gray-400';
    return '';
  };

  if (loading) return <div className="p-4">불러오는 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!bets.length) return <div className="p-4 text-gray-500 text-sm">최근 배팅내역이 없습니다.</div>;

  return (
    <div className="w-full p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">배팅내역</h2>
        <button 
          onClick={fetchBets}
          className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
        >
          새로고침
        </button>
      </div>
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
      {/* 배팅내역 리스트 + 지난 결과 숨기기 하단 고정 */}
      <div className="relative">
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
            // 경기별 평균 소요 시간(분)
            const avgGameDurationBySport: Record<string, number> = {
              soccer: 120,
              baseball: 180,
              basketball: 150,
              // 필요시 추가
            };
            if (Array.isArray(bet.selections)) {
              const times = bet.selections
                .map((sel: any) => sel.commence_time)
                .filter((t: any) => !!t)
                .map((t: string) => new Date(t))
                .filter((d: Date) => !isNaN(d.getTime()));
              if (times.length > 0) {
                const maxDate = new Date(Math.max(...times.map(d => d.getTime())));
                // 스포츠 종류 추출(예: soccer_epl → soccer)
                const sportType = bet.selections[0]?.sport_key?.split('_')[0] || 'soccer';
                const duration = avgGameDurationBySport[sportType] || 120;
                maxDate.setMinutes(maxDate.getMinutes() + duration);
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
                  <span className={`font-semibold ${statusColor(bet.status)}`}>{statusLabel(bet.status)}</span>
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
                            else if (sel.result === 'cancelled') { icon = '🚫'; color = 'text-gray-400'; label = '취소'; }
                            // 언더/오버 마켓이면 라인+옵션만 노출
                            const isOverUnder = sel.market === '언더/오버' || sel.market === 'totals';
                            const ouType = normalizeOption(sel.option || sel.team);
                            return (
                              <div key={idx} className="flex items-center text-sm">
                                <span className={`mr-2 ${color}`}>{icon}</span>
                                {isOverUnder ? (
                                  <span className={`font-semibold ${color}`}>{ouType} {sel.point !== undefined ? `(${sel.point})` : ''}</span>
                                ) : (
                                  <span className={`font-semibold ${color}`}>{sel.desc ? sel.desc.split(' vs ').find(t => t && sel.team && t.replace(/\s/g, '').toLowerCase().includes(sel.team.replace(/\s/g, '').toLowerCase())) || sel.team : sel.team}</span>
                                )}
                                <span className="ml-2 text-gray-600">@ {sel.odds}</span>
                                <span className={`ml-2 text-xs ${color}`}>{label}</span>
                                {bet.status === 'cancelled' && (
                                  <span className="ml-2 text-xs text-gray-400 font-semibold">배팅이 취소됨</span>
                                )}
                                {['won', 'lost'].includes(sel.result) && sel.gameResult && sel.gameResult.score && Array.isArray(sel.gameResult.score) ? (
                                  <span className="ml-2 text-xs text-blue-600">
                                    결과: ({sel.gameResult.homeTeam} {sel.gameResult.score[0]?.score ?? '-'} : {sel.gameResult.awayTeam} {sel.gameResult.score[1]?.score ?? '-'})
                                  </span>
                                ) : ['won', 'lost'].includes(sel.result) ? (
                                  <span className="ml-2 text-xs text-gray-400">결과 대기중</span>
                                ) : null}
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
                              if (res.ok) {
                                const data = await res.json();
                                alert('베팅이 취소되었습니다.');
                                if (data.balance !== undefined) setBalance(Number(data.balance));
                                setBets((prev: any[]) => prev.map(b => b.id === bet.id ? { ...b, status: 'cancelled' } : b));
                                window.dispatchEvent(new Event('betCancelled'));
                              } else {
                                alert('경기 시작 10분 전까지만 베팅 취소가 가능합니다.');
                              }
                            }}
                            disabled={bet.status === 'cancelled' || bet.selections.some((sel: any) => {
                              if (!sel.commence_time) return false;
                              const gameTime = new Date(sel.commence_time);
                              return gameTime <= new Date(Date.now() + 10 * 60 * 1000);
                            })}
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
        <div className="sticky bottom-0 bg-white py-2 flex items-center justify-end border-t z-10">
          <input
            type="checkbox"
            id="hidePastResults"
            checked={hidePastResults}
            onChange={e => setHidePastResults(e.target.checked)}
            className="mr-1"
          />
          <label htmlFor="hidePastResults" className="text-xs text-gray-600 select-none">지난 결과 숨기기</label>
        </div>
      </div>
    </div>
  );
}

export default function BetslipSidebar() {
  const { isLoggedIn, balance } = useAuth();
  const [tab, setTab] = useState<'betslip' | 'mybets'>('betslip');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (newTab: 'betslip' | 'mybets') => {
    setTab(newTab);
    if (newTab === 'mybets') {
      // 배팅내역 탭으로 전환 시 새로고침
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

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
          onClick={() => handleTabChange('betslip')}
        >
          베팅슬립
        </button>
        <button
          className={`flex-1 py-1 rounded ${tab === 'mybets' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => handleTabChange('mybets')}
        >
          배팅내역
        </button>
      </div>
      {tab === 'betslip' ? <BetSelectionPanel /> : <MyBetsPanel key={refreshKey} />}
    </aside>
  );
} 