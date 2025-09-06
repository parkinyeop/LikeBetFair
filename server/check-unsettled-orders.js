// 미정산 익스체인지 주문 분석 스크립트
import ExchangeOrder from './models/exchangeOrderModel.js';
import GameResult from './models/gameResultModel.js';
import User from './models/userModel.js';
import sequelize from './models/sequelize.js';
import { Op } from 'sequelize';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('🔍 미정산 익스체인지 주문 분석 시작\n');
    
    // 1. 전체 익스체인지 주문 통계
    const totalOrders = await ExchangeOrder.count();
    const settledOrders = await ExchangeOrder.count({
      where: { settledAt: { [Op.not]: null } }
    });
    const unsettledOrders = totalOrders - settledOrders;
    
    console.log('📊 전체 익스체인지 주문 통계:');
    console.log(`  전체 주문: ${totalOrders}개`);
    console.log(`  정산 완료: ${settledOrders}개`);
    console.log(`  미정산: ${unsettledOrders}개`);
    console.log();
    
    // 2. 미정산 주문들의 상태별 분류
    const unsettledByStatus = await ExchangeOrder.findAll({
      where: { settledAt: null },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });
    
    console.log('🏷️ 미정산 주문 상태별 분류:');
    unsettledByStatus.forEach(row => {
      console.log(`  ${row.status}: ${row.dataValues.count}개`);
    });
    console.log();
    
    // 3. 미정산 주문 중 경기 결과가 있는 경우 (정산 가능한 주문들)
    const unsettledWithGameResults = await ExchangeOrder.findAll({
      where: { 
        settledAt: null,
        gameResultId: { [Op.not]: null }
      },
      include: [{
        model: GameResult,
        as: 'gameResult',
        required: true,
        where: { 
          status: 'finished'
        }
      }],
      limit: 10
    });
    
    console.log('🎯 정산 가능한 미정산 주문들 (경기 완료):');
    console.log(`  총 ${unsettledWithGameResults.length}개 발견`);
    
    if (unsettledWithGameResults.length > 0) {
      console.log('\n📋 상위 10개 상세 정보:');
      unsettledWithGameResults.forEach((order, i) => {
        const game = order.gameResult;
        console.log(`  ${i+1}. 주문 ID: ${order.id}`);
        console.log(`     상태: ${order.status}`);
        console.log(`     경기: ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`     결과: ${game.result || 'Unknown'}`);
        console.log(`     생성: ${order.createdAt.toISOString().split('T')[0]}`);
        console.log(`     Market: ${order.market}`);
        console.log(`     배팅타입: ${order.betType} (odds: ${order.odds})`);
        console.log();
      });
    }
    
    // 4. 미정산 주문 중 경기 결과가 없는 경우
    const unsettledNoGameResults = await ExchangeOrder.count({
      where: { 
        settledAt: null,
        [Op.or]: [
          { gameResultId: null },
          { '$GameResult.id$': null }
        ]
      },
      include: [{
        model: GameResult,
        as: 'gameResult',
        required: false
      }]
    });
    
    console.log(`🚫 경기 결과가 없는 미정산 주문: ${unsettledNoGameResults}개`);
    
    // 5. 오래된 미정산 주문들 (7일 이상)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldUnsettledOrders = await ExchangeOrder.findAll({
      where: { 
        settledAt: null,
        createdAt: { [Op.lt]: sevenDaysAgo }
      },
      include: [{
        model: GameResult,
        as: 'gameResult',
        required: false
      }],
      order: [['createdAt', 'ASC']],
      limit: 5
    });
    
    console.log(`\n⏰ 7일 이상 오래된 미정산 주문: ${oldUnsettledOrders.length}개`);
    if (oldUnsettledOrders.length > 0) {
      oldUnsettledOrders.forEach((order, i) => {
        console.log(`  ${i+1}. ID: ${order.id}, 생성: ${order.createdAt.toISOString().split('T')[0]}, 상태: ${order.status}`);
        if (order.gameResult) {
          console.log(`     경기: ${order.gameResult.homeTeam} vs ${order.gameResult.awayTeam} (${order.gameResult.status})`);
        } else {
          console.log(`     경기 정보: 없음`);
        }
      });
    }
    
    // 6. 매칭된 주문 중 미정산인 경우 (가장 중요)
    const matchedUnsettled = await ExchangeOrder.count({
      where: { 
        settledAt: null,
        status: { [Op.in]: ['matched', 'partially_matched'] }
      }
    });
    
    console.log(`\n🔥 매칭된 주문 중 미정산: ${matchedUnsettled}개 ⚠️`);
    
    if (matchedUnsettled > 0) {
      const matchedDetails = await ExchangeOrder.findAll({
        where: { 
          settledAt: null,
          status: { [Op.in]: ['matched', 'partially_matched'] }
        },
        include: [{
          model: GameResult,
          required: false
        }],
        limit: 5
      });
      
      console.log('\n🚨 매칭된 미정산 주문 상세:');
      matchedDetails.forEach((order, i) => {
        console.log(`  ${i+1}. ID: ${order.id}`);
        console.log(`     상태: ${order.status}`);
        console.log(`     생성: ${order.createdAt.toISOString()}`);
        console.log(`     매칭 금액: ${order.matchedAmount || 'N/A'}`);
        if (order.gameResult) {
          console.log(`     경기: ${order.gameResult.homeTeam} vs ${order.gameResult.awayTeam}`);
          console.log(`     경기 상태: ${order.gameResult.status}`);
          console.log(`     경기 결과: ${order.gameResult.result || 'N/A'}`);
        }
        console.log();
      });
    }
    
    // 7. 결론 및 권장사항
    console.log('📋 분석 결론:');
    if (matchedUnsettled > 0) {
      console.log('  🚨 CRITICAL: 매칭된 주문이 정산되지 않고 있습니다!');
      console.log('  📝 조치 필요: 정산 로직 점검 및 수동 정산 실행');
    }
    
    if (unsettledWithGameResults.length > 0) {
      console.log('  ⚠️  WARNING: 경기가 완료되었으나 정산되지 않은 주문들 존재');
    }
    
    if (oldUnsettledOrders.length > 0) {
      console.log('  🔍 INFO: 오래된 미정산 주문들 정리 필요');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('분석 오류:', error);
    process.exit(1);
  }
})();