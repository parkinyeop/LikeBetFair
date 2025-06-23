import Bet from '../models/betModel.js';

(async () => {
  const minBet = await Bet.findOne({
    order: [['createdAt', 'ASC']],
    attributes: ['createdAt'],
  });
  if (minBet) {
    console.log('가장 과거의 베팅 날짜:', minBet.createdAt.toISOString().slice(0, 10));
  } else {
    console.log('베팅 데이터가 없습니다.');
  }
  process.exit(0);
})(); 