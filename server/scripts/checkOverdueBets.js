import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

async function main() {
  console.log('🔍 정산예정일이 지난 베팅 중 경기결과 미업데이트 베팅 검색 시작...\n');
  
  try {
    // 현재 시간
    const now = new Date();
    console.log(`현재 시간: ${now.toISOString()}\n`);
    
    // 모든 pending 상태 베팅 조회
    const pendingBets = await Bet.findAll({
      where: {
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 전체 pending 베팅 수: ${pendingBets.length}\n`);
    
    if (pendingBets.length === 0) {
      console.log('✅ pending 상태의 베팅이 없습니다.');
      return;
    }
    
    // 경기별 평균 소요 시간(분)
    const avgGameDurationBySport = {
      soccer: 120,
      baseball: 180,
      basketball: 150,
      american_football: 210,
      default: 120
    };
    
    let overdueCount = 0;
    let overdueBets = [];
    
    for (const bet of pendingBets) {
      const selections = bet.selections;
      
      if (!Array.isArray(selections) || selections.length === 0) {
        continue;
      }
      
      // 각 베팅의 모든 경기 시간 수집
      const gameTimes = selections
        .map(sel => sel.commence_time)
        .filter(time => !!time)
        .map(time => new Date(time))
        .filter(date => !isNaN(date.getTime()));
      
      if (gameTimes.length === 0) {
        continue;
      }
      
      // 가장 늦은 경기 시간
      const latestGameTime = new Date(Math.max(...gameTimes.map(d => d.getTime())));
      
      // 스포츠 종류 추출 (예: soccer_epl → soccer)
      const sportType = selections[0]?.sport_key?.split('_')[0] || 'default';
      const duration = avgGameDurationBySport[sportType] || avgGameDurationBySport.default;
      
      // 정산예정일 계산 (가장 늦은 경기 + 경기 소요시간)
      const expectedSettlementTime = new Date(latestGameTime.getTime() + duration * 60 * 1000);
      
      // 정산예정일이 지났는지 확인
      if (expectedSettlementTime < now) {
        overdueCount++;
        
        // 각 selection의 경기결과 상태 확인
        let missingResults = [];
        let hasResults = [];
        
        for (const selection of selections) {
          if (selection.result === 'pending' || !selection.result) {
            // 경기결과 DB에서 해당 경기 찾기
            const gameResult = await GameResult.findOne({
              where: {
                [Op.and]: [
                  {
                    [Op.or]: [
                      { homeTeam: { [Op.like]: `%${selection.home_team || ''}%` } },
                      { awayTeam: { [Op.like]: `%${selection.away_team || ''}%` } }
                    ]
                  },
                  {
                    commenceTime: {
                      [Op.between]: [
                        new Date(new Date(selection.commence_time).getTime() - 60 * 60 * 1000), // 1시간 전
                        new Date(new Date(selection.commence_time).getTime() + 60 * 60 * 1000)  // 1시간 후
                      ]
                    }
                  }
                ]
              }
            });
            
            if (gameResult && gameResult.status === 'completed') {
              missingResults.push({
                selection: `${selection.home_team} vs ${selection.away_team}`,
                commence_time: selection.commence_time,
                game_result_exists: true,
                game_result_status: gameResult.status,
                game_result_score: gameResult.score
              });
            } else {
              missingResults.push({
                selection: `${selection.home_team} vs ${selection.away_team}`,
                commence_time: selection.commence_time,
                game_result_exists: false,
                game_result_status: gameResult?.status || 'not_found'
              });
            }
          } else {
            hasResults.push({
              selection: `${selection.home_team} vs ${selection.away_team}`,
              result: selection.result
            });
          }
        }
        
        overdueBets.push({
          betId: bet.id,
          userId: bet.userId,
          createdAt: bet.createdAt,
          stake: bet.stake,
          potentialWinnings: bet.potentialWinnings,
          latestGameTime: latestGameTime.toISOString(),
          expectedSettlementTime: expectedSettlementTime.toISOString(),
          overdueHours: Math.floor((now - expectedSettlementTime) / (1000 * 60 * 60)),
          selectionsCount: selections.length,
          missingResults: missingResults,
          hasResults: hasResults
        });
      }
    }
    
    console.log(`⚠️  정산예정일이 지난 베팅: ${overdueCount}개`);
    console.log(`⏰ 정상 베팅: ${pendingBets.length - overdueCount}개\n`);
    
    if (overdueBets.length > 0) {
      console.log('📋 정산예정일이 지난 베팅 상세 정보:\n');
      
      for (let i = 0; i < overdueBets.length; i++) {
        const bet = overdueBets[i];
        console.log(`${i + 1}. 베팅 ID: ${bet.betId}`);
        console.log(`   사용자 ID: ${bet.userId}`);
        console.log(`   베팅일: ${new Date(bet.createdAt).toLocaleString('ko-KR')}`);
        console.log(`   베팅금: ${Number(bet.stake).toLocaleString()}원`);
        console.log(`   예상수익: ${Number(bet.potentialWinnings).toLocaleString()}원`);
        console.log(`   가장 늦은 경기: ${new Date(bet.latestGameTime).toLocaleString('ko-KR')}`);
        console.log(`   정산예정일: ${new Date(bet.expectedSettlementTime).toLocaleString('ko-KR')}`);
        console.log(`   지연시간: ${bet.overdueHours}시간`);
        console.log(`   총 선택: ${bet.selectionsCount}개`);
        
        if (bet.missingResults.length > 0) {
          console.log(`   ❌ 결과 미업데이트 경기 (${bet.missingResults.length}개):`);
          bet.missingResults.forEach((missing, idx) => {
            console.log(`      ${idx + 1}) ${missing.selection}`);
            console.log(`         경기시간: ${new Date(missing.commence_time).toLocaleString('ko-KR')}`);
            console.log(`         DB 경기결과: ${missing.game_result_exists ? '존재' : '없음'}`);
            if (missing.game_result_exists) {
              console.log(`         경기상태: ${missing.game_result_status}`);
              console.log(`         스코어: ${missing.game_result_score || '없음'}`);
            }
          });
        }
        
        if (bet.hasResults.length > 0) {
          console.log(`   ✅ 결과 업데이트 완료 경기 (${bet.hasResults.length}개):`);
          bet.hasResults.forEach((completed, idx) => {
            console.log(`      ${idx + 1}) ${completed.selection} - 결과: ${completed.result}`);
          });
        }
        
        console.log(''); // 구분선
      }
      
      // 요약 통계
      const totalMissingResults = overdueBets.reduce((sum, bet) => sum + bet.missingResults.length, 0);
      const totalBetsWithDbResults = overdueBets.filter(bet => 
        bet.missingResults.some(missing => missing.game_result_exists)
      ).length;
      
      console.log('\n📊 요약:');
      console.log(`- 총 지연 베팅: ${overdueBets.length}개`);
      console.log(`- 총 미업데이트 경기: ${totalMissingResults}개`);
      console.log(`- DB에 경기결과는 있지만 베팅에 반영 안된 경우: ${totalBetsWithDbResults}개`);
      
      if (overdueBets.length > 0) {
        // 가장 오래된 지연 베팅
        const oldestOverdue = overdueBets.reduce((oldest, current) => 
          current.overdueHours > oldest.overdueHours ? current : oldest
        );
        console.log(`- 가장 오래 지연된 베팅: ${oldestOverdue.overdueHours}시간 (ID: ${oldestOverdue.betId})`);
      }
      
    } else {
      console.log('✅ 정산예정일이 지난 베팅이 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

main(); 