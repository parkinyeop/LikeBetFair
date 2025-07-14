import GameResult from './models/gameResultModel.js';
import ExchangeOrder from './models/exchangeOrderModel.js';
import { Op } from 'sequelize';

async function fixGameData() {
  try {
    console.log('=== 경기 데이터 수정 ===');
    
    // 1. 올바른 경기 찾기 (Juventude vs Sport Club do Recife)
    const correctGame = await GameResult.findOne({
      where: {
        id: '84810f99-d63a-4f50-9ad6-8b773e9a5fbd'
      }
    });
    
    if (!correctGame) {
      console.log('❌ 올바른 경기를 찾을 수 없습니다.');
      return;
    }
    
    console.log('1. 올바른 경기 정보:');
    console.log(`   ID: ${correctGame.id}`);
    console.log(`   경기: ${correctGame.homeTeam} vs ${correctGame.awayTeam}`);
    console.log(`   시간: ${correctGame.commenceTime}`);
    console.log(`   카테고리: ${correctGame.mainCategory} > ${correctGame.subCategory}`);
    
    // 2. ExchangeOrder 업데이트
    const order = await ExchangeOrder.findByPk(1);
    if (!order) {
      console.log('❌ ExchangeOrder를 찾을 수 없습니다.');
      return;
    }
    
    console.log('\n2. ExchangeOrder 수정 전:');
    console.log(`   gameId: ${order.gameId}`);
    console.log(`   homeTeam: ${order.homeTeam}`);
    console.log(`   awayTeam: ${order.awayTeam}`);
    console.log(`   gameResultId: ${order.gameResultId}`);
    console.log(`   sportKey: ${order.sportKey}`);
    
    // 3. 올바른 정보로 업데이트
    await order.update({
      gameId: correctGame.id,
      homeTeam: correctGame.homeTeam,
      awayTeam: correctGame.awayTeam,
      gameResultId: correctGame.id,
      sportKey: `soccer_${correctGame.subCategory}`,
      commenceTime: correctGame.commenceTime
    });
    
    console.log('\n3. ExchangeOrder 수정 후:');
    console.log(`   gameId: ${order.gameId}`);
    console.log(`   homeTeam: ${order.homeTeam}`);
    console.log(`   awayTeam: ${order.awayTeam}`);
    console.log(`   gameResultId: ${order.gameResultId}`);
    console.log(`   sportKey: ${order.sportKey}`);
    
    console.log('\n✅ 경기 데이터 수정 완료!');
    
  } catch (error) {
    console.error('오류:', error);
  }
}

fixGameData(); 