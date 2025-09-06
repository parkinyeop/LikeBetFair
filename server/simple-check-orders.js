// 간단한 미정산 주문 분석
import ExchangeOrder from './models/exchangeOrderModel.js';
import sequelize from './models/sequelize.js';
import { Op } from 'sequelize';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('🔍 미정산 익스체인지 주문 간단 분석\n');
    
    // 1. 기본 통계
    const totalOrders = await ExchangeOrder.count();
    const settledOrders = await ExchangeOrder.count({
      where: { settledAt: { [Op.not]: null } }
    });
    const unsettledOrders = totalOrders - settledOrders;
    
    console.log('📊 기본 통계:');
    console.log(`  전체: ${totalOrders}, 정산완료: ${settledOrders}, 미정산: ${unsettledOrders}`);
    console.log();
    
    // 2. 상태별 미정산 주문
    const statusCounts = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM "ExchangeOrders" 
      WHERE "settledAt" IS NULL 
      GROUP BY status
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('🏷️ 미정산 주문 상태별:');
    statusCounts.forEach(row => {
      console.log(`  ${row.status}: ${row.count}개`);
    });
    console.log();
    
    // 3. 매칭된 미정산 주문 (가장 중요!)
    const matchedUnsettled = await ExchangeOrder.findAll({
      where: { 
        settledAt: null,
        status: { [Op.in]: ['matched', 'partially_matched'] }
      },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`🚨 매칭된 미정산 주문: ${matchedUnsettled.length}개`);
    if (matchedUnsettled.length > 0) {
      matchedUnsettled.forEach((order, i) => {
        console.log(`  ${i+1}. ID: ${order.id}`);
        console.log(`     상태: ${order.status}`);
        console.log(`     생성: ${order.createdAt.toISOString()}`);
        console.log(`     GameResultId: ${order.gameResultId || 'NULL'}`);
        console.log(`     매칭금액: ${order.matchedAmount || 'N/A'}`);
        console.log(`     Market: ${order.market} | Side: ${order.side}`);
        console.log();
      });
    }
    
    // 4. gameResultId가 있는 미정산 주문
    const withGameResult = await ExchangeOrder.count({
      where: { 
        settledAt: null,
        gameResultId: { [Op.not]: null }
      }
    });
    
    console.log(`🎯 GameResultId가 있는 미정산: ${withGameResult}개`);
    
    // 5. 최근 생성된 미정산 주문들
    const recentUnsettled = await ExchangeOrder.findAll({
      where: { settledAt: null },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('\n📅 최근 미정산 주문 5개:');
    recentUnsettled.forEach((order, i) => {
      console.log(`  ${i+1}. ID: ${order.id} | 상태: ${order.status} | 생성: ${order.createdAt.toISOString().split('T')[0]}`);
    });
    
    // 6. 결론
    console.log('\n📋 분석 결론:');
    if (matchedUnsettled.length > 0) {
      console.log('  🚨 CRITICAL: 매칭된 주문이 정산되지 않고 있음!');
      console.log('  🔧 조치필요: 정산 로직 점검 및 수동 정산 필요');
    } else {
      console.log('  ✅ 매칭된 주문들은 모두 정상 정산 중');
    }
    
    if (withGameResult > 0) {
      console.log(`  ⚠️  WARNING: ${withGameResult}개 주문이 경기결과가 있으나 미정산`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('오류:', error.message);
    process.exit(1);
  }
})();