const GameResult = require('./models/gameResultModel');
const { Op } = require('sequelize');

async function listGameResults() {
  const startOfDay = new Date('2025-06-15T00:00:00Z');
  const endOfDay = new Date('2025-06-15T23:59:59Z');
  const results = await GameResult.findAll({
    where: { commenceTime: { [Op.between]: [startOfDay, endOfDay] } },
    order: [['commenceTime', 'ASC']]
  });
  console.log('2025-06-15 경기 목록:');
  results.forEach(r => {
    console.log(`${r.homeTeam} vs ${r.awayTeam} | ${r.commenceTime.toISOString()} | status: ${r.status} | result: ${r.result}`);
  });
}

listGameResults(); 