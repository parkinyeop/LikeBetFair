const Bet = require('./models/betModel');

async function checkBetDates() {
  try {
    const now = new Date();
    const koreaTime = new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
    
    console.log('현재 날짜:', now.toISOString());
    console.log('현재 날짜 (한국 시간):', koreaTime);
    console.log('\n=== 베팅별 경기 날짜 확인 ===\n');
    
    const allBets = await Bet.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    for (const bet of allBets) {
      console.log(`베팅 ID: ${bet.id}, 상태: ${bet.status}`);
      
      for (const selection of bet.selections) {
        if (selection.commence_time) {
          const gameTime = new Date(selection.commence_time);
          const gameKoreaTime = gameTime.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
          const isPast = gameTime < now;
          
          console.log(`  ${selection.desc} (${selection.team})`);
          console.log(`    경기 시간: ${selection.commence_time}`);
          console.log(`    경기 시간 (한국): ${gameKoreaTime}`);
          console.log(`    과거 경기: ${isPast ? 'YES' : 'NO'}`);
          console.log('');
        } else {
          console.log(`  ${selection.desc} (${selection.team}) - commence_time 없음`);
          console.log('');
        }
      }
      console.log('---');
    }
  } catch (error) {
    console.error('에러:', error);
  }
}

checkBetDates(); 