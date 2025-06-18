const Bet = require('./models/betModel');

async function checkBet6() {
  try {
    const bet = await Bet.findByPk('ccb99def-211a-45ef-b810-ce88a9486e82');
    console.log('베팅 6 selections:');
    bet.selections.forEach((sel, idx) => {
      console.log(`${idx + 1}. ${sel.desc} (${sel.team}) - market: ${sel.market}`);
    });
  } catch (error) {
    console.error('에러:', error);
  }
}

checkBet6(); 