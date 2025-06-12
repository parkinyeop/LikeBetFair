import { create } from 'zustand';

// 선택된 베팅 항목의 타입
export type BetSelection = {
  team: string;
  odds: number;
  desc: string;
  commence_time?: string;
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
    
    // 같은 게임의 다른 팀 선택 해제
    const gameDesc = bet.desc;
    const otherTeamInGame = selections.find(s => s.desc === gameDesc && s.team !== bet.team);
    
    if (exists) {
      // 같은 팀을 다시 클릭하면 선택 해제
      get().removeSelection(bet.team);
    } else {
      // 다른 팀을 선택하면 같은 게임의 이전 선택은 해제
      if (otherTeamInGame) {
        get().removeSelection(otherTeamInGame.team);
      }
      get().addSelection(bet);
    }
  },

  setStake: (amount) => set(() => ({ stake: amount })),

  clearAll: () => set(() => ({ selections: [], stake: 0 })),
})); 