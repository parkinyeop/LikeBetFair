import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';
import { Op } from 'sequelize';

const desc = 'Pohang Steelers vs Jeju United FC';
const [home, away] = desc.split(' vs ');
const homeNorm = normalizeTeamName(home);
const awayNorm = normalizeTeamName(away);
const commenceTime = new Date('2025-06-21T10:00:00.000Z');

const results = await GameResult.findAll({
  where: {
    commenceTime: {
      [Op.between]: [
        new Date(commenceTime.getTime() - 2 * 60 * 60 * 1000),
        new Date(commenceTime.getTime() + 2 * 60 * 60 * 1000)
      ]
    }
  },
  order: [['commenceTime', 'ASC']]
});

const match = results.find(g => normalizeTeamName(g.homeTeam) === homeNorm && normalizeTeamName(g.awayTeam) === awayNorm);

if (match) {
  console.log(JSON.stringify({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score: match.score,
    result: match.result,
    status: match.status,
    commenceTime: match.commenceTime
  }, null, 2));
} else {
  console.log('No matching game result found');
} 