const User = require('./models/userModel.js').default;
const Bet = require('./models/betModel.js').default;
const GameResult = require('./models/gameResultModel.js').default;
const PaymentHistory = require('./models/paymentHistoryModel.js').default;

async function updateBetResults() {
  console.log('=== 미정산 베팅 결과 업데이트 및 정산 시작 ===\n');
  
  // parkinyeop@naver.com 사용자 찾기
  const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
  if (!user) {
    console.log('❌ 해당 이메일의 유저가 없습니다.');
    return;
  }
  
  // 미정산 베팅들 조회
  const pendingBets = await Bet.findAll({ 
    where: { userId: user.id, status: 'pending' },
    order: [['createdAt', 'DESC']]
  });
  
  console.log(`📊 미정산 베팅 수: ${pendingBets.length}개\n`);
  
  let processedCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let totalWinnings = 0;
  
  for (const bet of pendingBets) {
    console.log(`\n🔍 베팅 ID: ${bet.id}`);
    console.log(`   스테이크: ${bet.stake}원`);
    console.log(`   배당: ${bet.totalOdds}`);
    console.log(`   선택: ${bet.selections.length}개`);
    
    let allSelectionsSettled = true;
    let betResult = 'won'; // 기본값은 승리
    
    // 각 선택(selection) 확인
    for (const selection of bet.selections) {
      console.log(`   - ${selection.desc}: ${selection.team} (${selection.market})`);
      
      // 해당 경기 결과 찾기
      const gameResult = await GameResult.findOne({
        where: { id: selection.gameId }
      });
      
      if (!gameResult) {
        console.log(`     ❌ 경기 결과 없음 (gameId: ${selection.gameId})`);
        allSelectionsSettled = false;
        continue;
      }
      
      console.log(`     📊 경기 결과: ${gameResult.result} (${gameResult.score})`);
      
      // 베팅 결과 판정
      let selectionResult = 'lost';
      
      if (selection.market === '승/패') {
        if (selection.team === gameResult.homeTeam && gameResult.result === 'home_win') {
          selectionResult = 'won';
        } else if (selection.team === gameResult.awayTeam && gameResult.result === 'away_win') {
          selectionResult = 'won';
        }
      } else if (selection.market === '언더/오버') {
        const scores = JSON.parse(gameResult.score);
        const homeScore = parseInt(scores[0].score);
        const awayScore = parseInt(scores[1].score);
        const totalScore = homeScore + awayScore;
        const point = parseFloat(selection.point);
        
        if (selection.team === 'Under' && totalScore < point) {
          selectionResult = 'won';
        } else if (selection.team === 'Over' && totalScore > point) {
          selectionResult = 'won';
        }
      }
      
      console.log(`     🎯 선택 결과: ${selectionResult}`);
      
      // 하나라도 패배하면 전체 베팅 패배
      if (selectionResult === 'lost') {
        betResult = 'lost';
      }
      
      // selection 결과 업데이트
      selection.result = selectionResult;
    }
    
    if (!allSelectionsSettled) {
      console.log(`   ⏳ 아직 정산 불가 (경기 결과 누락)`);
      continue;
    }
    
    // 베팅 결과 업데이트
    bet.status = betResult;
    bet.selections = bet.selections; // 업데이트된 selections 저장
    await bet.save();
    
    console.log(`   🎯 베팅 결과: ${betResult}`);
    
    // 승리한 경우 당첨금 지급
    if (betResult === 'won') {
      const winnings = parseFloat(bet.potentialWinnings);
      user.balance = parseFloat(user.balance) + winnings;
      await user.save();
      
      // 지급 내역 기록
      await PaymentHistory.create({
        userId: user.id,
        betId: bet.id,
        amount: winnings,
        balanceAfter: user.balance,
        memo: `베팅 당첨금 지급 (베팅ID: ${bet.id})`,
        paidAt: new Date()
      });
      
      wonCount++;
      totalWinnings += winnings;
      console.log(`   💰 당첨금 지급: ${winnings}원 (잔액: ${user.balance}원)`);
    } else {
      lostCount++;
      console.log(`   💸 베팅금 손실`);
    }
    
    processedCount++;
  }
  
  console.log(`\n=== 정산 완료 ===`);
  console.log(`처리된 베팅: ${processedCount}개`);
  console.log(`승리: ${wonCount}개`);
  console.log(`패배: ${lostCount}개`);
  console.log(`총 당첨금: ${totalWinnings}원`);
  console.log(`최종 잔액: ${user.balance}원`);
}

updateBetResults(); 