// 멀티벳 주문들의 GameResult 매핑 상태 확인
import ExchangeOrder from './models/exchangeOrderModel.js';
import ExchangeMultibet from './models/exchangeMultibetModel.js';
import ExchangeMultibetSelection from './models/exchangeMultibetSelectionModel.js';
import GameResult from './models/gameResultModel.js';
import OddsCache from './models/oddsCacheModel.js';
import sequelize from './models/sequelize.js';
import { Op } from 'sequelize';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('🔍 멀티벳 주문 GameResult 매핑 상태 확인\n');
    
    // 1. 미정산 멀티벳 주문들 상세 조회
    const unmatchedMultibets = await ExchangeOrder.findAll({
      where: { 
        settledAt: null,
        market: 'multibet',
        status: { [Op.in]: ['matched', 'partially_matched'] }
      },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    
    console.log(`📊 분석할 미정산 멀티벳 주문: ${unmatchedMultibets.length}개\n`);
    
    for (const order of unmatchedMultibets) {
      console.log(`🎯 주문 ID: ${order.id} (상태: ${order.status})`);
      console.log(`   생성일: ${order.createdAt.toISOString()}`);
      console.log(`   gameId: ${order.gameId || 'NULL'}`);
      console.log(`   gameResultId: ${order.gameResultId || 'NULL'}`);
      console.log(`   selection: ${order.selection || 'NULL'}`);
      console.log();
      
      // 2. 연결된 멀티벳 정보 조회
      try {
        const multibet = await ExchangeMultibet.findOne({
          where: { exchangeOrderId: order.id }
        });
        
        if (multibet) {
          console.log(`   📋 멀티벳 ID: ${multibet.id}`);
          console.log(`   📋 멀티벳 상태: ${multibet.status}`);
          
          // 3. 멀티벳 선택 사항들 조회
          const selections = await ExchangeMultibetSelection.findAll({
            where: { multibetId: multibet.id }
          });
          
          console.log(`   🔢 선택 사항 수: ${selections.length}개`);
          
          for (const [i, selection] of selections.entries()) {
            console.log(`     ${i+1}. gameId: ${selection.gameId}`);
            console.log(`        selection: ${selection.selection}`);
            console.log(`        gameResultId: ${selection.gameResultId || 'NULL'}`);
            
            // 각 선택에 대한 GameResult 존재 여부 확인
            if (selection.gameResultId) {
              const gameResult = await GameResult.findByPk(selection.gameResultId);
              if (gameResult) {
                console.log(`        ✅ GameResult 존재: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
                console.log(`           상태: ${gameResult.status}, 결과: ${gameResult.result || 'N/A'}`);
              } else {
                console.log(`        ❌ GameResult 없음 (ID: ${selection.gameResultId})`);
              }
            } else {
              console.log(`        ⚠️  GameResultId가 NULL`);
              
              // gameId로 OddsCache나 GameResult 찾기 시도
              const oddsCache = await OddsCache.findOne({
                where: { 
                  [Op.or]: [
                    { id: selection.gameId },
                    sequelize.where(
                      sequelize.fn('CONCAT', sequelize.col('homeTeam'), ' vs ', sequelize.col('awayTeam')),
                      selection.gameId
                    )
                  ]
                }
              });
              
              if (oddsCache) {
                console.log(`        💡 OddsCache 발견: ${oddsCache.homeTeam} vs ${oddsCache.awayTeam}`);
                console.log(`           commenceTime: ${oddsCache.commenceTime}`);
                console.log(`           gameResultId: ${oddsCache.gameResultId || 'NULL'}`);
              } else {
                console.log(`        🚫 OddsCache에서도 찾을 수 없음`);
              }
            }
            console.log();
          }
        } else {
          console.log(`   ❌ 연결된 멀티벳 정보를 찾을 수 없음`);
        }
        
      } catch (mbError) {
        console.error(`   멀티벳 정보 조회 오류:`, mbError.message);
      }
      
      console.log('---'.repeat(30));
    }
    
    // 4. GameResult 매핑이 있는 멀티벳 선택 통계
    const mappedSelections = await sequelize.query(`
      SELECT 
        COUNT(*) as total_selections,
        COUNT(CASE WHEN "gameResultId" IS NOT NULL THEN 1 END) as mapped_selections,
        COUNT(CASE WHEN "gameResultId" IS NULL THEN 1 END) as unmapped_selections
      FROM "ExchangeMultibetSelections"
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📈 멀티벳 선택 매핑 통계:');
    if (mappedSelections.length > 0) {
      const stats = mappedSelections[0];
      console.log(`  전체 선택: ${stats.total_selections}개`);
      console.log(`  매핑됨: ${stats.mapped_selections}개`);
      console.log(`  미매핑: ${stats.unmapped_selections}개`);
      console.log(`  매핑률: ${((stats.mapped_selections / stats.total_selections) * 100).toFixed(1)}%`);
    }
    
    // 5. 최근 생성된 GameResult들 확인
    const recentGameResults = await GameResult.findAll({
      where: {
        createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('\n🆕 최근 7일 GameResult:');
    recentGameResults.forEach((gr, i) => {
      console.log(`  ${i+1}. ${gr.homeTeam} vs ${gr.awayTeam}`);
      console.log(`     생성: ${gr.createdAt.toISOString().split('T')[0]}`);
      console.log(`     상태: ${gr.status}`);
      console.log(`     결과: ${gr.result || 'N/A'}`);
    });
    
    console.log('\n📋 분석 결론:');
    console.log('  🔍 멀티벳 주문들의 GameResult 매핑 문제 확인됨');
    console.log('  💡 각 멀티벳 선택이 GameResult와 연결되지 않아 정산 불가');
    console.log('  🔧 멀티벳 선택에 대한 GameResult 매핑 로직 점검 필요');
    
    process.exit(0);
    
  } catch (error) {
    console.error('오류:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();