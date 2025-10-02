// server/scripts/fixSpecificBet.js

import Bet from '../models/betModel.js';
import betResultService from '../services/betResultService.js';
import createScriptSequelize from '../config/scriptDatabase.js';

const sequelize = createScriptSequelize();

async function fixBet() {
  // Command line argument로 betId 받기
  const betId = process.argv[2];
  
  if (!betId) {
    console.error('❌ 사용법: node scripts/fixSpecificBet.js <BET_ID>');
    await sequelize.close();
    process.exit(1);
  }
  
  console.log('🔧 버그 베팅 수정...\n');
  console.log(`🎯 대상 베팅 ID: ${betId}\n`);
  
  // 1. 베팅 조회
  const bet = await Bet.findByPk(betId);
  
  if (!bet) {
    console.error(`❌ 베팅을 찾을 수 없습니다: ${betId}`);
    await sequelize.close();
    process.exit(1);
  }
  
  console.log(`📊 현재 상태: ${bet.status}`);
  console.log(`📋 선택 개수: ${bet.selections.length}`);
  bet.selections.forEach((sel, idx) => {
    console.log(`   [${idx+1}] ${sel.market}: ${sel.team || sel.desc} → ${sel.result || 'pending'}`);
  });
  console.log('');
  
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
  console.log(`📋 선택 결과:`);
  updatedBet.selections.forEach((sel, idx) => {
    console.log(`   [${idx+1}] ${sel.market}: ${sel.team || sel.desc} → ${sel.result || 'pending'}`);
  });
  
  console.log('\n✅ 수정 완료!');
  
  await sequelize.close();
  process.exit(0);
}

fixBet().catch(async (error) => {
  console.error('❌ 오류 발생:', error.message);
  console.error(error.stack);
  await sequelize.close();
  process.exit(1);
});


