// 멀티벳 주문 정산 문제 심층 분석
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
    console.log('🔍 멀티벳 정산 문제 심층 분석\n');
    
    // 1. 미정산 멀티벳 주문 조회
    const unsettledMultibets = await ExchangeOrder.findAll({
      where: { 
        settledAt: null,
        market: 'multibet',
        status: { [Op.in]: ['matched', 'partially_matched'] }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`📊 분석할 미정산 멀티벳 주문: ${unsettledMultibets.length}개\n`);
    
    for (const order of unsettledMultibets) {
      console.log(`🎯 주문 ID: ${order.id}`);
      console.log(`   생성일: ${order.createdAt.toISOString()}`);
      console.log(`   상태: ${order.status}`);
      console.log(`   GameResultId: ${order.gameResultId || 'NULL'}`);
      
      // 2. 멀티벳 테이블에서 해당 주문 찾기
      try {
        const multibet = await ExchangeMultibet.findOne({
          where: { exchangeOrderId: order.id }
        });
        
        if (multibet) {
          console.log(`   ✅ 멀티벳 레코드 존재 - ID: ${multibet.id}`);
          console.log(`   멀티벳 상태: ${multibet.status}`);
          
          // 3. 멀티벳 선택 항목들 조회
          const selections = await ExchangeMultibetSelection.findAll({
            where: { multibetId: multibet.id }
          });
          
          console.log(`   📊 선택 항목: ${selections.length}개`);
          
          let mappingIssues = 0;
          let settledSelections = 0;
          
          for (const [i, selection] of selections.entries()) {
            console.log(`     ${i+1}. gameId: "${selection.gameId}"`);
            console.log(`        selection: "${selection.selection}"`);
            console.log(`        gameResultId: ${selection.gameResultId || 'NULL'}`);
            
            // gameResultId가 NULL인 경우 매핑 문제 확인
            if (!selection.gameResultId) {
              mappingIssues++;
              
              // gameId를 사용해서 OddsCache에서 찾기
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
                console.log(`           OddsCache gameResultId: ${oddsCache.gameResultId || 'NULL'}`);
                console.log(`           commence_time: ${oddsCache.commenceTime}`);
                
                if (oddsCache.gameResultId) {
                  const gameResult = await GameResult.findByPk(oddsCache.gameResultId);
                  if (gameResult) {
                    console.log(`        ✅ GameResult 존재: ${gameResult.status} - ${gameResult.result}`);
                    if (gameResult.status === 'finished' && gameResult.result) {
                      settledSelections++;
                      console.log(`        🎯 정산 가능한 선택!`);
                    }
                  } else {
                    console.log(`        ❌ GameResult 없음 (ID: ${oddsCache.gameResultId})`);
                  }
                }
              } else {
                console.log(`        🚫 OddsCache에서 찾을 수 없음: "${selection.gameId}"`);
                
                // gameId 형태 분석
                console.log(`        🔍 gameId 형태 분석:`);
                console.log(`           길이: ${selection.gameId.length}`);
                console.log(`           타입: ${typeof selection.gameId}`);
                console.log(`           contains 'vs': ${selection.gameId.includes(' vs ')}`);
              }
            } else {
              // gameResultId가 있는 경우
              const gameResult = await GameResult.findByPk(selection.gameResultId);
              if (gameResult && gameResult.status === 'finished' && gameResult.result) {
                settledSelections++;
              }
            }
            console.log();
          }
          
          console.log(`   📈 매핑 통계:`);
          console.log(`     매핑 실패: ${mappingIssues}개`);
          console.log(`     정산 가능: ${settledSelections}개`);
          console.log(`     전체 선택: ${selections.length}개`);
          
          if (mappingIssues === 0 && settledSelections === selections.length) {
            console.log(`   🎯 이 멀티벳은 즉시 정산 가능!`);
          } else if (mappingIssues > 0) {
            console.log(`   ⚠️  GameResult 매핑 문제로 정산 불가`);
          } else {
            console.log(`   ⏳ 일부 경기 결과 대기 중`);
          }
          
        } else {
          console.log(`   ❌ 멀티벳 레코드 없음!`);
        }
      } catch (error) {
        console.error(`   멀티벳 분석 오류: ${error.message}`);
      }
      
      console.log('---'.repeat(40));
    }
    
    // 4. 전체 통계
    const totalMultibetSelections = await sequelize.query(`
      SELECT 
        COUNT(*) as total_selections,
        COUNT(CASE WHEN "gameResultId" IS NOT NULL THEN 1 END) as mapped_selections,
        COUNT(CASE WHEN "gameResultId" IS NULL THEN 1 END) as unmapped_selections
      FROM "ExchangeMultibetSelections"
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📊 전체 멀티벳 선택 통계:');
    if (totalMultibetSelections.length > 0) {
      const stats = totalMultibetSelections[0];
      console.log(`  전체 선택: ${stats.total_selections}개`);
      console.log(`  매핑 성공: ${stats.mapped_selections}개`);
      console.log(`  매핑 실패: ${stats.unmapped_selections}개`);
      console.log(`  매핑률: ${((stats.mapped_selections / stats.total_selections) * 100).toFixed(1)}%`);
    }
    
    console.log('\n🔧 권장 해결 방안:');
    console.log('  1. ExchangeMultibetSelection의 gameId와 OddsCache/GameResult 매핑 로직 수정');
    console.log('  2. gameId 형식 표준화 (팀명 vs 팀명 형태로 통일)');
    console.log('  3. 매핑 실패 시 자동 재매핑 스크립트 구현');
    console.log('  4. 멀티벳 정산 시 선택별 GameResult 확인 로직 강화');
    
    process.exit(0);
    
  } catch (error) {
    console.error('분석 오류:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();