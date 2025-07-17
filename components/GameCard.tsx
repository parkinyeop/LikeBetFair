// File: components/GameCard.tsx
import React, { memo, useMemo, useCallback } from 'react';
import GameTimeDisplay from './GameTimeDisplay';
import BettingButton from './BettingButton';
import { getSportKey, getDisplayNameFromSportKey, SPORTS_TREE } from '../config/sportsMapping';

interface GameCardProps {
  teams: string;
  time: string;
  selectedTeam: string | null;
  onSelect: (match: string, team: string) => void;
  bookmakers?: any[];
  infoOnly?: boolean;
  sportKey?: string;
  onCategorySelect?: (category: string) => void;
}

const GameCard: React.FC<GameCardProps> = memo(({ teams, time, selectedTeam, onSelect, bookmakers, infoOnly, sportKey, onCategorySelect }) => {
  // 팀명 파싱 (메모화)
  const [teamA, teamB] = useMemo(() => teams.split(" vs "), [teams]);

  // 클릭 핸들러 (메모화)
  const handleClick = useCallback((team: string) => {
    // 같은 팀을 다시 클릭하면 선택 해제
    if (selectedTeam === team) {
      onSelect(teams, "");
    } else {
      // 다른 팀을 선택하면 이전 선택은 자동으로 해제되고 새로운 팀 선택
      onSelect(teams, team);
    }
  }, [selectedTeam, onSelect, teams]);

  // 게임 카드 클릭 핸들러 (메모화)
  const handleCardClick = useCallback(() => {
    if (sportKey && onCategorySelect) {
      const displayName = getDisplayNameFromSportKey(sportKey);
      if (displayName) {
        // 해당 스포츠가 속한 메인 카테고리를 찾아서 트리 형태로 선택
        const parentCategory = Object.entries(SPORTS_TREE).find(([main, subs]) => 
          subs.includes(displayName)
        );
        
        let categoryToSet;
        if (parentCategory) {
          // "축구 > K리그" 형태로 설정
          categoryToSet = `${parentCategory[0]} > ${displayName}`;
        } else {
          // 메인 카테고리에 속하지 않는 경우
          categoryToSet = displayName;
        }
        
        // 사이드바 카테고리 동기화를 위한 이벤트 발생
        window.dispatchEvent(new CustomEvent('categorySelected', { detail: { category: categoryToSet } }));
        
        // onCategorySelect 콜백도 호출 (기존 동작 유지)
        onCategorySelect(categoryToSet);
      }
    }
  }, [sportKey, onCategorySelect]);

  // 배당율 정보 추출 (메모화)
  const getOdds = useCallback((teamName: string) => {
    if (!bookmakers || bookmakers.length === 0) return null;
    for (const bookmaker of bookmakers) {
      const h2hMarket = bookmaker.markets?.find((market: any) => market.key === 'h2h');
      if (h2hMarket) {
        const outcome = h2hMarket.outcomes?.find((outcome: any) =>
          outcome.name.trim().toLowerCase() === teamName.trim().toLowerCase()
        );
        if (outcome) return outcome.price;
      }
    }
    return null;
  }, [bookmakers]);

  // 배당률 계산 (메모화)
  const { teamAOdds, teamBOdds } = useMemo(() => ({
    teamAOdds: getOdds(teamA),
    teamBOdds: getOdds(teamB)
  }), [getOdds, teamA, teamB]);

    // 개별 팀 클릭 핸들러 (메모화)
  const createTeamClickHandler = useCallback((team: string) => () => {
    handleClick(team);
  }, [handleClick]);

  if (infoOnly) {
    return (
      <div 
        className="bg-white p-4 rounded shadow opacity-90 hover:shadow-lg transition-shadow border-2 border-blue-400 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="text-gray-700 font-semibold mb-2">{teams}</div>
        <GameTimeDisplay time={time} showStatus={false} />
        <div className="flex space-x-4">
          {[teamA, teamB].map((team, index) => {
            const odds = index === 0 ? teamAOdds : teamBOdds;
            return (
              <div key={team} className="flex-1 px-4 py-2 rounded bg-gray-100 text-gray-700 text-center border-2 border-gray-400">
                <div>{team}</div>
                {odds && (
                  <div className="text-xs mt-1 opacity-90">배당: {odds.toFixed(2)}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded shadow border-2 border-blue-400">
      <div className="text-gray-700 font-semibold mb-2">{teams}</div>
      <div className="mb-4">
        <GameTimeDisplay time={time} showStatus={true} />
      </div>
      <div className="flex space-x-4">
        <BettingButton
          team={teamA}
          odds={teamAOdds}
          selected={selectedTeam === teamA}
          commenceTime={time}
          onSelect={createTeamClickHandler(teamA)}
          onBettingAreaSelect={onCategorySelect ? () => {
            // 배팅 영역 선택 시 배팅슬립으로 자동 변경
            window.dispatchEvent(new CustomEvent('bettingAreaSelected'));
          } : undefined}
        />
        <BettingButton
          team={teamB}
          odds={teamBOdds}
          selected={selectedTeam === teamB}
          commenceTime={time}
          onSelect={createTeamClickHandler(teamB)}
          onBettingAreaSelect={onCategorySelect ? () => {
            // 배팅 영역 선택 시 배팅슬립으로 자동 변경
            window.dispatchEvent(new CustomEvent('bettingAreaSelected'));
          } : undefined}
        />
      </div>
    </div>
  );
});

GameCard.displayName = 'GameCard';

export default GameCard;
