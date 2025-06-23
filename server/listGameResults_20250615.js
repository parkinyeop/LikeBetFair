import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

async function listGameResults() {
  const startOfDay = new Date('2025-06-19T00:00:00Z');
  const endOfDay = new Date('2025-06-19T23:59:59Z');
  const results = await GameResult.findAll({
    where: { commenceTime: { [Op.between]: [startOfDay, endOfDay] } },
    attributes: ['mainCategory', 'subCategory', 'id'],
    raw: true
  });

  // 카테고리별 집계
  const countMap = {};
  results.forEach(r => {
    const key = `${r.mainCategory} / ${r.subCategory}`;
    countMap[key] = (countMap[key] || 0) + 1;
  });

  console.log('2025-06-19 mainCategory / subCategory별 경기 수:');
  Object.entries(countMap).forEach(([key, count]) => {
    console.log(`${key}: ${count}경기`);
  });
  console.log(`총 경기 수: ${results.length}경기`);
}

listGameResults(); 