import sequelize from './models/sequelize.js';
import ExchangeOrder from './models/exchangeOrderModel.js';
import { Op } from 'sequelize';

async function analyzeExchangeOrders() {
  try {
    console.log('=== 📊 ExchangeOrders 데이터베이스 분석 보고서 ===\n');
    
    // 1. 전체 통계
    const totalCount = await ExchangeOrder.count();
    console.log('📈 전체 주문 수:', totalCount);
    
    if (totalCount === 0) {
      console.log('❌ 데이터가 없습니다.');
      return;
    }
    
    // 2. 상태별 통계
    const statusStats = await ExchangeOrder.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    console.log('\n📊 상태별 주문 분포:');
    statusStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.dataValues.count}개`);
    });
    
    // 3. 사이드별 통계
    const sideStats = await ExchangeOrder.findAll({
      attributes: [
        'side',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['side']
    });
    console.log('\n🎯 사이드별 주문 분포:');
    sideStats.forEach(stat => {
      console.log(`  ${stat.side}: ${stat.dataValues.count}개`);
    });
    
    // 4. 마켓별 통계
    const marketStats = await ExchangeOrder.findAll({
      attributes: [
        'market',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['market']
    });
    console.log('\n🏪 마켓별 주문 분포:');
    marketStats.forEach(stat => {
      console.log(`  ${stat.market}: ${stat.dataValues.count}개`);
    });
    
    // 5. 스포츠별 통계
    const sportStats = await ExchangeOrder.findAll({
      attributes: [
        'sportKey',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['sportKey']
    });
    console.log('\n⚽ 스포츠별 주문 분포:');
    sportStats.forEach(stat => {
      console.log(`  ${stat.sportKey || '미지정'}: ${stat.dataValues.count}개`);
    });
    
    // 6. 금액 통계
    const amountStats = await ExchangeOrder.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'avgAmount'],
        [sequelize.fn('MIN', sequelize.col('amount')), 'minAmount'],
        [sequelize.fn('MAX', sequelize.col('amount')), 'maxAmount']
      ]
    });
    console.log('\n💰 금액 통계:');
    console.log(`  총 베팅 금액: ${amountStats.dataValues.totalAmount?.toLocaleString()}원`);
    console.log(`  평균 베팅 금액: ${Math.round(amountStats.dataValues.avgAmount || 0).toLocaleString()}원`);
    console.log(`  최소 베팅 금액: ${amountStats.dataValues.minAmount?.toLocaleString()}원`);
    console.log(`  최대 베팅 금액: ${amountStats.dataValues.maxAmount?.toLocaleString()}원`);
    
    // 7. 최근 주문들
    const recentOrders = await ExchangeOrder.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    console.log('\n🕒 최근 주문 5개:');
    recentOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. ID: ${order.id}, ${order.homeTeam} vs ${order.awayTeam}`);
      console.log(`     ${order.side} ${order.amount.toLocaleString()}원 @ ${order.price}, 상태: ${order.status}`);
      console.log(`     생성: ${order.createdAt.toLocaleString()}`);
    });
    
    // 8. 매칭 상태 분석
    const matchedCount = await ExchangeOrder.count({
      where: { matchedOrderId: { [Op.not]: null } }
    });
    console.log(`\n🔗 매칭된 주문: ${matchedCount}개`);
    
    // 9. 정산 상태 분석
    const settledCount = await ExchangeOrder.count({
      where: { settledAt: { [Op.not]: null } }
    });
    console.log(`📋 정산 완료된 주문: ${settledCount}개`);
    
    // 10. 게임 연동 상태
    const withGameResult = await ExchangeOrder.count({
      where: { gameResultId: { [Op.not]: null } }
    });
    console.log(`🎮 게임 결과 연동된 주문: ${withGameResult}개`);
    
    console.log('\n=== 📊 분석 완료 ===');
    
  } catch (error) {
    console.error('❌ 분석 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeExchangeOrders(); 