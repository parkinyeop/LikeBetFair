/**
 * PaymentHistory 테이블 개선 마이그레이션
 *
 * Phase 1: 새 컬럼 추가 (Non-breaking)
 * Phase 2: 기존 데이터 마이그레이션
 *
 * 주의사항:
 * - 이 마이그레이션은 서비스 중단 없이 실행 가능
 * - 모든 새 컬럼은 nullable로 추가
 * - 기존 betId, memo 필드는 유지 (하위 호환성)
 */

import sequelize from '../models/sequelize.js';
import { TransactionType } from '../types/paymentHistory.js';

const MIGRATION_NAME = 'paymenthistory-add-fields';

/**
 * Phase 1: 스키마 추가
 */
async function addNewColumns(transaction) {
  console.log('📝 [Phase 1] 새 컬럼 추가 중...');

  await sequelize.query(`
    ALTER TABLE "PaymentHistories"
    ADD COLUMN IF NOT EXISTS "transactionType" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS "relatedOrderId" UUID,
    ADD COLUMN IF NOT EXISTS "relatedBetId" UUID,
    ADD COLUMN IF NOT EXISTS "relatedMultibetId" UUID,
    ADD COLUMN IF NOT EXISTS "relatedMatchId" UUID,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB;
  `, { transaction });

  console.log('✅ [Phase 1] 컬럼 추가 완료');
}

/**
 * Phase 2: 기존 데이터 마이그레이션
 *
 * memo 패턴을 파싱하여 transactionType 채우기
 */
async function migrateExistingData(transaction) {
  console.log('📝 [Phase 2] 기존 데이터 마이그레이션 중...');

  // memo 패턴 → transactionType 매핑
  const patterns = [
    { pattern: '스포츠북 베팅 - %', type: TransactionType.SPORTSBOOK_BET_DEDUCT },
    { pattern: '베팅 적중 지급%', type: TransactionType.SPORTSBOOK_WIN_PAYOUT },
    { pattern: '베팅 취소 환불', type: TransactionType.SPORTSBOOK_CANCEL_REFUND },
    { pattern: '%재정산%', type: TransactionType.SPORTSBOOK_RESETTLE },
    { pattern: 'Exchange 멀티베팅 제로썸 정산%', type: TransactionType.EXCHANGE_MULTIBET_SETTLEMENT },
    { pattern: '익스체인지 매칭 배팅 차감%', type: TransactionType.EXCHANGE_ORDER_DEDUCT },
    { pattern: '익스체인지 멀티배팅 주문 생성%', type: TransactionType.EXCHANGE_MULTIBET_DEDUCT },
    { pattern: '%부분 매칭%환불%', type: TransactionType.EXCHANGE_PARTIAL_REFUND },
    { pattern: 'Exchange back 주문 취소 환불', type: TransactionType.EXCHANGE_CANCEL_REFUND },
    { pattern: 'Exchange 주문%환불%', type: TransactionType.EXCHANGE_PARTIAL_REFUND },
    { pattern: '회원가입 초기 잔액', type: TransactionType.INITIAL_BALANCE },
    { pattern: '%정산 (누락된%복구)%', type: TransactionType.ROLLBACK_FIX },
    { pattern: '%롤백%', type: TransactionType.ROLLBACK_FIX },
    { pattern: '%수정%', type: TransactionType.ROLLBACK_FIX },
    { pattern: '%복구%', type: TransactionType.ROLLBACK_FIX },
  ];

  let totalUpdated = 0;

  for (const { pattern, type } of patterns) {
    const [result] = await sequelize.query(`
      UPDATE "PaymentHistories"
      SET "transactionType" = :type
      WHERE "memo" LIKE :pattern
        AND "transactionType" IS NULL
    `, {
      replacements: { type, pattern },
      transaction
    });

    const updatedCount = result.rowCount || 0;
    if (updatedCount > 0) {
      console.log(`  ✓ ${type.padEnd(35)}: ${updatedCount}건 업데이트`);
      totalUpdated += updatedCount;
    }
  }

  console.log(`✅ [Phase 2] 총 ${totalUpdated}건 마이그레이션 완료`);

  // UNKNOWN 패턴 확인
  const [unknownRows] = await sequelize.query(`
    SELECT id, memo, "betId", amount
    FROM "PaymentHistories"
    WHERE "transactionType" IS NULL
    ORDER BY "paidAt" DESC
  `, { transaction });

  if (unknownRows.length > 0) {
    console.warn(`⚠️ [Phase 2] ${unknownRows.length}건의 UNKNOWN 패턴 발견:`);
    unknownRows.forEach(row => {
      console.warn(`  - ID: ${row.id}, memo: ${row.memo}`);
    });
    console.warn('  → 이 레코드들은 수동으로 확인이 필요합니다.');
  }
}

