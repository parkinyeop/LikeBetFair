import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import betResultService from '../services/betResultService.js';

async function main() {
  const betId = '423ec960-c6f9-44c6-a105-d69ed013c2de'; // test001 계정의 문제 베팅
  
  try {
    const bet = await Bet.findByPk(betId);
    
    if (!bet) {
      console.log('❌ 베팅을 찾을 수 없습니다.');
      return;
    }
    
    // ✅ 베팅 결과 처리(환불 체크 포함)
    await betResultService.processBetResult(bet);

    console.log('📋 베팅 상세 정보:');
    console.log(`베팅 ID: ${bet.id}`);
    console.log(`사용자 ID: ${bet.userId}`);
    console.log(`상태: ${bet.status}`);
    console.log(`베팅금: ${Number(bet.stake).toLocaleString()}원`);
    console.log(`배당률: ${bet.totalOdds}`);
    console.log(`예상수익: ${Number(bet.potentialWinnings).toLocaleString()}원`);
    console.log(`생성일: ${bet.createdAt}`);
    console.log('\n📝 선택 정보:');
    
    for (let i = 0; i < bet.selections.length; i++) {
      const sel = bet.selections[i];
      console.log(`\n${i + 1}. 선택 상세:`);
      console.log('   전체 selection 데이터:', JSON.stringify(sel, null, 2));
      
      // 경기결과 DB에서 찾기
      if (sel.commence_time) {
        const gameResults = await GameResult.findAll({
          where: {
            commenceTime: {
              [Op.between]: [
                new Date(new Date(sel.commence_time).getTime() - 3 * 60 * 60 * 1000), // 3시간 전
                new Date(new Date(sel.commence_time).getTime() + 3 * 60 * 60 * 1000)  // 3시간 후
              ]
            }
          }
        });
        
        console.log(`   해당 시간대 경기결과 (${gameResults.length}개):`);
        gameResults.forEach((gr, idx) => {
          console.log(`      ${idx + 1}) ${gr.homeTeam} vs ${gr.awayTeam}`);
          console.log(`         시간: ${gr.commenceTime}`);
          console.log(`         상태: ${gr.status}`);
          console.log(`         스코어: ${gr.score}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

main(); 