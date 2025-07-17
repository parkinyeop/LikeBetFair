import Bet from '../models/betModel.js';

async function checkPendingBets() {
  try {
    const pendingBets = await Bet.findAll({ where: { status: 'pending' } });
    console.log('Pending 베팅 수:', pendingBets.length);
    
    pendingBets.forEach((bet, i) => {
      console.log(`\n베팅 ${i+1}:`);
      console.log('ID:', bet.id);
      console.log('생성시간:', bet.createdAt);
      console.log('선택사항 수:', bet.selections.length);
      
      bet.selections.forEach((sel, j) => {
        console.log(`  선택 ${j+1}: ${sel.desc} (${sel.commence_time})`);
      });
    });
  } catch (err) {
    console.error('에러:', err.message);
  }
}

checkPendingBets(); 