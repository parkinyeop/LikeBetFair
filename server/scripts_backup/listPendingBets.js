import Bet from '../models/betModel.js';

async function main() {
  const pendingBets = await Bet.findAll({ where: { status: 'pending' } });
  console.log(`Pending 베팅 수: ${pendingBets.length}`);
  for (const bet of pendingBets) {
    console.log(`\n[Bet ID: ${bet.id}]`);
    for (const sel of bet.selections) {
      console.log(`- 경기: ${sel.desc}, 팀: ${sel.team}, 시간: ${sel.commence_time}, 마켓: ${sel.market}, 결과: ${sel.result}`);
    }
  }
}

main(); 