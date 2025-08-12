import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SelectedBet {
  team: string;
  price: number;
  type: 'back' | 'lay';
  gameId?: string;
  market?: string;
  line?: number;
  homeTeam?: string;
  awayTeam?: string;
  commenceTime?: string;
}

export interface MatchTargetOrder {
  id: string;
  type: 'back' | 'lay';
  odds: number;
  selection: string;
  homeTeam: string;
  awayTeam: string;
  gameId: string;
  commenceTime: string;
  sportKey: string;
}

interface ExchangeContextType {
  selectedBet: SelectedBet | null;
  setSelectedBet: (bet: SelectedBet | null) => void;
  isMatchMode: boolean;
  setIsMatchMode: (mode: boolean) => void;
  matchTargetOrder: MatchTargetOrder | null;
  setMatchTargetOrder: (order: MatchTargetOrder | null) => void;
  activateMatchMode: (targetOrder: MatchTargetOrder) => void;
  deactivateMatchMode: () => void;
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined);

export const useExchangeContext = () => {
  const context = useContext(ExchangeContext);
  if (context === undefined) {
    throw new Error('useExchangeContext must be used within an ExchangeProvider');
  }
  return context;
};

interface ExchangeProviderProps {
  children: ReactNode;
}

export const ExchangeProvider: React.FC<ExchangeProviderProps> = ({ children }) => {
  const [selectedBet, setSelectedBet] = useState<SelectedBet | null>(null);
  const [isMatchMode, setIsMatchMode] = useState(false);
  const [matchTargetOrder, setMatchTargetOrder] = useState<MatchTargetOrder | null>(null);

  // selectedBet 상태 변경 로그
  React.useEffect(() => {
    console.log('ExchangeContext selectedBet state changed to:', selectedBet);
  }, [selectedBet]);

  const setSelectedBetWithLog = (bet: SelectedBet | null) => {
    console.log('ExchangeContext setSelectedBet called with:', bet);
    setSelectedBet(bet);
  };

  // 매칭 모드 활성화
  const activateMatchMode = (targetOrder: MatchTargetOrder) => {
    setIsMatchMode(true);
    setMatchTargetOrder(targetOrder);
    
    // 매칭 정보로 selectedBet 자동 설정
    const matchType = targetOrder.type === 'back' ? 'lay' : 'back';
    const matchOdds = targetOrder.odds;
    
    setSelectedBet({
      team: targetOrder.selection,
      price: matchOdds,
      type: matchType,
      gameId: targetOrder.gameId,
      market: 'h2h',
      line: 0,
      homeTeam: targetOrder.homeTeam,
      awayTeam: targetOrder.awayTeam,
      commenceTime: targetOrder.commenceTime
    });
  };

  // 매칭 모드 비활성화
  const deactivateMatchMode = () => {
    setIsMatchMode(false);
    setMatchTargetOrder(null);
    setSelectedBet(null);
  };

  const value = {
    selectedBet,
    setSelectedBet: setSelectedBetWithLog,
    isMatchMode,
    setIsMatchMode,
    matchTargetOrder,
    setMatchTargetOrder,
    activateMatchMode,
    deactivateMatchMode,
  };

  return (
    <ExchangeContext.Provider value={value}>
      {children}
    </ExchangeContext.Provider>
  );
}; 