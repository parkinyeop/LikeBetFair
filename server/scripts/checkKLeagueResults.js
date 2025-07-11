import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

async function checkKLeagueResults() {
  try {
    console.log('=== 🔍 K리그 경기 결과 상태 확인 ===\n');
    
    const now = new Date();
    
    // 1. 과거 경기 중 아직 scheduled 상태인 것들
    const pastScheduledGames = await GameResult.findAll({
      where: {
        subCategory: 'KLEAGUE1',
        status: 'scheduled',
        commenceTime: { [Op.lt]: now }
      },
      order: [['commenceTime', 'DESC']]
    });
    
    console.log(`📊 과거 경기인데 아직 scheduled 상태: ${pastScheduledGames.length}개\n`);
    
    if (pastScheduledGames.length > 0) {
      console.log('🚨 문제가 있는 경기들:');
      pastScheduledGames.forEach((game, index) => {
        console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`      경기 시간: ${game.commenceTime}`);
        console.log(`      상태: ${game.status}, 결과: ${game.result}`);
        console.log(`      스코어: ${JSON.stringify(game.score)}`);
        console.log(`      이벤트 ID: ${game.eventId}`);
        console.log('');
      });
    }
    
    // 2. 최근 K리그 경기들 (상태별)
    const recentGames = await GameResult.findAll({
      where: {
        subCategory: 'KLEAGUE1'
      },
      order: [['commenceTime', 'DESC']],
      limit: 20
    });
    
    console.log(`📋 최근 K리그 경기들 (최근 20개):`);
    
    const statusCount = { scheduled: 0, finished: 0, live: 0, cancelled: 0 };
    
    recentGames.forEach((game, index) => {
      const status = game.status;
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      const isPast = game.commenceTime < now;
      const statusIcon = isPast && status === 'scheduled' ? '🚨' : 
                        status === 'finished' ? '✅' : 
                        status === 'live' ? '🔴' : '⏳';
      
      console.log(`   ${index + 1}. ${statusIcon} ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime.toLocaleString('ko-KR')}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
      console.log('');
    });
    
    console.log(`📊 상태별 통계:`);
    console.log(`   - 예정됨: ${statusCount.scheduled}개`);
    console.log(`   - 완료됨: ${statusCount.finished}개`);
    console.log(`   - 진행중: ${statusCount.live}개`);
    console.log(`   - 취소됨: ${statusCount.cancelled}개`);
    
    // 3. 특정 경기 상세 확인 (Anyang vs Gwangju FC)
    const specificGame = await GameResult.findOne({
      where: {
        homeTeam: 'Anyang',
        awayTeam: 'Gwangju FC',
        commenceTime: new Date('2025-06-28T10:00:00+09:00')
      }
    });
    
    if (specificGame) {
      console.log(`\n🎯 특정 경기 상세 정보 (Anyang vs Gwangju FC):`);
      console.log(`   ID: ${specificGame.id}`);
      console.log(`   경기 시간: ${specificGame.commenceTime}`);
      console.log(`   상태: ${specificGame.status}`);
      console.log(`   결과: ${specificGame.result}`);
      console.log(`   스코어: ${JSON.stringify(specificGame.score)}`);
      console.log(`   이벤트 ID: ${specificGame.eventId}`);
      console.log(`   생성 시간: ${specificGame.createdAt}`);
      console.log(`   마지막 업데이트: ${specificGame.lastUpdated}`);
    } else {
      console.log(`\n❌ Anyang vs Gwangju FC 경기를 찾을 수 없습니다.`);
    }
    
    console.log(`\n✅ 확인 완료!`);
    
  } catch (error) {
    console.error('❌ 확인 중 오류:', error);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  checkKLeagueResults()
    .then(() => {
      console.log('\n✅ K리그 결과 확인 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default checkKLeagueResults; 