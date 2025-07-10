import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('=== 팀명/시간 불일치 매칭 실패 분석 (정확한 버전) ===\n');
    
    // 1. pending 상태의 배팅 조회
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 총 ${pendingBets.length}개의 pending 배팅 발견\n`);
    
    let totalSelections = 0;
    let matchedSelections = 0;
    let unmatchedSelections = 0;
    let teamNameMismatches = 0;
    let timeMismatches = 0;
    let completelyDifferentGames = 0;
    let missingGames = 0;
    
    const mismatchDetails = [];
    
    for (const bet of pendingBets) {
      console.log(`\n🔍 배팅 ${bet.id} 분석:`);
      console.log(`   배팅 시간: ${bet.createdAt}`);
      console.log(`   배팅 금액: ${bet.stake}원`);
      
      const selections = bet.selections || [];
      
      for (const [selIndex, selection] of selections.entries()) {
        totalSelections++;
        console.log(`\n   📋 Selection ${selIndex + 1}:`);
        console.log(`      경기: ${selection.desc}`);
        console.log(`      팀: ${selection.team}`);
        console.log(`      시간: ${selection.commence_time}`);
        console.log(`      결과: ${selection.result || 'pending'}`);
        
        if (!selection.commence_time) {
          console.log(`      ❌ commence_time 없음`);
          unmatchedSelections++;
          continue;
        }
        
        // 2. 팀명 파싱
        const teams = selection.desc.split(' vs ');
        const homeTeam = teams[0]?.trim();
        const awayTeam = teams[1]?.trim();
        
        if (!homeTeam || !awayTeam) {
          console.log(`      ❌ 팀명 파싱 실패: ${selection.desc}`);
          unmatchedSelections++;
          continue;
        }
        
        // 3. 시간 범위 설정 (1시간 전후)
        const gameTime = new Date(selection.commence_time);
        const startTime = new Date(gameTime.getTime() - 60 * 60 * 1000); // 1시간 전
        const endTime = new Date(gameTime.getTime() + 60 * 60 * 1000);   // 1시간 후
        
        // 4. GameResult DB에서 정확한 매칭 시도
        const exactGameResult = await GameResult.findOne({
          where: {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: {
              [Op.between]: [startTime, endTime]
            }
          }
        });
        
        if (exactGameResult) {
          matchedSelections++;
          console.log(`      ✅ 정확한 GameResult 매칭 성공:`);
          console.log(`         DB 홈팀: ${exactGameResult.homeTeam}`);
          console.log(`         DB 원정팀: ${exactGameResult.awayTeam}`);
          console.log(`         DB 시간: ${exactGameResult.commenceTime}`);
          console.log(`         DB 상태: ${exactGameResult.status}`);
          console.log(`         DB 결과: ${exactGameResult.result}`);
          
        } else {
          unmatchedSelections++;
          console.log(`      ❌ 정확한 GameResult 매칭 실패`);
          
          // 5. 왜 매칭이 실패했는지 상세 분석
          const mismatchDetail = {
            betId: bet.id,
            selection: selection.desc,
            selectionTeam: selection.team,
            selectionTime: selection.commence_time,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            searchStartTime: startTime,
            searchEndTime: endTime
          };
          
          // 5-1. 팀명만으로 검색 (시간 무관)
          const teamOnlyResults = await GameResult.findAll({
            where: {
              [Op.or]: [
                { homeTeam: homeTeam },
                { awayTeam: homeTeam },
                { homeTeam: awayTeam },
                { awayTeam: awayTeam }
              ]
            },
            order: [['commenceTime', 'DESC']],
            limit: 5
          });
          
          if (teamOnlyResults.length > 0) {
            console.log(`      🔍 팀명으로 발견된 경기들:`);
            teamOnlyResults.forEach((result, idx) => {
              const timeDiff = Math.abs(result.commenceTime.getTime() - gameTime.getTime()) / (1000 * 60);
              console.log(`         ${idx + 1}. ${result.homeTeam} vs ${result.awayTeam} (${result.commenceTime}) - 시간차: ${timeDiff}분`);
            });
            
            // 가장 가까운 시간의 경기
            const closestGame = teamOnlyResults[0];
            const timeDiff = Math.abs(closestGame.commenceTime.getTime() - gameTime.getTime()) / (1000 * 60);
            
            if (timeDiff > 60 * 24) { // 24시간 이상 차이
              completelyDifferentGames++;
              console.log(`         ❌ 완전히 다른 경기 (시간 차이: ${timeDiff}분)`);
              mismatchDetail.type = 'completely_different_game';
              mismatchDetail.closestGame = {
                homeTeam: closestGame.homeTeam,
                awayTeam: closestGame.awayTeam,
                commenceTime: closestGame.commenceTime,
                timeDifference: timeDiff
              };
            } else {
              timeMismatches++;
              console.log(`         ❌ 시간 불일치 (시간 차이: ${timeDiff}분)`);
              mismatchDetail.type = 'time_mismatch';
              mismatchDetail.closestGame = {
                homeTeam: closestGame.homeTeam,
                awayTeam: closestGame.awayTeam,
                commenceTime: closestGame.commenceTime,
                timeDifference: timeDiff
              };
            }
            
          } else {
            // 5-2. 시간만으로 검색 (팀명 무관)
            const timeOnlyResults = await GameResult.findAll({
              where: {
                commenceTime: {
                  [Op.between]: [startTime, endTime]
                }
              },
              order: [['commenceTime', 'DESC']],
              limit: 5
            });
            
            if (timeOnlyResults.length > 0) {
              console.log(`      🔍 시간으로 발견된 경기들:`);
              timeOnlyResults.forEach((result, idx) => {
                console.log(`         ${idx + 1}. ${result.homeTeam} vs ${result.awayTeam} (${result.commenceTime})`);
              });
              
              teamNameMismatches++;
              console.log(`         ❌ 팀명 불일치 - 같은 시간대에 다른 경기들`);
              mismatchDetail.type = 'team_name_mismatch';
              mismatchDetail.timeOnlyGames = timeOnlyResults.map(r => ({
                homeTeam: r.homeTeam,
                awayTeam: r.awayTeam,
                commenceTime: r.commenceTime
              }));
              
            } else {
              missingGames++;
              console.log(`      ❌ 완전히 매칭되는 경기 없음`);
              console.log(`         → GameResult DB에 해당 경기가 아예 없음`);
              
              mismatchDetail.type = 'missing_game';
              mismatchDetail.noMatch = true;
            }
          }
          
          mismatchDetails.push(mismatchDetail);
        }
      }
    }
    
    // 6. 전체 통계
    console.log(`\n📈 매칭 실패 분석 결과:`);
    console.log(`   총 selection 수: ${totalSelections}개`);
    console.log(`   매칭 성공: ${matchedSelections}개`);
    console.log(`   매칭 실패: ${unmatchedSelections}개`);
    console.log(`   팀명 불일치: ${teamNameMismatches}개`);
    console.log(`   시간 불일치: ${timeMismatches}개`);
    console.log(`   완전히 다른 경기: ${completelyDifferentGames}개`);
    console.log(`   누락된 경기: ${missingGames}개`);
    
    // 7. 불일치 상세 사례
    if (mismatchDetails.length > 0) {
      console.log(`\n🔍 불일치 상세 사례:`);
      mismatchDetails.slice(0, 5).forEach((detail, index) => {
        console.log(`\n   사례 ${index + 1}:`);
        console.log(`      배팅 ID: ${detail.betId}`);
        console.log(`      경기: ${detail.selection}`);
        console.log(`      선택팀: ${detail.selectionTeam}`);
        console.log(`      선택시간: ${detail.selectionTime}`);
        console.log(`      불일치 타입: ${detail.type}`);
        
        if (detail.type === 'completely_different_game') {
          console.log(`      가장 가까운 경기: ${detail.closestGame.homeTeam} vs ${detail.closestGame.awayTeam}`);
          console.log(`      시간 차이: ${detail.closestGame.timeDifference}분`);
        } else if (detail.type === 'time_mismatch') {
          console.log(`      가장 가까운 경기: ${detail.closestGame.homeTeam} vs ${detail.closestGame.awayTeam}`);
          console.log(`      시간 차이: ${detail.closestGame.timeDifference}분`);
        } else if (detail.type === 'team_name_mismatch') {
          console.log(`      같은 시간대 경기들: ${detail.timeOnlyGames.length}개`);
          detail.timeOnlyGames.slice(0, 2).forEach((game, idx) => {
            console.log(`         ${idx + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
          });
        } else if (detail.type === 'missing_game') {
          console.log(`      GameResult DB에 해당 경기 없음`);
        }
      });
    }
    
    // 8. 개선 제안
    console.log(`\n💡 개선 제안:`);
    if (teamNameMismatches > 0) {
      console.log(`   - 팀명 정규화 로직 강화 필요 (${teamNameMismatches}건)`);
    }
    if (timeMismatches > 0) {
      console.log(`   - 시간대/포맷 통일 필요 (${timeMismatches}건)`);
    }
    if (completelyDifferentGames > 0) {
      console.log(`   - GameResult DB에 누락된 경기 수집 필요 (${completelyDifferentGames}건)`);
    }
    if (missingGames > 0) {
      console.log(`   - GameResult DB에 완전히 누락된 경기 수집 필요 (${missingGames}건)`);
    }
    
  } catch (error) {
    console.error('분석 중 오류 발생:', error);
  }
})(); 