import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('=== 스코어 형식 분석 시작 ===');
    
    // 1. 모든 finished 경기의 스코어 형식 분석
    const finishedGames = await GameResult.findAll({
      where: {
        status: 'finished',
        score: {
          [Op.not]: null
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    console.log(`분석할 finished 경기 수: ${finishedGames.length}`);
    
    let objectFormatCount = 0;
    let arrayFormatCount = 0;
    let stringFormatCount = 0;
    let otherFormatCount = 0;
    
    const formatExamples = {
      object: [],
      array: [],
      string: [],
      other: []
    };
    
    for (const game of finishedGames) {
      const score = game.score;
      const scoreType = typeof score;
      
      if (Array.isArray(score)) {
        if (score.length === 2 && typeof score[0] === 'object' && score[0].name) {
          objectFormatCount++;
          if (formatExamples.object.length < 3) {
            formatExamples.object.push({
              id: game.id,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              score: score,
              createdAt: game.createdAt,
              updatedAt: game.updatedAt
            });
          }
        } else if (score.length === 2 && (typeof score[0] === 'string' || typeof score[0] === 'number')) {
          arrayFormatCount++;
          if (formatExamples.array.length < 3) {
            formatExamples.array.push({
              id: game.id,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              score: score,
              createdAt: game.createdAt,
              updatedAt: game.updatedAt
            });
          }
        } else {
          otherFormatCount++;
          if (formatExamples.other.length < 3) {
            formatExamples.other.push({
              id: game.id,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              score: score,
              createdAt: game.createdAt,
              updatedAt: game.updatedAt
            });
          }
        }
      } else if (scoreType === 'string') {
        stringFormatCount++;
        if (formatExamples.string.length < 3) {
          formatExamples.string.push({
            id: game.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            score: score,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt
          });
        }
      } else {
        otherFormatCount++;
        if (formatExamples.other.length < 3) {
          formatExamples.other.push({
            id: game.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            score: score,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt
          });
        }
      }
    }
    
    console.log('\n=== 스코어 형식 통계 ===');
    console.log(`객체 형식 (올바른): ${objectFormatCount}개`);
    console.log(`배열 형식 (잘못된): ${arrayFormatCount}개`);
    console.log(`문자열 형식: ${stringFormatCount}개`);
    console.log(`기타 형식: ${otherFormatCount}개`);
    
    console.log('\n=== 형식별 예시 ===');
    
    if (formatExamples.object.length > 0) {
      console.log('\n✅ 객체 형식 (올바른):');
      formatExamples.object.forEach(example => {
        console.log(`  ${example.homeTeam} vs ${example.awayTeam}`);
        console.log(`  스코어: ${JSON.stringify(example.score)}`);
        console.log(`  생성일: ${example.createdAt}`);
        console.log(`  수정일: ${example.updatedAt}`);
        console.log('');
      });
    }
    
    if (formatExamples.array.length > 0) {
      console.log('\n❌ 배열 형식 (잘못된):');
      formatExamples.array.forEach(example => {
        console.log(`  ${example.homeTeam} vs ${example.awayTeam}`);
        console.log(`  스코어: ${JSON.stringify(example.score)}`);
        console.log(`  생성일: ${example.createdAt}`);
        console.log(`  수정일: ${example.updatedAt}`);
        console.log('');
      });
    }
    
    if (formatExamples.string.length > 0) {
      console.log('\n⚠️ 문자열 형식:');
      formatExamples.string.forEach(example => {
        console.log(`  ${example.homeTeam} vs ${example.awayTeam}`);
        console.log(`  스코어: ${example.score}`);
        console.log(`  생성일: ${example.createdAt}`);
        console.log(`  수정일: ${example.updatedAt}`);
        console.log('');
      });
    }
    
    // 2. 데이터 소스별 분석
    console.log('\n=== 데이터 소스별 분석 ===');
    
    const kboGames = finishedGames.filter(game => game.subCategory === 'KBO');
    const mlbGames = finishedGames.filter(game => game.subCategory === 'MLB');
    const mlsGames = finishedGames.filter(game => game.subCategory === 'MLS');
    
    console.log(`KBO 경기: ${kboGames.length}개`);
    console.log(`MLB 경기: ${mlbGames.length}개`);
    console.log(`MLS 경기: ${mlsGames.length}개`);
    
    // 3. 시간대별 분석
    console.log('\n=== 시간대별 분석 ===');
    
    const recentGames = finishedGames.filter(game => {
      const gameDate = new Date(game.createdAt);
      const now = new Date();
      const diffDays = (now - gameDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });
    
    const oldGames = finishedGames.filter(game => {
      const gameDate = new Date(game.createdAt);
      const now = new Date();
      const diffDays = (now - gameDate) / (1000 * 60 * 60 * 24);
      return diffDays > 7;
    });
    
    console.log(`최근 7일 내 경기: ${recentGames.length}개`);
    console.log(`7일 이전 경기: ${oldGames.length}개`);
    
    // 4. 원인 분석
    console.log('\n=== 원인 분석 ===');
    console.log('1. 데이터 수집 시점에 따라 다른 API나 스크립트가 사용됨');
    console.log('2. 일부 스크립트는 배열 형식으로 저장하고, 일부는 객체 형식으로 저장');
    console.log('3. 데이터 마이그레이션 과정에서 형식이 통일되지 않음');
    console.log('4. The Odds API와 TheSportsDB API의 응답 형식 차이');
    
    console.log('\n=== 권장 사항 ===');
    console.log('1. 모든 데이터 수집 스크립트에서 동일한 형식 사용');
    console.log('2. 데이터 저장 전 형식 검증 로직 추가');
    console.log('3. 기존 데이터의 형식 통일 (이미 완료됨)');
    
  } catch (error) {
    console.error('분석 중 오류:', error);
  }
})(); 