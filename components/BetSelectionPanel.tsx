import React, { useState } from 'react';
import { useBetStore } from '../stores/useBetStore';
import { useAuth } from '../contexts/AuthContext';
import { normalizeOption } from '../server/normalizeUtils';

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
        <h3 className="text-lg font-bold mb-4 text-red-600">⚠️ 배당율 변경 알림</h3>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-3">{message}</p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <p className="text-sm font-medium text-gray-700">경기: {selection}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-red-600">기존: {oldOdds}</span>
              <span className="text-blue-600 font-bold">→ 현재: {newOdds}</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            현재 배당율로 베팅을 진행하시겠습니까?
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            새 배당율로 베팅
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
  
  // 배당율 변경 모달 상태
  const [oddsChangeModal, setOddsChangeModal] = useState<{
    isOpen: boolean;
    data?: any;
  }>({ isOpen: false });

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const expectedReturn = stake * totalOdds;

  // 베팅 가능 시간 체크 (10분 전 마감)
  const now = new Date();
  const marginMinutes = 10;
  const hasPastGame = selections.some(sel => !sel.commence_time || new Date(sel.commence_time) <= new Date(now.getTime() + marginMinutes * 60000));

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, ''); // 콤마 제거 후 숫자 변환
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setStake(value === '' ? 0 : parseFloat(value));
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
        setMessage(responseData.message || '베팅 저장 실패');
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
        setMessage(data.message || '베팅 저장 실패');
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
        <h2 className="text-lg font-bold">베팅 선택</h2>
        <button className="text-sm text-red-500" onClick={clearAll}>전체 삭제</button>
      </div>
      <ul className="space-y-2 mb-4">
        {selections.map((sel) => (
          <li key={sel.team} className="flex justify-between items-center">
            <div>
              {((sel as any)?.market === '언더/오버' || (sel as any)?.market === 'totals') ? (
                <p className="text-sm font-medium">{normalizeOption((sel as any)?.option || sel.team)} {(sel as any)?.point !== undefined ? `(${(sel as any).point})` : ''}</p>
              ) : (
                <p className="text-sm font-medium">{sel.team}</p>
              )}
              <p className="text-xs text-gray-500">{sel.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{sel.odds.toFixed(2)}</span>
              <button onClick={() => removeSelection(sel.team)} className="text-red-500 text-xs">X</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mb-3">
        <label className="text-sm">배팅 금액</label>
        <input
          type="text"
          value={stakeDisplay}
          onChange={handleStakeChange}
          placeholder="0"
          className="w-full mt-1 border rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="text-sm">
        <p className="mb-1">총 배당률: <span className="font-semibold">{totalOdds.toFixed(2)}</span></p>
        <p className="mb-1">예상 수익: <span className="font-semibold">{Math.floor(expectedReturn).toLocaleString()} ₩</span></p>
      </div>
      <button
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        disabled={selections.length === 0 || stake <= 0 || loading || hasPastGame}
        onClick={handleBet}
      >
        {loading ? '베팅 중...' : '베팅하기'}
      </button>
      {hasPastGame && (
        <div className="mt-2 text-center text-sm text-red-600">이미 시작된 경기가 포함되어 있어 베팅이 불가합니다.</div>
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