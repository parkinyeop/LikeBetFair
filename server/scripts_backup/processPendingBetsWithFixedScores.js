import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import betResultService from '../services/betResultService.js';

/**
 * 스코어 형식 수정 후 pending 베팅 재처리 스크립트
 */
async function processPendingBetsWithFixedScores() {
  try {
    console.log('=== 🔄 Pending 베팅 재처리 시작 ===\n');
    
    // 1. pending 상태의 베팅 조회
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Pending 베팅 발견: ${pendingBets.length}개\n`);
    
    if (pendingBets.length === 0) {
      console.log('✅ 처리할 pending 베팅이 없습니다.');
      return;
    }
    
    let processedCount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let cancelledCount = 0;
    let errorCount = 0;
    
    for (const bet of pendingBets) {
      try {
        console.log(`\n🔍 베팅 ID: ${bet.id} 처리 중...`);
        console.log(`   스테이크: ${bet.stake}원`);
        console.log(`   선택 항목: ${bet.selections.length}개`);
        
        // 각 selection의 경기 결과 확인
        const selections = bet.selections || [];
        let hasWon = false;
        let hasLost = false;
        let hasCancelled = false;
        let hasPending = false;
        
        for (const selection of selections) {
          console.log(`   - ${selection.desc}: ${selection.team} (${selection.market})`);
          
          // 경기 결과 찾기
          const gameResult = await GameResult.findOne({
            where: {
              homeTeam: { [Op.iLike]: `%${selection.team}%` },
              awayTeam: { [Op.iLike]: `%${selection.team}%` },
              commenceTime: {
                [Op.between]: [
                  new Date(selection.commence_time).setHours(0, 0, 0, 0),
                  new Date(selection.commence_time).setHours(23, 59, 59, 999)
                ]
              }
            }
          });
          
          if (!gameResult) {
            console.log(`     ❌ 경기 결과 없음`);
            hasPending = true;
            continue;
          }
          
          console.log(`     📊 경기 결과: ${gameResult.result} (${JSON.stringify(gameResult.score)})`);
          
          // 베팅 결과 판정 (새로운 방어 코드 사용)
          let selectionResult = 'pending';
          
          if (gameResult.status === 'finished' && gameResult.result && gameResult.result !== 'pending') {
            if (selection.market === '승/패') {
              if (selection.team === gameResult.homeTeam && gameResult.result === 'home_win') {
                selectionResult = 'won';
              } else if (selection.team === gameResult.awayTeam && gameResult.result === 'away_win') {
                selectionResult = 'won';
              } else {
                selectionResult = 'lost';
              }
            } else if (selection.market === '언더/오버') {
              const totalScore = betResultService.calculateTotalScore(gameResult.score);
              const point = parseFloat(selection.point);
              
              if (selection.team === 'Under' && totalScore < point) {
                selectionResult = 'won';
              } else if (selection.team === 'Over' && totalScore > point) {
                selectionResult = 'won';
              } else {
                selectionResult = 'lost';
              }
            }
          } else if (gameResult.status === 'cancelled' || gameResult.result === 'cancelled') {
            selectionResult = 'cancelled';
          }
          
          console.log(`     🎯 선택 결과: ${selectionResult}`);
          
          // 결과 집계
          if (selectionResult === 'won') hasWon = true;
          else if (selectionResult === 'lost') hasLost = true;
          else if (selectionResult === 'cancelled') hasCancelled = true;
          else hasPending = true;
          
          // selection 결과 업데이트
          selection.result = selectionResult;
        }
        
        // 베팅 전체 상태 결정
        let betStatus = 'pending';
        
        if (hasPending) {
          betStatus = 'pending';
          console.log(`   ⏳ 아직 진행 중인 경기가 있음 - pending 유지`);
        } else if (hasLost) {
          betStatus = 'lost';
          console.log(`   ❌ 하나라도 패배했으므로 전체 패배`);
        } else if (hasWon && !hasLost) {
          betStatus = 'won';
          console.log(`   ✅ 모든 경기 승리 - 정산`);
        } else if (hasCancelled && !hasWon && !hasLost) {
          betStatus = 'cancelled';
          console.log(`   🚫 모든 경기 취소 - 환불`);
        }
        
        // 베팅 상태 업데이트
        bet.status = betStatus;
        bet.selections = selections;
        await bet.save();
        
        console.log(`   🎯 베팅 결과: ${betStatus}`);
        
        // 통계 업데이트
        processedCount++;
        if (betStatus === 'won') wonCount++;
        else if (betStatus === 'lost') lostCount++;
        else if (betStatus === 'cancelled') cancelledCount++;
        
      } catch (error) {
        console.error(`   ❌ 베팅 처리 중 오류: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n=== 재처리 완료 ===`);
    console.log(`📊 통계:`);
    console.log(`   - 처리된 베팅: ${processedCount}개`);
    console.log(`   - 승리: ${wonCount}개`);
    console.log(`   - 패배: ${lostCount}개`);
    console.log(`   - 취소: ${cancelledCount}개`);
    console.log(`   - 오류: ${errorCount}개`);
    
    // 2. 최종 검증
    console.log(`\n=== 최종 검증 ===`);
    const remainingPending = await Bet.count({
      where: { status: 'pending' }
    });
    
    console.log(`   - 남은 pending 베팅: ${remainingPending}개`);
    
    if (remainingPending === 0) {
      console.log(`   ✅ 모든 pending 베팅이 처리되었습니다!`);
    } else {
      console.log(`   ⚠️ 아직 ${remainingPending}개의 pending 베팅이 남아있습니다.`);
    }
    
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  processPendingBetsWithFixedScores()
    .then(() => {
      console.log('\n✅ Pending 베팅 재처리 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default processPendingBetsWithFixedScores; 