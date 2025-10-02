// server/scripts/fixSpecificBet.js

import Bet from '../models/betModel.js';
import betResultService from '../services/betResultService.js';
import createScriptSequelize from '../config/scriptDatabase.js';

const sequelize = createScriptSequelize();

async function fixBet() {
  const betId = 'ebeae01a-6b00-432d-8591-d3a4f7caa8e9';
  
  console.log('🔧 버그 베팅 수정...\n');
  
  // 1. 베팅 조회
  const bet = await Bet.findByPk(betId);
  console.log(`📊 현재 상태: ${bet.status}`);
  console.log(`📋 Selection result: ${bet.selections[0].result}\n`);
  
  // 2. pending으로 재설정
  console.log('🔄 상태를 pending으로 재설정...');
  bet.status = 'pending';
  await bet.save();
  console.log('✅ 재설정 완료\n');
  
  // 3. 재정산
  console.log('🎯 재정산 실행...');
  await betResultService.processBetResult(bet);
  
  // 4. 결과 확인
  const updatedBet = await Bet.findByPk(betId);
  console.log(`\n📊 재정산 후 상태: ${updatedBet.status}`);
  console.log(`📋 Selection result: ${updatedBet.selections[0].result}`);
  
  await sequelize.close();
}

fixBet().catch(console.error);


