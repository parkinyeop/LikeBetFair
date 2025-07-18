import sequelize from '../models/sequelize.js';

async function fixDatabaseSchema() {
  try {
    console.log('🔧 데이터베이스 스키마 수정 시작...\n');
    
    // 1. adminLevel 컬럼 추가
    console.log('1. Users 테이블에 adminLevel 컬럼 추가...');
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "adminLevel" INTEGER DEFAULT 0;
      `);
      console.log('✅ adminLevel 컬럼 추가 완료');
    } catch (error) {
      console.log('⚠️ adminLevel 컬럼이 이미 존재하거나 오류:', error.message);
    }
    
    // 2. gameResultId 컬럼 타입 수정
    console.log('\n2. ExchangeOrders 테이블의 gameResultId 컬럼 타입 수정...');
    try {
      // 기존 컬럼 제거
      await sequelize.query(`
        ALTER TABLE "ExchangeOrders" 
        DROP COLUMN IF EXISTS "gameResultId";
      `);
      console.log('✅ 기존 gameResultId 컬럼 제거 완료');
      
      // 올바른 타입으로 다시 추가
      await sequelize.query(`
        ALTER TABLE "ExchangeOrders" 
        ADD COLUMN "gameResultId" UUID REFERENCES "GameResults"(id) ON UPDATE CASCADE ON DELETE SET NULL;
      `);
      console.log('✅ gameResultId 컬럼을 UUID 타입으로 추가 완료');
      
      // 인덱스 추가
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_exchange_orders_game_result_id" 
        ON "ExchangeOrders" ("gameResultId");
      `);
      console.log('✅ gameResultId 인덱스 추가 완료');
      
    } catch (error) {
      console.log('⚠️ gameResultId 컬럼 수정 중 오류:', error.message);
    }
    
    // 3. 기타 누락된 컬럼들 추가
    console.log('\n3. 기타 누락된 컬럼들 확인 및 추가...');
    
    // ExchangeOrders 테이블의 누락된 컬럼들
    const exchangeColumns = [
      { name: 'homeTeam', type: 'VARCHAR(255)', nullable: true },
      { name: 'awayTeam', type: 'VARCHAR(255)', nullable: true },
      { name: 'commenceTime', type: 'TIMESTAMP', nullable: true },
      { name: 'sportKey', type: 'VARCHAR(255)', nullable: true },
      { name: 'selectionDetails', type: 'JSONB', nullable: true },
      { name: 'autoSettlement', type: 'BOOLEAN DEFAULT true', nullable: false },
      { name: 'settlementNote', type: 'TEXT', nullable: true },
      { name: 'backOdds', type: 'FLOAT', nullable: true },
      { name: 'layOdds', type: 'FLOAT', nullable: true },
      { name: 'oddsSource', type: 'VARCHAR(255)', nullable: true },
      { name: 'oddsUpdatedAt', type: 'TIMESTAMP', nullable: true },
      { name: 'stakeAmount', type: 'INTEGER', nullable: false, default: '0' },
      { name: 'potentialProfit', type: 'INTEGER', nullable: false, default: '0' },
      { name: 'actualProfit', type: 'INTEGER', nullable: true },
      { name: 'settledAt', type: 'TIMESTAMP', nullable: true }
    ];
    
    for (const column of exchangeColumns) {
      try {
        const nullableClause = column.nullable ? 'NULL' : 'NOT NULL';
        const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
        
        await sequelize.query(`
          ALTER TABLE "ExchangeOrders" 
          ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type} ${nullableClause} ${defaultClause};
        `);
        console.log(`✅ ${column.name} 컬럼 확인/추가 완료`);
      } catch (error) {
        console.log(`⚠️ ${column.name} 컬럼 처리 중 오류:`, error.message);
      }
    }
    
    // 4. 테이블 상태 확인
    console.log('\n4. 테이블 상태 확인...');
    
    const tables = ['Users', 'ExchangeOrders', 'GameResults', 'OddsCaches'];
    for (const table of tables) {
      try {
        const [columns] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = '${table}'
          ORDER BY ordinal_position;
        `);
        console.log(`\n📋 ${table} 테이블 컬럼 목록:`);
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
      } catch (error) {
        console.log(`⚠️ ${table} 테이블 정보 조회 실패:`, error.message);
      }
    }
    
    console.log('\n✅ 데이터베이스 스키마 수정 완료!');
    
  } catch (error) {
    console.error('❌ 데이터베이스 스키마 수정 실패:', error);
  } finally {
    await sequelize.close();
  }
}

// 스크립트 실행
fixDatabaseSchema(); 