// 잘못 정산된 베팅 복구 스크립트
// - scheduled 경기인데 won/lost 판정된 베팅을 pending으로 되돌림
// - GameResult가 없거나 스코어가 없는데 정산된 베팅을 pending으로 되돌림

import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import { normalizeTeamNameForComparison } from '../utils/gameStatusHelpers.js';

/**
 * 베팅 상태 재계산
 * betResultService의 determineBetStatus 로직과 동일
 */
function recalculateBetStatus(selections) {
  const hasWon = selections.some(s => s.result === 'won');
  const hasLost = selections.some(s => s.result === 'lost' || s.result === 'draw');
  const hasPending = selections.some(s => s.result === 'pending');
  const hasCancelled = selections.some(s => s.result === 'cancelled');

  // 모든 selection이 취소된 경우
  if (hasCancelled && !hasWon && !hasLost && !hasPending) {
    return 'cancelled';
  }

  // pending이 있으면 대기
  if (hasPending) {
    return 'pending';
  }

  // 멀티베팅: 하나라도 실패하면 전체 실패
  if (hasLost) {
    return 'lost';
  }

  // 취소되지 않은 모든 선택이 성공인 경우만 전체 성공
  const allNonCancelledSelections = selections.filter(s => s.result !== 'cancelled');
  const allWonSelections = allNonCancelledSelections.filter(s => s.result === 'won');
  
  if (allNonCancelledSelections.length > 0 && allWonSelections.length === allNonCancelledSelections.length) {
    return 'won';
  }

  // 모든 selection이 취소된 경우
  if (selections.every(s => s.result === 'cancelled')) {
    return 'cancelled';
  }

  return 'pending';
}

/**
 * 잘못 정산된 베팅 복구
 */
async function fixScheduledBetResults() {
  const transaction = await sequelize.transaction();

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 잘못 정산된 베팅 복구 시작');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. won 또는 lost 상태인 베팅 조회
    const suspiciousBets = await Bet.findAll({
      where: {
        status: { [Op.in]: ['won', 'lost'] }
      },
      transaction
    });

    console.log(`📋 확인 대상 베팅: ${suspiciousBets.length}개\n`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const bet of suspiciousBets) {
      let needsFix = false;
      let betChanged = false;

      try {
        // 2. 각 selection 검증
        for (const selection of bet.selections) {
          if (!selection.commence_time) continue;

          const commenceTime = new Date(selection.commence_time);
          const now = new Date();

          // 2-1. 미래 경기인데 won/lost 판정된 경우
          if (commenceTime > now && ['won', 'lost'].includes(selection.result)) {
            console.log(`[수정 필요] 베팅 ${bet.id}:`);
            console.log(`  - 미래 경기인데 ${selection.result} 판정`);
            console.log(`  - 경기: ${selection.desc}`);
            console.log(`  - 경기 시간: ${commenceTime.toISOString()}`);
            selection.result = 'pending';
            needsFix = true;
            continue;
          }

          // 2-2. GameResult 찾기
          const desc = selection.desc || '';
          const parts = desc.split(' vs ');
          
          if (parts.length !== 2) continue;

          const homeTeam = normalizeTeamNameForComparison(parts[0].trim());
          const awayTeam = normalizeTeamNameForComparison(parts[1].trim());
          const startTime = new Date(commenceTime.getTime() - 24 * 60 * 60 * 1000);
          const endTime = new Date(commenceTime.getTime() + 24 * 60 * 60 * 1000);

          // 팀명 첫 단어로 검색 (부분 매칭)
          const homeFirstWord = homeTeam.split(' ')[0];
          const awayFirstWord = awayTeam.split(' ')[0];

          const gameResult = await GameResult.findOne({
            where: {
              [Op.and]: [
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.col('homeTeam')),
                  { [Op.like]: `%${homeFirstWord.toLowerCase()}%` }
                ),
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.col('awayTeam')),
                  { [Op.like]: `%${awayFirstWord.toLowerCase()}%` }
                ),
                {
                  commenceTime: {
                    [Op.between]: [startTime, endTime]
                  }
                }
              ]
            },
            transaction
          });

          // 2-3. GameResult가 scheduled인 경우
          if (gameResult && gameResult.status === 'scheduled' && ['won', 'lost'].includes(selection.result)) {
            console.log(`[수정 필요] 베팅 ${bet.id}:`);
            console.log(`  - scheduled 경기인데 ${selection.result} 판정`);
            console.log(`  - 경기: ${selection.desc}`);
            console.log(`  - GameResult: ${gameResult.homeTeam} vs ${gameResult.awayTeam} (${gameResult.status})`);
            selection.result = 'pending';
            needsFix = true;
            continue;
          }

          // 2-4. GameResult가 없는데 won/lost 판정된 경우
          if (!gameResult && ['won', 'lost'].includes(selection.result)) {
            console.log(`[수정 필요] 베팅 ${bet.id}:`);
            console.log(`  - GameResult 없는데 ${selection.result} 판정`);
            console.log(`  - 경기: ${selection.desc}`);
            console.log(`  - 경기 시간: ${commenceTime.toISOString()}`);
            selection.result = 'pending';
            needsFix = true;
            continue;
          }

          // 2-5. GameResult가 있지만 스코어가 없는데 won/lost 판정된 경우
          if (gameResult && 
              (!gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) &&
              ['won', 'lost'].includes(selection.result)) {
            console.log(`[수정 필요] 베팅 ${bet.id}:`);
            console.log(`  - 스코어 없는데 ${selection.result} 판정`);
            console.log(`  - 경기: ${selection.desc}`);
            console.log(`  - GameResult 상태: ${gameResult.status}`);
            selection.result = 'pending';
            needsFix = true;
          }
        }

        // 3. 베팅 상태 재계산
        if (needsFix) {
          const newStatus = recalculateBetStatus(bet.selections);
          
          console.log(`  ✅ 베팅 ${bet.id} 수정:`);
          console.log(`     ${bet.status} → ${newStatus}`);
          console.log(`     selections: ${bet.selections.map(s => s.result).join(', ')}\n`);

          bet.status = newStatus;
          bet.selections = [...bet.selections]; // 배열 변경 감지
          bet.changed('selections', true);
          await bet.save({ transaction });

          fixedCount++;
          betChanged = true;
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ 베팅 ${bet.id} 처리 중 오류:`, error.message);
      }
    }

    await transaction.commit();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 복구 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 수정된 베팅: ${fixedCount}개`);
    console.log(`❌ 오류 발생: ${errorCount}개`);
    console.log(`📋 확인한 베팅: ${suspiciousBets.length}개`);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ 데이터 복구 중 오류:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// 실행
fixScheduledBetResults()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 스크립트 실행 실패:', err);
    process.exit(1);
  });

