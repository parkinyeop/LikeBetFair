const User = require('./models/userModel.js').default;
const Bet = require('./models/betModel.js').default;
const PaymentHistory = require('./models/paymentHistoryModel.js').default;

async function fixBalanceDiscrepancy() {
  console.log('=== 잔액 불일치 수정 시작 ===\n');
  
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
  
  let totalStake = 0;
  let totalWinnings = 0;
  
  allBets.forEach(bet => {
    const stake = parseFloat(bet.stake);
    totalStake += stake;
    
    if (bet.status === 'won') {
      totalWinnings += parseFloat(bet.potentialWinnings);
    }
  });
  
  // 2. 올바른 잔액 계산
  // 초기 잔액은 0으로 가정하고, 베팅금 차감 + 당첨금 지급으로 계산
  const correctBalance = totalWinnings - totalStake;
  
  console.log('🧮 올바른 잔액 계산:');
  console.log(`   총 베팅금: ${totalStake.toLocaleString()}원`);
  console.log(`   총 당첨금: ${totalWinnings.toLocaleString()}원`);
  console.log(`   올바른 잔액: ${correctBalance.toLocaleString()}원`);
  
  // 3. 잔액 수정
  const oldBalance = user.balance;
  user.balance = correctBalance;
  await user.save();
  
  console.log('\n✅ 잔액 수정 완료:');
  console.log(`   이전 잔액: ${oldBalance}원`);
  console.log(`   수정된 잔액: ${user.balance}원`);
  console.log(`   차이: ${(user.balance - oldBalance).toLocaleString()}원`);
  
  // 4. 중복 지급 내역 정리 (선택사항)
  console.log('\n📝 중복 지급 내역 정리 권장사항:');
  console.log('1. PaymentHistory 테이블에서 중복 지급 내역 삭제');
  console.log('2. 각 베팅당 하나의 지급 내역만 유지');
  console.log('3. 정산 로직 개선으로 중복 지급 방지');
  
  // 5. 검증
  const verificationBalance = totalWinnings - totalStake;
  console.log('\n🔍 검증:');
  console.log(`   계산된 잔액: ${verificationBalance}원`);
  console.log(`   DB 잔액: ${user.balance}원`);
  console.log(`   일치 여부: ${Math.abs(verificationBalance - user.balance) < 0.01 ? '✅' : '❌'}`);
}

fixBalanceDiscrepancy(); 