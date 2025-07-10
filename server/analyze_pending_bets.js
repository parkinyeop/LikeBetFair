import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('=== 정산이 안된 배팅 원인 분석 ===\n');
    
    // 1. pending 상태의 배팅 조회
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 총 ${pendingBets.length}개의 pending 배팅 발견\n`);
    
    if (pendingBets.length === 0) {
      console.log('✅ pending 상태의 배팅이 없습니다.');
      return;
    }
    
    // 2. 각 배팅별 상세 분석
    for (const [index, bet] of pendingBets.entries()) {
      console.log(`\n🔍 배팅 ${index + 1} 분석:`);
      console.log(`   배팅 ID: ${bet.id}`);
      console.log(`   배팅 금액: ${bet.stake}원`);
      console.log(`   배팅 시간: ${bet.createdAt}`);
      console.log(`   전체 상태: ${bet.status}`);
      
      const selections = bet.selections || [];
      console.log(`   선택 항목 수: ${selections.length}`);
      
      // 3. 각 selection별 분석
      for (const [selIndex, selection] of selections.entries()) {
        console.log(`\n   📋 Selection ${selIndex + 1}:`);
        console.log(`      경기: ${selection.desc}`);
        console.log(`      팀: ${selection.team}`);
        console.log(`      마켓: ${selection.market}`);
        console.log(`      결과: ${selection.result || 'pending'}`);
        console.log(`      경기 시간: ${selection.commence_time}`);
        
        // 4. GameResult DB에서 해당 경기 찾기
        if (selection.commence_time) {
          const gameTime = new Date(selection.commence_time);
          const startOfDay = new Date(gameTime);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(gameTime);
          endOfDay.setHours(23, 59, 59, 999);
          
          // 팀명 정규화
          const teams = selection.desc.split(' vs ');
          const homeTeam = teams[0]?.trim();
          const awayTeam = teams[1]?.trim();
          
          if (homeTeam && awayTeam) {
            const gameResult = await GameResult.findOne({
              where: {
                homeTeam: { [Op.iLike]: `%${homeTeam}%` },
                awayTeam: { [Op.iLike]: `%${awayTeam}%` },
                commenceTime: {
                  [Op.between]: [startOfDay, endOfDay]
                }
              }
            });
            
            if (gameResult) {
              console.log(`      ✅ GameResult 발견:`);
              console.log(`         상태: ${gameResult.status}`);
              console.log(`         결과: ${gameResult.result}`);
              console.log(`         스코어: ${JSON.stringify(gameResult.score)}`);
              console.log(`         경기 시간: ${gameResult.commenceTime}`);
              
              // 5. 왜 정산이 안되었는지 분석
              if (gameResult.status === 'finished' && gameResult.result !== 'pending') {
                console.log(`      ❌ 문제: 경기는 완료되었지만 배팅이 정산되지 않음`);
                console.log(`         - GameResult.result: ${gameResult.result}`);
                console.log(`         - Selection.result: ${selection.result}`);
                
                // 팀명 매칭 문제 확인
                const normalizedSelectionTeam = selection.team?.toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedHomeTeam = gameResult.homeTeam?.toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedAwayTeam = gameResult.awayTeam?.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                console.log(`         - 선택팀 정규화: ${normalizedSelectionTeam}`);
                console.log(`         - 홈팀 정규화: ${normalizedHomeTeam}`);
                console.log(`         - 원정팀 정규화: ${normalizedAwayTeam}`);
                
                if (normalizedSelectionTeam !== normalizedHomeTeam && normalizedSelectionTeam !== normalizedAwayTeam) {
                  console.log(`         🔥 원인: 팀명 매칭 실패!`);
                }
              } else if (gameResult.status !== 'finished') {
                console.log(`      ⏳ 경기 아직 진행 중 또는 미완료`);
              } else if (gameResult.result === 'pending') {
                console.log(`      ❓ 경기 완료되었지만 결과가 pending`);
              }
            } else {
              console.log(`      ❌ GameResult 없음 - 경기 결과가 DB에 없음`);
            }
          } else {
            console.log(`      ❌ 팀명 파싱 실패: ${selection.desc}`);
          }
        } else {
          console.log(`      ❌ commence_time 없음`);
        }
      }
      
      // 6. 배팅 전체 상태 분석
      const allResults = selections.map(s => s.result).filter(r => r && r !== 'pending');
      const hasWon = allResults.includes('won');
      const hasLost = allResults.includes('lost');
      const hasCancelled = allResults.includes('cancelled');
      const hasPending = selections.some(s => !s.result || s.result === 'pending');
      
      console.log(`\n   📊 배팅 전체 상태 분석:`);
      console.log(`      승리: ${hasWon}`);
      console.log(`      패배: ${hasLost}`);
      console.log(`      취소: ${hasCancelled}`);
      console.log(`      대기: ${hasPending}`);
      
      if (hasPending) {
        console.log(`      ⏳ 아직 진행 중인 경기가 있음`);
      } else if (hasLost) {
        console.log(`      ❌ 하나라도 패배했으므로 전체 패배`);
      } else if (hasWon && !hasLost) {
        console.log(`      ✅ 모든 경기 승리 - 정산되어야 함`);
      } else if (hasCancelled && !hasWon && !hasLost) {
        console.log(`      🚫 모든 경기 취소 - 환불되어야 함`);
      }
    }
    
    // 7. 전체 통계
    console.log(`\n📈 전체 통계:`);
    const totalStake = pendingBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
    console.log(`   총 pending 배팅 금액: ${totalStake.toLocaleString()}원`);
    
    const recentBets = pendingBets.filter(bet => 
      new Date(bet.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    console.log(`   최근 24시간 내 배팅: ${recentBets.length}개`);
    
    const oldBets = pendingBets.filter(bet => 
      new Date(bet.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    console.log(`   7일 이상 된 배팅: ${oldBets.length}개`);
    
  } catch (error) {
    console.error('분석 중 오류 발생:', error);
  }
})(); 