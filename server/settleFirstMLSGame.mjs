import User from './models/userModel.js';
import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { normalizeTeamNameForComparison } from './normalizeUtils.js';
import { Op } from 'sequelize';

async function settleFirstMLSGame() {
  try {
    console.log('=== 첫 번째 MLS 경기 정산: New England Revolution vs Inter Miami ===\n');
    
    // 1. 경기 결과 업데이트
    const gameResult = await GameResult.findByPk('ca54def1-f1d4-4a43-8eab-3e36c34d4c52');
    
    if (!gameResult) {
      console.log('❌ 경기 결과를 찾을 수 없습니다.');
      return;
    }
    
    console.log('1. 경기 정보 업데이트:');
    console.log(`   기존 상태: ${gameResult.status}, 결과: ${gameResult.result}`);
    console.log(`   스코어: ${JSON.stringify(gameResult.score)}`);
    
    // 경기 결과를 away_win으로 업데이트
    await gameResult.update({
      result: 'away_win'
    });
    
    console.log(`   ✅ 업데이트 완료: 결과 = away_win`);
    
    // 2. 관련 베팅들 찾기
    const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다.');
      return;
    }
    
    const allBets = await Bet.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });
    
    // 3. 해당 경기와 관련된 베팅들 필터링
    const targetGameBets = [];
    const gameTime = new Date('2025-07-09T23:30:00.000Z');
    const timeRange = 2 * 60 * 60 * 1000; // ±2시간
    
    for (const bet of allBets) {
      if (!bet.selections || !Array.isArray(bet.selections)) continue;
      
      for (const selection of bet.selections) {
        if (!selection.commence_time) continue;
        
        const selTime = new Date(selection.commence_time);
        const timeDiff = Math.abs(selTime.getTime() - gameTime.getTime());
        
        if (timeDiff <= timeRange) {
          // 팀명 매칭 확인
          const betTeamNorm = normalizeTeamNameForComparison(selection.team);
          const homeTeamNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
          const awayTeamNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
          
          if (betTeamNorm === homeTeamNorm || betTeamNorm === awayTeamNorm) {
            targetGameBets.push({ bet, selection });
            break;
          }
        }
      }
    }
    
    console.log(`\n2. 정산할 베팅: ${targetGameBets.length}개`);
    
    // 4. 베팅 정산
    let totalWinnings = 0;
    
    for (const item of targetGameBets) {
      const { bet, selection } = item;
      
      console.log(`\n   베팅 ID: ${bet.id}`);
      console.log(`   금액: ${bet.stake}원`);
      console.log(`   팀: ${selection.team}`);
      console.log(`   마켓: ${selection.market}`);
      
      // 베팅 결과 결정
      const betTeamNorm = normalizeTeamNameForComparison(selection.team);
      const isAwayTeam = betTeamNorm === normalizeTeamNameForComparison(gameResult.awayTeam);
      
      if (isAwayTeam) {
        // Inter Miami에 베팅했으므로 승리
        const winnings = bet.stake * parseFloat(selection.price);
        
        await bet.update({
          status: 'won',
          winnings: winnings
        });
        
        // selection 결과도 업데이트
        const updatedSelections = bet.selections.map(sel => {
          if (sel.team === selection.team && sel.market === selection.market) {
            return { ...sel, result: 'won' };
          }
          return sel;
        });
        
        await bet.update({
          selections: updatedSelections
        });
        
        console.log(`   ✅ 승리! 상금: ${winnings.toFixed(2)}원`);
        totalWinnings += winnings;
      } else {
        // New England Revolution에 베팅했으므로 패배
        await bet.update({
          status: 'lost',
          winnings: 0
        });
        
        // selection 결과도 업데이트
        const updatedSelections = bet.selections.map(sel => {
          if (sel.team === selection.team && sel.market === selection.market) {
            return { ...sel, result: 'lost' };
          }
          return sel;
        });
        
        await bet.update({
          selections: updatedSelections
        });
        
        console.log(`   ❌ 패배! 상금: 0원`);
      }
    }
    
    console.log(`\n3. 정산 완료!`);
    console.log(`   총 상금: ${totalWinnings.toFixed(2)}원`);
    console.log(`   정산된 베팅: ${targetGameBets.length}개`);
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

settleFirstMLSGame(); 