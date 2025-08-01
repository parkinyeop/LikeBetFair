import betResultService from './services/betResultService.js';
import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

async function forceBetUpdate() {
  try {
    console.log('=== 강제 베팅 결과 업데이트 시작 ===\n');
    
    // 1. pending 상태의 베팅 수 확인
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' }
    });
    
    console.log(`📊 Pending 베팅 수: ${pendingBets.length}개`);
    
    if (pendingBets.length === 0) {
      console.log('✅ 처리할 pending 베팅이 없습니다.');
      return;
    }
    
    // 2. 베팅 결과 업데이트 실행 (개선된 로직)
    console.log('\n🔄 베팅 결과 업데이트 실행 중...');
    const result = await betResultService.updateBetResults();
    
    console.log('\n📈 업데이트 결과:');
    console.log(`  - 업데이트된 베팅: ${result.updatedCount}개`);
    console.log(`  - 오류 발생: ${result.errorCount}개`);
    
    // 3. 업데이트 후 상태 확인
    const updatedPendingBets = await Bet.findAll({
      where: { status: 'pending' }
    });
    
    console.log(`\n📊 업데이트 후 pending 베팅 수: ${updatedPendingBets.length}개`);
    
    if (updatedPendingBets.length > 0) {
      console.log('\n⚠️ 여전히 pending인 베팅들 (처리되지 않은 이유 분석):');
      for (const bet of updatedPendingBets.slice(0, 10)) { // 처음 10개만 표시
        console.log(`\n  - ID: ${bet.id}`);
        console.log(`    선택: ${bet.selections?.length || 0}개`);
        console.log(`    업데이트: ${bet.updatedAt}`);
        
        // 각 선택의 상태 확인
        if (bet.selections && Array.isArray(bet.selections)) {
          bet.selections.forEach((selection, index) => {
            console.log(`      ${index + 1}. ${selection.desc} - ${selection.result}`);
          });
        }
      }
      
      if (updatedPendingBets.length > 10) {
        console.log(`  ... 외 ${updatedPendingBets.length - 10}개 더`);
      }
    }
    
    // 4. 경기 결과 상태 확인
    console.log('\n🏈 경기 결과 상태 확인:');
    const finishedGames = await GameResult.count({
      where: { status: 'finished' }
    });
    const pendingGames = await GameResult.count({
      where: { status: 'pending' }
    });
    const scheduledGames = await GameResult.count({
      where: { status: 'scheduled' }
    });
    
    console.log(`  - 완료된 경기: ${finishedGames}개`);
    console.log(`  - Pending 경기: ${pendingGames}개`);
    console.log(`  - 예정된 경기: ${scheduledGames}개`);
    
    console.log('\n✅ 강제 베팅 결과 업데이트 완료!');
    
  } catch (error) {
    console.error('❌ 강제 베팅 결과 업데이트 실패:', error.message);
  }
  
  process.exit(0);
}

forceBetUpdate(); 