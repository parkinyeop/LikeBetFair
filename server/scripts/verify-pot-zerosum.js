/**
 * Pot 기반 제로섬 검증 스크립트
 *
 * PaymentHistory의 metadata에 저장된 potAmount 정보를 활용하여
 * 익스체인지 정산이 제로섬을 만족하는지 검증합니다.
 *
 * 검증 원칙:
 * 1. 각 Match의 Back 정산 + Lay 정산 = 0 (제로섬)
 * 2. totalPot = backStake + layStake
 * 3. 승자의 actualProfit + 패자의 actualProfit = 0
 */

import sequelize from '../models/sequelize.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import { Op } from 'sequelize';

/**
 * Pot 기반 제로섬 검증
 */
async function verifyPotZeroSum() {
  console.log('🔍 Pot 기반 제로섬 검증 시작...\n');

  try {
    // 1. metadata에 potAmount가 있는 PaymentHistory 조회
    const payments = await PaymentHistory.findAll({
      where: {
        transactionType: 'EXCHANGE_MULTIBET_SETTLEMENT',
        metadata: {
          [Op.ne]: null
        }
      },
      order: [['paidAt', 'DESC']],
      raw: true
    });

    console.log(`📊 총 ${payments.length}건의 익스체인지 정산 기록 발견\n`);

    if (payments.length === 0) {
      console.log('⚠️ metadata가 있는 정산 기록이 없습니다.');
      console.log('   (이전 정산은 metadata 없이 기록되었을 수 있습니다)\n');
      return;
    }

    // 2. Match별로 그룹화
    const matchMap = new Map();

    for (const payment of payments) {
      const metadata = payment.metadata;

      if (!metadata || !metadata.matches) {
        console.log(`⚠️ Payment #${payment.id}: metadata.matches가 없음`);
        continue;
      }

      for (const match of metadata.matches) {
        const matchId = match.matchId;

        if (!matchMap.has(matchId)) {
          matchMap.set(matchId, {
            matchId: matchId,
            potAmount: match.potAmount,
            payments: [],
            totalActualProfit: 0
          });
        }

        const matchData = matchMap.get(matchId);
        matchData.payments.push({
          paymentId: payment.id,
          userId: payment.userId,
          orderId: metadata.orderId,
          side: metadata.side,
          result: metadata.result,
          actualProfit: metadata.actualProfit,
          amount: payment.amount
        });

        matchData.totalActualProfit += parseFloat(payment.amount);
      }
    }

    console.log(`🎯 총 ${matchMap.size}개의 Match 발견\n`);

    // 3. 제로섬 검증
    let totalViolations = 0;
    let totalMatches = 0;

    for (const [matchId, data] of matchMap.entries()) {
      totalMatches++;

      const error = Math.abs(data.totalActualProfit);
      const isZeroSum = error < 0.01; // 1센트 이하 오차 허용

      if (!isZeroSum) {
        totalViolations++;
        console.log(`❌ Match #${matchId}: 제로섬 위반`);
        console.log(`   Pot: ${Number(data.potAmount).toLocaleString()}원`);
        console.log(`   정산 합계: ${data.totalActualProfit.toLocaleString()}원`);
        console.log(`   오차: ${error.toLocaleString()}원`);
        console.log(`   참여자:`);

        data.payments.forEach((p, i) => {
          console.log(`     ${i + 1}. Order #${p.orderId} (${p.side}): ${p.result} → ${parseFloat(p.amount).toLocaleString()}원`);
        });

        console.log();
      } else {
        console.log(`✅ Match #${matchId}: 제로섬 OK (Pot: ${Number(data.potAmount).toLocaleString()}원, 오차: ${error.toFixed(2)}원)`);
      }

      // ✅ Pot 계산 근거 검증 (settlementResult에 backStake/layStake가 있는 경우)
      if (data.payments.length > 0 && data.payments[0].metadata && data.payments[0].metadata.matches) {
        const matchData = data.payments[0].metadata.matches.find(m => m.matchId === matchId);
        if (matchData && matchData.backStake && matchData.layStake) {
          const calculatedPot = matchData.backStake + matchData.layStake;
          const potError = Math.abs(calculatedPot - data.potAmount);

          if (potError > 0.01) {
            console.log(`  ⚠️ Pot 계산 오류: ${matchData.backStake} + ${matchData.layStake} = ${calculatedPot} ≠ ${data.potAmount}`);
          }
        }
      }
    }

    // 4. 요약 통계
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 검증 결과 요약');
    console.log(`${'='.repeat(60)}`);
    console.log(`총 Match 수: ${totalMatches}개`);
    console.log(`제로섬 준수: ${totalMatches - totalViolations}개`);
    console.log(`제로섬 위반: ${totalViolations}개`);
    console.log(`준수율: ${((totalMatches - totalViolations) / totalMatches * 100).toFixed(2)}%`);

    if (totalViolations === 0) {
      console.log('\n✅ 모든 Match가 제로섬을 만족합니다!');
    } else {
      console.log(`\n⚠️ ${totalViolations}개의 Match에서 제로섬 위반이 발견되었습니다.`);
    }

  } catch (error) {
    console.error('❌ 검증 실패:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/**
 * Pot 상세 분석
 */
async function analyzePotDetails() {
  console.log('\n\n🔍 Pot 상세 분석 시작...\n');

  try {
    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_settlements,
        AVG((metadata->>'totalPot')::DECIMAL) as avg_pot,
        MAX((metadata->>'totalPot')::DECIMAL) as max_pot,
        MIN((metadata->>'totalPot')::DECIMAL) as min_pot,
        SUM((metadata->>'actualProfit')::DECIMAL) as total_profit,
        SUM((metadata->>'commissionAmount')::DECIMAL) as total_commission
      FROM "PaymentHistories"
      WHERE "transactionType" = 'EXCHANGE_MULTIBET_SETTLEMENT'
        AND metadata IS NOT NULL
        AND metadata->>'totalPot' IS NOT NULL
    `);

    if (stats.length === 0 || !stats[0].total_settlements) {
      console.log('⚠️ 분석할 데이터가 없습니다.\n');
      return;
    }

    const s = stats[0];

    console.log('📊 Pot 통계');
    console.log(`${'='.repeat(60)}`);
    console.log(`총 정산 건수: ${s.total_settlements}건`);
    console.log(`평균 Pot: ${Number(s.avg_pot || 0).toLocaleString()}원`);
    console.log(`최대 Pot: ${Number(s.max_pot || 0).toLocaleString()}원`);
    console.log(`최소 Pot: ${Number(s.min_pot || 0).toLocaleString()}원`);
    console.log(`총 실현 수익: ${Number(s.total_profit || 0).toLocaleString()}원`);
    console.log(`총 수수료: ${Number(s.total_commission || 0).toLocaleString()}원`);

    // Side별 통계
    const [sideStats] = await sequelize.query(`
      SELECT
        metadata->>'side' as side,
        metadata->>'result' as result,
        COUNT(*) as count,
        AVG((metadata->>'actualProfit')::DECIMAL) as avg_profit,
        SUM((metadata->>'actualProfit')::DECIMAL) as total_profit
      FROM "PaymentHistories"
      WHERE "transactionType" = 'EXCHANGE_MULTIBET_SETTLEMENT'
        AND metadata IS NOT NULL
        AND metadata->>'side' IS NOT NULL
      GROUP BY metadata->>'side', metadata->>'result'
      ORDER BY side, result
    `);

    console.log(`\n📊 Side별 정산 통계`);
    console.log(`${'='.repeat(60)}`);

    sideStats.forEach(s => {
      console.log(`${s.side.toUpperCase()} - ${s.result.toUpperCase()}:`);
      console.log(`  건수: ${s.count}건`);
      console.log(`  평균 수익: ${Number(s.avg_profit || 0).toLocaleString()}원`);
      console.log(`  총 수익: ${Number(s.total_profit || 0).toLocaleString()}원`);
    });

  } catch (error) {
    console.error('❌ 분석 실패:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/**
 * ExchangeOrderMatch의 Pot과 PaymentHistory 정합성 검증
 */
async function verifyPotIntegrity() {
  console.log('\n\n🔍 Pot 정합성 검증 시작...\n');

  try {
    // PaymentHistory의 Pot 합계
    const [paymentPotStats] = await sequelize.query(`
      SELECT
        SUM((metadata->>'totalPot')::DECIMAL) as payment_total_pot,
        COUNT(*) as payment_count
      FROM "PaymentHistories"
      WHERE "transactionType" = 'EXCHANGE_MULTIBET_SETTLEMENT'
        AND metadata IS NOT NULL
        AND metadata->>'totalPot' IS NOT NULL
    `);

    // ExchangeOrderMatch의 Pot 합계
    const [matchPotStats] = await sequelize.query(`
      SELECT
        SUM("potAmount") as match_total_pot,
        COUNT(*) as match_count
      FROM "ExchangeOrderMatches"
      WHERE "potAmount" IS NOT NULL
        AND "potAmount" > 0
    `);

    console.log('📊 Pot 정합성 비교');
    console.log(`${'='.repeat(60)}`);
    console.log(`PaymentHistory 총 Pot: ${Number(paymentPotStats[0]?.payment_total_pot || 0).toLocaleString()}원 (${paymentPotStats[0]?.payment_count || 0}건)`);
    console.log(`ExchangeOrderMatch 총 Pot: ${Number(matchPotStats[0]?.match_total_pot || 0).toLocaleString()}원 (${matchPotStats[0]?.match_count || 0}건)`);

    const paymentPot = Number(paymentPotStats[0]?.payment_total_pot || 0);
    const matchPot = Number(matchPotStats[0]?.match_total_pot || 0);
    const diff = Math.abs(paymentPot - matchPot);

    console.log(`차이: ${diff.toLocaleString()}원`);

    if (diff < 0.01) {
      console.log('\n✅ PaymentHistory와 ExchangeOrderMatch의 Pot 합계가 일치합니다!');
    } else {
      console.log(`\n⚠️ ${diff.toLocaleString()}원 차이 발견`);
      console.log('   (이전 정산은 metadata 없이 기록되었을 수 있습니다)');
    }

  } catch (error) {
    console.error('❌ 정합성 검증 실패:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// 메인 실행
(async () => {
  try {
    await verifyPotZeroSum();
    await analyzePotDetails();
    await verifyPotIntegrity();

    console.log('\n✅ 모든 검증 완료\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 검증 중 오류 발생:', error);
    process.exit(1);
  }
})();
