import Bet from '../models/betModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import sequelize from '../models/sequelize.js';
import { Op } from 'sequelize';

async function fixBetStatus() {
  const transaction = await sequelize.transaction();
  
  try {
    const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de';
    
    console.log(`🔧 베팅 상태 수정 시작: ${betId}`);
    
    // 베팅 조회
    const bet = await Bet.findByPk(betId, { transaction });
    
    if (!bet) {
      throw new Error(`베팅을 찾을 수 없습니다: ${betId}`);
    }
    
    console.log(`현재 베팅 상태: ${bet.status}`);
    
    // PaymentHistory 확인
    const paymentHistory = await PaymentHistory.findOne({
      where: {
        betId: betId,
        memo: {
          [Op.like]: '%환불%'
        }
      },
      transaction
    });
    
    if (!paymentHistory) {
      throw new Error('환불 기록을 찾을 수 없습니다.');
    }
    
    console.log(`환불 기록 확인: ${paymentHistory.amount}원 (${paymentHistory.createdAt})`);
    
    // 베팅 상태를 cancelled로 변경
    bet.status = 'cancelled';
    await bet.save({ transaction });
    
    await transaction.commit();
    
    console.log('✅ 베팅 상태 수정 완료!');
    console.log(`- 베팅 ID: ${betId}`);
    console.log(`- 이전 상태: pending`);
    console.log(`- 현재 상태: cancelled`);
    console.log(`- 환불 금액: ${paymentHistory.amount}원`);
    console.log(`- 환불 일시: ${paymentHistory.createdAt}`);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 베팅 상태 수정 실패:', error.message);
  } finally {
    process.exit(0);
  }
}

fixBetStatus(); 