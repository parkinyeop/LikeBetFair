const { Sequelize } = require('sequelize');

// 기존 데이터베이스 설정 사용
const db = new Sequelize('likebetfair_db', 'likebetfair_db_user', 'Dz60kyoWA0Xb8sRkCGyMIXmGgoDqqr4D', {
  host: 'dpg-d1smti49c44c73a8i5s0-a',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function updateSubCategories() {
  try {
    console.log('🔄 데이터베이스 subCategory 한글 → 영문 업데이트 시작...');
    
    // 한글 → 영문 매핑
    const updates = [
      { from: '중국 슈퍼리그', to: 'CSL' },
      { from: '라리가', to: 'LALIGA' },
      { from: '분데스리가', to: 'BUNDESLIGA' },
      { from: '프리미어리그', to: 'EPL' },
      { from: 'K리그', to: 'KLEAGUE' },
      { from: 'J리그', to: 'JLEAGUE' },
      { from: '세리에A', to: 'SERIEA' },
      { from: '브라질리라오', to: 'BRASILEIRAO' },
      { from: '아르헨티나프리메라', to: 'ARGENTINA_PRIMERA' }
    ];
    
    let totalUpdated = 0;
    
    // GameResults 테이블 업데이트
    for (const update of updates) {
      const [count] = await db.query(
        'UPDATE "GameResults" SET "subCategory" = :to WHERE "subCategory" = :from',
        {
          replacements: { from: update.from, to: update.to },
          type: Sequelize.QueryTypes.UPDATE
        }
      );
      
      if (count > 0) {
        console.log(`✅ GameResults: ${update.from} → ${update.to}: ${count}개 업데이트`);
        totalUpdated += count;
      }
    }
    
    // OddsCaches 테이블 업데이트
    for (const update of updates) {
      const [count] = await db.query(
        'UPDATE "OddsCaches" SET "subCategory" = :to WHERE "subCategory" = :from',
        {
          replacements: { from: update.from, to: update.to },
          type: Sequelize.QueryTypes.UPDATE
        }
      );
      
      if (count > 0) {
        console.log(`✅ OddsCaches: ${update.from} → ${update.to}: ${count}개 업데이트`);
        totalUpdated += count;
      }
    }
    
    console.log(`\n🎉 총 ${totalUpdated}개 레코드 업데이트 완료!`);
    
    // 업데이트 후 결과 확인
    console.log('\n📊 업데이트 후 subCategory 분포:');
    const [gameResults] = await db.query(
      'SELECT "subCategory", COUNT(*) as count FROM "GameResults" GROUP BY "subCategory" ORDER BY count DESC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log('GameResults:');
    gameResults.forEach(row => {
      console.log(`  ${row.subCategory}: ${row.count}개`);
    });
    
    const [oddsCaches] = await db.query(
      'SELECT "subCategory", COUNT(*) as count FROM "OddsCaches" GROUP BY "subCategory" ORDER BY count DESC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log('OddsCaches:');
    oddsCaches.forEach(row => {
      console.log(`  ${row.subCategory}: ${row.count}개`);
    });
    
  } catch (error) {
    console.error('❌ 업데이트 중 오류:', error);
  } finally {
    await db.close();
  }
}

// 스크립트 실행
updateSubCategories(); 