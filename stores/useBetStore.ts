import { create } from 'zustand';

// 선택된 베팅 항목의 타입
export type BetSelection = {
  team: string;
  odds: number;
  desc: string;
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
    set((state) => ({ selections: [...state.selections, bet] })),

  removeSelection: (team) =>
    set((state) => ({
      selections: state.selections.filter((s) => s.team !== team),
    })),

  toggleSelection: (bet) => {
    const { selections } = get();
    const exists = selections.some((s) => s.team === bet.team);
    if (exists) {
      get().removeSelection(bet.team);
    } else {
      get().addSelection(bet);
    }
  },

  setStake: (amount) => set(() => ({ stake: amount })),

  clearAll: () => set(() => ({ selections: [], stake: 0 })),
})); 