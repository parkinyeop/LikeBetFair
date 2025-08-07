import { create } from 'zustand';

// 선택된 베팅 항목의 타입
export type BetSelection = {
  team: string;
  odds: number;
  desc: string;
  commence_time?: string;
  market?: string;
  gameId?: string;
  point?: number;
  sport_key?: string; // 시즌 검증을 위한 스포츠 키 추가
};

interface BetState {
  selections: BetSelection[];
  stake: number;
  onTabChange?: (tab: 'betslip' | 'mybets') => void;
  addSelection: (bet: BetSelection) => void;
  removeSelection: (team: string) => void;
  toggleSelection: (bet: BetSelection) => void;
  updateSelection: (index: number, updates: Partial<BetSelection>) => void;
  setStake: (amount: number) => void;
  clearAll: () => void;
  setTabChangeCallback: (callback: (tab: 'betslip' | 'mybets') => void) => void;
}

export const useBetStore = create<BetState>((set, get) => ({
  selections: [],
  stake: 0,
  onTabChange: undefined,

  addSelection: (bet) =>
    set((state) => ({ selections: [...state.selections, { ...bet, market: bet.market || 'Win/Loss' }] })),

  removeSelection: (team) =>
    set((state) => ({
      selections: state.selections.filter((s) => s.team !== team),
    })),

  toggleSelection: (bet) => {
    const { selections, onTabChange } = get();
    // market 필드 강제 보장
    const safeBet = { ...bet, market: bet.market || 'Win/Loss' };
    
    // 디버깅 로그
    console.log('[toggleSelection] 새로운 선택:', {
      team: safeBet.team,
      market: safeBet.market,
      gameId: safeBet.gameId,
      desc: safeBet.desc
    });
    console.log('[toggleSelection] 현재 선택들:', selections.map(s => ({
      team: s.team,
      market: s.market,
      gameId: s.gameId
    })));
    // 이미 같은 팀, 마켓, 경기 선택되어 있으면 해제
    const exists = selections.some(
      (s) => s.team === safeBet.team && s.market === safeBet.market && s.gameId === safeBet.gameId
    );

    if (exists) {
      set((state) => ({
        selections: state.selections.filter(
          (s) => !(s.team === safeBet.team && s.market === safeBet.market && s.gameId === safeBet.gameId)
        ),
      }));
    } else {
      // 새로운 선택이 추가될 때 Bet Slip 탭으로 변경
      if (onTabChange) {
        onTabChange('betslip');
      }
      
      // 같은 경기에서 승패(h2h)와 핸디캡(spreads)은 동시에 선택 불가
      const conflictingSelection = selections.find(
        (s) =>
          s.gameId === safeBet.gameId &&
          ((s.market === 'Win/Loss' && safeBet.market === 'Handicap') ||
            (s.market === 'Handicap' && safeBet.market === 'Win/Loss'))
      );
      
      console.log('[toggleSelection] 충돌 검사:', {
        newMarket: safeBet.market,
        newGameId: safeBet.gameId,
        conflictingSelection: conflictingSelection ? {
          team: conflictingSelection.team,
          market: conflictingSelection.market,
          gameId: conflictingSelection.gameId
        } : null
      });
      
      if (
        (safeBet.market === 'Win/Loss' || safeBet.market === 'Handicap') &&
        conflictingSelection
      ) {
        // 사용자에게 알림
        alert('You cannot bet on both Win/Loss and Handicap for the same game. The previous selection will be replaced.');
        
        // 기존 승패 또는 핸디캡 선택 해제 후 추가
        set((state) => ({
          selections: [
            ...state.selections.filter(
              (s) =>
                !(
                  s.gameId === safeBet.gameId &&
                              ((s.market === 'Win/Loss' && safeBet.market === 'Handicap') ||
              (s.market === 'Handicap' && safeBet.market === 'Win/Loss'))
                )
            ),
            safeBet,
          ],
        }));
      } else {
        // 같은 경기, 같은 마켓이면 기존 선택 해제(같은 마켓 내 단일 선택)
        set((state) => ({
          selections: [
            ...state.selections.filter(
              (s) => !(s.market === safeBet.market && s.gameId === safeBet.gameId)
            ),
            safeBet,
          ],
        }));
      }
    }
  },

  updateSelection: (index, updates) =>
    set((state) => ({
      selections: state.selections.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    })),

  setStake: (amount) => set(() => ({ stake: amount })),

  clearAll: () => set(() => ({ selections: [], stake: 0 })),
  
  setTabChangeCallback: (callback) => set(() => ({ onTabChange: callback })),
})); 