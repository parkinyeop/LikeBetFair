import createScriptSequelize from '../config/scriptDatabase.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import { Op } from 'sequelize';

const sequelize = createScriptSequelize();

/**
 * 부당 정산된 멀티베팅 주문 찾기
 * - 경기 시작 시간보다 정산 시간이 빠른 주문
 * - scheduled 상태로 정산된 주문
 */
async function findInvalidSettlements() {
  try {
    console.log('\n🔍 부당 정산된 멀티베팅 주문 조회 시작...\n');

    // 1. 최근 7일간 정산된 멀티베팅 주문 조회
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const settledMultibets = await ExchangeOrder.findAll({
      where: {
        isMultibet: true,
        status: 'settled',
        settledAt: {
          [Op.gte]: sevenDaysAgo
        }
      },
      order: [['settledAt', 'DESC']],
      raw: true
    });

    console.log(`📊 최근 7일간 정산된 멀티베팅 주문: ${settledMultibets.length}개\n`);

    if (settledMultibets.length === 0) {
      console.log('✅ 정산된 멀티베팅 주문이 없습니다.');
      return;
    }

    // 2. 의심스러운 주문 필터링
    const suspiciousOrders = [];

    for (const order of settledMultibets) {
      const issues = [];

      // 경기 시작 시간과 정산 시간 비교
      if (order.commenceTime && order.settledAt) {
        const gameTime = new Date(order.commenceTime);
        const settledTime = new Date(order.settledAt);
        
        // 경기 시작 전에 정산된 경우
        if (settledTime < gameTime) {
          const hoursDiff = Math.floor((gameTime - settledTime) / (1000 * 60 * 60));
          const minutesDiff = Math.floor(((gameTime - settledTime) % (1000 * 60 * 60)) / (1000 * 60));
          issues.push(`경기 시작 ${hoursDiff}시간 ${minutesDiff}분 전에 정산됨`);
        }
      }

      // settlementNote에 'scheduled' 포함 여부
      if (order.settlementNote && order.settlementNote.includes('scheduled')) {
        issues.push(`정산 노트에 'scheduled' 상태 포함`);
      }

      // 생성 후 5분 이내 정산
      if (order.createdAt && order.settledAt) {
        const createdTime = new Date(order.createdAt);
        const settledTime = new Date(order.settledAt);
        const diffMinutes = Math.floor((settledTime - createdTime) / (1000 * 60));
        
        if (diffMinutes < 5) {
          issues.push(`생성 후 ${diffMinutes}분 만에 정산됨 (너무 빠름)`);
        }
      }

      if (issues.length > 0) {
        suspiciousOrders.push({
          order,
          issues
        });
      }
    }

    console.log(`🚨 의심스러운 주문: ${suspiciousOrders.length}개\n`);

    if (suspiciousOrders.length === 0) {
      console.log('✅ 부당 정산된 주문이 없습니다.');
      return;
    }

    // 3. 의심스러운 주문 상세 출력
    console.log('📋 의심스러운 주문 목록:\n');
    
    for (const { order, issues } of suspiciousOrders) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🚨 주문 ID: ${order.id}`);
      console.log(`👤 사용자 ID: ${order.userId}`);
      console.log(`📅 생성 시간: ${order.createdAt}`);
      console.log(`⚖️  정산 시간: ${order.settledAt}`);
      console.log(`🏟️  경기 시작: ${order.commenceTime}`);
      console.log(`🎯 경기: ${order.homeTeam} vs ${order.awayTeam}`);
      console.log(`💰 베팅 금액: ${order.stakeAmount}원`);
      console.log(`📊 실제 수익: ${order.actualProfit}원`);
      console.log(`📝 정산 노트: ${order.settlementNote}`);
      console.log(`\n⚠️  문제점:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 4. 복구 대상 주문 요약
    const totalRefund = suspiciousOrders.reduce((sum, { order }) => {
      const refund = Math.abs(parseFloat(order.actualProfit || 0)) + parseFloat(order.stakeAmount || 0);
      return sum + refund;
    }, 0);

    console.log('📊 복구 대상 요약:');
    console.log(`  - 총 주문 수: ${suspiciousOrders.length}개`);
    console.log(`  - 총 환불 금액: ${totalRefund}원`);
    console.log('\n⚠️  복구 스크립트를 실행하려면 fix-order-343.js를 실행하세요.');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ 조회 실패:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

findInvalidSettlements();

