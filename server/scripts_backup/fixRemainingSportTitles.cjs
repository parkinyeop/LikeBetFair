const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function fixRemainingSportTitles() {
  try {
    console.log('=== 남은 한글 sportTitle 수정 ===\n');

    // 분데스리가 → Bundesliga 수정
    console.log('🔄 분데스리가 → Bundesliga 변환...');
    const updateResult = await sequelize.query(`
      UPDATE "OddsCaches"
      SET "sportTitle" = 'Bundesliga', "updatedAt" = NOW()
      WHERE "sportTitle" = '분데스리가'
    `, { type: Sequelize.QueryTypes.UPDATE });

    console.log(`✅ 분데스리가 → Bundesliga: ${updateResult[1]}개 수정 완료`);

    // 최종 sportTitle 현황 확인
    console.log('\n📋 최종 sportTitle 목록:');
    const finalStats = await sequelize.query(`
      SELECT "sportTitle", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "sportTitle"
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    finalStats.forEach(item => {
      console.log(`  ${item.sportTitle}: ${item.count}개`);
    });

    // 한글 포함 여부 확인
    const koreanCheck = finalStats.filter(item => 
      /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(item.sportTitle)
    );

    if (koreanCheck.length === 0) {
      console.log('\n🎉 모든 sportTitle이 영어로 통일되었습니다!');
    } else {
      console.log('\n⚠️ 아직 한글이 포함된 sportTitle이 있습니다:');
      koreanCheck.forEach(item => {
        console.log(`  - ${item.sportTitle}: ${item.count}개`);
      });
    }

    // 전체 레코드 수 확인
    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM "OddsCaches"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n전체 레코드 수: ${totalCount[0].count}`);

  } catch (error) {
    console.error('sportTitle 수정 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
fixRemainingSportTitles(); 