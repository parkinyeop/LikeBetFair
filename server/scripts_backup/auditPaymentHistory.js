import Bet from '../models/betModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import sequelize from '../models/sequelize.js';
import { Op } from 'sequelize';

class PaymentHistoryAuditor {
  
  /**
   * 취소된 베팅의 PaymentHistory 누락 검사
   */
  async auditCancelledBets() {
    console.log('🔍 [PaymentHistoryAuditor] 취소된 베팅의 PaymentHistory 누락 검사 시작');
    
    // 모든 cancelled 베팅 조회
    const cancelledBets = await Bet.findAll({
      where: { status: 'cancelled' },
      order: [['updatedAt', 'DESC']]
    });
    
    console.log(`📊 총 취소된 베팅: ${cancelledBets.length}개`);
    
    const missingPayments = [];
    
    for (const bet of cancelledBets) {
      // 해당 베팅의 환불 기록 확인
      const refundRecord = await PaymentHistory.findOne({
        where: {
          betId: bet.id,
          memo: { [Op.like]: '%환불%' }
        }
      });
      
      if (!refundRecord) {
        missingPayments.push({
          betId: bet.id,
          userId: bet.userId,
          stake: bet.stake,
          createdAt: bet.createdAt,
          updatedAt: bet.updatedAt
        });
      }
    }
    
    console.log(`❌ PaymentHistory 누락된 취소 베팅: ${missingPayments.length}개`);
    
    if (missingPayments.length > 0) {
      console.log('\n🚨 누락된 PaymentHistory 목록:');
      missingPayments.forEach(missing => {
        console.log(`- 베팅 ID: ${missing.betId}`);
        console.log(`  사용자 ID: ${missing.userId}`);
        console.log(`  환불 금액: ${missing.stake}원`);
        console.log(`  취소일: ${missing.updatedAt}`);
        console.log('');
      });
    }
    
    return missingPayments;
  }
  
  /**
   * 자동 복구 실행
   */
  async autoRepair(dryRun = true) {
    console.log(`🔧 [PaymentHistoryAuditor] 자동 복구 ${dryRun ? '시뮬레이션' : '실행'}`);
    
    const missingPayments = await this.auditCancelledBets();
    
    if (missingPayments.length === 0) {
      console.log('✅ 복구할 PaymentHistory가 없습니다.');
      return;
    }
    
    console.log('\n1️⃣ 환불 누락 복구 중...');
    
    for (const missing of missingPayments) {
      try {
        if (dryRun) {
          console.log(`[DRY RUN] 복구 예정: 베팅 ${missing.betId}, 금액 ${missing.stake}원`);
          continue;
        }
        
        // 실제 복구 실행
        const transaction = await sequelize.transaction();
        
        try {
          // 베팅과 사용자 정보 재확인
          const bet = await Bet.findByPk(missing.betId, { transaction });
          const user = await User.findByPk(missing.userId, { transaction });
          
          if (!bet || !user) {
            throw new Error(`베팅 또는 사용자를 찾을 수 없음: bet=${missing.betId}, user=${missing.userId}`);
          }
          
          if (bet.status !== 'cancelled') {
            throw new Error(`베팅 상태가 cancelled가 아님: ${bet.status}`);
          }
          
          // 중복 확인
          const existingRecord = await PaymentHistory.findOne({
            where: {
              betId: missing.betId,
              memo: { [Op.like]: '%환불%' }
            },
            transaction
          });
          
          if (existingRecord) {
            throw new Error(`이미 환불 기록이 존재함: ${existingRecord.id}`);
          }
          
          // PaymentHistory 복구
          const paymentHistory = await PaymentHistory.create({
            userId: missing.userId,
            betId: missing.betId,
            amount: missing.stake,
            balanceAfter: user.balance, // 현재 잔액으로 기록
            memo: `[복구] 취소된 베팅 환불 - 시스템 감사를 통한 복구`,
            paidAt: bet.updatedAt, // 베팅 취소 시점으로 기록
            metadata: {
              auditRepair: true,
              originalCancelDate: bet.updatedAt,
              repairedAt: new Date().toISOString(),
              repairReason: 'PaymentHistory 누락 복구'
            }
          }, { transaction });
          
          await transaction.commit();
          
          console.log(`✅ 복구 완료: 베팅 ${missing.betId} → PaymentHistory ${paymentHistory.id}`);
          
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
        
      } catch (error) {
        console.error(`❌ 복구 실패: 베팅 ${missing.betId} - ${error.message}`);
      }
    }
  }
}

// 실행 부분
async function runAudit() {
  try {
    const auditor = new PaymentHistoryAuditor();
    
    // 명령줄 인수 확인
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');
    
    console.log(`🚀 PaymentHistory 감사 시작 ${dryRun ? '(DRY RUN)' : '(실제 실행)'}`);
    console.log('💡 실제 복구를 원한다면 --execute 플래그를 사용하세요.\n');
    
    await auditor.autoRepair(dryRun);
    
    console.log('\n✅ PaymentHistory 감사 완료');
    
  } catch (error) {
    console.error('❌ PaymentHistory 감사 실패:', error);
  } finally {
    process.exit();
  }
}

runAudit();
