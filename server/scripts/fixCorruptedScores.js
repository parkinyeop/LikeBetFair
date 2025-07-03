import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/sequelize.js';

async function fixCorruptedScores() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔧 불완전한 스코어 데이터 수정 시작...\n');
    
    // 불완전한 스코어 데이터 조회 (PostgreSQL JSONB 타입 고려)
    const corruptedGames = await GameResult.findAll({
      where: sequelize.where(
        sequelize.cast(sequelize.col('score'), 'TEXT'),
        {
          [Op.or]: [
            { [Op.like]: '%,%' },  // 콤마 형태
            { [Op.like]: '%[object Object]%' },  // 객체 오류  
            { [Op.regexp]: '^[0-9]+,$' },  // 숫자,
            { [Op.regexp]: '^,[0-9]+$' },  // ,숫자
            { [Op.regexp]: '^[0-9]+,[0-9]+$' },  // 숫자,숫자
            { [Op.eq]: ',' }  // 빈 콤마
          ]
        }
      ),
      transaction
    });
    
    console.log(`📊 수정 대상: ${corruptedGames.length}개 경기\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const game of corruptedGames) {
      console.log(`🔧 수정 중: ${game.homeTeam} vs ${game.awayTeam} (${game.subCategory})`);
      console.log(`   현재 스코어: "${game.score}"`);
      
      let newScore = null;
      let newResult = 'pending';
      let newStatus = 'finished';
      
      // 스코어 타입별 처리
      if (game.score === ',' || game.score === '') {
        // 빈 콤마 - 결과 불명으로 처리
        console.log('   → 빈 스코어: 결과 불명으로 처리');
        newResult = 'pending';
        newStatus = 'scheduled';
        newScore = null;
        
      } else if (game.score.includes('[object Object]')) {
        // 객체 오류 - 결과 불명으로 처리
        console.log('   → 객체 오류: 결과 불명으로 처리');
        newResult = 'pending';
        newStatus = 'scheduled';
        newScore = null;
        
      } else if (game.score.match(/^[0-9]+,$/)) {
        // "5," 형태 - 홈팀 스코어만 있음
        const homeScore = game.score.replace(',', '');
        console.log(`   → 홈팀 스코어만 있음: ${homeScore} (원정팀 불명)`);
        newScore = JSON.stringify([
          {"name": game.homeTeam, "score": homeScore},
          {"name": game.awayTeam, "score": "0"}
        ]);
        newResult = parseInt(homeScore) > 0 ? 'home_win' : 'draw';
        
      } else if (game.score.match(/^,[0-9]+$/)) {
        // ",5" 형태 - 원정팀 스코어만 있음
        const awayScore = game.score.replace(',', '');
        console.log(`   → 원정팀 스코어만 있음: ${awayScore} (홈팀 불명)`);
        newScore = JSON.stringify([
          {"name": game.homeTeam, "score": "0"},
          {"name": game.awayTeam, "score": awayScore}
        ]);
        newResult = parseInt(awayScore) > 0 ? 'away_win' : 'draw';
        
      } else if (game.score.match(/^[0-9]+,[0-9]+$/)) {
        // "5,4" 형태 - 숫자만 있음
        const [homeScore, awayScore] = game.score.split(',');
        console.log(`   → 숫자만 있음: ${homeScore}-${awayScore} (팀 정보 추가)`);
        newScore = JSON.stringify([
          {"name": game.homeTeam, "score": homeScore},
          {"name": game.awayTeam, "score": awayScore}
        ]);
        
        const home = parseInt(homeScore);
        const away = parseInt(awayScore);
        if (home > away) {
          newResult = 'home_win';
        } else if (away > home) {
          newResult = 'away_win';
        } else {
          newResult = 'draw';
        }
        
      } else {
        console.log('   → 처리할 수 없는 형태: 건너뜀');
        skippedCount++;
        continue;
      }
      
      // DB 업데이트
      await game.update({
        score: newScore,
        result: newResult,
        status: newStatus,
        lastUpdated: new Date()
      }, { transaction });
      
      console.log(`   ✅ 수정 완료: 스코어="${newScore}", 결과="${newResult}", 상태="${newStatus}"`);
      fixedCount++;
      console.log('');
    }
    
    await transaction.commit();
    
    console.log('🎉 수정 완료!');
    console.log(`- 수정된 경기: ${fixedCount}개`);
    console.log(`- 건너뛴 경기: ${skippedCount}개`);
    console.log(`- 총 대상: ${corruptedGames.length}개`);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

fixCorruptedScores(); 