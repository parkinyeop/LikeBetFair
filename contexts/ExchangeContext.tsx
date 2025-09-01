import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

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

// 🆕 멀티배팅 선택 인터페이스
export interface MultiBetSelection {
  orderId: number;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  team: string; // 🆕 team 필드 추가
  side: 'back' | 'lay';
  odds: number;
  amount: number;
  commenceTime: string;
  sportKey: string;
  desc?: string; // 🆕 desc 필드 추가
  option?: string; // 🆕 option 필드 추가 (Over/Under용)
  point?: string; // 🆕 point 필드 추가 (Over/Under용)
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
  
  // 🆕 멀티배팅 관련 상태들
  multiBetSelections: MultiBetSelection[];
  setMultiBetSelections: React.Dispatch<React.SetStateAction<MultiBetSelection[]>>;
  multiBetStake: number;
  multiBetTotalOdds: number;
  multiBetPotentialWinnings: number;
  
  // 🆕 멀티배팅 액션들
  addMultiBetSelection: (selection: MultiBetSelection) => void;
  removeMultiBetSelection: (gameId: string, market: string, team: string) => void;
  isMultiBetSelected: (gameId: string, market: string, team: string) => boolean;
  updateMultiBetStake: (stake: number) => void;
  clearMultiBet: () => void;
  createMultiBetOrder: () => Promise<{ success: boolean; data?: any; error?: string }>;
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
  const { token } = useAuth(); // 🆕 인증 토큰 가져오기
  const [selectedBet, setSelectedBet] = useState<SelectedBet | null>(null);
  const [isMatchMode, setIsMatchMode] = useState(false);
  const [matchTargetOrder, setMatchTargetOrder] = useState<MatchTargetOrder | null>(null);
  const [sidebarActiveTab, setSidebarActiveTab] = useState<'order' | 'history'>('order');

  // 🆕 멀티배팅 관련 상태들
  const [multiBetSelections, setMultiBetSelections] = useState<MultiBetSelection[]>([]);
  const [multiBetStake, setMultiBetStake] = useState<number>(0);
  const [multiBetTotalOdds, setMultiBetTotalOdds] = useState<number>(1);
  const [multiBetPotentialWinnings, setMultiBetPotentialWinnings] = useState<number>(0);

  // selectedBet 상태 변경 로그
  React.useEffect(() => {
    console.log('ExchangeContext selectedBet state changed to:', selectedBet);
  }, [selectedBet]);

  // 🆕 멀티배팅 총 배당률과 예상 수익 계산
  React.useEffect(() => {
    if (multiBetSelections.length === 0) {
      setMultiBetTotalOdds(1);
      setMultiBetPotentialWinnings(0);
      return;
    }

    const totalOdds = multiBetSelections.reduce((acc, selection) => acc * selection.odds, 1);
    setMultiBetTotalOdds(totalOdds);
    
    if (multiBetStake > 0) {
      const potentialWinnings = Math.round(multiBetStake * totalOdds - multiBetStake);
      setMultiBetPotentialWinnings(potentialWinnings);
    }
  }, [multiBetSelections, multiBetStake]);

  const setSelectedBetWithLog = (bet: SelectedBet | null) => {
    console.log('ExchangeContext setSelectedBet called with:', bet);
    setSelectedBet(bet);
  };

  // 🆕 멀티배팅 선택 추가
  const addMultiBetSelection = (selection: MultiBetSelection) => {
    setMultiBetSelections(prev => {
      // 이미 존재하는지 확인 (동일한 경기, 마켓, 선택)
      const exists = prev.some(s => 
        s.gameId === selection.gameId && 
        s.market === selection.market && 
        s.selection === selection.selection
      );
      
      if (exists) {
        return prev; // 이미 존재하면 추가하지 않음
      }
      
      return [...prev, selection];
    });
  };

  // 🆕 멀티배팅 선택 제거
  const removeMultiBetSelection = (gameId: string, market: string, team: string) => {
    setMultiBetSelections(prev => 
      prev.filter(s => !(s.gameId === gameId && s.market === market && s.team === team))
    );
  };

  // 🆕 멀티배팅 선택 상태 확인
  const isMultiBetSelected = (gameId: string, market: string, team: string) => {
    return multiBetSelections.some(
      (s) => s.gameId === gameId && s.market === market && s.team === team
    );
  };

  // 🆕 멀티배팅 베팅 금액 업데이트
  const updateMultiBetStake = (stake: number) => {
    setMultiBetStake(stake);
  };

  // 🆕 멀티배팅 초기화
  const clearMultiBet = () => {
    setMultiBetSelections([]);
    setMultiBetStake(0);
    setMultiBetTotalOdds(1);
    setMultiBetPotentialWinnings(0);
  };

  // 🆕 멀티배팅 주문 생성
  const createMultiBetOrder = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      if (multiBetSelections.length === 0) {
        return { success: false, error: '선택된 경기가 없습니다.' };
      }

      if (multiBetStake <= 0) {
        return { success: false, error: '베팅 금액을 입력해주세요.' };
      }

      // 🆕 인증 토큰이 없으면 오류 반환
      if (!token) {
        return { success: false, error: '인증 토큰이 없습니다. 다시 로그인해주세요.' };
      }

      const response = await fetch('http://localhost:5050/api/exchange/multibet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token, // 🆕 인증 토큰 추가
        },
        body: JSON.stringify({
          selections: multiBetSelections,
          stake: multiBetStake,
          totalOdds: multiBetTotalOdds,
          description: `멀티배팅 (${multiBetSelections.length}개 경기)`
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 성공 시 멀티배팅 초기화
        clearMultiBet();
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.message || '멀티배팅 주문 생성에 실패했습니다.' };
      }
    } catch (error) {
      console.error('멀티배팅 주문 생성 오류:', error);
      return { success: false, error: '서버 오류가 발생했습니다.' };
    }
  };

  // 매칭 모드 활성화
  const activateMatchMode = (targetOrder: MatchTargetOrder) => {
    setIsMatchMode(true);
    setMatchTargetOrder(targetOrder);
    
    // 사이드바 탭을 주문하기로 전환
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
    // 🆕 멀티배팅 관련 상태와 함수들 추가
    multiBetSelections,
    setMultiBetSelections,
    multiBetStake,
    multiBetTotalOdds,
    multiBetPotentialWinnings,
    addMultiBetSelection,
    removeMultiBetSelection,
    isMultiBetSelected,
    updateMultiBetStake,
    clearMultiBet,
    createMultiBetOrder,
  };

  return (
    <ExchangeContext.Provider value={value}>
      {children}
    </ExchangeContext.Provider>
  );
}; 