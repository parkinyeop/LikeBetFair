// server/scripts/debug-settlement-issues.js
import { sequelize } from '../models/sequelize.js';
import { QueryTypes } from 'sequelize';
import BetResultService from '../services/betResultService.js';
import { normalizeTeamNameForComparison } from '../normalizeUtils.js';

/**
 * 정산 로직 문제점 디버깅 스크립트
 * 이미지에서 보이는 문제점들을 분석
 */
async function debugSettlementIssues() {
  try {
    console.log('🔍 정산 로직 문제점 디버깅 시작...');
    
    // 1. Cleveland Guardians vs Detroit Tigers 경기 관련 베팅 찾기
    const problematicBets = await sequelize.query(`
      SELECT 
        b.*,
        u.username,
        u.email
      FROM "Bets" b
      JOIN "Users" u ON b."userId" = u.id
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(b.selections) s
        WHERE s->>'desc' LIKE '%Cleveland%' 
          AND s->>'desc' LIKE '%Detroit%'
      )
      ORDER BY b."createdAt" DESC
      LIMIT 10
    `, {
      type: QueryTypes.SELECT
    });
    
    console.log(`\n📊 Cleveland vs Detroit 관련 베팅: ${problematicBets.length}건`);
    
    const betResultService = new BetResultService();
    
    for (const bet of problematicBets) {
      console.log(`\n🔍 베팅 ${bet.id} 분석 (${bet.username})`);
      console.log(`   상태: ${bet.status}`);
      console.log(`   베팅 금액: ${bet.stake}원`);
      console.log(`   예상 당첨금: ${bet.potentialWinnings}원`);
      
      for (const selection of bet.selections) {
        console.log(`\n   📋 선택: ${selection.desc}`);
        console.log(`      마켓: ${selection.market}`);
        console.log(`      팀/옵션: ${selection.team}`);
        console.log(`      포인트: ${selection.point}`);
        console.log(`      배당률: ${selection.odds}`);
        console.log(`      현재 결과: ${selection.result}`);
        
        // 경기 결과 조회
        const gameResult = await betResultService.getGameResultByTeams(selection);
        if (gameResult) {
          console.log(`      🎯 경기 결과:`);
          console.log(`         상태: ${gameResult.status}`);
          console.log(`         스코어: ${JSON.stringify(gameResult.score)}`);
          console.log(`         홈팀: ${gameResult.homeTeam}`);
          console.log(`         원정팀: ${gameResult.awayTeam}`);
          
          // 팀명 정규화 테스트
          const selectedTeamNorm = normalizeTeamNameForComparison(selection.team);
          const homeTeamNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
          const awayTeamNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
          
          console.log(`      🔤 팀명 정규화:`);
          console.log(`         선택팀: "${selection.team}" → "${selectedTeamNorm}"`);
          console.log(`         홈팀: "${gameResult.homeTeam}" → "${homeTeamNorm}"`);
          console.log(`         원정팀: "${gameResult.awayTeam}" → "${awayTeamNorm}"`);
          
          // 매칭 결과
          const homeMatch = selectedTeamNorm === homeTeamNorm;
          const awayMatch = selectedTeamNorm === awayTeamNorm;
          console.log(`         홈팀 매칭: ${homeMatch}`);
          console.log(`         원정팀 매칭: ${awayMatch}`);
          
          // 스코어 분석
          if (gameResult.score && Array.isArray(gameResult.score) && gameResult.score.length >= 2) {
            const homeScoreData = gameResult.score.find(s => s.name === gameResult.homeTeam);
            const awayScoreData = gameResult.score.find(s => s.name === gameResult.awayTeam);
            
            if (homeScoreData && awayScoreData) {
              const homeScore = parseInt(homeScoreData.score);
              const awayScore = parseInt(awayScoreData.score);
              
              console.log(`      ⚽ 스코어 분석:`);
              console.log(`         홈팀 스코어: ${homeScore}`);
              console.log(`         원정팀 스코어: ${awayScore}`);
              console.log(`         결과: ${homeScore > awayScore ? '홈팀 승리' : awayScore > homeScore ? '원정팀 승리' : '무승부'}`);
              
              // 정산 로직 재계산
              let correctResult;
              if (selection.market === 'Win/Loss' || selection.market === '승/패') {
                correctResult = betResultService.determineWinLoseResult(selection, gameResult);
              } else if (selection.market === 'Over/Under' || selection.market === '언더/오버') {
                correctResult = betResultService.determineOverUnderResult(selection, gameResult);
              } else if (selection.market === 'Handicap' || selection.market === '핸디캡') {
                correctResult = betResultService.determineHandicapResult(selection, gameResult);
              } else {
                correctResult = 'pending';
              }
              
              console.log(`      ✅ 정산 로직 재계산:`);
              console.log(`         현재 결과: ${selection.result}`);
              console.log(`         올바른 결과: ${correctResult}`);
              console.log(`         일치 여부: ${selection.result === correctResult ? '✅ 일치' : '❌ 불일치'}`);
              
              if (selection.result !== correctResult) {
                console.log(`         🚨 문제 발견! 수정 필요: ${selection.result} → ${correctResult}`);
              }
            }
          }
        } else {
          console.log(`      ❌ 경기 결과를 찾을 수 없음`);
        }
      }
    }
    
    // 2. 전체적으로 잘못 정산된 베팅 통계
    console.log(`\n📈 잘못 정산된 베팅 통계:`);
    
    const wrongSettlements = await sequelize.query(`
      SELECT 
        b.status,
        COUNT(*) as count,
        SUM(b.stake) as total_stake,
        SUM(b.potentialWinnings) as total_winnings
      FROM "Bets" b
      WHERE b.status IN ('won', 'lost', 'cancelled')
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(b.selections) s
          WHERE s->>'result' IN ('won', 'lost', 'cancelled')
        )
      GROUP BY b.status
      ORDER BY count DESC
    `, {
      type: QueryTypes.SELECT
    });
    
    for (const stat of wrongSettlements) {
      console.log(`   ${stat.status}: ${stat.count}건 (총 베팅금액: ${stat.total_stake}원, 총 당첨금: ${stat.total_winnings}원)`);
    }
    
    console.log(`\n✅ 디버깅 완료`);
    
  } catch (error) {
    console.error('❌ 디버깅 중 오류 발생:', error);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  debugSettlementIssues()
    .then(() => {
      console.log('디버깅 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('디버깅 스크립트 실패:', error);
      process.exit(1);
    });
}

export default debugSettlementIssues;
