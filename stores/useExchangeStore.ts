import { create } from 'zustand';

// 익스체인지 선택된 베팅 항목의 타입
export type ExchangeSelection = {
  team: string;
  odds: number;
  type: 'back' | 'lay';
  gameId: string;
  market: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  sportKey?: string;
};

interface ExchangeState {
  selections: ExchangeSelection[];
  onTabChange?: (tab: 'order' | 'history') => void;
  addSelection: (bet: ExchangeSelection) => void;
  removeSelection: (gameId: string, market: string, team: string) => void;
  toggleSelection: (bet: ExchangeSelection) => void;
  clearAll: () => void;
  setTabChangeCallback: (callback: (tab: 'order' | 'history') => void) => void;
}

export const useExchangeStore = create<ExchangeState>((set, get) => ({
  selections: [],
  onTabChange: undefined,

  addSelection: (bet) =>
    set((state) => ({ selections: [...state.selections, bet] })),

  removeSelection: (gameId, market, team) =>
    set((state) => ({
      selections: state.selections.filter(
        (s) => !(s.gameId === gameId && s.market === market && s.team === team)
      ),
    })),

  toggleSelection: (bet) => {
    const { selections, onTabChange } = get();
    
    // 디버깅 로그
    console.log('[Exchange toggleSelection] 새로운 선택:', {
      team: bet.team,
      market: bet.market,
      gameId: bet.gameId
    });
    console.log('[Exchange toggleSelection] 현재 선택들:', selections.map(s => ({
      team: s.team,
      market: s.market,
      gameId: s.gameId
    })));
    
    // 이미 같은 팀, 마켓, 경기 선택되어 있으면 해제
    const exists = selections.some(
      (s) => s.team === bet.team && s.market === bet.market && s.gameId === bet.gameId
    );

    if (exists) {
      console.log('[Exchange toggleSelection] 기존 선택 해제');
      set((state) => ({
        selections: state.selections.filter(
          (s) => !(s.team === bet.team && s.market === bet.market && s.gameId === bet.gameId)
        ),
      }));
    } else {
      console.log('[Exchange toggleSelection] 새 선택 추가');
      // 새로운 선택이 추가될 때 Order 탭으로 변경
      if (onTabChange) {
        onTabChange('order');
      }
      
      // 같은 경기에서 승패(Win/Loss)와 핸디캡(Handicap)은 동시에 선택 불가
      const conflictingSelection = selections.find(
        (s) =>
          s.gameId === bet.gameId &&
          ((s.market === '승패' && bet.market === '핸디캡') ||
            (s.market === '핸디캡' && bet.market === '승패'))
      );
      
      console.log('[Exchange toggleSelection] 충돌 검사:', {
        newMarket: bet.market,
        newGameId: bet.gameId,
        conflictingSelection: conflictingSelection ? {
          team: conflictingSelection.team,
          market: conflictingSelection.market,
          gameId: conflictingSelection.gameId
        } : null
      });
      
      if (
        (bet.market === '승패' || bet.market === '핸디캡') &&
        conflictingSelection
      ) {
        // 사용자에게 알림
        alert('같은 경기에서 승패와 핸디캡을 동시에 선택할 수 없습니다. 기존 선택이 교체됩니다.');
        
        // 기존 승패 또는 핸디캡 선택 해제 후 추가
        set((state) => ({
          selections: [
            ...state.selections.filter(
              (s) =>
                !(
                  s.gameId === bet.gameId &&
                  ((s.market === '승패' && bet.market === '핸디캡') ||
                    (s.market === '핸디캡' && bet.market === '승패'))
                )
            ),
            bet,
          ],
        }));
      } else {
        // 같은 경기, 같은 마켓이면 기존 선택 해제(같은 마켓 내 단일 선택)
        set((state) => ({
          selections: [
            ...state.selections.filter(
              (s) => !(s.market === bet.market && s.gameId === bet.gameId)
            ),
            bet,
          ],
        }));
      }
    }
  },

  clearAll: () => set(() => ({ selections: [] })),
  
  setTabChangeCallback: (callback) => set(() => ({ onTabChange: callback })),
}));
