import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import { Op } from 'sequelize';

async function fixRefundedBetStatus() {
  console.log('🔧 환불된 베팅 상태 강제 수정 시작');
  console.log('='.repeat(50));
  
  try {
    // 1. 환불 기록이 있는 모든 베팅 찾기
    console.log('\n🔍 1. 환불 기록이 있는 베팅 조회:');
    const refundHistories = await PaymentHistory.findAll({
      where: {
        memo: { [Op.like]: '%환불%' }
      },
      attributes: ['betId', 'memo', 'createdAt']
    });
    
    console.log(`- 환불 기록 총 ${refundHistories.length}개 발견`);
    
    if (refundHistories.length === 0) {
      console.log('✅ 수정할 베팅이 없습니다.');
      return;
    }
    
    // 2. 각 베팅의 현재 상태 확인 및 수정
    console.log('\n🔧 2. 베팅 상태 확인 및 수정:');
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    
    for (const refund of refundHistories) {
      const bet = await Bet.findByPk(refund.betId);
      
      if (!bet) {
        console.log(`⚠️  베팅 ${refund.betId}를 찾을 수 없습니다.`);
        continue;
      }
      
      console.log(`\n베팅 ${refund.betId}:`);
      console.log(`- 현재 상태: ${bet.status}`);
      console.log(`- 환불 사유: ${refund.memo}`);
      console.log(`- 환불 시간: ${refund.createdAt}`);
      
      if (bet.status !== 'cancelled') {
        // 상태를 cancelled로 강제 변경
        bet.status = 'cancelled';
        await bet.save();
        console.log(`✅ 상태를 cancelled로 수정 완료`);
        fixedCount++;
      } else {
        console.log(`✅ 이미 cancelled 상태 (수정 불필요)`);
        alreadyCorrectCount++;
      }
    }
    
    // 3. 결과 요약
    console.log('\n📊 3. 수정 결과 요약:');
    console.log(`- 총 환불 베팅: ${refundHistories.length}개`);
    console.log(`- 수정 완료: ${fixedCount}개`);
    console.log(`- 이미 정상: ${alreadyCorrectCount}개`);
    
    if (fixedCount > 0) {
      console.log(`\n✅ ${fixedCount}개의 베팅 상태를 cancelled로 수정했습니다.`);
    } else {
      console.log(`\n✅ 모든 환불 베팅이 이미 올바른 상태입니다.`);
    }
    
  } catch (error) {
    console.error('❌ 수정 중 오류 발생:', error);
  }
}

// 스크립트 실행
fixRefundedBetStatus()
  .then(() => {
    console.log('\n✅ 환불 베팅 상태 수정 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  }); 