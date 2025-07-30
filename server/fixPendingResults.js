const { Sequelize } = require('sequelize');
const config = require('./config/database.js').production;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

console.log('=== GameResults pending 상태 수정 시작 (개선된 로직) ===');

async function fixPendingResults() {
  try {
    // status가 'finished'이지만 result가 'pending'이고 스코어가 있는 경기들 조회
    const pendingGames = await sequelize.query(`
      SELECT 
        id,
        "homeTeam",
        "awayTeam",
        score,
        result,
        status,
        "commenceTime",
        "updatedAt"
      FROM "GameResults"
      WHERE status = 'finished' 
        AND result = 'pending'
        AND score IS NOT NULL
        AND jsonb_array_length(score) = 2
      ORDER BY "commenceTime" DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`총 ${pendingGames.length}개의 pending 경기를 발견했습니다.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const game of pendingGames) {
      try {
        const score = JSON.parse(game.score);
        
        if (!Array.isArray(score) || score.length !== 2) {
          console.log(`스킵: ${game.homeTeam} vs ${game.awayTeam} - 잘못된 스코어 형식`);
          skippedCount++;
          continue;
        }

        const homeScoreData = score.find(s => s.name === game.homeTeam);
        const awayScoreData = score.find(s => s.name === game.awayTeam);

        if (!homeScoreData || !awayScoreData) {
          console.log(`스킵: ${game.homeTeam} vs ${game.awayTeam} - 팀명 매칭 실패`);
          skippedCount++;
          continue;
        }

        const homeScore = parseInt(homeScoreData.score);
        const awayScore = parseInt(awayScoreData.score);

        if (isNaN(homeScore) || isNaN(awayScore)) {
          console.log(`스킵: ${game.homeTeam} vs ${game.awayTeam} - 숫자가 아닌 스코어`);
          skippedCount++;
          continue;
        }

        // 보수적 시간 기반 처리: 48시간 이상 지났는지 확인
        const gameTime = new Date(game.commenceTime);
        const now = new Date();
        const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);

        let newResult = 'pending';

        if (hoursSinceGame > 48) {
          // 48시간 이상 지났으면 결과 계산
          if (homeScore > awayScore) {
            newResult = 'home_win';
          } else if (awayScore > homeScore) {
            newResult = 'away_win';
          } else {
            newResult = 'draw';
          }
        } else {
          // 48시간 미만이면 pending 유지
          console.log(`스킵: ${game.homeTeam} vs ${game.awayTeam} - 경기 후 ${hoursSinceGame.toFixed(1)}시간 (48시간 미만)`);
          skippedCount++;
          continue;
        }

        // 결과 업데이트
        await sequelize.query(`
          UPDATE "GameResults"
          SET 
            result = :result::"enum_GameResults_result",
            "updatedAt" = NOW()
          WHERE id = :id
        `, {
          replacements: {
            result: newResult,
            id: game.id
          },
          type: Sequelize.QueryTypes.UPDATE
        });

        console.log(`✅ 업데이트: ${game.homeTeam} vs ${game.awayTeam} (${homeScore}-${awayScore}) → ${newResult}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ 오류: ${game.homeTeam} vs ${game.awayTeam} - ${error.message}`);
        skippedCount++;
      }
    }

    console.log('\n=== 수정 완료 ===');
    console.log(`✅ 업데이트된 경기: ${updatedCount}개`);
    console.log(`⏭️ 스킵된 경기: ${skippedCount}개`);
    console.log(`📊 총 처리: ${updatedCount + skippedCount}개`);

  } catch (error) {
    console.error('❌ 전체 오류:', error);
  } finally {
    await sequelize.close();
  }
}

fixPendingResults(); 