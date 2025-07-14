import GameResult from './models/gameResultModel.js';
import ExchangeOrder from './models/exchangeOrderModel.js';
import { Op } from 'sequelize';

async function checkGameData() {
  try {
    console.log('=== 경기 데이터 확인 ===');
    
    // 1. ExchangeOrder에서 해당 주문 확인
    const order = await ExchangeOrder.findByPk(1);
    if (order) {
      console.log('1. ExchangeOrder 정보:');
      console.log(`   gameId: ${order.gameId}`);
      console.log(`   homeTeam: ${order.homeTeam}`);
      console.log(`   awayTeam: ${order.awayTeam}`);
      console.log(`   gameResultId: ${order.gameResultId}`);
      console.log(`   sportKey: ${order.sportKey}`);
    }
    
    // 2. GameResult에서 해당 경기 확인
    if (order && order.gameResultId) {
      const gameResult = await GameResult.findByPk(order.gameResultId);
      if (gameResult) {
        console.log('\n2. GameResult 정보:');
        console.log(`   homeTeam: ${gameResult.homeTeam}`);
        console.log(`   awayTeam: ${gameResult.awayTeam}`);
        console.log(`   commenceTime: ${gameResult.commenceTime}`);
        console.log(`   mainCategory: ${gameResult.mainCategory}`);
        console.log(`   subCategory: ${gameResult.subCategory}`);
      }
    }
    
    // 3. gameId로 GameResult 검색
    const gameByGameId = await GameResult.findOne({
      where: { id: order.gameId }
    });
    if (gameByGameId) {
      console.log('\n3. gameId로 찾은 GameResult:');
      console.log(`   homeTeam: ${gameByGameId.homeTeam}`);
      console.log(`   awayTeam: ${gameByGameId.awayTeam}`);
    }
    
    // 4. Juventude가 포함된 모든 경기 검색
    const juventudeGames = await GameResult.findAll({
      where: {
        [Op.or]: [
          { homeTeam: { [Op.iLike]: '%juventude%' } },
          { awayTeam: { [Op.iLike]: '%juventude%' } }
        ]
      },
      order: [['commenceTime', 'DESC']],
      limit: 5
    });
    
    console.log('\n4. Juventude가 포함된 경기들:');
    juventudeGames.forEach((game, i) => {
      console.log(`   ${i+1}. ${game.homeTeam} vs ${game.awayTeam} (${game.commenceTime})`);
    });
    
    // 5. Sport Recife가 포함된 모든 경기 검색
    const sportRecifeGames = await GameResult.findAll({
      where: {
        [Op.or]: [
          { homeTeam: { [Op.iLike]: '%sport%recife%' } },
          { awayTeam: { [Op.iLike]: '%sport%recife%' } }
        ]
      },
      order: [['commenceTime', 'DESC']],
      limit: 5
    });
    
    console.log('\n5. Sport Recife가 포함된 경기들:');
    sportRecifeGames.forEach((game, i) => {
      console.log(`   ${i+1}. ${game.homeTeam} vs ${game.awayTeam} (${game.commenceTime})`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  }
}

checkGameData(); 