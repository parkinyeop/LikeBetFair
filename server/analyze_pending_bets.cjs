const User = require('./models/userModel.js').default;
const Bet = require('./models/betModel.js').default;

async function analyzePendingBets(email) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.log('해당 이메일의 유저가 없습니다.');
    return;
  }
  const bets = await Bet.findAll({ where: { userId: user.id, status: 'pending' }, order: [['createdAt', 'DESC']], limit: 5 });
  console.log(`미정산 베팅 수: ${bets.length}`);
  bets.forEach((bet, i) => {
    console.log(`\n[${i+1}] 베팅ID: ${bet.id}`);
    console.log(`스테이크: ${bet.stake}`);
    console.log(`배당: ${bet.totalOdds}`);
    console.log(`상태: ${bet.status}`);
    console.log(`베팅내역: ${JSON.stringify(bet.selections)}`);
    console.log(`생성일: ${bet.createdAt}`);
  });
}

analyzePendingBets('parkinyeop@naver.com'); 