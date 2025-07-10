const User = require('./models/userModel.js').default;
const Bet = require('./models/betModel.js').default;

async function checkAllBetStatus() {
  const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
  if (!user) {
    console.log('해당 이메일의 유저가 없습니다.');
    return;
  }
  
  const allBets = await Bet.findAll({ 
    where: { userId: user.id },
    order: [['createdAt', 'DESC']],
    limit: 10
  });
  
  console.log(`전체 베팅 수: ${allBets.length}`);
  
  // 상태별 카운트
  const statusCount = {};
  allBets.forEach(bet => {
    statusCount[bet.status] = (statusCount[bet.status] || 0) + 1;
  });
  
  console.log('\n상태별 베팅 수:');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}개`);
  });
  
  console.log('\n최근 베팅 5개:');
  allBets.slice(0, 5).forEach((bet, i) => {
    console.log(`\n[${i+1}] 베팅ID: ${bet.id}`);
    console.log(`   스테이크: ${bet.stake}`);
    console.log(`   배당: ${bet.totalOdds}`);
    console.log(`   상태: ${bet.status}`);
    console.log(`   생성일: ${bet.createdAt}`);
    console.log(`   베팅내역: ${bet.selections.length}개 선택`);
  });
}

checkAllBetStatus(); 