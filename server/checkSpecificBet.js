import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import User from './models/userModel.js';
import { Op } from 'sequelize';

async function checkSpecificBet() {
  const betId = '217b03ea-eb4d-4a8d-bbef-048b63529eec';
  
  try {
    console.log('=== 특정 베팅 상세 정보 확인 ===\n');
    
    // 베팅 정보 조회
    const bet = await Bet.findByPk(betId, {
      include: [{ model: User, attributes: ['email', 'username'] }]
    });
    
    if (!bet) {
      console.log('❌ 베팅을 찾을 수 없습니다.');
      return;
    }
    
    console.log('📊 베팅 기본 정보:');
    console.log(`  - ID: ${bet.id}`);
    console.log(`  - 사용자: ${bet.User?.username || 'N/A'}`);
    console.log(`  - 스테이크: ${bet.stake}원`);
    console.log(`  - 총 배당: ${bet.totalOdds}`);
    console.log(`  - 상태: ${bet.status}`);
    console.log(`  - 완료 여부: ${bet.completed}`);
    console.log(`  - 생성일: ${bet.createdAt}`);
    console.log(`  - 업데이트: ${bet.updatedAt}`);
    
    console.log('\n🎯 선택 정보:');
    if (bet.selections && Array.isArray(bet.selections)) {
      bet.selections.forEach((selection, index) => {
        console.log(`  ${index + 1}. ${selection.desc}`);
        console.log(`     팀: ${selection.team}`);
        console.log(`     마켓: ${selection.market}`);
        console.log(`     결과: ${selection.result}`);
        console.log(`     경기시간: ${selection.commence_time}`);
        console.log('');
      });
    }
    
    // 각 선택에 대한 경기 결과 확인
    console.log('🏈 경기 결과 매칭:');
    for (const selection of bet.selections) {
      const teams = selection.desc ? selection.desc.split(' vs ') : [];
      if (teams.length === 2) {
        const homeTeam = teams[0].trim();
        const awayTeam = teams[1].trim();
        
        console.log(`\n  ${homeTeam} vs ${awayTeam}:`);
        
        // 경기 결과 찾기
        const gameResult = await GameResult.findOne({
          where: {
            homeTeam: { [Op.iLike]: `%${homeTeam}%` },
            awayTeam: { [Op.iLike]: `%${awayTeam}%` },
            commenceTime: {
              [Op.between]: [
                new Date(new Date(selection.commence_time).getTime() - 24 * 60 * 60 * 1000),
                new Date(new Date(selection.commence_time).getTime() + 24 * 60 * 60 * 1000)
              ]
            }
          },
          order: [['createdAt', 'DESC']]
        });
        
        if (gameResult) {
          console.log(`    ✅ 경기 결과 찾음 (ID: ${gameResult.id})`);
          console.log(`    상태: ${gameResult.status}`);
          console.log(`    결과: ${gameResult.result}`);
          console.log(`    스코어: ${JSON.stringify(gameResult.score)}`);
          console.log(`    완료시간: ${gameResult.finishedAt}`);
        } else {
          console.log(`    ❌ 경기 결과 없음`);
        }
      }
    }
    
    // 베팅 결과 처리 가능 여부 확인
    console.log('\n🔍 베팅 결과 처리 분석:');
    let canProcess = true;
    let reasons = [];
    
    if (bet.status !== 'pending') {
      canProcess = false;
      reasons.push('베팅 상태가 pending이 아님');
    }
    
    if (!bet.selections || !Array.isArray(bet.selections)) {
      canProcess = false;
      reasons.push('선택 정보가 없거나 배열이 아님');
    }
    
    for (const selection of bet.selections) {
      if (selection.result === 'pending') {
        const teams = selection.desc ? selection.desc.split(' vs ') : [];
        if (teams.length === 2) {
          const homeTeam = teams[0].trim();
          const awayTeam = teams[1].trim();
          
          const gameResult = await GameResult.findOne({
            where: {
              homeTeam: { [Op.iLike]: `%${homeTeam}%` },
              awayTeam: { [Op.iLike]: `%${awayTeam}%` },
              commenceTime: {
                [Op.between]: [
                  new Date(new Date(selection.commence_time).getTime() - 24 * 60 * 60 * 1000),
                  new Date(new Date(selection.commence_time).getTime() + 24 * 60 * 60 * 1000)
                ]
              }
            }
          });
          
          if (!gameResult || !gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) {
            canProcess = false;
            reasons.push(`${homeTeam} vs ${awayTeam} 경기의 스코어 정보 없음`);
          }
        }
      }
    }
    
    console.log(`  처리 가능: ${canProcess ? '✅ 예' : '❌ 아니오'}`);
    if (!canProcess) {
      console.log('  이유:');
      reasons.forEach(reason => console.log(`    - ${reason}`));
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
  
  process.exit(0);
}

checkSpecificBet(); 