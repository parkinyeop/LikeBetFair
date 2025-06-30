// 베팅 버튼 전용 컴포넌트 (성능 최적화)
import React, { memo, useMemo, useCallback } from 'react';
import { getBettingStatus } from '../utils/timeUtils';

interface BettingButtonProps {
  team: string;
  odds: number | null;
  selected: boolean;
  commenceTime: string;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
}

const BettingButton = memo(({ 
  team, 
  odds, 
  selected, 
  commenceTime,
  onSelect,
  disabled = false,
  className = ""
}: BettingButtonProps) => {
  
  // 베팅 상태 계산 (메모화)
  const bettingInfo = useMemo(() => {
    const bettingStatus = getBettingStatus(commenceTime);
    return {
      isBettable: bettingStatus.isBettingAllowed,
      status: bettingStatus.status,
      message: bettingStatus.message
    };
  }, [commenceTime]);

  // 클릭 핸들러 (메모화)
  const handleClick = useCallback(() => {
    if (bettingInfo.isBettable && !disabled && odds) {
      onSelect();
    }
  }, [bettingInfo.isBettable, disabled, odds, onSelect]);

  // 버튼 스타일 계산 (메모화)
  const buttonStyle = useMemo(() => {
    const baseClasses = `flex-1 px-4 py-2 rounded text-white font-bold transition-colors border-2 border-gray-400 ${className}`;
    
    if (!bettingInfo.isBettable || disabled || !odds) {
      return `${baseClasses} opacity-50 cursor-not-allowed bg-gray-400`;
    }
    
    if (selected) {
      return `${baseClasses} bg-yellow-400 hover:bg-yellow-500`;
    }
    
    return `${baseClasses} bg-blue-600 hover:bg-blue-700`;
  }, [bettingInfo.isBettable, disabled, odds, selected, className]);

  // 상태 메시지 결정
  const getStatusMessage = () => {
    if (!bettingInfo.isBettable) {
      return bettingInfo.message;
    }
    if (!odds) {
      return '배당률 없음';
    }
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <button
      onClick={handleClick}
      className={buttonStyle}
      disabled={!bettingInfo.isBettable || disabled || !odds}
      aria-label={`${team} 베팅 - 배당률 ${odds || 'N/A'}`}
    >
      <div>{team}</div>
      {odds && (
        <div className="text-xs mt-1 opacity-90">
          배당: {odds}
        </div>
      )}
      {statusMessage && (
        <div className="text-xs mt-1 text-red-400 font-semibold">
          {statusMessage}
        </div>
      )}
    </button>
  );
});

BettingButton.displayName = 'BettingButton';

export default BettingButton; 