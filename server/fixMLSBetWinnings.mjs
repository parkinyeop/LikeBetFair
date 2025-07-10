import User from './models/userModel.js';
import Bet from './models/betModel.js';
import sequelize from './models/db.js';

async function fixMLSBetWinnings() {
  try {
    console.log('=== MLS 베팅 상금 수정 ===\n');
    
    // 첫 번째 MLS 경기 관련 베팅들
    const betIds = [
      'd4b0052c-62d2-427b-b879-128ed6c6b443',
      'ffd29fcd-c8e9-4ee2-b0a0-f791a0bc8c20'
    ];
    
    let totalWinnings = 0;
    
    for (const betId of betIds) {
      const bet = await Bet.findByPk(betId);
      
      if (!bet) {
        console.log(`❌ 베팅 ID ${betId}를 찾을 수 없습니다.`);
        continue;
      }
      
      console.log(`\n베팅 ID: ${bet.id}`);
      console.log(`기존 상금: ${bet.winnings}`);
      
      if (bet.selections && Array.isArray(bet.selections) && bet.selections.length > 0) {
        const selection = bet.selections[0]; // 첫 번째 선택
        
        if (selection.odds) {
          const winnings = bet.stake * selection.odds;
          
          await bet.update({
            winnings: winnings
          });
          
          console.log(`배당률: ${selection.odds}`);
          console.log(`계산된 상금: ${bet.stake} × ${selection.odds} = ${winnings.toFixed(2)}원`);
          console.log(`✅ 상금 업데이트 완료`);
          
          totalWinnings += winnings;
        } else {
          console.log(`❌ 배당률 정보가 없습니다.`);
        }
      } else {
        console.log(`❌ 선택 내역이 없습니다.`);
      }
    }
    
    console.log(`\n=== 정산 완료 ===`);
    console.log(`총 상금: ${totalWinnings.toFixed(2)}원`);
    console.log(`정산된 베팅: ${betIds.length}개`);
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

fixMLSBetWinnings(); 