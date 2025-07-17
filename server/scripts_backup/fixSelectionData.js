// DB selection 데이터 자동 정정 스크립트 (ESM)
import Bet from '../models/betModel.js';
import { normalizeTeamName, extractTeamsFromDesc, normalizeMarket, normalizeOption } from '../normalizeUtils.js';

(async () => {
  const bets = await Bet.findAll();
  let fixedCount = 0;
  let invalidCount = 0;
  for (const bet of bets) {
    let changed = false;
    const newSelections = (bet.selections || []).map(sel => {
      // desc에서 팀명 추출 및 정규화
      const [team1, team2] = extractTeamsFromDesc(sel.desc);
      // team 필드 정규화
      let teamNorm = sel.team ? normalizeTeamName(sel.team) : '';
      // market/option 표준화
      let marketNorm = normalizeMarket(sel.market);
      let optionNorm = sel.option ? normalizeOption(sel.option) : '';
      // 오버/언더 등 옵션이 team에 들어간 경우 분리
      if ((teamNorm === 'over' || teamNorm === 'under') && (marketNorm === 'totals' || marketNorm === 'spreads')) {
        optionNorm = teamNorm.charAt(0).toUpperCase() + teamNorm.slice(1);
        teamNorm = '';
        changed = true;
      }
      // team이 실제 참가팀과 일치하지 않으면 무효 처리
      if (teamNorm && team1 && team2 && teamNorm !== team1 && teamNorm !== team2) {
        // 단, 오버/언더 등 옵션은 예외
        if (!(marketNorm === 'totals' && (optionNorm === 'Over' || optionNorm === 'Under'))) {
          teamNorm = '';
          invalidCount++;
          changed = true;
        }
      }
      // 변경사항 반영
      return {
        ...sel,
        team: teamNorm,
        market: marketNorm,
        option: optionNorm,
      };
    });
    if (changed) {
      await bet.update({ selections: newSelections });
      fixedCount++;
      console.log(`[정정] betId=${bet.id} selections 정정됨`);
    }
  }
  console.log(`\n총 ${fixedCount}건의 베팅 selections 정정, 무효 처리 ${invalidCount}건`);
})(); 