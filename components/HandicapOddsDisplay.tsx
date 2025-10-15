// components/HandicapOddsDisplay.tsx

import React from 'react';
import { groupHandicapsByPoint, filterHalfPointHandicaps, formatHandicap } from '../utils/handicapUtils';

interface GameData {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  officialOdds?: {
    spreads?: Record<string, { averagePrice: number; count: number }>;
  };
}

interface SelectionParams {
  team: string;
  odds: number;
  desc: string;
  commence_time: string;
  market: string;
  gameId: string;
  sport_key: string;
  point: number;  // ⚠️ 실제 핸디캡 값 (절대값 아님)
}

interface HandicapOddsDisplayProps {
  game: GameData;
  toggleSelection: (params: SelectionParams) => void;
  isSelected: (team: string, market: string, gameId: string, point?: number) => boolean;
  isBettable: boolean;
  onBettingAreaSelect?: () => void;
  variant?: 'sportsbook' | 'homepage';
}

const HandicapOddsDisplay: React.FC<HandicapOddsDisplayProps> = ({
  game,
  toggleSelection,
  isSelected,
  isBettable,
  onBettingAreaSelect,
  variant = 'sportsbook'
}) => {
  const spreadsOdds = game.officialOdds?.spreads || {};

  if (Object.keys(spreadsOdds).length === 0) {
    return (
      <div className="text-center text-gray-500 py-3">
        {variant === 'homepage' ? 'No Handicap odds available' : '핸디캡 배당 정보 없음'}
      </div>
    );
  }

  const groupedSpreads = groupHandicapsByPoint(
    spreadsOdds,
    game.home_team,
    game.away_team
  );

  const filteredSpreads = filterHalfPointHandicaps(groupedSpreads);

  if (filteredSpreads.length === 0) {
    return (
      <div className="text-center text-gray-500 py-3">
        {variant === 'homepage' ? 'No Handicap odds available' : '핸디캡 배당 정보 없음'}
      </div>
    );
  }

  // 스타일 변형
  const centerClass = variant === 'homepage'
    ? 'w-16 text-base font-bold text-gray-800 text-center'
    : 'w-12 text-sm font-medium text-blue-700 text-center';

  return (
    <div className="space-y-2">
      {filteredSpreads.map(([absPoint, oddsPair]) => {
        const homeData = oddsPair.home;
        const awayData = oddsPair.away;

        const homeOdds = homeData?.oddsData?.averagePrice;
        const awayOdds = awayData?.oddsData?.averagePrice;
        const homeHandicap = homeData?.handicap;
        const awayHandicap = awayData?.handicap;

        return (
          <div key={absPoint} className="flex items-center gap-2">
            {/* 홈팀 버튼 */}
            {homeOdds != null && homeHandicap != null && (
              <button
                onClick={() => {
                  if (isBettable && homeOdds) {
                    toggleSelection({
                      team: `${game.home_team} ${formatHandicap(homeHandicap)}`,
                      odds: homeOdds,
                      desc: `${game.home_team} vs ${game.away_team}`,
                      commence_time: game.commence_time,
                      market: 'Handicap',
                      gameId: game.id,
                      sport_key: game.sport_key,
                      point: homeHandicap  // ⚠️ 실제 값 전달
                    });
                    onBettingAreaSelect?.();
                  }
                }}
                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                  isSelected(
                    `${game.home_team} ${formatHandicap(homeHandicap)}`,
                    'Handicap',
                    game.id,
                    homeHandicap
                  )
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : isBettable
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-300 cursor-not-allowed'
                } text-white text-sm`}
                disabled={!isBettable || !homeOdds}
              >
                <div className="font-medium">
                  {game.home_team} {formatHandicap(homeHandicap)}
                </div>
                <div className="text-xs">{homeOdds.toFixed(3)}</div>
              </button>
            )}

            {/* 중앙 핸디캡 표시 */}
            <div className={centerClass}>
              {homeHandicap != null ? formatHandicap(homeHandicap) : absPoint}
            </div>

            {/* 원정팀 버튼 */}
            {awayOdds != null && awayHandicap != null && (
              <button
                onClick={() => {
                  if (isBettable && awayOdds) {
                    toggleSelection({
                      team: `${game.away_team} ${formatHandicap(awayHandicap)}`,
                      odds: awayOdds,
                      desc: `${game.home_team} vs ${game.away_team}`,
                      commence_time: game.commence_time,
                      market: 'Handicap',
                      gameId: game.id,
                      sport_key: game.sport_key,
                      point: awayHandicap  // ⚠️ 실제 값 전달
                    });
                    onBettingAreaSelect?.();
                  }
                }}
                className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                  isSelected(
                    `${game.away_team} ${formatHandicap(awayHandicap)}`,
                    'Handicap',
                    game.id,
                    awayHandicap
                  )
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : isBettable
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-300 cursor-not-allowed'
                } text-white text-sm`}
                disabled={!isBettable || !awayOdds}
              >
                <div className="font-medium">
                  {game.away_team} {formatHandicap(awayHandicap)}
                </div>
                <div className="text-xs">{awayOdds.toFixed(3)}</div>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HandicapOddsDisplay;



