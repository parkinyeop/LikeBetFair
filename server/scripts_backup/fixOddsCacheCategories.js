import OddsCache from '../models/oddsCacheModel.js';
import { normalizeCategoryPair } from '../normalizeUtils.js';
import sequelize from '../models/sequelize.js';

async function fixOddsCacheCategories() {
  const oddsList = await OddsCache.findAll();
  let updated = 0;

  for (const odds of oddsList) {
    const { mainCategory, subCategory } = normalizeCategoryPair(odds.mainCategory, odds.subCategory);
    if (odds.mainCategory !== mainCategory || odds.subCategory !== subCategory) {
      odds.mainCategory = mainCategory;
      odds.subCategory = subCategory;
      await odds.save();
      updated++;
      console.log(`Updated: ${odds.id} → mainCategory: ${mainCategory}, subCategory: ${subCategory}`);
    }
  }

  console.log(`Done. Updated ${updated} rows.`);
  await sequelize.close();
}

fixOddsCacheCategories().catch(e => {
  console.error(e);
  sequelize.close();
}); 