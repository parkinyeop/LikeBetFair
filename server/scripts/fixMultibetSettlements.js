import ExchangeOrder from '../models/exchangeOrderModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import User from '../models/userModel.js';
import multibetSettlementService from '../services/multibetSettlementService.js';
import { Op } from 'sequelize';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

/**
 * 기존 잘못 정산된 멀티배팅 주문들 재정산 처리 스크립트
 */
class MultibetSettlementFixer {
  
  async fixAllMultibetSettlements() {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('🔧 멀티배팅 정산 수정 시작...');
      
      // 1. 잘못 정산된 멀티배팅 주문들 찾기
      const wrongSettlements = await this.findWrongMultibetSettlements();
      console.log(`📋 수정 대상 멀티배팅 주문: ${wrongSettlements.length}개`);
      
      if (wrongSettlements.length === 0) {
        console.log('✅ 수정할 멀티배팅 주문이 없습니다.');
        await transaction.commit();
        return;
      }
      
      // 2. 각 주문에 대해 올바른 정산 수행
      let fixedCount = 0;
      let errorCount = 0;
      
      for (const order of wrongSettlements) {
        try {
          console.log(`\n🔄 주문 ${order.id} 수정 시작...`);
          
          // 기존 잘못된 정산 데이터 롤백
          await this.rollbackWrongSettlement(order, transaction);
          
          // 올바른 정산 수행
          await multibetSettlementService.settleMultibetOrder(order);
          
          fixedCount++;
          console.log(`✅ 주문 ${order.id} 수정 완료`);
          
        } catch (error) {
          errorCount++;
          console.error(`❌ 주문 ${order.id} 수정 실패:`, error.message);
        }
      }
      
      await transaction.commit();
      
      console.log(`\n🎉 멀티배팅 정산 수정 완료:`);
      console.log(`   수정 성공: ${fixedCount}개`);
      console.log(`   수정 실패: ${errorCount}개`);
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 멀티배팅 정산 수정 실패:', error);
      throw error;
    }
  }
  
  /**
   * 잘못 정산된 멀티배팅 주문들 찾기
   * @returns {Array} 잘못 정산된 주문들
   */
  async findWrongMultibetSettlements() {
    // 멀티배팅 주문 중 정산된 것들 조회
    const settledMultibets = await ExchangeOrder.findAll({
      where: {
        isMultibet: true,
        status: { [Op.in]: ['settled', 'partially_matched'] }
      },
      order: [['settledAt', 'DESC']]
    });
    
    console.log(`📊 정산된 멀티배팅 주문: ${settledMultibets.length}개`);
    
    const wrongSettlements = [];
    
    for (const order of settledMultibets) {
      // 해당 주문의 결제 내역 확인
      const payments = await PaymentHistory.findAll({
        where: { betId: `EXCHANGE_${order.id}` }
      });
      
      // 멀티배팅인데 개별 경기별로 정산된 경우 감지
      const hasMultipleGames = order.selectionDetails?.selections?.length > 1;
      const hasMultiplePayments = payments.length > 1;
      
      if (hasMultipleGames && hasMultiplePayments) {
        // 개별 경기별 정산 메모가 있는지 확인
        const hasIndividualSettlement = payments.some(p => 
          p.memo.includes('매칭 배팅 체결') || 
          p.memo.includes('완전 매칭') ||
          p.memo.includes('부분 매칭')
        );
        
        if (hasIndividualSettlement) {
          wrongSettlements.push(order);
          console.log(`⚠️ 잘못 정산된 주문 발견: ${order.id} (${payments.length}건 결제)`);
        }
      }
    }
    
    return wrongSettlements;
  }
  
  /**
   * 잘못된 정산 데이터 롤백
   * @param {Object} order - 주문
   * @param {Object} transaction - 트랜잭션
   */
  async rollbackWrongSettlement(order, transaction) {
    console.log(`🔄 주문 ${order.id} 롤백 시작...`);
    
    // 1. 기존 결제 내역 삭제
    await PaymentHistory.destroy({
      where: { betId: `EXCHANGE_${order.id}` },
      transaction
    });
    
    // 2. 사용자 잔액 복원
    const user = await User.findByPk(order.userId, { transaction });
    if (user) {
      // 원래 베팅 금액 복원
      user.balance += order.stakeAmount || order.amount;
      await user.save({ transaction });
      console.log(`   사용자 잔액 복원: +${order.stakeAmount || order.amount}원`);
    }
    
    // 3. 주문 상태 초기화
    await order.update({
      status: 'open',
      settledAt: null,
      actualProfit: null,
      profitLoss: null
    }, { transaction });
    
    console.log(`   주문 상태 초기화 완료`);
  }
  
  /**
   * 특정 주문만 수정
   * @param {number} orderId - 주문 ID
   */
  async fixSpecificOrder(orderId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🔧 주문 ${orderId} 수정 시작...`);
      
      const order = await ExchangeOrder.findByPk(orderId, { transaction });
      if (!order) {
        throw new Error(`주문 ${orderId}를 찾을 수 없습니다.`);
      }
      
      if (!order.isMultibet) {
        throw new Error(`주문 ${orderId}는 멀티배팅이 아닙니다.`);
      }
      
      // 기존 잘못된 정산 데이터 롤백
      await this.rollbackWrongSettlement(order, transaction);
      
      // 올바른 정산 수행
      await multibetSettlementService.settleMultibetOrder(order);
      
      await transaction.commit();
      
      console.log(`✅ 주문 ${orderId} 수정 완료`);
      
    } catch (error) {
      await transaction.rollback();
      console.error(`❌ 주문 ${orderId} 수정 실패:`, error);
      throw error;
    }
  }
  
  /**
   * 수정 전후 비교 리포트
   */
  async generateFixReport() {
    console.log('📊 멀티배팅 정산 수정 리포트 생성...');
    
    const allMultibets = await ExchangeOrder.findAll({
      where: { isMultibet: true },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\n📋 전체 멀티배팅 주문: ${allMultibets.length}개`);
    
    const statusCounts = {};
    allMultibets.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    console.log('\n📊 상태별 분포:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}개`);
    });
    
    // 잘못 정산된 주문들 분석
    const wrongSettlements = await this.findWrongMultibetSettlements();
    console.log(`\n⚠️ 잘못 정산된 주문: ${wrongSettlements.length}개`);
    
    if (wrongSettlements.length > 0) {
      console.log('\n🔍 잘못 정산된 주문 상세:');
      for (const order of wrongSettlements.slice(0, 5)) {
        const payments = await PaymentHistory.findAll({
          where: { betId: `EXCHANGE_${order.id}` }
        });
        
        console.log(`   주문 ${order.id}: ${order.selectionDetails?.selections?.length || 0}개 경기, ${payments.length}건 결제`);
        payments.forEach((p, i) => {
          console.log(`     ${i+1}. ${p.amount}원 - ${p.memo}`);
        });
      }
    }
  }
}

// 스크립트 실행
async function main() {
  const fixer = new MultibetSettlementFixer();
  
  try {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      const command = args[0];
      
      if (command === 'report') {
        await fixer.generateFixReport();
      } else if (command === 'fix' && args[1]) {
        const orderId = parseInt(args[1]);
        await fixer.fixSpecificOrder(orderId);
      } else {
        console.log('사용법:');
        console.log('  node fixMultibetSettlements.js report  # 리포트 생성');
        console.log('  node fixMultibetSettlements.js fix <orderId>  # 특정 주문 수정');
        console.log('  node fixMultibetSettlements.js  # 모든 주문 수정');
      }
    } else {
      await fixer.fixAllMultibetSettlements();
    }
    
    // 데이터베이스 연결 종료
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error);
    await sequelize.close();
    process.exit(1);
  }
}

main();
