// 게임 시간 표시 전용 컴포넌트 (성능 최적화)
import React, { memo, useMemo } from 'react';
import { 
  formatTimeWithTimezone, 
  getBettingStatus, 
  getGameTimeStatus,
  getClientTimezoneInfo
} from '../utils/timeUtils';

interface GameTimeDisplayProps {
  time: string;
  showStatus?: boolean;
  showTimezone?: boolean;
  format?: 'full' | 'date_time' | 'date_only' | 'time_only' | 'relative';
}

const GameTimeDisplay = memo(({ 
  time, 
  showStatus = true, 
  showTimezone = false,
  format = 'date_time'
}: GameTimeDisplayProps) => {
  
  // 시간 관련 상태 계산 (메모화)
  const timeInfo = useMemo(() => {
    const bettingStatus = getBettingStatus(time);
    const gameTimeStatus = getGameTimeStatus(time);
    const clientTimezoneInfo = getClientTimezoneInfo();
    
    const displayTime = formatTimeWithTimezone(time, {
      format,
      showRelative: true,
      showTimezone: showTimezone || !clientTimezoneInfo.isKST
    });
    
    return {
      bettingStatus,
      gameTimeStatus,
      displayTime,
      clientTimezoneInfo
    };
  }, [time, format, showTimezone]);

  const { bettingStatus, gameTimeStatus, displayTime } = timeInfo;

  // 시간 색상 결정
  const getTimeColor = () => {
    switch (gameTimeStatus.status) {
      case 'live':
        return 'text-green-600 font-semibold';
      case 'finished':
        return 'text-gray-500';
      case 'upcoming':
      default:
        return bettingStatus.status === 'closing_soon' ? 'text-orange-600' : 'text-blue-600';
    }
  };

  return (
    <div className="text-sm">
      <span className={getTimeColor()}>
        {displayTime}
      </span>
      {showStatus && bettingStatus.status === 'closing_soon' && (
        <span className="ml-2 text-orange-600 font-semibold">
          ({bettingStatus.message})
        </span>
      )}
      {showStatus && gameTimeStatus.status === 'live' && (
        <span className="ml-2 text-green-600 font-semibold">
          🔴 LIVE
        </span>
      )}
    </div>
  );
});

GameTimeDisplay.displayName = 'GameTimeDisplay';

export default GameTimeDisplay; 