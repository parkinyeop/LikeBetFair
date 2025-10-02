// server/jobs/forceSettleBets.js
import betResultService from '../services/betResultService.js';
import multibetSettlementService from '../services/multibetSettlementService.js';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

async function run() {
  console.log('🎯 [Manual Job] 모든 Pending 상태 베팅에 대한 강제 정산을 시작합니다...');
  try {
    // 스포츠북 정산
    console.log('📊 [1/2] 스포츠북 베팅 정산 중...');
    const betResult = await betResultService.updateBetResults();
    console.log(`✅ [1/2] 스포츠북 정산 완료: ${betResult.updatedCount}개 정산, ${betResult.errorCount}개 실패`);

    // 익스체인지 멀티베팅 정산
    console.log('📊 [2/2] 익스체인지 멀티베팅 정산 중...');
    const multibetResult = await multibetSettlementService.settleAllMultibetOrders();
    console.log(`✅ [2/2] 익스체인지 멀티베팅 정산 완료`);
    console.log(`   - 성공: ${multibetResult?.settledCount || 0}개`);
    console.log(`   - 실패: ${multibetResult?.errorCount || 0}개`);
    console.log(`   - 타임아웃: ${multibetResult?.timeoutCount || 0}개`);

  } catch (error) {
    console.error('❌ [Manual Job] 강제 정산 중 오류 발생:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('🔌 [Manual Job] 데이터베이스 연결이 종료되었습니다.');
    process.exit(0);
  }
}

run();



