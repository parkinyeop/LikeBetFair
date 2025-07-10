const User = require('./models/userModel.js').default;
const Bet = require('./models/betModel.js').default;
const PaymentHistory = require('./models/paymentHistoryModel.js').default;

async function checkBalanceDiscrepancy() {
  console.log('=== 잔액 불일치 진단 시작 ===\n');
  
  // parkinyeop@naver.com 사용자 찾기
  const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
  if (!user) {
    console.log('❌ 해당 이메일의 유저가 없습니다.');
    return;
  }
  
  console.log(`👤 사용자: ${user.username} (${user.email})`);
  console.log(`💰 현재 DB 잔액: ${user.balance}원\n`);
  
  // 1. 베팅 내역 분석
  const allBets = await Bet.findAll({ 
    where: { userId: user.id },
    order: [['createdAt', 'ASC']]
  });
  
  console.log('📊 베팅 내역 분석:');
  console.log(`   총 베팅 수: ${allBets.length}개`);
  
  let totalStake = 0;
  let totalWinnings = 0;
  let totalLosses = 0;
  
  allBets.forEach(bet => {
    const stake = parseFloat(bet.stake);
    totalStake += stake;
    
    if (bet.status === 'won') {
      totalWinnings += parseFloat(bet.potentialWinnings);
    } else if (bet.status === 'lost') {
      totalLosses += stake;
    }
  });
  
  console.log(`   총 베팅금: ${totalStake.toLocaleString()}원`);
  console.log(`   총 당첨금: ${totalWinnings.toLocaleString()}원`);
  console.log(`   총 손실금: ${totalLosses.toLocaleString()}원`);
  
  // 2. 지급 내역 분석
  const payments = await PaymentHistory.findAll({
    where: { userId: user.id },
    order: [['paidAt', 'ASC']]
  });
  
  console.log('\n💳 지급 내역 분석:');
  console.log(`   총 지급 내역: ${payments.length}개`);
  
  let totalPayments = 0;
  payments.forEach(payment => {
    totalPayments += parseFloat(payment.amount);
    console.log(`   ${payment.paidAt.toISOString()}: ${payment.amount}원 (${payment.memo})`);
  });
  
  console.log(`   총 지급액: ${totalPayments.toLocaleString()}원`);
  
  // 3. 이론적 잔액 계산
  const theoreticalBalance = totalPayments - totalStake + totalWinnings;
  console.log('\n🧮 이론적 잔액 계산:');
  console.log(`   초기 지급액: ${totalPayments}원`);
  console.log(`   - 총 베팅금: ${totalStake}원`);
  console.log(`   + 총 당첨금: ${totalWinnings}원`);
  console.log(`   = 이론적 잔액: ${theoreticalBalance.toLocaleString()}원`);
  
  // 4. 불일치 분석
  const discrepancy = parseFloat(user.balance) - theoreticalBalance;
  console.log('\n⚠️ 불일치 분석:');
  console.log(`   DB 잔액: ${user.balance}원`);
  console.log(`   이론적 잔액: ${theoreticalBalance}원`);
  console.log(`   차이: ${discrepancy}원`);
  
  if (Math.abs(discrepancy) > 0.01) {
    console.log('\n🚨 심각한 불일치 발견!');
    console.log('원인 가능성:');
    console.log('1. 베팅 정산 시 잔액 업데이트 누락');
    console.log('2. 중복 지급 또는 중복 차감');
    console.log('3. 베팅 취소 시 환불 처리 누락');
    console.log('4. Exchange 거래로 인한 잔액 변동');
    
    // 5. 최근 베팅 상세 분석
    console.log('\n🔍 최근 베팅 5개 상세 분석:');
    const recentBets = allBets.slice(-5);
    recentBets.forEach((bet, index) => {
      console.log(`\n   [${index + 1}] 베팅 ID: ${bet.id}`);
      console.log(`       스테이크: ${bet.stake}원`);
      console.log(`       상태: ${bet.status}`);
      console.log(`       예상 당첨금: ${bet.potentialWinnings}원`);
      console.log(`       생성일: ${bet.createdAt}`);
    });
  } else {
    console.log('\n✅ 잔액이 정상적으로 일치합니다.');
  }
}

checkBalanceDiscrepancy(); 