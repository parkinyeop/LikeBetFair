import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { Op } from 'sequelize';

async function fixFirstGame() {
  try {
    console.log('=== 첫 번째 경기 수정: New England Revolution vs Inter Miami CF ===\n');
    
    // 1. 경기 결과 업데이트
    console.log('1. 경기 결과 업데이트:');
    const gameResult = await GameResult.findOne({
      where: {
        homeTeam: 'New England Revolution',
        awayTeam: 'Inter Miami',
        commenceTime: '2025-07-09T23:30:00.000Z'
      }
    });
    
    if (gameResult) {
      console.log(`   기존 상태: ${gameResult.status}, 결과: ${gameResult.result}`);
      console.log(`   스코어: ${JSON.stringify(gameResult.score)}`);
      
      // 스코어 ["1","2"] → Inter Miami(away) 승리
      await gameResult.update({
        result: 'away_win',
        status: 'finished'
      });
      
      console.log('   ✅ 경기 결과를 away_win으로 업데이트 완료');
    } else {
      console.log('   ❌ 경기 결과를 찾을 수 없습니다.');
      return;
    }
    
    // 2. 베팅 결과 업데이트
    console.log('\n2. 베팅 결과 업데이트:');
    const bet1 = await Bet.findOne({
      where: { id: 'd4b0052c-62d2-427b-b879-128ed6c6b443' }
    });
    
    const bet2 = await Bet.findOne({
      where: { id: 'ffd29fcd-c8e9-4ee2-b0a0-f791a0bc8c20' }
    });
    
    if (bet1) {
      const selection = bet1.selections[0];
      console.log(`   베팅 1 - 선택 팀: ${selection.team}, 베팅 결과: ${selection.result}`);
      
      // intermiamicf → Inter Miami 매칭
      if (selection.team === 'intermiamicf') {
        // Inter Miami가 승리했으므로 베팅 결과 결정
        const betResult = 'won'; // Inter Miami에 베팅했으므로 승리
        await bet1.update({ status: betResult });
        console.log(`   ✅ 베팅 1 상태를 ${betResult}로 업데이트 완료`);
      }
    }
    
    if (bet2) {
      const selection = bet2.selections[0];
      console.log(`   베팅 2 - 선택 팀: ${selection.team}, 베팅 결과: ${selection.result}`);
      
      if (selection.team === 'intermiamicf') {
        const betResult = 'won'; // Inter Miami에 베팅했으므로 승리
        await bet2.update({ status: betResult });
        console.log(`   ✅ 베팅 2 상태를 ${betResult}로 업데이트 완료`);
      }
    }
    
    // 3. 수정 결과 확인
    console.log('\n3. 수정 결과 확인:');
    const updatedGame = await GameResult.findOne({
      where: {
        homeTeam: 'New England Revolution',
        awayTeam: 'Inter Miami',
        commenceTime: '2025-07-09T23:30:00.000Z'
      }
    });
    
    console.log(`   경기 결과: ${updatedGame.result}`);
    console.log(`   경기 상태: ${updatedGame.status}`);
    
    const updatedBet1 = await Bet.findOne({
      where: { id: 'd4b0052c-62d2-427b-b879-128ed6c6b443' }
    });
    
    const updatedBet2 = await Bet.findOne({
      where: { id: 'ffd29fcd-c8e9-4ee2-b0a0-f791a0bc8c20' }
    });
    
    console.log(`   베팅 1 상태: ${updatedBet1.status}`);
    console.log(`   베팅 2 상태: ${updatedBet2.status}`);
    
    console.log('\n✅ 첫 번째 경기 수정 완료!');
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

fixFirstGame(); 