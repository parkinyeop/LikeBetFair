// types/odds.ts

export interface OddsData {
  averagePrice: number;
  count: number;
}

export interface HandicapData {
  oddsData: OddsData;
  handicap: number;  // 실제 핸디캡 값 (-1.5, +1.5 등)
}

export interface OddsPair {
  home?: HandicapData;
  away?: HandicapData;
}

export type GroupedSpreads = Record<string, OddsPair>;

export interface GameData {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  officialOdds?: {
    h2h?: Record<string, OddsData>;
    spreads?: Record<string, OddsData>;
    totals?: Record<string, OddsData>;
  };
}

export interface SelectionParams {
  team: string;
  odds: number;
  desc: string;
  commence_time: string;
  market: string;
  gameId: string;
  sport_key: string;
  point: number;
}




