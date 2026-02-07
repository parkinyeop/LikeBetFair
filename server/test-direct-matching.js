// 직접 매칭 서비스 테스트
import directMatchingService from './services/directMatchingService.js';
import ExchangeOrder from './models/exchangeOrderModel.js';
import sequelize from './models/sequelize.js';
import { Op } from 'sequelize';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('🔍 직접 매칭 서비스 테스트\n');
    
    // 미정산 멀티벳 주문들 가져오기
    const multibetOrders = await ExchangeOrder.findAll({
      where: { 
        market: 'multibet',
        settledAt: null,
        status: { [Op.in]: ['matched', 'partially_matched'] }
      },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    
    console.log(`📊 테스트 대상: ${multibetOrders.length}개 멀티벳 주문\n`);
    
    for (const order of multibetOrders) {
      console.log(`🎯 주문 ID: ${order.id}`);
      console.log(`📅 생성일: ${order.createdAt.toISOString()}`);
      
      const matchResults = await directMatchingService.matchAllSelections(order);
      
      // 결과 요약
      const totalSelections = matchResults.length;
      const matchedSelections = matchResults.filter(r => r.matched).length;
      
      console.log(`\n📈 매칭 결과 요약:`);
      console.log(`  전체 선택: ${totalSelections}개`);
      console.log(`  매칭 성공: ${matchedSelections}개`);
      console.log(`  매칭률: ${((matchedSelections / totalSelections) * 100).toFixed(1)}%`);
      
      if (matchedSelections === totalSelections && totalSelections > 0) {
        console.log(`✅ 이 멀티벳은 즉시 정산 가능!`);
        
        // 정산 가능한 선택들의 결과 출력
        matchResults.forEach((result, i) => {
          if (result.matched) {
            console.log(`  ${i+1}. ${result.selection.selection} → ${result.gameResult.result}`);
          }
        });
      } else if (matchedSelections > 0) {
        console.log(`⚠️  부분 매칭 (${matchedSelections}/${totalSelections})`);
      } else {
        console.log(`❌ 매칭 실패`);
      }
      
      console.log('='.repeat(80));
    }
    
    // 단일 선택 테스트
    console.log('\n🧪 단일 선택 테스트:');
    const testSelection = {
      homeTeam: "Philadelphia Eagles",
      awayTeam: "Dallas Cowboys", 
      commenceTime: "2025-09-04T15:21:00.000Z"
    };
    
    console.log(`테스트 선택: ${testSelection.homeTeam} vs ${testSelection.awayTeam}`);
    const singleResult = await directMatchingService.findMatchingGameResult(testSelection);
    
    if (singleResult) {
      console.log(`✅ 단일 테스트 성공!`);
      console.log(`결과: ${singleResult.homeTeam} vs ${singleResult.awayTeam} → ${singleResult.result}`);
    } else {
      console.log(`❌ 단일 테스트 실패`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('테스트 오류:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();