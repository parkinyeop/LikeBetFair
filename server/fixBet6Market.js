const Bet = require('./models/betModel');

async function fixBet6Market() {
  try {
    const bet = await Bet.findByPk('ccb99def-211a-45ef-b810-ce88a9486e82');
    
    console.log('베팅 6 수정 전:');
    bet.selections.forEach((sel, idx) => {
      console.log(`${idx + 1}. ${sel.desc} (${sel.team}) - market: ${sel.market}`);
    });
    
    // market 필드 추가
    bet.selections.forEach(selection => {
      if (!selection.market) {
        selection.market = '승/패';
      }
    });
    
    await bet.update({
      selections: bet.selections
    });
    
    console.log('\n베팅 6 수정 후:');
    bet.selections.forEach((sel, idx) => {
      console.log(`${idx + 1}. ${sel.desc} (${sel.team}) - market: ${sel.market}`);
    });
    
    console.log('\n베팅 6 market 필드 수정 완료!');
  } catch (error) {
    console.error('에러:', error);
  }
}

fixBet6Market(); 