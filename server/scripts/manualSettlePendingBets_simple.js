import dotenv from 'dotenv';
import createScriptSequelize from '../config/scriptDatabase.js';
import Bet from '../models/betModel.js';
import User from '../models/userModel.js';

dotenv.config();

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

/**
 * 🚀 Phase 2.5: 간단하고 안전한 수동 정산 스크립트
 * 기존 필드만 사용하여 트랜잭션 보장
 */
async function manualSettlePendingBets() {
  try {
    console.log('🔍 수동 정산 스크립트 시작...');
    console.log('환경:', process.env.NODE_ENV || 'development');
    
    // 1. 데이터베이스 연결 확인
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공!');
    
    // 2. 정산 로직을 위한 import
    const betResultService = (await import('../services/betResultService.js')).default;
    
    // 3. 현재 pending 베팅 수 확인
    const totalPendingCount = await Bet.count({
      where: { status: 'pending' }
    });
    
    console.log(`📊 현재 pending 상태인 베팅: ${totalPendingCount}개`);
    
    if (totalPendingCount === 0) {
      console.log('✅ 처리할 pending 베팅이 없습니다.');
      return;
    }
    
    // 4. 배치 단위로 처리 (DB 부하를 고려하여 50개씩)
    const batchSize = 50;
    let processedCount = 0;
    let successCount = 0;
    let failCount = 0;
    
    while (processedCount < totalPendingCount) {
      const pendingBets = await Bet.findAll({
        where: { status: 'pending' },
        limit: batchSize,
        order: [['createdAt', 'ASC']], // 오래된 베팅부터 처리
        include: [{ model: User, attributes: ['email', 'username'] }]
      });
      
      if (pendingBets.length === 0) {
        console.log('📋 더 이상 처리할 pending 베팅이 없습니다.');
        break;
      }
      
      console.log(`\n🔄 배치 ${Math.floor(processedCount / batchSize) + 1} 처리 시작 (${pendingBets.length}개)`);
      
      for (const bet of pendingBets) {
        // 트랜잭션으로 안전하게 처리
        const transaction = await sequelize.transaction();
        
        try {
          console.log(`\n📝 베팅 ID ${bet.id} 처리 중...`);
          console.log(`   - 사용자: ${bet.user?.email || bet.userId}`);
          console.log(`   - 배팅금액: ${bet.stake}원`);
          console.log(`   - 예상수익: ${bet.potentialWinnings}원`);
          console.log(`   - 선택 개수: ${bet.selections?.length || 0}개`);
          
          // 개선된 매칭 로직을 사용하여 정산 처리 (트랜잭션 전달)
          const result = await betResultService.processBetResult(bet, { transaction });
          
          await transaction.commit();
          
          if (result) {
            console.log(`✅ 베팅 ID ${bet.id} 정산 완료`);
            successCount++;
          } else {
            console.log(`⏳ 베팅 ID ${bet.id} 여전히 pending 상태 (경기 미완료)`);
          }
          
        } catch (error) {
          await transaction.rollback();
          console.error(`❌ 베팅 ID ${bet.id} 정산 실패:`, error.message);
          console.error('   상세 오류:', error.stack);
          failCount++;
        }
        
        processedCount++;
        
        // 처리 간격 (DB 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ 배치 ${Math.floor((processedCount - batchSize) / batchSize) + 1} 처리 완료`);
    }
    
    // 5. 최종 통계 출력
    console.log('\n🎉 수동 정산 작업 완료!');
    console.log('='.repeat(50));
    console.log(`📊 처리 통계:`);
    console.log(`   - 총 처리: ${processedCount}개`);
    console.log(`   - 성공: ${successCount}개`);
    console.log(`   - 실패: ${failCount}개`);
    console.log(`   - 여전히 pending: ${totalPendingCount - successCount - failCount}개`);
    
    // 6. 처리 후 상태 확인
    const remainingPendingCount = await Bet.count({
      where: { status: 'pending' }
    });
    
    console.log(`\n📈 정산 후 상태:`);
    console.log(`   - 처리 전 pending: ${totalPendingCount}개`);
    console.log(`   - 처리 후 pending: ${remainingPendingCount}개`);
    console.log(`   - 정산 완료: ${totalPendingCount - remainingPendingCount}개`);
    
    if (remainingPendingCount > 0) {
      console.log(`\n⚠️  여전히 ${remainingPendingCount}개의 pending 베팅이 남아있습니다.`);
      console.log('   이는 경기 결과가 아직 나오지 않았거나, 매칭 불가능한 베팅일 수 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 수동 정산 스크립트 실행 중 오류:', error);
    console.error('상세 오류:', error.stack);
  } finally {
    // 데이터베이스 연결 종료
    await sequelize.close();
    console.log('🔒 데이터베이스 연결 종료');
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  manualSettlePendingBets()
    .then(() => {
      console.log('✅ 수동 정산 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 수동 정산 스크립트 실패:', error);
      process.exit(1);
    });
}

export default manualSettlePendingBets;
