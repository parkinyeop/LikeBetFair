const GameResult = require('./models/gameResultModel');
const { Op } = require('sequelize');

const kboTeams = [
  'Samsung Lions', 'Doosan Bears', 'LG Twins', 'Kia Tigers', 'Hanwha Eagles',
  'SSG Landers', 'KT Wiz', 'NC Dinos', 'Lotte Giants', 'Kiwoom Heroes'
];

(async () => {
  const results = await GameResult.findAll({
    where: {
      [Op.or]: [
        { homeTeam: { [Op.in]: kboTeams } },
        { awayTeam: { [Op.in]: kboTeams } }
      ],
      commenceTime: { [Op.gte]: new Date('2025-06-01') }
    },
    order: [['commenceTime', 'DESC']],
    limit: 30
  });
  console.log('2025-06-01 이후 KBO 팀 경기 상세 내역:');
  results.forEach(r => {
    console.log({
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      commenceTime: r.commenceTime,
      mainCategory: r.mainCategory,
      subCategory: r.subCategory,
      eventId: r.eventId,
      status: r.status,
      result: r.result
    });
  });
})(); 