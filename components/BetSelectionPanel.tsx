import React, { useState, useEffect } from 'react';
import { useBetStore } from '../stores/useBetStore';
import { useAuth } from '../contexts/AuthContext';
import { normalizeOption, normalizeOverUnderOption } from '../server/normalizeUtils';

// 배당율 변경 확인 모달
const OddsChangeModal = ({ 
  isOpen, 
  oldOdds, 
  newOdds, 
  selection, 
  message,
  onAccept, 
  onReject 
}: {
  isOpen: boolean;
  oldOdds: number;
  newOdds: number;
  selection: string;
  message: string;
  onAccept: () => void;
  onReject: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4 text-red-600">⚠️ Odds Change Alert</h3>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-3">{message}</p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <p className="text-sm font-medium text-gray-700">Game: {selection}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-red-600">Previous: {oldOdds}</span>
              <span className="text-blue-600 font-bold">→ Current: {newOdds}</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            Would you like to proceed with the current odds?
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Bet with New Odds
          </button>
        </div>
      </div>
    </div>
  );
};

const BetSelectionPanel = () => {
  const { selections, stake, setStake, removeSelection, clearAll, updateSelection } = useBetStore();
  const { isLoggedIn, setBalance, token, refreshBalance, forceRefreshBalance } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // selections 변경 시 메시지 초기화
  useEffect(() => {
    if (message) {
      setMessage('');
    }
  }, [selections]);
  
  // 배당율 변경 모달 상태
  const [oddsChangeModal, setOddsChangeModal] = useState<{
    isOpen: boolean;
    data?: any;
  }>({ isOpen: false });

  const totalOdds = Math.round(selections.reduce((acc, curr) => acc * curr.odds, 1) * 1000) / 1000; // 소수점 3자리로 반올림
  const expectedReturn = Math.round(stake * totalOdds * 100) / 100; // 소수점 2자리로 반올림

  // 베팅 가능 시간 체크 (10분 전 마감)
  const now = new Date();
  const marginMinutes = 10;
  const hasPastGame = selections.some(sel => !sel.commence_time || new Date(sel.commence_time) <= new Date(now.getTime() + marginMinutes * 60000));

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, ''); // 콤마 제거 후 숫자 변환
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setStake(value === '' ? 0 : parseFloat(value));
      // 베팅금 변경 시 메시지 초기화
      if (message) {
        setMessage('');
      }
    }
  };

  // 입력란에 표시할 값 (천 단위 콤마)
  const stakeDisplay = stake === 0 ? '' : stake.toLocaleString();

  // 배당율 변경 수락
  const handleAcceptOddsChange = async () => {
    const { data } = oddsChangeModal;
    if (!data) return;

    // 선택사항에서 배당율 업데이트
    updateSelection(data.selectionIndex, { odds: data.newOdds });
    
    setOddsChangeModal({ isOpen: false });
    
    // odds 데이터 새로고침 이벤트 발생
    window.dispatchEvent(new Event('refreshOdds'));
    
    // 업데이트된 선택사항으로 새로운 totalOdds 계산
    const updatedSelections = [...selections];
    updatedSelections[data.selectionIndex].odds = data.newOdds;
    const newTotalOdds = updatedSelections.reduce((acc, curr) => acc * curr.odds, 1);
    
    // 즉시 새로운 배당율로 베팅 요청
    try {
      // API URL 결정
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                    (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                     ? 'http://localhost:5050' 
                     : 'https://likebetfair.onrender.com');
      
      console.log('[BetSelectionPanel] (배당변경) 베팅 요청 body:', {
        selections: updatedSelections,
        stake,
        totalOdds: newTotalOdds
      });

      const res = await fetch(`${apiUrl}/api/bet/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          selections: updatedSelections,
          stake,
          totalOdds: newTotalOdds,
        }),
      });
      
      const responseData = await res.json();
      
      if (res.ok) {
        setMessage('베팅이 성공적으로 저장되었습니다!');
        // 베팅 후 잔액 업데이트 (응답에 잔액이 있으면 우선 사용)
        if (responseData.balance !== undefined) {
          console.log('[BetSelectionPanel] 응답에서 잔액 업데이트:', responseData.balance);
          setBalance(Number(responseData.balance));
        } else {
          console.log('[BetSelectionPanel] 응답에 잔액 없음, 강제 새로고침 시도');
          await forceRefreshBalance();
        }
        clearAll();
        // 배팅 완료 이벤트 발생
        window.dispatchEvent(new Event('betPlaced'));
        setLoading(false);
      } else {
                  setMessage(responseData.message || 'Betting save failed');
        setLoading(false);
      }
    } catch (err) {
      setMessage('서버 오류');
      setLoading(false);
    }
  };

  // 배당율 변경 거부
  const handleRejectOddsChange = () => {
    setOddsChangeModal({ isOpen: false });
    setMessage('베팅이 취소되었습니다. 배당율을 확인 후 다시 시도해주세요.');
    setLoading(false);
  };

  // 실제 베팅 제출
  const submitBet = async () => {
    try {
      // API URL 결정
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                    (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                     ? 'http://localhost:5050' 
                     : 'https://likebetfair.onrender.com');
      
      console.log('[BetSelectionPanel] 베팅 요청 body:', {
        selections,
        stake,
        totalOdds: selections.reduce((acc, curr) => acc * curr.odds, 1)
      });
      
      // 더 자세한 로깅 추가
      console.log('[BetSelectionPanel] 상세 데이터 분석:');
      console.log('- selections 개수:', selections.length);
      console.log('- selections 내용:', JSON.stringify(selections, null, 2));
      console.log('- stake 값:', stake);
      console.log('- totalOdds 계산:', selections.reduce((acc, curr) => acc * curr.odds, 1));

      const res = await fetch(`${apiUrl}/api/bet/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          selections,
          stake,
          totalOdds,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage('베팅이 성공적으로 저장되었습니다!');
        // 베팅 후 잔액 업데이트 (응답에 잔액이 있으면 우선 사용)
        if (data.balance !== undefined) {
          console.log('[BetSelectionPanel] 응답에서 잔액 업데이트:', data.balance);
          setBalance(Number(data.balance));
        } else {
          console.log('[BetSelectionPanel] 응답에 잔액 없음, 강제 새로고침 시도');
          await forceRefreshBalance();
        }
        clearAll();
        // 배팅 완료 이벤트 발생
        window.dispatchEvent(new Event('betPlaced'));
        setLoading(false);
      } else {
        // 배당율 변경 케이스 처리
        if (res.status === 409 && data.code === 'ODDS_CHANGED') {
          // 변경된 선택사항의 인덱스 찾기
          const selectionIndex = selections.findIndex(sel => sel.desc === data.selection);
          
          setOddsChangeModal({
            isOpen: true,
            data: {
              ...data,
              selectionIndex
            }
          });
          return; // 로딩 상태 유지
        }
        
        // 기타 오류
        setMessage(data.message || 'Betting save failed');
        setLoading(false);
      }
    } catch (err) {
      setMessage('서버 오류');
      setLoading(false);
    }
  };

  const handleBet = async () => {
    if (!isLoggedIn) {
      setMessage('로그인 후 이용 가능합니다.');
      return;
    }
    setLoading(true);
    setMessage('');
    
    await submitBet();
  };

  return (
    <div className="w-full p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Bet Selection</h2>
        <button className="text-sm text-red-500" onClick={() => {
          clearAll();
          // 전체 삭제 시 메시지 초기화
          if (message) {
            setMessage('');
          }
        }}>Clear All</button>
      </div>
      <ul className="space-y-2 mb-4">
        {selections.map((sel) => (
          <li key={sel.team} className="flex justify-between items-center">
            <div>
                              {((sel as any)?.market === 'Over/Under' || (sel as any)?.market === 'totals') ? (
                <p className="text-sm font-medium">
                  {normalizeOverUnderOption((sel as any)?.option || sel.team, sel.desc, (sel as any)?.point)}
                </p>
              ) : ((sel as any)?.market === 'Handicap' || (sel as any)?.market === 'spreads') ? (
                <p className="text-sm font-medium">{sel.team}</p>
              ) : (
                <p className="text-sm font-medium">{sel.team}</p>
              )}
              <p className="text-xs text-gray-500">{sel.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{sel.odds.toFixed(2)}</span>
              <button onClick={() => {
                removeSelection(sel.team);
                // 선택 제거 시 메시지 초기화
                if (message) {
                  setMessage('');
                }
              }} className="text-red-500 text-xs">X</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mb-3">
        <label className="text-sm">Betting Amount</label>
        <input
          type="text"
          value={stakeDisplay}
          onChange={handleStakeChange}
          placeholder="0"
          className="w-full mt-1 border rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="text-sm">
        <p className="mb-1">Total Odds: <span className="font-semibold">{totalOdds.toFixed(2)}</span></p>
        <p className="mb-1">Estimated Profit: <span className="font-semibold">{Math.floor(expectedReturn).toLocaleString()} ₩</span></p>
      </div>
      <button
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        disabled={selections.length === 0 || stake <= 0 || loading || hasPastGame}
        onClick={handleBet}
      >
        {loading ? 'Betting...' : 'Place Bet'}
      </button>
      {hasPastGame && (
        <div className="mt-2 text-center text-sm text-red-600">Some games have already started and cannot be bet on.</div>
      )}
      {message && <div className="mt-2 text-center text-sm text-blue-600">{message}</div>}

      <OddsChangeModal
        isOpen={oddsChangeModal.isOpen}
        oldOdds={oddsChangeModal.data?.oldOdds || 0}
        newOdds={oddsChangeModal.data?.newOdds || 0}
        selection={oddsChangeModal.data?.selection || ''}
        message={oddsChangeModal.data?.message || ''}
        onAccept={handleAcceptOddsChange}
        onReject={handleRejectOddsChange}
      />
    </div>
  );
};

export default BetSelectionPanel; 