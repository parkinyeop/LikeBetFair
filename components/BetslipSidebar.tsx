import { buildApiUrl } from '../config/apiConfig';
import React, { useState, useEffect } from "react";
import BetSelectionPanel from "./BetSelectionPanel";
import { useAuth } from '../contexts/AuthContext';
import { normalizeOption, normalizeOverUnderOption } from '../server/normalizeUtils';

interface BetslipSidebarProps {
  activeTab?: 'betslip' | 'mybets';
  onTabChange?: (tab: 'betslip' | 'mybets') => void;
  onBettingAreaSelect?: () => void;
}

function MyBetsPanel() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openBetIds, setOpenBetIds] = useState<{ [id: string]: boolean }>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('pending');
  const [hidePastResults, setHidePastResults] = useState(false);
  const { setBalance, token, username, forceRefreshBalance } = useAuth(); // token과 username 추가

  const fetchBets = async () => {
    console.log('[클라이언트] 베팅 내역 fetch 시작');
    console.log('[클라이언트] 현재 사용자:', username);
    console.log('[클라이언트] 토큰 존재:', !!token);
    
    setLoading(true);
    setError('');
    try {
      // 토큰이 없으면 요청하지 않음
      if (!token) {
        console.log('[클라이언트] 토큰이 없어서 요청 중단');
        setBets([]);
        return;
      }
      
      // API URL 결정
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                    (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                     ? 'buildApiUrl' 
                     : 'https://likebetfair.onrender.com');
      
      console.log('[클라이언트] API 요청 시작:', `${apiUrl}/api/bet/history`);
      const res = await fetch(`${apiUrl}/api/bet/history`, {
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
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
        setError(data.message || 'Failed to load betting history');
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
    // 토큰이 있을 때만 fetch 실행
    if (token) {
      fetchBets();
    } else {
      setBets([]); // 토큰이 없으면 빈 배열로 초기화
    }
    
    // 30초마다 배팅 내역 새로고침 (진행중인 배팅이 있을 때만, 백그라운드에서도 동작)
    const interval = setInterval(() => {
      if (token) { // 토큰이 있을 때만 실행
        const hasPendingBets = bets.some(bet => bet.status === 'pending');
        if (hasPendingBets) {
          console.log('[BetslipSidebar] 주기적 베팅 내역 갱신 시도');
          fetchBets();
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [token, username]); // token과 username을 의존성으로 추가

  // Page Visibility API - 탭 활성화시 베팅 내역 즉시 갱신
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        console.log('[BetslipSidebar] 탭 활성화 - 베팅 내역 즉시 갱신');
        const fetchBets = async () => {
          try {
            const response = await fetch('/api/bets/user', {
              headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              setBets(data);
            } else {
              console.error('Failed to fetch bets');
            }
          } catch (error) {
            console.error('Error fetching bets:', error);
          }
        };
        fetchBets();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [token]);

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
    if (status === 'pending') return 'In Progress';
      if (status === 'won') return 'Won';
  if (status === 'lost') return 'Lost';
    if (status === 'cancelled') return 'Bet Cancelled';
    return status;
  };
  const statusColor = (status: string) => {
    if (status === 'pending') return 'text-blue-600';
    if (status === 'won') return 'text-green-600';
    if (status === 'lost') return 'text-red-500';
    if (status === 'cancelled') return 'text-gray-400';
    return '';
  };

      if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
        if (!bets.length) return <div className="p-4 text-gray-500 text-sm">No recent betting history.</div>;

  return (
    <div className="w-full p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Betting History</h2>
        <button 
          onClick={fetchBets}
          className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
        >
                            Refresh
        </button>
      </div>
      {/* 필터 버튼 */}
      <div className="flex gap-2 mb-2">
        {[
          { key: 'pending', label: 'In Progress' },
              { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
          { key: 'all', label: 'All' },
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
      <div className="relative h-full">
        <ul className="space-y-2 h-full pr-1">
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
            const isOpen = openBetIds[bet.id] || false;
            // 익스체인지 스타일로 변경
            return (
              <li key={bet.id} className="relative mb-4">
                {/* 구분선 */}
                <div className="my-4">
                  <div className="border-t border-gray-200"></div>
                </div>
                
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200 shadow-sm">
                  {/* 1줄: 날짜 | 상태 */}
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{dateStr}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(bet.status)}`}>{statusLabel(bet.status)}</span>
                  </div>
                  
                  {/* 배팅 유형 표시 */}
                  {Array.isArray(bet.selections) && bet.selections.length > 1 && (
                    <div className="mb-3">
                      <span className="text-sm font-bold text-gray-800">
                        멀티배팅 ({bet.selections.length}개)
                      </span>
                    </div>
                  )}
                  
                  {/* 2줄: 경기 정보 (팀명, 배당율) */}
                  <div className="space-y-2">
                    {Array.isArray(bet.selections) && bet.selections.length > 0 ? (
                      bet.selections.map((sel: any, idx: number) => {
                        const isOverUnder = sel.market === 'Over/Under' || sel.market === 'totals';
                        const isHandicap = sel.market === 'Handicap' || sel.market === 'spreads';
                        
                        return (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">
                                {isOverUnder ? (
                                  normalizeOverUnderOption(sel.option || sel.team, sel.desc, sel.point)
                                ) : isHandicap ? (
                                  sel.team
                                ) : sel.result === 'draw' ? (
                                  `Draw`
                                ) : (
                                  `${sel.team} (Win)`
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-800">
                                @ {Number(sel.odds).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-gray-500">No game info</span>
                    )}
                  </div>
                  
                  {/* 접힘 상태에서 배팅금액과 합산배당율 정보 표시 */}
                  {!isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600">
                            배팅금액: <span className="font-medium text-black">{Math.floor(bet.stake || 0).toLocaleString()}원</span>
                          </span>
                          <span className="text-gray-600">
                            배당율: <span className="font-medium text-black">{Number(bet.totalOdds).toFixed(2)}배</span>
                          </span>
                        </div>
                        <button className="px-2 py-1 text-xs border rounded text-blue-600 border-blue-300 hover:bg-blue-50" onClick={e => { e.stopPropagation(); toggleBet(bet.id); }}>{isOpen ? 'Collapse ▲' : 'Expand ▼'}</button>
                      </div>
                    </div>
                  )}
                  {/* 펼친 상태: 배팅금, 배당율, 예상수익 */}
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-800">상세 정보</span>
                        <button className="px-2 py-1 text-xs border rounded text-blue-600 border-blue-300 hover:bg-blue-50" onClick={e => { e.stopPropagation(); toggleBet(bet.id); }}>접기 ▲</button>
                      </div>
                                {/* 경기 정보 표시 */}
                                {Array.isArray(bet.selections) && (
                                  <div className="mb-3">
                                    <div className="text-sm font-medium text-gray-700 mb-2">🏟️ 경기 정보</div>
                                    <div className="space-y-2">
                                      {bet.selections.map((sel: any, idx: number) => {
                                        const isOverUnder = sel.market === 'Over/Under' || sel.market === 'totals';
                                        const isHandicap = sel.market === 'Handicap' || sel.market === 'spreads';
                                        
                                        return (
                                          <div key={idx} className="border-l-2 border-gray-200 pl-3 py-1">
                                            <div className="flex items-center justify-between text-sm">
                                              <div className="flex items-center">
                                                <div className="flex flex-col">
                                                  <span className="font-medium text-gray-800">
                                                    {isOverUnder ? (
                                                      normalizeOverUnderOption(sel.option || sel.team, sel.desc, sel.point)
                                                    ) : isHandicap ? (
                                                      sel.team
                                                    ) : (
                                                      sel.team || sel.selection
                                                    )}
                                                  </span>
                                                  {/* 경기명 표시 */}
                                                  <span className="text-xs text-gray-500">
                                                    {sel.desc || `${sel.team} Game`}
                                                  </span>
                                                  {/* 경기 시간 표시 */}
                                                  {sel.commence_time && (
                                                    <span className="text-xs text-blue-600 font-medium">
                                                      🕐 {new Date(sel.commence_time).toLocaleString('ko-KR', { 
                                                        month: '2-digit', 
                                                        day: '2-digit', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                      })}
                                                    </span>
                                                  )}
                                                  <span className="text-xs text-gray-400">
                                                    {sel.market || '승패'}
                                                  </span>
                                                </div>
                                                <span className="ml-2 text-gray-600">@ {Number(sel.odds).toFixed(2)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* 경기 결과 표시 (적중/미적중일 때) */}
                                {['won', 'lost'].includes(bet.status) && Array.isArray(bet.selections) && (
                                  <div className="mb-3">
                                    <div className="text-sm font-medium text-gray-700 mb-2">📊 Result</div>
                                    <div className="space-y-2">
                                      {bet.selections.map((sel: any, idx: number) => {
                            // 디버깅용 로그
                            console.log(`[배팅내역] 선택 ${idx}:`, {
                              result: sel.result,
                              market: sel.market,
                              team: sel.team,
                              option: sel.option,
                              desc: sel.desc,
                              gameResult: sel.gameResult,
                              betStatus: bet.status
                            });
                            
                            // 개별 선택의 실제 결과 계산
                            let actualResult = sel.result;
                            
                            // sel.result가 없거나 pending인 경우, 경기 결과를 직접 계산
                            if (!actualResult || actualResult === 'pending') {
                              if (sel.gameResult && sel.gameResult.score) {
                                // Over/Under 베팅의 경우 점수 계산
                                if (sel.market === 'Over/Under' || sel.market === 'totals') {
                                  const scores = sel.gameResult.score;
                                  let totalScore = 0;
                                  
                                  if (Array.isArray(scores)) {
                                    totalScore = scores.reduce((sum, score) => {
                                      const scoreValue = typeof score === 'string' ? parseInt(score) : (score?.score ? parseInt(score.score) : 0);
                                      return sum + (isNaN(scoreValue) ? 0 : scoreValue);
                                    }, 0);
                                  } else if (sel.gameResult.homeScore !== undefined && sel.gameResult.awayScore !== undefined) {
                                    totalScore = parseInt(sel.gameResult.homeScore) + parseInt(sel.gameResult.awayScore);
                                  }
                                  
                                  const betPoint = parseFloat(sel.point) || 0;
                                  const isOver = (sel.option || sel.team || '').toLowerCase().includes('over');
                                  
                                  if (isOver) {
                                    actualResult = totalScore > betPoint ? 'won' : 'lost';
                                  } else {
                                    actualResult = totalScore < betPoint ? 'won' : 'lost';
                                  }
                                  
                                  console.log(`[Over/Under 계산] ${sel.desc}: 총점 ${totalScore}, 기준 ${betPoint}, ${isOver ? 'Over' : 'Under'} 베팅 → ${actualResult}`);
                                }
                                // Win/Loss 베팅의 경우 (추후 필요시 구현)
                                else if (sel.market === 'Win/Loss' || sel.market === 'h2h') {
                                  // 승부 결과 계산 로직 (현재는 기존 result 사용)
                                  actualResult = sel.result;
                                }
                                // Handicap 베팅의 경우 (추후 필요시 구현)
                                else if (sel.market === 'Handicap' || sel.market === 'spreads') {
                                  // 핸디캡 결과 계산 로직 (현재는 기존 result 사용)
                                  actualResult = sel.result;
                                }
                              }
                              
                              // 여전히 결과가 없으면 전체 베팅 상태 기준으로 추정 (단일 베팅인 경우)
                              if (!actualResult || actualResult === 'pending') {
                                if (bet.status === 'won') actualResult = 'won';
                                else if (bet.status === 'lost') actualResult = 'lost';
                              }
                            }
                            
                                                          let icon = '⏳', color = 'text-gray-400', label = 'Pending';
                                                          if (actualResult === 'won') { icon = '✔️'; color = 'text-green-600'; label = 'Won'; }
                              else if (actualResult === 'lost') { icon = '❌'; color = 'text-red-500'; label = 'Lost'; }
                            else if (actualResult === 'cancelled') { icon = '🚫'; color = 'text-orange-500'; label = 'Game Cancelled'; }
else if (actualResult === 'draw') { icon = '⚖️'; color = 'text-blue-500'; label = 'Draw'; }
                            
                            const isOverUnder = sel.market === 'Over/Under' || sel.market === 'totals';
                            const isHandicap = sel.market === 'Handicap' || sel.market === 'spreads';
                            const ouType = normalizeOverUnderOption(sel.option || sel.team, sel.desc, sel.point);
                            
                            return (
                              <div key={idx} className="border-l-2 border-gray-200 pl-3 py-1">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center">
                                    <span className={`mr-2 ${color}`}>{icon}</span>
                                    <div className="flex flex-col">
                                      <span className={`font-medium ${color}`}>
                                        {isOverUnder ? (
                                          ouType
                                        ) : isHandicap ? (
                                          sel.team
                                        ) : actualResult === 'draw' ? (
                                          `${sel.desc ? sel.desc.replace(' vs ', ' vs ') : sel.team} (Draw)`
                                        ) : (
                                          (() => {
                                            // desc에서 홈팀과 원정팀 파악
                                            if (sel.desc) {
                                              const teams = sel.desc.split(' vs ');
                                              const homeTeam = teams[0];
                                              const awayTeam = teams[1];
                                              
                                              // 베팅한 팀이 홈팀인지 원정팀인지 확인
                                              if (sel.team === homeTeam) {
                                                return `${sel.team} Win`;
                                              } else if (sel.team === awayTeam) {
                                                return `${sel.team} Win`;
                                              } else {
                                                // 베팅한 팀이 홈/원정과 다르면 패 베팅일 가능성
                                                if (sel.team.includes(homeTeam) || homeTeam.includes(sel.team)) {
                                                  return `${homeTeam} Lose`;
                                                } else if (sel.team.includes(awayTeam) || awayTeam.includes(sel.team)) {
                                                  return `${awayTeam} Lose`;
                                                }
                                              }
                                            }
                                            return `${sel.team} Win`;
                                          })()
                                        )}
                                      </span>
                                    </div>
                                    <span className="ml-2 text-gray-600">@ {Number(sel.odds).toFixed(2)}</span>
                                  </div>
                                  <span className={`text-xs font-medium ${color}`}>{label}</span>
                                </div>
                                {/* 경기 결과 스코어 표시 - 조건 완화 */}
                                {['won', 'lost'].includes(actualResult) && sel.gameResult && (
                                  <div className="text-xs text-blue-600 mt-1 ml-6">
                                    {sel.gameResult.score && Array.isArray(sel.gameResult.score) ? (
                                      `Result: ${sel.gameResult.homeTeam || 'Home'} ${
                                        typeof sel.gameResult.score[0] === 'string' 
                                          ? sel.gameResult.score[0] 
                                          : sel.gameResult.score[0]?.score ?? '-'
                                                                              } : ${sel.gameResult.awayTeam || 'Away'} ${
                                        typeof sel.gameResult.score[1] === 'string' 
                                          ? sel.gameResult.score[1] 
                                          : sel.gameResult.score[1]?.score ?? '-'
                                      }`
                                    ) : sel.gameResult.homeScore !== undefined && sel.gameResult.awayScore !== undefined ? (
                                      `Result: ${sel.gameResult.homeTeam || 'Home'} ${sel.gameResult.homeScore} : ${sel.gameResult.awayTeam || 'Away'} ${sel.gameResult.awayScore}`
                                    ) : (
                                                                              `Game Result: ${JSON.stringify(sel.gameResult)}`
                                    )}
                                  </div>
                                )}
                                {/* Over/Under 추가 정보 */}
                                {isOverUnder && sel.point && (
                                  <div className="text-xs text-gray-400 mt-1 ml-6">
                                    Point: {sel.point}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>배팅금액:</span>
                        <b className="text-black">{Math.floor(Number(bet.stake)).toLocaleString()}원</b>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>배당율:</span>
                        <b className="text-black">{Number(bet.totalOdds).toFixed(2)}배</b>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>예상수익:</span>
                        <b className="text-black">{Math.floor(Number(bet.stake) * Number(bet.totalOdds)).toLocaleString()}원</b>
                      </div>
                      <div className="flex items-center justify-end pt-1">
                        {/* 배팅 취소 버튼 - 정상 조건으로 복원 */}
                        {bet.status === 'pending' && Array.isArray(bet.selections) && bet.selections.every((sel: any) => sel.result === 'pending' || !sel.result) && (
                          <button
                            className="px-2 py-0.5 text-xs border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors ml-1"
                            onClick={async () => {
                              console.log('[배팅취소] 버튼 클릭됨:', bet.id);
                                                          if (!window.confirm('Are you sure you want to cancel this bet?')) {
                              console.log('[배팅취소] 사용자가 취소함');
                                return;
                              }
                              
                              // API URL 동적 설정
                              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                                            (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                                             ? 'buildApiUrl' 
                                             : 'https://likebetfair.onrender.com');
                              
                              console.log('[배팅취소] API 요청 시작:', `${apiUrl}/api/bet/${bet.id}/cancel`);
                              console.log('[배팅취소] 토큰 존재:', !!token);
                              
                              const res = await fetch(`${apiUrl}/api/bet/${bet.id}/cancel`, {
                                method: 'POST',
                                headers: { 
                                  'x-auth-token': token || '',
                                  'Content-Type': 'application/json'
                                },
                              });
                              
                              console.log('[배팅취소] 응답 상태:', res.status, res.statusText);
                              
                              if (res.ok) {
                                const data = await res.json();
                                console.log('[배팅취소] 성공 응답:', data);
                                alert('Bet has been cancelled.');
                                if (data.balance !== undefined) setBalance(Number(data.balance));
                                setBets((prev: any[]) => prev.map(b => b.id === bet.id ? { ...b, status: 'cancelled' } : b));
                                window.dispatchEvent(new Event('betCancelled'));
                                forceRefreshBalance(); // 잔액 새로고침
                              } else {
                                const errorData = await res.json().catch(() => ({}));
                                console.error('[배팅취소] 오류 응답:', errorData);
                                alert(errorData.message || 'Failed to cancel bet.');
                              }
                            }}
                            disabled={bet.status === 'cancelled' || bet.selections.some((sel: any) => {
                              if (!sel.commence_time) return false;
                              // 경기 시작 10분 전까지만 취소 가능
                              const gameTime = new Date(sel.commence_time);
                              return gameTime <= new Date(Date.now() + 10 * 60 * 1000);
                            })}
                          >
                            Cancel Bet
                          </button>
                        )}
                      </div>
                    </div>
                    {bet.status === 'pending' && Array.isArray(bet.selections) && !bet.selections.every((sel: any) => sel.result === 'pending' || !sel.result) && (
                      <div className="mt-2 text-xs text-gray-400">Some games have already started and cannot be cancelled.</div>
                    )}
                    </div>
                  )}
                </div>
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
          <label htmlFor="hidePastResults" className="text-xs text-gray-600 select-none">Hide Past Results</label>
        </div>
      </div>
    </div>
  );
}

export default function BetslipSidebar({ 
  activeTab = 'betslip', 
  onTabChange, 
  onBettingAreaSelect 
}: BetslipSidebarProps) {
  const { isLoggedIn, balance, forceRefreshBalance } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (newTab: 'betslip' | 'mybets') => {
    if (onTabChange) {
      onTabChange(newTab);
    }
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
        <span className="text-gray-500 text-base font-semibold">Please login to place bets</span>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">BET</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-600">Balance: {balance !== null ? Math.round(Number(balance)).toLocaleString() : '-'} KRW</span>
          <button
            onClick={forceRefreshBalance}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Sync Balance"
          >
            🔄
          </button>
        </div>
      </div>
      <div className="flex space-x-2 mb-2">
        <button
          className={`flex-1 py-1 rounded ${activeTab === 'betslip' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => handleTabChange('betslip')}
        >
          Bet Slip
        </button>
        <button
          className={`flex-1 py-1 rounded ${activeTab === 'mybets' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => handleTabChange('mybets')}
        >
          My Bets
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'betslip' ? <BetSelectionPanel /> : <MyBetsPanel key={refreshKey} />}
      </div>
    </aside>
  );
} 