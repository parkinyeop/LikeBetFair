const { User, Bet } = require('./models/db.js');

async function checkPendingBets() {
  try {
    const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
    if (!user) {
      console.log('사용자를 찾을 수 없습니다.');
      return;
    }
    
    console.log('=== 사용자 정보 ===');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    
    const pendingBets = await Bet.findAll({
      where: {
        userId: user.id,
        status: 'pending'
      },
      include: ['selections'],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('\n=== 미정산 베팅 목록 ===');
    console.log('총 미정산 베팅 수:', pendingBets.length);
    
    pendingBets.forEach((bet, index) => {
      console.log(`\n${index + 1}. 베팅 ID: ${bet.id}`);
      console.log(`   금액: ${bet.amount}원`);
      console.log(`   상태: ${bet.status}`);
      console.log(`   생성일: ${bet.createdAt}`);
      console.log(`   선택사항:`);
      
      bet.selections.forEach((selection, selIndex) => {
        console.log(`     ${selIndex + 1}. ${selection.desc}`);
        console.log(`        팀: ${selection.team}`);
        console.log(`        마켓: ${selection.market}`);
        console.log(`        결과: ${selection.result}`);
        console.log(`        경기시간: ${selection.commence_time}`);
      });
    });
    
  } catch (error) {
    console.error('오류:', error);
  }
}

checkPendingBets(); 