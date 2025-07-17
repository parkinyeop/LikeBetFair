const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.js');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function analyzeDuplicateData() {
  try {
    console.log('=== 중복 데이터 분석 시작 ===\n');

    // 1. 전체 레코드 수 확인
    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM oddsCache',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`전체 레코드 수: ${totalCount[0].count}`);

    // 2. 중복 데이터 패턴 분석
    console.log('\n=== 중복 패턴 분석 ===');
    
    // 같은 경기, 같은 시간, 같은 카테고리의 중복
    const exactDuplicates = await sequelize.query(`
      SELECT 
        sportKey, 
        homeTeam, 
        awayTeam, 
        commenceTime,
        category,
        COUNT(*) as duplicate_count
      FROM oddsCache 
      GROUP BY sportKey, homeTeam, awayTeam, commenceTime, category
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n정확한 중복 (sportKey + homeTeam + awayTeam + commenceTime + category):`);
    if (exactDuplicates.length === 0) {
      console.log('정확한 중복 데이터 없음');
    } else {
      exactDuplicates.forEach((dup, index) => {
        console.log(`${index + 1}. ${dup.sportKey} | ${dup.homeTeam} vs ${dup.awayTeam} | ${dup.commenceTime} | ${dup.category} (${dup.duplicate_count}개)`);
      });
    }

    // 3. 같은 경기, 같은 시간의 중복 (카테고리 무관)
    const gameDuplicates = await sequelize.query(`
      SELECT 
        sportKey, 
        homeTeam, 
        awayTeam, 
        commenceTime,
        COUNT(*) as duplicate_count
      FROM oddsCache 
      GROUP BY sportKey, homeTeam, awayTeam, commenceTime
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n경기 중복 (sportKey + homeTeam + awayTeam + commenceTime):`);
    if (gameDuplicates.length === 0) {
      console.log('경기 중복 데이터 없음');
    } else {
      gameDuplicates.forEach((dup, index) => {
        console.log(`${index + 1}. ${dup.sportKey} | ${dup.homeTeam} vs ${dup.awayTeam} | ${dup.commenceTime} (${dup.duplicate_count}개)`);
      });
    }

    // 4. 중복 데이터의 상세 정보 (첫 번째 중복 그룹)
    if (exactDuplicates.length > 0) {
      const firstDuplicate = exactDuplicates[0];
      console.log(`\n=== 첫 번째 중복 그룹 상세 정보 ===`);
      console.log(`경기: ${firstDuplicate.sportKey} | ${firstDuplicate.homeTeam} vs ${firstDuplicate.awayTeam} | ${firstDuplicate.commenceTime} | ${firstDuplicate.category}`);
      
      const duplicateDetails = await sequelize.query(`
        SELECT 
          id, 
          sportKey, 
          homeTeam, 
          awayTeam, 
          commenceTime,
          category,
          subCategory,
          officialOdds,
          createdAt,
          updatedAt
        FROM oddsCache 
        WHERE sportKey = ? AND homeTeam = ? AND awayTeam = ? AND commenceTime = ? AND category = ?
        ORDER BY createdAt DESC
      `, {
        replacements: [
          firstDuplicate.sportKey, 
          firstDuplicate.homeTeam, 
          firstDuplicate.awayTeam, 
          firstDuplicate.commenceTime, 
          firstDuplicate.category
        ],
        type: Sequelize.QueryTypes.SELECT
      });

      duplicateDetails.forEach((detail, index) => {
        console.log(`\n중복 ${index + 1}:`);
        console.log(`  ID: ${detail.id}`);
        console.log(`  subCategory: ${detail.subCategory}`);
        console.log(`  officialOdds: ${detail.officialOdds}`);
        console.log(`  createdAt: ${detail.createdAt}`);
        console.log(`  updatedAt: ${detail.updatedAt}`);
      });
    }

    // 5. 중복 데이터 통계
    const duplicateStats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_duplicates,
        SUM(duplicate_count - 1) as excess_records
      FROM (
        SELECT COUNT(*) as duplicate_count
        FROM oddsCache 
        GROUP BY sportKey, homeTeam, awayTeam, commenceTime, category
        HAVING COUNT(*) > 1
      ) as duplicates
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n=== 중복 데이터 통계 ===`);
    console.log(`중복 그룹 수: ${duplicateStats[0].total_duplicates}`);
    console.log(`제거 가능한 레코드 수: ${duplicateStats[0].excess_records}`);

    // 6. 스포츠별 중복 현황
    const sportDuplicates = await sequelize.query(`
      SELECT 
        sportKey,
        COUNT(*) as total_records,
        SUM(CASE WHEN duplicate_count > 1 THEN 1 ELSE 0 END) as duplicate_groups,
        SUM(CASE WHEN duplicate_count > 1 THEN duplicate_count - 1 ELSE 0 END) as excess_records
      FROM (
        SELECT 
          sportKey,
          COUNT(*) as duplicate_count
        FROM oddsCache 
        GROUP BY sportKey, homeTeam, awayTeam, commenceTime, category
      ) as grouped
      GROUP BY sportKey
      ORDER BY excess_records DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n=== 스포츠별 중복 현황 ===`);
    sportDuplicates.forEach(sport => {
      console.log(`${sport.sportKey}: 총 ${sport.total_records}개 그룹, 중복 그룹 ${sport.duplicate_groups}개, 제거 가능 ${sport.excess_records}개`);
    });

  } catch (error) {
    console.error('중복 데이터 분석 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeDuplicateData(); 