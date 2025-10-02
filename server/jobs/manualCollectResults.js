// server/jobs/manualCollectResults.js
import gameResultService from '../services/gameResultService.js';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

async function run() {
  console.log('🔍 [Manual Job] 9월 30일 이후 누락된 경기 결과 수집을 시작합니다...');
  try {
    const result = await gameResultService.fetchAndSaveAllResults();
    console.log(`✅ [Manual Job] 수집 완료: ${result.newCount}개 신규 경기 추가, ${result.updatedCount}개 경기 업데이트`);
  } catch (error) {
    console.error('❌ [Manual Job] 경기 결과 수집 중 오류 발생:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('🔌 [Manual Job] 데이터베이스 연결이 종료되었습니다.');
    process.exit(0);
  }
}

run();



