import OddsCache from '../models/oddsCacheModel.js';
import sequelize from '../models/sequelize.js';
import { Op } from 'sequelize';

async function deleteInvalidOddsCacheRows() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate()+1);

  const deleted = await OddsCache.destroy({
    where: {
      commenceTime: { [Op.gte]: today, [Op.lt]: tomorrow },
      [Op.or]: [
        { mainCategory: null },
        { mainCategory: '' }
      ]
    }
  });
  console.log(`Deleted ${deleted} invalid OddsCache rows for today.`);
  await sequelize.close();
}

deleteInvalidOddsCacheRows(); 