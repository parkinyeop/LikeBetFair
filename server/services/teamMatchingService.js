/**
 * 팀명 매칭 서비스
 * - 자연어 처리 방식으로 팀명 매칭
 * - 축약형, 별명, 다양한 표기법 지원
 */

import { normalizeForBetSettlement } from '../utils/normalizeUtils.js';

class TeamMatchingService {
  constructor() {
    // 팀명 정규화 함수들
    this.normalizeTeamName = this.normalizeTeamName.bind(this);
    this.calculateSimilarity = this.calculateSimilarity.bind(this);
  }

  /**
   * 팀명 정규화
   * @param {string} teamName - 원본 팀명
   * @returns {string} 정규화된 팀명
   */
  normalizeTeamName(teamName) {
    if (!teamName) return '';
    
    // 🎯 중앙화된 함수 사용 (공백 유지 모드)
    return normalizeForBetSettlement(teamName);
  }

  /**
   * 두 팀명의 유사도 계산 (0-1)
   * ✅ 개선: 더 엄격한 매칭, 동명 팀 구분
   * @param {string} team1 - 첫 번째 팀명
   * @param {string} team2 - 두 번째 팀명
   * @returns {number} 유사도 (0-1)
   */
  calculateSimilarity(team1, team2) {
    const normalized1 = this.normalizeTeamName(team1);
    const normalized2 = this.normalizeTeamName(team2);
    
    if (!normalized1 || !normalized2) return 0;
    
    // 완전 일치
    if (normalized1 === normalized2) return 1.0;
    
    // 부분 일치 (한쪽이 다른 쪽을 포함)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      // ✅ 개선: 길이 차이가 크면 점수 낮춤 (동명 팀 구분)
      const lengthDiff = Math.abs(normalized1.length - normalized2.length);
      
      // 길이 차이가 5글자 이상이면 점수 낮춤
      // 예: "Borussia" vs "Borussia Monchengladbach" (길이 차이 16) → 0.3
      if (lengthDiff > 10) return 0.3; // threshold 0.6 미만 (매칭 실패)
      if (lengthDiff > 5) return 0.5;  // threshold 0.6 미만 (매칭 실패)
      
      // 길이 차이가 작으면 높은 점수
      // 예: "Bayern" vs "Bayern Munich" (길이 차이 7) → 0.5
      return 0.5; // threshold 0.6 미만으로 낮춤
    }
    
    // 단어별 매칭 (더 엄격하게)
    const words1 = normalized1.split(' ').filter(w => w.length > 0);
    const words2 = normalized2.split(' ').filter(w => w.length > 0);
    
    let matchCount = 0;
    const matchedWords = new Set(); // 중복 카운트 방지
    
    for (const word1 of words1) {
      for (const word2 of words2) {
        // ✅ 개선: 3글자 이상만 매칭 (너무 짧은 단어 제외)
        if (word1 === word2 && word1.length > 3 && !matchedWords.has(word2)) {
          matchCount++;
          matchedWords.add(word2);
          break;
        }
      }
    }
    
    const maxWords = Math.max(words1.length, words2.length);
    if (maxWords === 0) return 0;
    
    return matchCount / maxWords;
  }

  /**
   * 팀명 매칭 여부 확인
   * @param {string} team1 - 첫 번째 팀명
   * @param {string} team2 - 두 번째 팀명
   * @param {number} threshold - 유사도 임계값 (기본 0.6)
   * @returns {boolean} 매칭 여부
   */
  isTeamMatch(team1, team2, threshold = 0.6) {
    return this.calculateSimilarity(team1, team2) >= threshold;
  }

  /**
   * 경기 매칭 확인
   * ✅ 개선: 시간 범위 체크 추가 (±3시간)
   * @param {Object} order - Exchange 주문
   * @param {Object} gameResult - 경기 결과
   * @returns {boolean} 매칭 여부
   */
  isGameMatch(order, gameResult) {
    // 1. 경기 시간 확인 (±3시간 이내)
    const orderTime = new Date(order.commenceTime).getTime();
    const gameTime = new Date(gameResult.commenceTime).getTime();
    const timeDiff = Math.abs(orderTime - gameTime);
    
    // ✅ 개선: 3시간 범위 체크 (같은 날 중복 경기 구분)
    if (timeDiff > 3 * 60 * 60 * 1000) { // 3시간 = 10,800,000ms
      return false;
    }
    
    // 2. 홈팀 매칭 (더 엄격한 임계값)
    const homeMatch = this.isTeamMatch(order.homeTeam, gameResult.homeTeam, 0.8);
    if (!homeMatch) {
      return false;
    }
    
    // 3. 어웨이팀 매칭 (더 엄격한 임계값)
    const awayMatch = this.isTeamMatch(order.awayTeam, gameResult.awayTeam, 0.8);
    if (!awayMatch) {
      return false;
    }
    
    return true;
  }

  /**
   * 디버깅용 매칭 정보 출력
   * ✅ 개선: 시간 차이 정보 추가
   * @param {Object} order - Exchange 주문
   * @param {Object} gameResult - 경기 결과
   * @returns {Object} 매칭 정보
   */
  getMatchingInfo(order, gameResult) {
    const orderTime = new Date(order.commenceTime);
    const gameTime = new Date(gameResult.commenceTime);
    
    const orderDateStr = orderTime.toISOString().split('T')[0];
    const gameDateStr = gameTime.toISOString().split('T')[0];
    
    const timeDiff = Math.abs(orderTime.getTime() - gameTime.getTime());
    const timeDiffHours = timeDiff / (1000 * 60 * 60);
    
    const homeSimilarity = this.calculateSimilarity(order.homeTeam, gameResult.homeTeam);
    const awaySimilarity = this.calculateSimilarity(order.awayTeam, gameResult.awayTeam);
    
    return {
      dateMatch: orderDateStr === gameDateStr,
      orderDate: orderDateStr,
      gameDate: gameDateStr,
      timeDiff: timeDiff,
      timeDiffHours: timeDiffHours.toFixed(2),
      timeMatch: timeDiff <= 3 * 60 * 60 * 1000, // ±3시간 이내
      homeMatch: this.isTeamMatch(order.homeTeam, gameResult.homeTeam, 0.8),
      homeSimilarity,
      awayMatch: this.isTeamMatch(order.awayTeam, gameResult.awayTeam, 0.8),
      awaySimilarity,
      overallMatch: this.isGameMatch(order, gameResult)
    };
  }
}

export default new TeamMatchingService();
