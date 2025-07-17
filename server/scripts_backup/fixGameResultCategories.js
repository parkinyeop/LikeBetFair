// GameResult, OddsCache DB의 mainCategory, subCategory를 일괄 정규화하는 스크립트
import GameResult from '../models/gameResultModel.js';
import OddsCache from '../models/oddsCacheModel.js';
import { normalizeCategoryPair } from '../normalizeUtils.js';
import { Op } from 'sequelize';

const allowedCategories = ['baseball', 'soccer', 'basketball'];

async function fixGameResultCategories() {
  console.log('GameResult 카테고리 정규화 시작');
  const results = await GameResult.findAll();
  let updated = 0;
  for (const result of results) {
    const { mainCategory, subCategory } = normalizeCategoryPair(result.mainCategory, result.subCategory);
    if (result.mainCategory !== mainCategory || result.subCategory !== subCategory) {
      result.mainCategory = mainCategory;
      result.subCategory = subCategory;
      await result.save();
      updated++;
    }
  }
  console.log(`GameResult 정규화 완료: ${updated}건 업데이트됨`);

  // 비허용 카테고리 데이터 일괄 삭제
  const deleteCount = await GameResult.destroy({
    where: {
      mainCategory: { [Op.notIn]: allowedCategories }
    }
  });
  console.log(`비허용 카테고리 GameResult ${deleteCount}건 삭제 완료`);

  console.log('OddsCache 카테고리 정규화 시작');
  const odds = await OddsCache.findAll();
  let oddsUpdated = 0;
  for (const o of odds) {
    const { mainCategory, subCategory } = normalizeCategoryPair(o.mainCategory, o.subCategory);
    if (o.mainCategory !== mainCategory || o.subCategory !== subCategory) {
      o.mainCategory = mainCategory;
      o.subCategory = subCategory;
      await o.save();
      oddsUpdated++;
    }
  }
  console.log(`OddsCache 정규화 완료: ${oddsUpdated}건 업데이트됨`);
  process.exit(0);
}

fixGameResultCategories(); 