/**
 * Phase 3: betId 파싱 및 relatedBetId/relatedOrderId 채우기
 */
async function migrateBetIdReferences(transaction) {
  console.log('📝 [Phase 3] betId 참조 마이그레이션 중...');

  // 1. UUID 형태의 betId → relatedBetId
  const [uuidResult] = await sequelize.query(`
    UPDATE "PaymentHistories"
    SET "relatedBetId" = "betId"::UUID
    WHERE "betId" IS NOT NULL
      AND "betId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND "relatedBetId" IS NULL
  `, { transaction });

  console.log(`  ✓ UUID betId → relatedBetId: ${uuidResult.rowCount || 0}건`);

  // 2. EXCHANGE_{orderId}_MATCH_{matchId} 형태 파싱
  const [exchangeRows] = await sequelize.query(`
    SELECT id, "betId"
    FROM "PaymentHistories"
    WHERE "betId" LIKE 'EXCHANGE_%_MATCH_%'
      AND "relatedOrderId" IS NULL
  `, { transaction });

  let exchangeUpdated = 0;
  for (const row of exchangeRows) {
    const match = row.betId.match(/EXCHANGE_(\d+)_MATCH_(\d+)/);
    if (match) {
      const orderId = match[1];
      const matchId = match[2];

      // ExchangeOrder의 실제 UUID 찾기
      const [orderRows] = await sequelize.query(`
        SELECT id FROM "ExchangeOrders" WHERE id::text LIKE '%${orderId}%' LIMIT 1
      `, { transaction });

      if (orderRows.length > 0) {
        await sequelize.query(`
          UPDATE "PaymentHistories"
          SET "relatedOrderId" = :orderId,
              "metadata" = jsonb_build_object('matchId', :matchId)
          WHERE id = :id
        `, {
          replacements: { orderId: orderRows[0].id, matchId, id: row.id },
          transaction
        });
        exchangeUpdated++;
      }
    }
  }

  console.log(`  ✓ EXCHANGE betId 파싱: ${exchangeUpdated}건`);

  // 3. EXCHANGE_{timestamp} 형태 (멀티베팅) - 스킵 (테이블 없음)
  console.log(`  ✓ 멀티베팅 betId → relatedMultibetId: 0건 (ExchangeMultibets 테이블 없음)`);

  console.log('✅ [Phase 3] betId 참조 마이그레이션 완료');
}

/**
 * Phase 4: 인덱스 추가
 */
