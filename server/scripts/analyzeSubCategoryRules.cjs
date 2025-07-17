const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function analyzeSubCategoryRules() {
  try {
    console.log('=== 서브카테고리 명명 규칙 분석 ===\n');

    // 1. 전체 서브카테고리 목록 조회
    const subCategories = await sequelize.query(`
      SELECT DISTINCT "subCategory", COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "subCategory"
      ORDER BY "subCategory"
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('=== 전체 서브카테고리 목록 ===');
    subCategories.forEach((item, index) => {
      console.log(`${index + 1}. ${item.subCategory} (${item.count}개)`);
    });

    // 2. 스포츠별 서브카테고리 패턴 분석
    console.log('\n=== 스포츠별 서브카테고리 패턴 ===');
    const sportPatterns = await sequelize.query(`
      SELECT 
        "sportKey",
        "subCategory",
        COUNT(*) as count
      FROM "OddsCaches"
      GROUP BY "sportKey", "subCategory"
      ORDER BY "sportKey", "subCategory"
    `, { type: Sequelize.QueryTypes.SELECT });

    let currentSport = '';
    sportPatterns.forEach(item => {
      if (currentSport !== item.sportKey) {
        currentSport = item.sportKey;
        console.log(`\n${item.sportKey}:`);
      }
      console.log(`  - ${item.subCategory} (${item.count}개)`);
    });

    // 3. 중복 서브카테고리 패턴 분석
    console.log('\n=== 중복 서브카테고리 패턴 분석 ===');
    const duplicatePatterns = await sequelize.query(`
      SELECT 
        "sportKey",
        "homeTeam",
        "awayTeam",
        "commenceTime",
        "subCategory",
        COUNT(*) as duplicate_count
      FROM "OddsCaches"
      GROUP BY "sportKey", "homeTeam", "awayTeam", "commenceTime", "subCategory"
      HAVING COUNT(*) > 1
      ORDER BY "sportKey", "commenceTime"
      LIMIT 20
    `, { type: Sequelize.QueryTypes.SELECT });

    if (duplicatePatterns.length > 0) {
      console.log('동일 경기에 같은 서브카테고리로 중복된 경우:');
      duplicatePatterns.forEach((item, index) => {
        console.log(`${index + 1}. ${item.sportKey} | ${item.homeTeam} vs ${item.awayTeam} | ${item.subCategory} (${item.duplicate_count}개)`);
      });
    } else {
      console.log('동일 경기에 같은 서브카테고리로 중복된 경우 없음');
    }

    // 4. 서브카테고리 표기 패턴 분석
    console.log('\n=== 서브카테고리 표기 패턴 분석 ===');
    const patterns = {
      '대문자_언더스코어': 0,
      '한글': 0,
      '영문_대문자': 0,
      '영문_소문자': 0,
      '기타': 0
    };

    subCategories.forEach(item => {
      const subCat = item.subCategory;
      if (/^[A-Z_]+$/.test(subCat)) {
        patterns['대문자_언더스코어'] += item.count;
      } else if (/^[가-힣\s]+$/.test(subCat)) {
        patterns['한글'] += item.count;
      } else if (/^[A-Z\s]+$/.test(subCat)) {
        patterns['영문_대문자'] += item.count;
      } else if (/^[a-z\s]+$/.test(subCat)) {
        patterns['영문_소문자'] += item.count;
      } else {
        patterns['기타'] += item.count;
      }
    });

    Object.entries(patterns).forEach(([pattern, count]) => {
      if (count > 0) {
        console.log(`${pattern}: ${count}개`);
      }
    });

    // 5. 대표적인 서브카테고리 예시들
    console.log('\n=== 대표적인 서브카테고리 예시들 ===');
    const examples = await sequelize.query(`
      SELECT DISTINCT "sportKey", "subCategory"
      FROM "OddsCaches"
      ORDER BY "sportKey", "subCategory"
    `, { type: Sequelize.QueryTypes.SELECT });

    let currentSportKey = '';
    examples.forEach(item => {
      if (currentSportKey !== item.sportKey) {
        currentSportKey = item.sportKey;
        console.log(`\n${item.sportKey}:`);
      }
      console.log(`  - ${item.subCategory}`);
    });

  } catch (error) {
    console.error('서브카테고리 분석 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeSubCategoryRules(); 