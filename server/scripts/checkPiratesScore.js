import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

async function checkPiratesGame() {
  try {
    console.log('🔍 Pittsburgh Pirates vs St. Louis Cardinals 경기 데이터 확인...\n');
    
    // 2025-07-02 날짜의 Pirates 관련 경기 모두 조회
    const games = await GameResult.findAll({
      where: {
        [Op.or]: [
          { homeTeam: { [Op.like]: '%Pirates%' } },
          { awayTeam: { [Op.like]: '%Pirates%' } },
          { homeTeam: { [Op.like]: '%Pittsburgh%' } },
          { awayTeam: { [Op.like]: '%Pittsburgh%' } }
        ],
        commenceTime: {
          [Op.between]: [
            new Date('2025-07-02T00:00:00Z'), 
            new Date('2025-07-03T00:00:00Z')
          ]
        }
      },
      raw: true
    });
    
    console.log(`📊 총 ${games.length}개 경기 발견\n`);
    
    games.forEach((game, index) => {
      console.log(`${index + 1}. 경기 정보:`);
      console.log(`   ID: ${game.id}`);
      console.log(`   홈팀: ${game.homeTeam}`);
      console.log(`   원정팀: ${game.awayTeam}`);
      console.log(`   시간: ${game.commenceTime}`);
      console.log(`   상태: ${game.status}`);
      console.log(`   결과: ${game.result}`);
      console.log(`   스코어(원본): "${game.score}"`);
      console.log(`   스코어 타입: ${typeof game.score}`);
      
      if (game.score) {
        console.log(`   스코어 길이: ${game.score.length}`);
        
        // JSON 파싱 시도
        try {
          const parsedScore = JSON.parse(game.score);
          console.log(`   파싱된 스코어:`, parsedScore);
        } catch (error) {
          console.log(`   ❌ JSON 파싱 실패: ${error.message}`);
        }
      } else {
        console.log(`   스코어: null`);
      }
      console.log('');
    });
    
    // 특히 Cardinals와의 경기 찾기
    const cardinalGame = games.find(game => 
      game.awayTeam?.includes('Cardinals') || game.homeTeam?.includes('Cardinals')
    );
    
    if (cardinalGame) {
      console.log('🎯 Cardinals와의 경기 발견:');
      console.log(`   ${cardinalGame.homeTeam} vs ${cardinalGame.awayTeam}`);
      console.log(`   스코어 상세 분석:`);
      console.log(`   - 원본: "${cardinalGame.score}"`);
      console.log(`   - 바이트 길이: ${Buffer.from(cardinalGame.score || '').length}`);
      console.log(`   - 문자 길이: ${(cardinalGame.score || '').length}`);
      
      if (cardinalGame.score) {
        // 각 문자 분석
        console.log(`   - 문자별 분석:`);
        for (let i = 0; i < cardinalGame.score.length; i++) {
          const char = cardinalGame.score[i];
          const code = char.charCodeAt(0);
          console.log(`     [${i}] "${char}" (ASCII: ${code})`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

checkPiratesGame(); 