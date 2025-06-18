const GameResult = require('./models/gameResultModel');
const { Op } = require('sequelize');

(async () => {
  const recent = await GameResult.findAll({
    where: { mainCategory: 'kbo', commenceTime: { [Op.gte]: new Date('2025-06-10') } },
    order: [['commenceTime', 'DESC']],
    limit: 20
  });
  console.log('2025-06-10 이후 KBO 경기 결과:');
  recent.forEach(r => {
    console.log(`${r.homeTeam} vs ${r.awayTeam} | ${r.commenceTime.toISOString()} | status: ${r.status} | result: ${r.result}`);
  });
})(); 