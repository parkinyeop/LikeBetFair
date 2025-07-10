// 게임 시간 표시 전용 컴포넌트 (성능 최적화)
import React, { memo, useMemo } from 'react';
import { 
  formatTimeWithTimezone, 
  getBettingStatus, 
  getGameTimeStatus,
  getClientTimezoneInfo,
  getGameTimeDisplay
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
    const gameTimeDisplay = getGameTimeDisplay(time);
    const clientTimezoneInfo = getClientTimezoneInfo();
    
    return {
      bettingStatus,
      gameTimeDisplay,
      clientTimezoneInfo
    };
  }, [time, showTimezone]);

  const { bettingStatus, gameTimeDisplay } = timeInfo;

  // 시간 색상 결정
  const getTimeColor = () => {
    if (gameTimeDisplay.urgent) {
      return 'text-red-600 font-semibold'; // 베팅 마감 임박
    }
    
    switch (gameTimeDisplay.status) {
      case 'live':
        return 'text-red-600 font-semibold';
      case 'finished':
        return 'text-gray-500';
      case 'soon':
        return 'text-orange-600 font-semibold';
      case 'upcoming':
      default:
        return 'text-blue-600';
    }
  };

  // 상태 배지 결정
  const getStatusBadge = () => {
    if (gameTimeDisplay.status === 'live') {
      return <span className="ml-2 text-green-600 font-semibold">🔴 LIVE</span>;
    }
    if (gameTimeDisplay.status === 'finished') {
      return <span className="ml-2 text-gray-500 font-medium">종료</span>;
    }
    if (gameTimeDisplay.urgent) {
      return <span className="ml-2 text-red-600 font-semibold">⚠️ 마감임박</span>;
    }
    return null;
  };

  return (
    <div className="text-sm">
      <div className={getTimeColor()}>
        {gameTimeDisplay.primary}
      </div>
      {showStatus && gameTimeDisplay.secondary && (
        <div className="text-xs text-gray-600 mt-1">
          {gameTimeDisplay.secondary}
        </div>
      )}
      {showStatus && getStatusBadge()}
    </div>
  );
});

GameTimeDisplay.displayName = 'GameTimeDisplay';

export default GameTimeDisplay; 