const User = require('./models/userModel.js').default;

async function fixBalanceToInteger() {
  console.log('=== 잔액을 정수로 수정 ===\n');
  
  // parkinyeop@naver.com 사용자 찾기
  const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
  if (!user) {
    console.log('❌ 해당 이메일의 유저가 없습니다.');
    return;
  }
  
  console.log(`👤 사용자: ${user.username} (${user.email})`);
  console.log(`💰 현재 잔액: ${user.balance}원`);
  
  // 잔액을 정수로 변환
  const oldBalance = user.balance;
  const newBalance = Math.floor(parseFloat(user.balance));
  
  user.balance = newBalance;
  await user.save();
  
  console.log('\n✅ 잔액 정수 변환 완료:');
  console.log(`   이전 잔액: ${oldBalance}원`);
  console.log(`   수정된 잔액: ${user.balance}원`);
  console.log(`   차이: ${(user.balance - oldBalance).toLocaleString()}원`);
}

fixBalanceToInteger(); 