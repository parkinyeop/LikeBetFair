import sequelize from '../models/sequelize.js';

async function checkExchangeOrdersStructure() {
  try {
    console.log('🔍 ExchangeOrders 테이블 구조 확인...');
    
    // 테이블 존재 여부 확인
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    console.log('📊 전체 테이블 목록:', tableExists);
    
    if (tableExists.includes('ExchangeOrders')) {
      // 테이블 구조 조회
      const tableDescription = await sequelize.getQueryInterface().describeTable('ExchangeOrders');
      console.log('\n🏗️ ExchangeOrders 테이블 구조:');
      Object.entries(tableDescription).forEach(([column, details]) => {
        console.log(`  ${column}: ${details.type} ${details.allowNull ? 'NULL' : 'NOT NULL'} ${details.defaultValue ? `DEFAULT ${details.defaultValue}` : ''}`);
      });
      
      // 현재 데이터 개수 확인
      const [results] = await sequelize.query('SELECT COUNT(*) as count FROM "ExchangeOrders"');
      console.log(`\n📊 현재 데이터 개수: ${results[0].count}개`);
      
      // 샘플 데이터 확인
      if (results[0].count > 0) {
        const [sampleData] = await sequelize.query('SELECT * FROM "ExchangeOrders" LIMIT 2');
        console.log('\n📋 샘플 데이터:');
        sampleData.forEach((row, index) => {
          console.log(`  주문 ${index + 1}:`, JSON.stringify(row, null, 2));
        });
      }
    } else {
      console.log('❌ ExchangeOrders 테이블이 존재하지 않습니다.');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 테이블 구조 확인 중 오류:', error);
    process.exit(1);
  }
}

checkExchangeOrdersStructure(); 