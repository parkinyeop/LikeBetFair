import User from './models/userModel.js';
import Bet from './models/betModel.js';
import sequelize from './models/db.js';

async function checkBetDetails() {
  try {
    console.log('=== 베팅 상세 정보 확인 ===\n');
    
    const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다.');
      return;
    }
    
    // 첫 번째 MLS 경기 관련 베팅들
    const betIds = [
      'd4b0052c-62d2-427b-b879-128ed6c6b443',
      'ffd29fcd-c8e9-4ee2-b0a0-f791a0bc8c20'
    ];
    
    for (const betId of betIds) {
      const bet = await Bet.findByPk(betId);
      
      if (!bet) {
        console.log(`❌ 베팅 ID ${betId}를 찾을 수 없습니다.`);
        continue;
      }
      
      console.log(`\n베팅 ID: ${bet.id}`);
      console.log(`금액: ${bet.stake}원`);
      console.log(`상태: ${bet.status}`);
      console.log(`상금: ${bet.winnings}`);
      console.log(`생성일: ${bet.createdAt}`);
      console.log(`업데이트일: ${bet.updatedAt}`);
      
      if (bet.selections && Array.isArray(bet.selections)) {
        console.log('\n선택 내역:');
        bet.selections.forEach((selection, index) => {
          console.log(`  ${index + 1}. 선택: ${selection.desc}`);
          console.log(`     팀: ${selection.team}`);
          console.log(`     마켓: ${selection.market}`);
          console.log(`     배당률: ${selection.price}`);
          console.log(`     결과: ${selection.result}`);
          console.log(`     경기시간: ${selection.commence_time}`);
          console.log(`     전체 선택 객체:`, JSON.stringify(selection, null, 2));
        });
      } else {
        console.log('선택 내역이 없습니다.');
      }
      
      console.log('\n' + '='.repeat(50));
    }
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

checkBetDetails(); 