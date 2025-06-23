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
};

interface BetState {
  selections: BetSelection[];
  stake: number;
  addSelection: (bet: BetSelection) => void;
  removeSelection: (team: string) => void;
  toggleSelection: (bet: BetSelection) => void;
  setStake: (amount: number) => void;
  clearAll: () => void;
}

export const useBetStore = create<BetState>((set, get) => ({
  selections: [],
  stake: 0,

  addSelection: (bet) =>
    set((state) => ({ selections: [...state.selections, { ...bet, market: bet.market || '승/패' }] })),

  removeSelection: (team) =>
    set((state) => ({
      selections: state.selections.filter((s) => s.team !== team),
    })),

  toggleSelection: (bet) => {
    const { selections } = get();
    // market 필드 강제 보장
    const safeBet = { ...bet, market: bet.market || '승/패' };
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
      // 같은 경기에서 승패(h2h)와 핸디캡(spreads)은 동시에 선택 불가
      if (
        (safeBet.market === '승/패' || safeBet.market === '핸디캡') &&
        selections.some(
          (s) =>
            s.gameId === safeBet.gameId &&
            ((s.market === '승/패' && safeBet.market === '핸디캡') ||
              (s.market === '핸디캡' && safeBet.market === '승/패'))
        )
      ) {
        // 기존 승패 또는 핸디캡 선택 해제 후 추가
        set((state) => ({
          selections: [
            ...state.selections.filter(
              (s) =>
                !(
                  s.gameId === safeBet.gameId &&
                  ((s.market === '승/패' && safeBet.market === '핸디캡') ||
                    (s.market === '핸디캡' && safeBet.market === '승/패'))
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

  setStake: (amount) => set(() => ({ stake: amount })),

  clearAll: () => set(() => ({ selections: [], stake: 0 })),
})); 