import Bet from '../models/betModel.js';

async function checkKiaTigersBet() {
  try {
    const bets = await Bet.findAll();
    const targetBet = bets.find(bet => 
      bet.selections.some(sel => 
        sel.desc.includes('Kia Tigers') && 
        sel.commence_time.includes('2025-07-09')
      )
    );
    
    if (targetBet) {
      console.log('Kia Tigers 베팅 찾음:');
      console.log('ID:', targetBet.id);
      console.log('상태:', targetBet.status);
      console.log('생성시간:', targetBet.createdAt);
      console.log('선택사항:');
      
      targetBet.selections.forEach((sel, i) => {
        console.log(`  ${i+1}. ${sel.desc} - ${sel.result || 'pending'}`);
      });
    } else {
      console.log('Kia Tigers 베팅을 찾을 수 없음');
    }
  } catch (err) {
    console.error('에러:', err.message);
  }
}

checkKiaTigersBet(); 