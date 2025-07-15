import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import { normalizeTeamNameForComparison } from '../normalizeUtils.js';
import { Op } from 'sequelize';

async function debugMapKey() {
  try {
    // 1. Kia Tigers 베팅 찾기
    const bets = await Bet.findAll();
    const targetBet = bets.find(bet => 
      bet.selections.some(sel => 
        sel.desc.includes('Kia Tigers') && 
        sel.commence_time.includes('2025-07-09')
      )
    );
    
    if (!targetBet) {
      console.log('Kia Tigers 베팅을 찾을 수 없음');
      return;
    }
    
    console.log('=== 베팅 정보 ===');
    console.log('ID:', targetBet.id);
    console.log('상태:', targetBet.status);
    
    // 2. Kia Tigers selection 정보
    const kiaSelection = targetBet.selections.find(sel => sel.desc.includes('Kia Tigers'));
    console.log('\n=== Kia Tigers Selection ===');
    console.log('desc:', kiaSelection.desc);
    console.log('commence_time:', kiaSelection.commence_time);
    
    const teams = kiaSelection.desc.split(' vs ');
    const homeTeamNorm = normalizeTeamNameForComparison(teams[0].trim());
    const awayTeamNorm = normalizeTeamNameForComparison(teams[1].trim());
    console.log('정규화된 홈팀:', homeTeamNorm);
    console.log('정규화된 원정팀:', awayTeamNorm);
    
    const commenceTime = new Date(kiaSelection.commence_time);
    const selectionKey = `${commenceTime.toISOString()}|${homeTeamNorm}|${awayTeamNorm}`;
    console.log('Selection Key:', selectionKey);
    
    // 3. GameResult 정보
    const dayStart = new Date('2025-07-09T00:00:00Z');
    const dayEnd = new Date('2025-07-09T23:59:59Z');
    const gameResults = await GameResult.findAll({
      where: {
        commenceTime: { [Op.between]: [dayStart, dayEnd] },
        status: 'finished'
      }
    });
    
    console.log('\n=== GameResult 후보들 ===');
    gameResults.forEach((gr, i) => {
      const grHomeNorm = normalizeTeamNameForComparison(gr.homeTeam);
      const grAwayNorm = normalizeTeamNameForComparison(gr.awayTeam);
      const grKey = `${gr.commenceTime.toISOString()}|${grHomeNorm}|${grAwayNorm}`;
      
      console.log(`\n경기 ${i+1}:`);
      console.log('원본 홈팀:', gr.homeTeam, '-> 정규화:', grHomeNorm);
      console.log('원본 원정팀:', gr.awayTeam, '-> 정규화:', grAwayNorm);
      console.log('commenceTime:', gr.commenceTime);
      console.log('GameResult Key:', grKey);
      console.log('키 일치:', selectionKey === grKey);
    });
    
  } catch (err) {
    console.error('에러:', err.message);
  }
}

debugMapKey(); 