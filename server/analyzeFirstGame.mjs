import User from './models/userModel.js';
import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import sequelize from './models/db.js';
import { Op } from 'sequelize';

async function analyzeFirstGame() {
  try {
    console.log('=== 첫 번째 경기 분석: New England Revolution vs Inter Miami CF ===\n');
    
    // 1. 해당 베팅 정보 조회
    const bet1 = await Bet.findOne({
      where: { id: 'd4b0052c-62d2-427b-b879-128ed6c6b443' }
    });
    
    if (!bet1) {
      console.log('베팅을 찾을 수 없습니다.');
      return;
    }
    
    console.log('1. 베팅 정보:');
    console.log(`   베팅 ID: ${bet1.id}`);
    console.log(`   금액: ${bet1.stake}원`);
    console.log(`   상태: ${bet1.status}`);
    console.log(`   생성일: ${bet1.createdAt}`);
    
    const selection = bet1.selections[0];
    console.log('\n2. Selection 정보:');
    console.log(`   설명: ${selection.desc}`);
    console.log(`   팀: ${selection.team}`);
    console.log(`   마켓: ${selection.market}`);
    console.log(`   결과: ${selection.result}`);
    console.log(`   경기시간: ${selection.commence_time}`);
    
    // 2. DB에서 해당 시간대의 모든 경기 조회
    const selTime = new Date(selection.commence_time);
    const from = new Date(selTime.getTime() - 12 * 60 * 60 * 1000);
    const to = new Date(selTime.getTime() + 12 * 60 * 60 * 1000);
    
    console.log('\n3. DB에서 ±12시간 내 모든 경기 조회:');
    const allGames = await GameResult.findAll({
      where: {
        commenceTime: { [Op.between]: [from, to] }
      },
      order: [['commenceTime', 'ASC']]
    });
    
    console.log(`   총 ${allGames.length}개 경기 발견`);
    allGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
      console.log(`      스코어: ${JSON.stringify(game.score)}`);
    });
    
    // 3. 팀명 매칭 시도 (다양한 변형으로)
    console.log('\n4. 팀명 매칭 시도:');
    const teamVariations = [
      'intermiamicf',
      'inter miami cf',
      'inter miami',
      'miami',
      'new england revolution',
      'new england',
      'revolution'
    ];
    
    for (const teamVar of teamVariations) {
      const match = await GameResult.findOne({
        where: {
          commenceTime: { [Op.between]: [from, to] },
          [Op.or]: [
            { homeTeam: { [Op.iLike]: `%${teamVar}%` } },
            { awayTeam: { [Op.iLike]: `%${teamVar}%` } }
          ]
        }
      });
      
      if (match) {
        console.log(`   ✅ "${teamVar}" 매칭 성공:`);
        console.log(`      ${match.homeTeam} vs ${match.awayTeam}`);
        console.log(`      시간: ${match.commenceTime}`);
        console.log(`      상태: ${match.status}, 결과: ${match.result}`);
        console.log(`      스코어: ${JSON.stringify(match.score)}`);
        break;
      } else {
        console.log(`   ❌ "${teamVar}" 매칭 실패`);
      }
    }
    
    // 4. MLS 리그의 모든 경기 조회 (혹시 다른 팀명으로 저장되어 있을 수 있음)
    console.log('\n5. MLS 관련 경기 조회:');
    const mlsGames = await GameResult.findAll({
      where: {
        commenceTime: { [Op.between]: [from, to] },
        [Op.or]: [
          { homeTeam: { [Op.iLike]: '%mls%' } },
          { awayTeam: { [Op.iLike]: '%mls%' } },
          { homeTeam: { [Op.iLike]: '%united states%' } },
          { awayTeam: { [Op.iLike]: '%united states%' } }
        ]
      },
      order: [['commenceTime', 'ASC']]
    });
    
    console.log(`   MLS 관련 경기: ${mlsGames.length}개`);
    mlsGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`);
      console.log(`      시간: ${game.commenceTime}`);
      console.log(`      상태: ${game.status}, 결과: ${game.result}`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeFirstGame(); 