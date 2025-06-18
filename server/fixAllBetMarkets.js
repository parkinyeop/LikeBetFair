const Bet = require('./models/betModel');

async function fixAllBetMarkets() {
  try {
    console.log('모든 베팅의 market 필드 확인 및 수정...');
    
    const allBets = await Bet.findAll();
    console.log(`총 베팅 수: ${allBets.length}`);
    
    let fixedCount = 0;
    
    for (const bet of allBets) {
      let needsUpdate = false;
      
      console.log(`\n베팅 ID: ${bet.id}, 상태: ${bet.status}`);
      
      for (const selection of bet.selections) {
        if (!selection.market) {
          console.log(`  ${selection.desc} (${selection.team}) - market: ${selection.market} -> 승/패`);
          selection.market = '승/패';
          needsUpdate = true;
        } else {
          console.log(`  ${selection.desc} (${selection.team}) - market: ${selection.market}`);
        }
      }
      
      if (needsUpdate) {
        await bet.update({
          selections: bet.selections
        });
        fixedCount++;
        console.log(`  베팅 ${bet.id} 업데이트 완료`);
      }
    }
    
    console.log(`\n총 ${fixedCount}개 베팅의 market 필드 수정 완료! (market이 없는 selection만 보정)`);
  } catch (error) {
    console.error('에러:', error);
  }
}

fixAllBetMarkets(); 