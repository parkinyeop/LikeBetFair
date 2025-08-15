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
  amount: number;
  selection: string;
  homeTeam: string;
  awayTeam: string;
  gameId: string;
  commenceTime: string;
  sportKey: string;
  // 🆕 부분 매칭 필드들 추가
  originalAmount?: number;
  remainingAmount?: number;
  filledAmount?: number;
  partiallyFilled?: boolean;
  displayAmount?: number; // 화면에 표시할 금액
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
  sidebarActiveTab: 'order' | 'history';
  setSidebarActiveTab: (tab: 'order' | 'history') => void;
  getRequiredMatchAmount: () => number;
  // 🆕 부분 매칭 관련 함수들
  getMaxMatchAmount: () => number;
  getAvailableMatchAmount: () => number;
  formatPartialMatchInfo: (order: MatchTargetOrder) => string;
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
  const [sidebarActiveTab, setSidebarActiveTab] = useState<'order' | 'history'>('order');

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
    console.log('🆕 activateMatchMode 호출됨:', targetOrder);
    setIsMatchMode(true);
    setMatchTargetOrder(targetOrder);
    
    // 사이드바 탭을 주문하기로 전환
    console.log('🆕 setSidebarActiveTab("order") 호출');
    setSidebarActiveTab('order');
    
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

  // 🆕 매칭에 필요한 정확한 금액 계산 (부분 매칭 지원)
  const getRequiredMatchAmount = () => {
    if (!matchTargetOrder) return 0;
    
    // displayAmount 또는 remainingAmount를 우선 사용
    const availableAmount = matchTargetOrder.displayAmount || 
                           matchTargetOrder.remainingAmount || 
                           matchTargetOrder.amount;
    
    if (matchTargetOrder.type === 'back') {
      // Back 주문에 Lay로 매칭: amount × (odds - 1)
      return availableAmount * (matchTargetOrder.odds - 1);
    } else {
      // Lay 주문에 Back으로 매칭: amount 그대로
      return availableAmount;
    }
  };

  // 🆕 최대 매칭 가능 금액 (남은 금액 기준)
  const getMaxMatchAmount = () => {
    if (!matchTargetOrder) return 0;
    return matchTargetOrder.displayAmount || 
           matchTargetOrder.remainingAmount || 
           matchTargetOrder.amount;
  };

  // 🆕 실제 매칭 가능한 금액 (리스크 기준)
  const getAvailableMatchAmount = () => {
    if (!matchTargetOrder) return 0;
    
    const maxAmount = getMaxMatchAmount();
    
    if (matchTargetOrder.type === 'back') {
      // Back 주문에 Lay로 매칭할 때 필요한 리스크
      return maxAmount * (matchTargetOrder.odds - 1);
    } else {
      // Lay 주문에 Back으로 매칭할 때 필요한 리스크
      return maxAmount;
    }
  };

  // 🆕 부분 매칭 정보 포맷팅
  const formatPartialMatchInfo = (order: MatchTargetOrder) => {
    if (!order.partiallyFilled && !order.filledAmount) {
      return `${order.amount.toLocaleString()}원`;
    }
    
    const original = order.originalAmount || order.amount;
    const filled = order.filledAmount || 0;
    const remaining = order.remainingAmount || order.amount;
    
    if (filled > 0) {
      return `${remaining.toLocaleString()}원 (${original.toLocaleString()}원 중 ${filled.toLocaleString()}원 체결)`;
    }
    
    return `${remaining.toLocaleString()}원`;
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
    sidebarActiveTab,
    setSidebarActiveTab,
    getRequiredMatchAmount,
    // 🆕 부분 매칭 관련 함수들 추가
    getMaxMatchAmount,
    getAvailableMatchAmount,
    formatPartialMatchInfo,
  };

  return (
    <ExchangeContext.Provider value={value}>
      {children}
    </ExchangeContext.Provider>
  );
}; 