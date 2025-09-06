import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';

/**
 * 직접 매칭 서비스 - gameResultId 의존성 제거
 * 경기시간(UTC) + 홈팀명(NLP) + 어웨이팀명(NLP) 순서로 매칭
 */
class DirectMatchingService {

  /**
   * 팀명 자연어 처리 - 정규화
   * @param {string} teamName 
   * @returns {string} 정규화된 팀명
   */
  normalizeTeamName(teamName) {
    if (!teamName) return '';
    
    return teamName
      // 공통 접미사 제거
      .replace(/\s+(FC|CF|United|City|Town|Athletic|Athletics|Club)$/gi, '')
      // 공통 접두사 제거  
      .replace(/^(The\s+|FC\s+|CF\s+)/gi, '')
      // 특수문자 제거
      .replace(/[^\w\s]/g, '')
      // 여러 공백을 하나로
      .replace(/\s+/g, ' ')
      // 소문자로 변환 후 trim
      .toLowerCase()
      .trim();
  }

  /**
   * 팀명 유사도 계산 (Levenshtein distance 기반)
   * @param {string} name1 
   * @param {string} name2 
   * @returns {number} 0-1 사이의 유사도 점수
   */
  calculateSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;
    
    const norm1 = this.normalizeTeamName(name1);
    const norm2 = this.normalizeTeamName(name2);
    
    if (norm1 === norm2) return 1.0;
    
    // 완전 포함 관계 확인
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return 0.9;
    }
    
    // 단어 단위 매칭
    const words1 = norm1.split(' ');
    const words2 = norm2.split(' ');
    
    let matchingWords = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word1 === word2 || word1.includes(word2) || word2.includes(word1))) {
        matchingWords++;
      }
    }
    
    const wordSimilarity = matchingWords / Math.max(words1.length, words2.length);
    
    // Levenshtein distance
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const levenshteinSimilarity = maxLen > 0 ? 1 - (distance / maxLen) : 0;
    
    // 단어 매칭과 레벤슈타인 거리의 가중 평균
    return (wordSimilarity * 0.7) + (levenshteinSimilarity * 0.3);
  }

  /**
   * Levenshtein Distance 계산
   * @param {string} str1 
   * @param {string} str2 
   * @returns {number}
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 멀티벳 선택에 대한 GameResult 직접 매칭
   * @param {Object} selection - 멀티벳 선택 정보
   * @param {string} selection.homeTeam
   * @param {string} selection.awayTeam  
   * @param {string} selection.commenceTime
   * @returns {Object|null} 매칭된 GameResult 또는 null
   */
  async findMatchingGameResult(selection) {
    console.log(`🔍 직접 매칭 시작: ${selection.homeTeam} vs ${selection.awayTeam}`);
    
    if (!selection.homeTeam || !selection.awayTeam || !selection.commenceTime) {
      console.log('❌ 필수 정보 누락');
      return null;
    }

    const targetTime = new Date(selection.commenceTime);
    
    // 1단계: 경기시간 범위 설정 (UTC 기준 ±12시간)
    const timeWindowHours = 12;
    const startTime = new Date(targetTime.getTime() - (timeWindowHours * 60 * 60 * 1000));
    const endTime = new Date(targetTime.getTime() + (timeWindowHours * 60 * 60 * 1000));
    
    console.log(`⏰ 시간 범위: ${startTime.toISOString()} ~ ${endTime.toISOString()}`);

    try {
      // 2단계: 시간 범위 내 완료된 경기들 조회
      const candidateGames = await GameResult.findAll({
        where: {
          status: 'finished',
          commenceTime: {
            [Op.between]: [startTime, endTime]
          }
        }
      });

      console.log(`📊 시간 범위 내 후보 경기: ${candidateGames.length}개`);

      if (candidateGames.length === 0) {
        console.log('❌ 시간 범위 내 완료된 경기 없음');
        return null;
      }

      // 3단계: 팀명 매칭 (자연어 처리)
      let bestMatch = null;
      let bestScore = 0;
      const minimumScore = 0.7; // 최소 유사도 70%

      for (const game of candidateGames) {
        // 홈팀 유사도
        const homeScore = this.calculateSimilarity(selection.homeTeam, game.homeTeam);
        // 어웨이팀 유사도  
        const awayScore = this.calculateSimilarity(selection.awayTeam, game.awayTeam);
        
        // 전체 매칭 점수 (홈팀 + 어웨이팀 평균)
        const totalScore = (homeScore + awayScore) / 2;
        
        console.log(`🎯 경기: ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   홈팀 유사도: ${homeScore.toFixed(3)}, 어웨이팀 유사도: ${awayScore.toFixed(3)}`);
        console.log(`   전체 점수: ${totalScore.toFixed(3)}`);

        if (totalScore >= minimumScore && totalScore > bestScore) {
          bestMatch = game;
          bestScore = totalScore;
        }
      }

      if (bestMatch) {
        console.log(`✅ 매칭 성공! 점수: ${bestScore.toFixed(3)}`);
        console.log(`   선택: ${selection.homeTeam} vs ${selection.awayTeam}`);
        console.log(`   결과: ${bestMatch.homeTeam} vs ${bestMatch.awayTeam} (${bestMatch.result})`);
        return bestMatch;
      } else {
        console.log(`❌ 매칭 실패 (최고 점수: ${bestScore.toFixed(3)}, 최소 요구: ${minimumScore})`);
        return null;
      }

    } catch (error) {
      console.error('❌ 직접 매칭 중 오류:', error.message);
      return null;
    }
  }

  /**
   * 멀티벳 주문의 모든 선택에 대해 매칭 수행
   * @param {Object} multibetOrder - 멀티벳 주문
   * @returns {Array} 매칭 결과 배열
   */
  async matchAllSelections(multibetOrder) {
    if (!multibetOrder.selectionDetails?.selections) {
      console.log('❌ selectionDetails.selections 없음');
      return [];
    }

    console.log(`🎯 멀티벳 주문 ${multibetOrder.id} 매칭 시작`);
    console.log(`📊 선택 개수: ${multibetOrder.selectionDetails.selections.length}`);

    const results = [];
    
    for (const [index, selection] of multibetOrder.selectionDetails.selections.entries()) {
      console.log(`\n--- 선택 ${index + 1}/${multibetOrder.selectionDetails.selections.length} ---`);
      
      const gameResult = await this.findMatchingGameResult(selection);
      
      results.push({
        selection,
        gameResult,
        matched: !!gameResult
      });
    }

    const matchedCount = results.filter(r => r.matched).length;
    console.log(`\n📈 매칭 완료: ${matchedCount}/${results.length} 성공`);

    return results;
  }
}

export default new DirectMatchingService();