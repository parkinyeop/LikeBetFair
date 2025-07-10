import Bet from './models/betModel.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('=== Pending 배팅 상태 강제 수정 ===\n');
    
    // 1. pending 상태의 배팅 조회
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 총 ${pendingBets.length}개의 pending 배팅 발견\n`);
    
    let updatedCount = 0;
    
    for (const bet of pendingBets) {
      console.log(`\n🔍 배팅 ${bet.id} 처리 중...`);
      
      const selections = bet.selections || [];
      let hasWon = false;
      let hasLost = false;
      let hasCancelled = false;
      let hasPending = false;
      
      // 2. 각 selection의 결과 분석
      for (const selection of selections) {
        const result = selection.result || 'pending';
        console.log(`   ${selection.desc} (${selection.team}): ${result}`);
        
        if (result === 'won') hasWon = true;
        else if (result === 'lost') hasLost = true;
        else if (result === 'cancelled') hasCancelled = true;
        else hasPending = true;
      }
      
      // 3. 배팅 전체 상태 결정
      let newStatus = 'pending';
      
      if (hasPending) {
        newStatus = 'pending';
        console.log(`   ⏳ 아직 진행 중인 경기가 있음 - pending 유지`);
      } else if (hasLost) {
        newStatus = 'lost';
        console.log(`   ❌ 하나라도 패배했으므로 전체 패배`);
      } else if (hasWon && !hasLost) {
        newStatus = 'won';
        console.log(`   ✅ 모든 경기 승리 - 정산`);
      } else if (hasCancelled && !hasWon && !hasLost) {
        newStatus = 'cancelled';
        console.log(`   🚫 모든 경기 취소 - 환불`);
      }
      
      // 4. 상태가 변경되면 업데이트
      if (newStatus !== bet.status) {
        console.log(`   🔄 상태 변경: ${bet.status} → ${newStatus}`);
        
        await bet.update({
          status: newStatus,
          selections: selections
        });
        
        updatedCount++;
        console.log(`   ✅ 업데이트 완료`);
      } else {
        console.log(`   ℹ️ 상태 변경 없음`);
      }
    }
    
    console.log(`\n📈 수정 완료:`);
    console.log(`   총 배팅 수: ${pendingBets.length}개`);
    console.log(`   수정된 배팅 수: ${updatedCount}개`);
    
    // 5. 수정 후 통계
    const remainingPending = await Bet.count({
      where: { status: 'pending' }
    });
    console.log(`   남은 pending 배팅: ${remainingPending}개`);
    
  } catch (error) {
    console.error('수정 중 오류 발생:', error);
  }
})(); 