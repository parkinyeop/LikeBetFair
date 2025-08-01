import sequelize from '../models/sequelize.js';
import { Op } from 'sequelize';

console.log('🧹 [MLB_CLEANUP] MLB 중복 데이터 정리 시작...');

try {
  // 1. 중복 데이터 확인
  console.log('📊 [MLB_CLEANUP] 중복 데이터 확인 중...');
  const duplicateData = await sequelize.query(`
    SELECT 
      "homeTeam", 
      "awayTeam", 
      "commenceTime",
      COUNT(*) as duplicate_count
    FROM "OddsCaches" 
    WHERE "sportKey" = 'baseball_mlb' 
      AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
    GROUP BY "homeTeam", "awayTeam", "commenceTime"
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC
  `, { type: sequelize.QueryTypes.SELECT });

  console.log(`📊 [MLB_CLEANUP] 중복 데이터 발견: ${duplicateData.length}개 그룹`);

  if (duplicateData.length > 0) {
    // 2. 중복 데이터 삭제 (최신 ID만 유지)
    console.log('🗑️ [MLB_CLEANUP] 중복 데이터 삭제 중...');
    const deleteResult = await sequelize.query(`
      DELETE FROM "OddsCaches" 
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY "homeTeam", "awayTeam", "commenceTime" 
                   ORDER BY "createdAt" DESC
                 ) as rn
          FROM "OddsCaches"
          WHERE "sportKey" = 'baseball_mlb' 
            AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
        ) t
        WHERE rn > 1
      )
    `, { type: sequelize.QueryTypes.DELETE });

    console.log(`🗑️ [MLB_CLEANUP] 삭제된 중복 레코드: ${deleteResult[1]}개`);
  }

  // 3. 정리 후 결과 확인
  console.log('📊 [MLB_CLEANUP] 정리 후 결과 확인 중...');
  const finalResult = await sequelize.query(`
    SELECT 
      "sportKey",
      COUNT(*) as total_games
    FROM "OddsCaches" 
    WHERE "sportKey" = 'baseball_mlb' 
      AND "lastUpdated" = '2025-08-01 04:55:45.819+00'
    GROUP BY "sportKey"
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('✅ [MLB_CLEANUP] MLB 중복 데이터 정리 완료!');
  console.log('📊 [MLB_CLEANUP] 최종 결과:', finalResult);

} catch (error) {
  console.error('❌ [MLB_CLEANUP] 오류 발생:', error.message);
  console.error('❌ [MLB_CLEANUP] 스택 트레이스:', error.stack);
} finally {
  await sequelize.close();
  console.log('🔌 [MLB_CLEANUP] 데이터베이스 연결 종료');
} 