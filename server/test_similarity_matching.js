import Bet from './models/betModel.js';
import GameResult from './models/gameResultModel.js';
import { calculateTeamNameSimilarity, normalizeTeamNameForComparison } from './normalizeUtils.js';
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('=== 유사도 매칭 로직 테스트 ===\n');
    
    // 1. pending 배팅 조회
    const pendingBets = await Bet.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 총 ${pendingBets.length}개의 pending 배팅 발견\n`);
    
    for (const bet of pendingBets) {
      console.log(`\n🔍 배팅 ${bet.id} 분석:`);
      console.log(`   배팅 시간: ${bet.createdAt}`);
      console.log(`   배팅 금액: ${bet.stake}원`);
      
      const selections = bet.selections || [];
      
      for (const [selIndex, selection] of selections.entries()) {
        console.log(`\n   📋 Selection ${selIndex + 1}:`);
        console.log(`      경기: ${selection.desc}`);
        console.log(`      팀: ${selection.team}`);
        console.log(`      시간: ${selection.commence_time}`);
        
        // 2. 팀명 파싱
        const teams = selection.desc.split(' vs ');
        const homeTeam = teams[0]?.trim();
        const awayTeam = teams[1]?.trim();
        
        if (!homeTeam || !awayTeam) {
          console.log(`      ❌ 팀명 파싱 실패`);
          continue;
        }
        
        // 3. 시간 범위 설정 (±48시간)
        const gameTime = new Date(selection.commence_time);
        const startTime = new Date(gameTime.getTime() - 48 * 60 * 60 * 1000);
        const endTime = new Date(gameTime.getTime() + 48 * 60 * 60 * 1000);
        
        // 4. GameResult DB에서 후보 조회
        const candidates = await GameResult.findAll({
          where: {
            commenceTime: {
              [Op.between]: [startTime, endTime]
            }
          },
          order: [['commenceTime', 'DESC']]
        });
        
        console.log(`      🔍 ±48시간 범위 후보: ${candidates.length}개`);
        
        // 5. 유사도 매칭 테스트
        const homeTeamNorm = normalizeTeamNameForComparison(homeTeam);
        const awayTeamNorm = normalizeTeamNameForComparison(awayTeam);
        
        console.log(`      📝 정규화된 팀명:`);
        console.log(`         홈팀: "${homeTeam}" → "${homeTeamNorm}"`);
        console.log(`         원정팀: "${awayTeam}" → "${awayTeamNorm}"`);
        
        let bestMatch = null;
        let bestSimilarity = 0;
        const SIMILARITY_THRESHOLD = 0.8;
        
        console.log(`\n      🎯 유사도 매칭 결과 (임계값: ${SIMILARITY_THRESHOLD}):`);
        
        for (const candidate of candidates) {
          const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
          const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
          
          // 정방향 매칭 (home-home, away-away)
          const homeSimilarity = calculateTeamNameSimilarity(homeTeamNorm, dbHomeNorm);
          const awaySimilarity = calculateTeamNameSimilarity(awayTeamNorm, dbAwayNorm);
          const forwardScore = (homeSimilarity + awaySimilarity) / 2;
          
          // 역방향 매칭 (home-away, away-home)
          const homeAwaySimilarity = calculateTeamNameSimilarity(homeTeamNorm, dbAwayNorm);
          const awayHomeSimilarity = calculateTeamNameSimilarity(awayTeamNorm, dbHomeNorm);
          const reverseScore = (homeAwaySimilarity + awayHomeSimilarity) / 2;
          
          const similarity = Math.max(forwardScore, reverseScore);
          const matchDirection = forwardScore > reverseScore ? '정방향' : '역방향';
          
          if (similarity >= SIMILARITY_THRESHOLD) {
            console.log(`         ✅ ${candidate.homeTeam} vs ${candidate.awayTeam}`);
            console.log(`            유사도: ${similarity.toFixed(3)} (${matchDirection})`);
            console.log(`            시간: ${candidate.commenceTime}`);
            console.log(`            상태: ${candidate.status}`);
            console.log(`            결과: ${candidate.result}`);
            
            if (similarity > bestSimilarity) {
              bestMatch = candidate;
              bestSimilarity = similarity;
            }
          } else if (similarity >= 0.6) { // 60% 이상은 표시
            console.log(`         ⚠️ ${candidate.homeTeam} vs ${candidate.awayTeam} (${similarity.toFixed(3)})`);
          }
        }
        
        if (bestMatch) {
          console.log(`\n      🎉 최고 매칭:`);
          console.log(`         ${bestMatch.homeTeam} vs ${bestMatch.awayTeam}`);
          console.log(`         유사도: ${bestSimilarity.toFixed(3)}`);
          console.log(`         시간: ${bestMatch.commenceTime}`);
          console.log(`         상태: ${bestMatch.status}`);
          console.log(`         결과: ${bestMatch.result}`);
        } else {
          console.log(`\n      ❌ 임계값(${SIMILARITY_THRESHOLD}) 이상 매칭 없음`);
        }
      }
    }
    
    // 6. 특정 케이스 상세 테스트
    console.log(`\n🔬 특정 케이스 상세 테스트:`);
    
    const testCases = [
      {
        name: 'MLS 케이스',
        betTeam: 'Inter Miami CF',
        apiTeam: 'Inter Miami',
        expected: '높은 유사도'
      },
      {
        name: '중국 슈퍼리그 케이스',
        betTeam: 'Shanghai Shenhua FC',
        apiTeam: 'Shanghai Shenhua',
        expected: '높은 유사도'
      },
      {
        name: '중국 슈퍼리그 케이스 2',
        betTeam: 'Tianjin Jinmen Tiger FC',
        apiTeam: 'Tianjin Jinmen Tiger',
        expected: '높은 유사도'
      }
    ];
    
    for (const testCase of testCases) {
      const betNorm = normalizeTeamNameForComparison(testCase.betTeam);
      const apiNorm = normalizeTeamNameForComparison(testCase.apiTeam);
      const similarity = calculateTeamNameSimilarity(betNorm, apiNorm);
      
      console.log(`\n   ${testCase.name}:`);
      console.log(`      배팅: "${testCase.betTeam}" → "${betNorm}"`);
      console.log(`      API: "${testCase.apiTeam}" → "${apiNorm}"`);
      console.log(`      유사도: ${similarity.toFixed(3)}`);
      console.log(`      예상: ${testCase.expected}`);
      console.log(`      결과: ${similarity >= 0.8 ? '✅ 매칭 가능' : '❌ 매칭 불가'}`);
    }
    
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  }
})(); 