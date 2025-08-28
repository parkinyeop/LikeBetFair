import ExchangeOrder from './models/exchangeOrderModel.js';
import User from './models/userModel.js';
import PaymentHistory from './models/paymentHistoryModel.js';
import { Op } from 'sequelize';
import sequelize from './models/sequelize.js';

/**
 * 부분 매칭 후처리 개선 스크립트
 * - 남은 금액 처리 로직 개선
 * - 정산 메모 상세화
 * - 사용자 경험 향상
 */
class PartialMatchingPostProcessor {

  /**
   * 부분 매칭 주문의 남은 금액 처리 개선
   */
  async improveRemainingAmountProcessing() {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('🔧 부분 매칭 후처리 개선 시작...');
      
      // 1. 부분 매칭된 settled 주문들 조회
      const partialMatchedOrders = await ExchangeOrder.findAll({
        where: {
          partiallyFilled: true,
          status: 'settled',
          remainingAmount: { [Op.gt]: 0 }
        },
        transaction
      });
      
      console.log(`📊 처리할 부분 매칭 주문 수: ${partialMatchedOrders.length}`);
      
      if (partialMatchedOrders.length === 0) {
        console.log('✅ 처리할 부분 매칭 주문이 없습니다.');
        await transaction.commit();
        return;
      }
      
      let processedCount = 0;
      let totalRefunded = 0;
      
      for (const order of partialMatchedOrders) {
        try {
          console.log(`\n🎯 주문 ${order.id} 처리 중...`);
          console.log(`   경기: ${order.homeTeam} vs ${order.awayTeam}`);
          console.log(`   남은 금액: ${order.remainingAmount}원`);
          console.log(`   체결 금액: ${order.filledAmount}원`);
          
          // 1. 남은 금액을 0으로 설정하고 상태 업데이트
          await order.update({
            remainingAmount: 0,
            settlementNote: this.generateDetailedSettlementNote(order)
          }, { transaction });
          
          // 2. 사용자 잔액에 남은 금액 환불
          const user = await User.findByPk(order.userId, { transaction });
          const currentBalance = parseFloat(user.balance);
          const newBalance = currentBalance + order.remainingAmount;
          
          await user.update({ balance: newBalance }, { transaction });
          
          // 3. 환불 내역 기록
          await PaymentHistory.create({
            userId: order.userId,
            betId: null,
            amount: order.remainingAmount,
            type: 'refund',
            memo: this.generateRefundMemo(order),
            status: 'completed',
            balanceAfter: newBalance,
            paidAt: new Date()
          }, { transaction });
          
          console.log(`   ✅ 처리 완료 - 환불: ${order.remainingAmount}원, 새 잔액: ${newBalance}원`);
          
          processedCount++;
          totalRefunded += order.remainingAmount;
          
        } catch (error) {
          console.error(`   ❌ 주문 ${order.id} 처리 실패:`, error.message);
        }
      }
      
      await transaction.commit();
      
      console.log(`\n🎉 부분 매칭 후처리 개선 완료!`);
      console.log(`📊 처리된 주문: ${processedCount}개`);
      console.log(`💰 총 환불 금액: ${totalRefunded.toLocaleString()}원`);
      
      return { processedCount, totalRefunded };
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 부분 매칭 후처리 개선 실패:', error.message);
      throw error;
    } finally {
      await sequelize.close();
    }
  }

  /**
   * 상세한 정산 메모 생성
   */
  generateDetailedSettlementNote(order) {
    const baseNote = order.settlementNote || '정산 완료';
    const partialInfo = `[부분 매칭] 원래 ${order.originalAmount?.toLocaleString()}원 중 ${order.filledAmount?.toLocaleString()}원 체결, ${order.remainingAmount?.toLocaleString()}원 취소`;
    
    return `${baseNote} - ${partialInfo}`;
  }

  /**
   * 환불 메모 생성
   */
  generateRefundMemo(order) {
    return `부분 매칭 후 남은 금액 자동 환불 - ${order.homeTeam} vs ${order.awayTeam} (${order.side} ${order.selection})`;
  }

  /**
   * 부분 매칭 통계 생성
   */
  async generatePartialMatchingStats() {
    try {
      console.log('\n📊 부분 매칭 통계 생성 중...');
      
      // 1. 전체 부분 매칭 주문 통계
      const totalStats = await ExchangeOrder.findOne({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalPartialMatches'],
          [sequelize.fn('SUM', sequelize.col('originalAmount')), 'totalOriginalAmount'],
          [sequelize.fn('SUM', sequelize.col('filledAmount')), 'totalFilledAmount'],
          [sequelize.fn('SUM', sequelize.col('remainingAmount')), 'totalRemainingAmount']
        ],
        where: { partiallyFilled: true }
      });
      
      // 2. 상태별 부분 매칭 주문 통계
      const statusStats = await ExchangeOrder.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('filledAmount')), 'totalFilledAmount']
        ],
        where: { partiallyFilled: true },
        group: ['status']
      });
      
      // 3. 사용자별 부분 매칭 통계
      const userStats = await ExchangeOrder.findAll({
        attributes: [
          'userId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'partialMatchCount'],
          [sequelize.fn('SUM', sequelize.col('filledAmount')), 'totalFilledAmount']
        ],
        where: { partiallyFilled: true },
        group: ['userId']
      });
      
      const stats = {
        total: {
          partialMatches: totalStats.dataValues.totalPartialMatches || 0,
          originalAmount: totalStats.dataValues.totalOriginalAmount || 0,
          filledAmount: totalStats.dataValues.totalFilledAmount || 0,
          remainingAmount: totalStats.dataValues.totalRemainingAmount || 0
        },
        byStatus: statusStats.map(stat => ({
          status: stat.status,
          count: parseInt(stat.dataValues.count),
          totalFilledAmount: parseFloat(stat.dataValues.totalFilledAmount) || 0
        })),
        byUser: userStats.map(stat => ({
          userId: stat.userId,
          partialMatchCount: parseInt(stat.dataValues.partialMatchCount),
          totalFilledAmount: parseFloat(stat.dataValues.totalFilledAmount) || 0
        }))
      };
      
      console.log('📊 부분 매칭 통계:');
      console.log(`   총 부분 매칭: ${stats.total.partialMatches}개`);
      console.log(`   총 원래 금액: ${stats.total.originalAmount.toLocaleString()}원`);
      console.log(`   총 체결 금액: ${stats.total.filledAmount.toLocaleString()}원`);
      console.log(`   총 남은 금액: ${stats.total.remainingAmount.toLocaleString()}원`);
      
      console.log('\n   상태별 통계:');
      stats.byStatus.forEach(stat => {
        console.log(`     ${stat.status}: ${stat.count}개 (체결: ${stat.totalFilledAmount.toLocaleString()}원)`);
      });
      
      return stats;
      
    } catch (error) {
      console.error('❌ 부분 매칭 통계 생성 실패:', error.message);
      throw error;
    }
  }

  /**
   * 부분 매칭 주문 검증
   */
  async validatePartialMatchingOrders() {
    try {
      console.log('\n🔍 부분 매칭 주문 검증 중...');
      
      // 1. 수학적 정확성 검증
      const validationErrors = [];
      
      const partialOrders = await ExchangeOrder.findAll({
        where: { partiallyFilled: true }
      });
      
      for (const order of partialOrders) {
        const calculatedTotal = (order.filledAmount || 0) + (order.remainingAmount || 0);
        const originalAmount = order.originalAmount || order.amount;
        
        if (Math.abs(calculatedTotal - originalAmount) > 1) { // 1원 오차 허용
          validationErrors.push({
            orderId: order.id,
            issue: '금액 불일치',
            originalAmount,
            calculatedTotal,
            difference: Math.abs(calculatedTotal - originalAmount)
          });
        }
        
        if (order.remainingAmount > 0 && order.status === 'settled') {
          validationErrors.push({
            orderId: order.id,
            issue: 'settled 상태에서 remainingAmount > 0',
            remainingAmount: order.remainingAmount
          });
        }
      }
      
      if (validationErrors.length === 0) {
        console.log('✅ 모든 부분 매칭 주문이 정상입니다.');
      } else {
        console.log(`⚠️ ${validationErrors.length}개의 문제가 발견되었습니다:`);
        validationErrors.forEach(error => {
          console.log(`   주문 ${error.orderId}: ${error.issue}`);
        });
      }
      
      return validationErrors;
      
    } catch (error) {
      console.error('❌ 부분 매칭 주문 검증 실패:', error.message);
      throw error;
    }
  }
}

// 메인 실행 함수
async function main() {
  try {
    const processor = new PartialMatchingPostProcessor();
    
    // 1. 부분 매칭 주문 검증
    await processor.validatePartialMatchingOrders();
    
    // 2. 부분 매칭 통계 생성
    await processor.generatePartialMatchingStats();
    
    // 3. 남은 금액 처리 개선
    await processor.improveRemainingAmountProcessing();
    
    console.log('\n🎉 모든 작업이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 메인 실행 실패:', error.message);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default PartialMatchingPostProcessor;





