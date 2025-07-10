import User from './models/userModel.js';
import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { normalizeTeamNameForComparison } from './normalizeUtils.js';
import { Op } from 'sequelize';

async function checkFirstMLSGame() {
  try {
    console.log('=== 첫 번째 MLS 경기 체크: New England Revolution vs Inter Miami ===\n');
    
    // 1. 해당 경기 정보 조회 (경기 ID로)
    const gameResult = await GameResult.findByPk('ca54def1-f1d4-4a43-8eab-3e36c34d4c52');
    
    if (!gameResult) {
      console.log('❌ 경기 결과를 찾을 수 없습니다.');
      return;
    }
    
    console.log('1. 경기 정보:');
    console.log(`   경기: ${gameResult.homeTeam} vs ${gameResult.awayTeam}`);
    console.log(`   시간: ${gameResult.commenceTime}`);
    console.log(`   상태: ${gameResult.status}`);
    console.log(`   결과: ${gameResult.result}`);
    console.log(`   스코어: ${JSON.stringify(gameResult.score)}`);
    console.log(`   ID: ${gameResult.id}`);
    
    // 2. 해당 경기와 관련된 모든 베팅 조회
    const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다.');
      return;
    }
    
    const allBets = await Bet.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\n2. 사용자 총 베팅 수: ${allBets.length}개`);
    
    // 3. 해당 경기와 관련된 베팅들 필터링
    const targetGameBets = [];
    const gameTime = new Date('2025-07-09T23:30:00.000Z');
    const timeRange = 2 * 60 * 60 * 1000; // ±2시간
    
    for (const bet of allBets) {
      if (!bet.selections || !Array.isArray(bet.selections)) continue;
      
      for (const selection of bet.selections) {
        if (!selection.commence_time) continue;
        
        const selTime = new Date(selection.commence_time);
        const timeDiff = Math.abs(selTime.getTime() - gameTime.getTime());
        
        if (timeDiff <= timeRange) {
          // 팀명 매칭 확인
          const betTeamNorm = normalizeTeamNameForComparison(selection.team);
          const homeTeamNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
          const awayTeamNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
          
          if (betTeamNorm === homeTeamNorm || betTeamNorm === awayTeamNorm) {
            targetGameBets.push({ bet, selection });
            break; // 한 베팅에 여러 selection이 있을 수 있으므로 첫 번째 매칭만
          }
        }
      }
    }
    
    console.log(`\n3. 해당 경기 관련 베팅: ${targetGameBets.length}개`);
    
    targetGameBets.forEach((item, index) => {
      const { bet, selection } = item;
      console.log(`\n   ${index + 1}. 베팅 ID: ${bet.id}`);
      console.log(`      금액: ${bet.stake}원`);
      console.log(`      상태: ${bet.status}`);
      console.log(`      생성일: ${bet.createdAt}`);
      console.log(`      선택: ${selection.desc}`);
      console.log(`      팀: ${selection.team}`);
      console.log(`      마켓: ${selection.market}`);
      console.log(`      결과: ${selection.result}`);
      console.log(`      경기시간: ${selection.commence_time}`);
      
      // 정산 가능 여부 분석
      if (gameResult.status === 'finished' && gameResult.result !== 'pending') {
        console.log(`      ✅ 정산 가능: 경기 완료, 결과 있음`);
        
        // 베팅 결과 예측
        const betTeamNorm = normalizeTeamNameForComparison(selection.team);
        const isHomeTeam = betTeamNorm === normalizeTeamNameForComparison(gameResult.homeTeam);
        const isAwayTeam = betTeamNorm === normalizeTeamNameForComparison(gameResult.awayTeam);
        
        if (isHomeTeam || isAwayTeam) {
          let expectedResult = 'pending';
          if (gameResult.result === 'home_win' && isHomeTeam) {
            expectedResult = 'won';
          } else if (gameResult.result === 'away_win' && isAwayTeam) {
            expectedResult = 'won';
          } else if (gameResult.result === 'home_win' && isAwayTeam) {
            expectedResult = 'lost';
          } else if (gameResult.result === 'away_win' && isHomeTeam) {
            expectedResult = 'lost';
          }
          
          console.log(`      예상 베팅 결과: ${expectedResult}`);
        }
      } else if (gameResult.status === 'finished' && gameResult.result === 'pending') {
        console.log(`      ⚠️ 경기 완료했지만 결과가 pending`);
        console.log(`      스코어 ["1","2"] → Inter Miami(away) 승리로 업데이트 필요`);
      } else {
        console.log(`      ⏳ 경기 아직 진행 중 또는 미완료`);
      }
    });
    
    // 4. 정산 가능한 베팅 수
    const settleableBets = targetGameBets.filter(item => 
      gameResult.status === 'finished' && gameResult.result !== 'pending'
    );
    
    console.log(`\n4. 정산 가능한 베팅: ${settleableBets.length}개`);
    
    if (gameResult.status === 'finished' && gameResult.result === 'pending') {
      console.log('\n5. 정산 작업 준비 완료!');
      console.log('   - 경기 결과를 away_win으로 업데이트 필요');
      console.log('   - 베팅 상태를 won으로 업데이트 필요 (Inter Miami에 베팅했으므로)');
    }
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

checkFirstMLSGame(); 