async function addIndexes(transaction) {
  console.log('📝 [Phase 4] 인덱스 추가 중...');

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_user_type
    ON "PaymentHistories"("userId", "transactionType");
  `, { transaction });

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_related_order
    ON "PaymentHistories"("relatedOrderId")
    WHERE "relatedOrderId" IS NOT NULL;
  `, { transaction });

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_related_bet
    ON "PaymentHistories"("relatedBetId")
    WHERE "relatedBetId" IS NOT NULL;
  `, { transaction });

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_status
    ON "PaymentHistories"("status");
  `, { transaction });

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_metadata
    ON "PaymentHistories" USING GIN("metadata")
    WHERE "metadata" IS NOT NULL;
  `, { transaction });

  console.log('✅ [Phase 4] 인덱스 추가 완료');
}

/**
 * Phase 5 (선택사항): Foreign Key 제약 조건 추가
 *
 * 주의: 이 단계는 데이터 무결성이 완벽히 검증된 후에만 실행
 */
async function addForeignKeyConstraints(transaction) {
  console.log('📝 [Phase 5] Foreign Key 제약 조건 추가 중...');

  try {
    await sequelize.query(`
      ALTER TABLE "PaymentHistories"
      ADD CONSTRAINT fk_payment_related_bet
      FOREIGN KEY ("relatedBetId")
      REFERENCES "Bets"(id)
      ON DELETE SET NULL;
    `, { transaction });

    console.log('  ✓ FK: relatedBetId → Bets.id');
  } catch (error) {
    console.warn('  ⚠️ FK 추가 실패 (relatedBetId):', error.message);
  }

  try {
    await sequelize.query(`
      ALTER TABLE "PaymentHistories"
      ADD CONSTRAINT fk_payment_related_order
      FOREIGN KEY ("relatedOrderId")
      REFERENCES "ExchangeOrders"(id)
      ON DELETE SET NULL;
    `, { transaction });

    console.log('  ✓ FK: relatedOrderId → ExchangeOrders.id');
  } catch (error) {
    console.warn('  ⚠️ FK 추가 실패 (relatedOrderId):', error.message);
  }

  // ExchangeMultibets 테이블 없음 - 스킵
  console.log('  ✓ FK: relatedMultibetId → ExchangeMultibets.id (스킵 - 테이블 없음)');

  console.log('✅ [Phase 5] Foreign Key 제약 조건 추가 완료');
}

/**
 * 마이그레이션 검증
 */
async function verifyMigration(transaction) {
  console.log('🔍 [검증] 마이그레이션 결과 검증 중...');

  const [stats] = await sequelize.query(`
    SELECT
      "transactionType",
      COUNT(*) as count,
      SUM(CASE WHEN "relatedBetId" IS NOT NULL THEN 1 ELSE 0 END) as has_related_bet,
      SUM(CASE WHEN "relatedOrderId" IS NOT NULL THEN 1 ELSE 0 END) as has_related_order,
      SUM(CASE WHEN "relatedMultibetId" IS NOT NULL THEN 1 ELSE 0 END) as has_related_multibet
    FROM "PaymentHistories"
    GROUP BY "transactionType"
    ORDER BY count DESC
  `, { transaction });

  console.log('\n=== 마이그레이션 결과 ===');
  stats.forEach(row => {
    console.log(`${(row.transactionType || 'NULL').padEnd(35)}: ${row.count}건 (Bet: ${row.has_related_bet}, Order: ${row.has_related_order}, Multibet: ${row.has_related_multibet})`);
  });

  const [totalRows] = await sequelize.query(`
    SELECT COUNT(*) as total FROM "PaymentHistories"
  `, { transaction });

  const [nullTypeRows] = await sequelize.query(`
    SELECT COUNT(*) as count FROM "PaymentHistories" WHERE "transactionType" IS NULL
  `, { transaction });

  const coverage = ((totalRows[0].total - nullTypeRows[0].count) / totalRows[0].total * 100).toFixed(2);
  console.log(`\n총 ${totalRows[0].total}건 중 ${totalRows[0].total - nullTypeRows[0].count}건 마이그레이션 완료 (${coverage}%)`);

  if (nullTypeRows[0].count > 0) {
    console.warn(`⚠️ ${nullTypeRows[0].count}건은 transactionType이 NULL입니다. 수동 확인이 필요합니다.`);
  }

  console.log('✅ [검증] 마이그레이션 검증 완료\n');
}

/**
 * 메인 마이그레이션 실행
 */
export async function up() {
  const transaction = await sequelize.transaction();

  try {
    console.log(`\n🚀 PaymentHistory 마이그레이션 시작: ${MIGRATION_NAME}\n`);

    await addNewColumns(transaction);
    await migrateExistingData(transaction);
    await migrateBetIdReferences(transaction);
    await addIndexes(transaction);

    // Phase 5는 선택사항 (주석 처리)
    // await addForeignKeyConstraints(transaction);

    await verifyMigration(transaction);

    await transaction.commit();
    console.log('✅ 마이그레이션 성공적으로 완료\n');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  }
}

/**
 * 롤백 (필요 시)
 */
export async function down() {
  const transaction = await sequelize.transaction();

  try {
    console.log(`\n🔄 PaymentHistory 마이그레이션 롤백 시작: ${MIGRATION_NAME}\n`);

    // FK 제약 조건 제거
    await sequelize.query(`ALTER TABLE "PaymentHistories" DROP CONSTRAINT IF EXISTS fk_payment_related_bet`, { transaction });
    await sequelize.query(`ALTER TABLE "PaymentHistories" DROP CONSTRAINT IF EXISTS fk_payment_related_order`, { transaction });
    await sequelize.query(`ALTER TABLE "PaymentHistories" DROP CONSTRAINT IF EXISTS fk_payment_related_multibet`, { transaction });

    // 인덱스 제거
    await sequelize.query(`DROP INDEX IF EXISTS idx_payment_user_type`, { transaction });
    await sequelize.query(`DROP INDEX IF EXISTS idx_payment_related_order`, { transaction });
    await sequelize.query(`DROP INDEX IF EXISTS idx_payment_related_bet`, { transaction });
    await sequelize.query(`DROP INDEX IF EXISTS idx_payment_status`, { transaction });
    await sequelize.query(`DROP INDEX IF EXISTS idx_payment_metadata`, { transaction });

    // 컬럼 제거
    await sequelize.query(`
      ALTER TABLE "PaymentHistories"
      DROP COLUMN IF EXISTS "transactionType",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "relatedOrderId",
      DROP COLUMN IF EXISTS "relatedBetId",
      DROP COLUMN IF EXISTS "relatedMultibetId",
      DROP COLUMN IF EXISTS "relatedMatchId",
      DROP COLUMN IF EXISTS "metadata";
    `, { transaction });

    await transaction.commit();
    console.log('✅ 롤백 성공적으로 완료\n');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 롤백 실패:', error);
    throw error;
  }
}

// CLI에서 직접 실행 가능
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'up') {
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'down') {
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('Usage: node migration-paymenthistory-add-fields.js [up|down]');
    process.exit(1);
  }
}
