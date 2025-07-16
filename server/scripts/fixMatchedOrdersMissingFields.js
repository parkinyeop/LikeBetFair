import ExchangeOrder from '../models/exchangeOrderModel.js';
import sequelize from '../models/sequelize.js';

(async () => {
  try {
    const t = await sequelize.transaction();
    // 1. homeTeam/awayTeam/selection이 비어있는 matched 주문 찾기
    const brokenOrders = await ExchangeOrder.findAll({
      where: {
        status: 'matched',
        [sequelize.Sequelize.Op.or]: [
          { homeTeam: null },
          { homeTeam: '' },
          { awayTeam: null },
          { awayTeam: '' },
          { selection: null },
          { selection: '' }
        ]
      }
    });
    console.log(`🔍 보정 대상 matched 주문: ${brokenOrders.length}개`);
    let fixed = 0;
    for (const order of brokenOrders) {
      // matchedOrderId로 연결된 원본 오더에서 값 복사
      let refOrder = null;
      if (order.matchedOrderId) {
        refOrder = await ExchangeOrder.findOne({ where: { id: order.matchedOrderId } });
      }
      // fallback: 같은 userId, gameId, status=open/cancelled 주문에서 값 복사
      if (!refOrder) {
        refOrder = await ExchangeOrder.findOne({
          where: {
            userId: order.userId,
            gameId: order.gameId,
            status: ['open', 'cancelled']
          },
          order: [['createdAt', 'DESC']]
        });
      }
      if (refOrder) {
        order.homeTeam = order.homeTeam || refOrder.homeTeam;
        order.awayTeam = order.awayTeam || refOrder.awayTeam;
        order.selection = order.selection || refOrder.selection;
        await order.save({ transaction: t });
        fixed++;
        console.log(`✅ 주문 ${order.id} 보정: homeTeam=${order.homeTeam}, awayTeam=${order.awayTeam}, selection=${order.selection}`);
      } else {
        console.log(`⚠️ 참조 주문 없음: 주문 ${order.id}`);
      }
    }
    await t.commit();
    console.log(`🎉 보정 완료: ${fixed}개 주문 수정됨`);
    process.exit(0);
  } catch (err) {
    console.error('❌ 보정 중 오류:', err);
    process.exit(1);
  }
})(); 