import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

async function findCorruptedScores() {
  try {
    console.log('🔍 불완전한 스코어 데이터 검색 중...\n');
    
    // 스코어가 있지만 JSON 파싱이 안 되거나 이상한 형태의 경기들 찾기
    const games = await GameResult.findAll({
      where: {
        score: {
          [Op.ne]: null
        }
      },
      raw: true
    });
    
    console.log(`📊 총 ${games.length}개 스코어 데이터 검사 중...\n`);
    
    const corruptedGames = [];
    const shortScores = [];
    
    games.forEach(game => {
      if (game.score) {
        // 길이가 너무 짧은 스코어 (정상적인 JSON은 최소 20자 이상)
        if (game.score.length < 10) {
          shortScores.push({
            id: game.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            score: game.score,
            length: game.score.length,
            subCategory: game.subCategory
          });
          return;
        }
        
        // JSON 파싱 시도
        try {
          const parsed = JSON.parse(game.score);
          
          // 배열이 아니거나 길이가 2가 아닌 경우
          if (!Array.isArray(parsed) || parsed.length !== 2) {
            corruptedGames.push({
              id: game.id,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              score: game.score,
              issue: 'Invalid array structure',
              subCategory: game.subCategory
            });
            return;
          }
          
          // 각 요소가 올바른 형태인지 확인
          const isValidFormat = parsed.every(item => 
            typeof item === 'object' && 
            item !== null && 
            'name' in item && 
            'score' in item
          );
          
          if (!isValidFormat) {
            // 문자열 배열 형태도 허용 (일부 KBO/MLB)
            const isStringArray = parsed.every(item => 
              typeof item === 'string' || item === null
            );
            
            if (!isStringArray) {
              corruptedGames.push({
                id: game.id,
                homeTeam: game.homeTeam,
                awayTeam: game.awayTeam,
                score: game.score,
                parsed: parsed,
                issue: 'Invalid element format',
                subCategory: game.subCategory
              });
            }
          }
          
        } catch (error) {
          corruptedGames.push({
            id: game.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            score: game.score,
            issue: `JSON parsing error: ${error.message}`,
            subCategory: game.subCategory
          });
        }
      }
    });
    
    console.log('🚨 문제 발견:');
    console.log(`- 너무 짧은 스코어: ${shortScores.length}개`);
    console.log(`- JSON 형태 오류: ${corruptedGames.length}개\n`);
    
    if (shortScores.length > 0) {
      console.log('📋 너무 짧은 스코어 데이터:');
      shortScores.forEach((game, index) => {
        console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam} (${game.subCategory})`);
        console.log(`   ID: ${game.id}`);
        console.log(`   스코어: "${game.score}" (길이: ${game.length})`);
        console.log('');
      });
    }
    
    if (corruptedGames.length > 0) {
      console.log('📋 JSON 형태 오류:');
      corruptedGames.forEach((game, index) => {
        console.log(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam} (${game.subCategory})`);
        console.log(`   ID: ${game.id}`);
        console.log(`   스코어: "${game.score}"`);
        console.log(`   문제: ${game.issue}`);
        if (game.parsed) {
          console.log(`   파싱됨:`, game.parsed);
        }
        console.log('');
      });
    }
    
    if (shortScores.length === 0 && corruptedGames.length === 0) {
      console.log('✅ 모든 스코어 데이터가 정상입니다!');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

findCorruptedScores(); 