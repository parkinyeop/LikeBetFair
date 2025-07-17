import { Sequelize, Op } from 'sequelize';
import dotenv from 'dotenv';
import OddsCache from './models/oddsCacheModel.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

let sequelize;
if (process.env.DB_CONNECTION_STRING) {
  sequelize = new Sequelize(process.env.DB_CONNECTION_STRING);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: false,
    }
  );
}

async function analyzeOddsCache() {
  try {
    console.log('🔍 oddsCache DB 분석 시작...\n');
    
    // DB 연결 확인
    await sequelize.authenticate();
    console.log('✅ DB 연결 성공\n');
    
    // 1. 전체 레코드 수
    const totalCount = await OddsCache.count();
    console.log(`📊 전체 oddsCache 레코드 수: ${totalCount}\n`);
    
    if (totalCount === 0) {
      console.log('❌ oddsCache 테이블에 데이터가 없습니다.');
      return;
    }
    
    // 2. 스포츠별 데이터 분포
    const sportDistribution = await OddsCache.findAll({
      attributes: [
        'sportKey',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['sportKey'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });
    
    console.log('🏈 스포츠별 데이터 분포:');
    sportDistribution.forEach(item => {
      console.log(`  ${item.sportKey}: ${item.dataValues.count}개`);
    });
    console.log('');
    
    // 3. officialOdds 필드 상세 분석
    const nullOfficialOdds = await OddsCache.count({
      where: {
        officialOdds: null
      }
    });
    
    const emptyOfficialOdds = await OddsCache.count({
      where: {
        officialOdds: {}
      }
    });
    
    const validOfficialOdds = await OddsCache.count({
      where: {
        officialOdds: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: {} }
          ]
        }
      }
    });
    
    console.log('📈 officialOdds 필드 분석:');
    console.log(`  null인 레코드: ${nullOfficialOdds}개`);
    console.log(`  빈 객체인 레코드: ${emptyOfficialOdds}개`);
    console.log(`  정상 데이터: ${validOfficialOdds}개\n`);
    
    // 4. 정상 데이터 샘플 (officialOdds가 있는 것)
    if (validOfficialOdds > 0) {
      const validData = await OddsCache.findAll({
        where: {
          officialOdds: {
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.ne]: {} }
            ]
          }
        },
        limit: 5,
        order: [['createdAt', 'DESC']]
      });
      
      console.log('✅ 정상 데이터 샘플 (officialOdds 있음):');
      validData.forEach((item, i) => {
        const officialOddsStr = JSON.stringify(item.officialOdds).substring(0, 100) + '...';
        console.log(`${i+1}. ${item.sportKey} - ${item.homeTeam} vs ${item.awayTeam}`);
        console.log(`   시간: ${item.commenceTime}`);
        console.log(`   officialOdds: ${officialOddsStr}`);
        console.log('');
      });
    }
    
    // 5. 빈 데이터 샘플
    const emptyData = await OddsCache.findAll({
      where: {
        officialOdds: {}
      },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    console.log('❌ 빈 데이터 샘플 (officialOdds가 빈 객체):');
    emptyData.forEach((item, i) => {
      console.log(`${i+1}. ${item.sportKey} - ${item.homeTeam} vs ${item.awayTeam}`);
      console.log(`   시간: ${item.commenceTime}`);
      console.log(`   bookmakers: ${item.bookmakers ? '있음' : '없음'}`);
      console.log(`   createdAt: ${item.createdAt}`);
      console.log('');
    });
    
    // 6. 시간 범위 분석
    const timeRange = await OddsCache.findAll({
      attributes: [
        [sequelize.fn('MIN', sequelize.col('commenceTime')), 'earliest'],
        [sequelize.fn('MAX', sequelize.col('commenceTime')), 'latest']
      ]
    });
    
    console.log('⏰ 시간 범위:');
    console.log(`  가장 이른 경기: ${timeRange[0].dataValues.earliest}`);
    console.log(`  가장 늦은 경기: ${timeRange[0].dataValues.latest}\n`);
    
    // 7. 중복 데이터 확인
    const duplicates = await OddsCache.findAll({
      attributes: [
        'sportKey',
        'homeTeam',
        'awayTeam',
        'commenceTime',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['sportKey', 'homeTeam', 'awayTeam', 'commenceTime'],
      having: sequelize.literal('COUNT(id) > 1'),
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });
    
    console.log('🔄 중복 데이터 분석:');
    if (duplicates.length > 0) {
      console.log(`  중복된 경기: ${duplicates.length}개`);
      duplicates.slice(0, 5).forEach((item, i) => {
        console.log(`  ${i+1}. ${item.sportKey} - ${item.homeTeam} vs ${item.awayTeam} (${item.dataValues.count}개)`);
      });
    } else {
      console.log('  중복 데이터 없음');
    }
    console.log('');
    
    // 8. bookmakers 필드 분석
    const hasBookmakers = await OddsCache.count({
      where: {
        bookmakers: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: {} }
          ]
        }
      }
    });
    
    console.log('📚 bookmakers 필드 분석:');
    console.log(`  bookmakers가 있는 레코드: ${hasBookmakers}개`);
    console.log(`  bookmakers가 없는 레코드: ${totalCount - hasBookmakers}개\n`);
    
    // 9. 문제가 있는 데이터 샘플
    const problematicData = await OddsCache.findAll({
      where: {
        [Op.or]: [
          { officialOdds: null },
          { officialOdds: {} },
          { homeTeam: null },
          { awayTeam: null },
          { commenceTime: null }
        ]
      },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    if (problematicData.length > 0) {
      console.log('⚠️ 문제가 있는 데이터 샘플:');
      problematicData.forEach((item, i) => {
        console.log(`${i+1}. ID: ${item.id}`);
        console.log(`   sportKey: ${item.sportKey}`);
        console.log(`   homeTeam: ${item.homeTeam}`);
        console.log(`   awayTeam: ${item.awayTeam}`);
        console.log(`   commenceTime: ${item.commenceTime}`);
        console.log(`   officialOdds: ${item.officialOdds ? '있음' : '없음'}`);
        console.log(`   bookmakers: ${item.bookmakers ? '있음' : '없음'}`);
        console.log('');
      });
    }
    
  } catch (err) {
    console.error('❌ DB 분석 실패:', err);
  } finally {
    await sequelize.close();
    console.log('🔚 DB 연결 종료');
  }
}

analyzeOddsCache(); 