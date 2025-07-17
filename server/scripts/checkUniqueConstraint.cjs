const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function checkUniqueConstraint() {
  try {
    console.log('=== 유니크 제약 조건 확인 ===\n');

    // 테이블의 제약 조건 확인
    const constraints = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'OddsCaches'
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('=== 유니크 제약 조건 목록 ===');
    constraints.forEach(constraint => {
      console.log(`${constraint.constraint_name}: ${constraint.column_name} (${constraint.constraint_type})`);
    });

    // odds_cache_unique_idx 제약 조건의 상세 정보
    console.log('\n=== odds_cache_unique_idx 상세 정보 ===');
    const uniqueIdxDetails = await sequelize.query(`
      SELECT 
        kcu.column_name,
        kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'OddsCaches'
        AND tc.constraint_name = 'odds_cache_unique_idx'
      ORDER BY kcu.ordinal_position
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('odds_cache_unique_idx 구성 컬럼:');
    uniqueIdxDetails.forEach(detail => {
      console.log(`  ${detail.ordinal_position}. ${detail.column_name}`);
    });

    // 특정 경기의 중복 확인 (Udinese vs Hellas Verona)
    console.log('\n=== 특정 경기 중복 확인 (Udinese vs Hellas Verona) ===');
    const specificGame = await sequelize.query(`
      SELECT 
        "id", "mainCategory", "subCategory", "homeTeam", "awayTeam", "commenceTime", "market",
        "createdAt", "updatedAt"
      FROM "OddsCaches"
      WHERE "homeTeam" = 'Udinese' AND "awayTeam" = 'Hellas Verona'
      ORDER BY "createdAt" DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`총 ${specificGame.length}개 레코드 발견:`);
    specificGame.forEach((record, index) => {
      console.log(`\n${index + 1}. ID: ${record.id}`);
      console.log(`   서브카테고리: ${record.subCategory}`);
      console.log(`   마켓: ${record.market}`);
      console.log(`   생성시간: ${record.createdAt}`);
      console.log(`   업데이트시간: ${record.updatedAt}`);
    });

    // 유니크 제약 조건을 위반하는 데이터 확인
    console.log('\n=== 유니크 제약 조건 위반 데이터 확인 ===');
    const violations = await sequelize.query(`
      SELECT 
        "mainCategory", "subCategory", "homeTeam", "awayTeam", "commenceTime",
        COUNT(*) as duplicate_count
      FROM "OddsCaches"
      GROUP BY "mainCategory", "subCategory", "homeTeam", "awayTeam", "commenceTime"
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`유니크 제약 조건 위반 그룹: ${violations.length}개`);
    violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.mainCategory} | ${violation.subCategory} | ${violation.homeTeam} vs ${violation.awayTeam} | ${violation.commenceTime} (${violation.duplicate_count}개)`);
    });

  } catch (error) {
    console.error('제약 조건 확인 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 실행
checkUniqueConstraint(); 