/**
 * 팀명 매칭 서비스
 * - 자연어 처리 방식으로 팀명 매칭
 * - 축약형, 별명, 다양한 표기법 지원
 */

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
    
    return teamName
      .toLowerCase()
      .trim()
      // 특수문자 제거
      .replace(/[^\w\s]/g, '')
      // 연속 공백을 하나로
      .replace(/\s+/g, ' ')
      // 불필요한 단어 제거
      .replace(/\b(fc|club|team|united|city|town|athletic|sports|football|soccer|basketball|baseball)\b/g, '')
      .trim();
  }

  /**
   * 두 팀명의 유사도 계산 (0-1)
   * @param {string} team1 - 첫 번째 팀명
   * @param {string} team2 - 두 번째 팀명
   * @returns {number} 유사도 (0-1)
   */
  calculateSimilarity(team1, team2) {
    const normalized1 = this.normalizeTeamName(team1);
    const normalized2 = this.normalizeTeamName(team2);
    
    if (!normalized1 || !normalized2) return 0;
    
    // 완전 일치
    if (normalized1 === normalized2) return 1;
    
    // 부분 일치 (한쪽이 다른 쪽을 포함)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return 0.8;
    }
    
    // 단어별 매칭
    const words1 = normalized1.split(' ');
    const words2 = normalized2.split(' ');
    
    let matchCount = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 && word1.length > 2) {
          matchCount++;
          break;
        }
      }
    }
    
    const maxWords = Math.max(words1.length, words2.length);
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
   * @param {Object} order - Exchange 주문
   * @param {Object} gameResult - 경기 결과
   * @returns {boolean} 매칭 여부
   */
  isGameMatch(order, gameResult) {
    // 1. 경기 시간 확인 (UTC, 같은 날짜)
    const orderDate = new Date(order.commenceTime);
    const gameDate = new Date(gameResult.commenceTime);
    
    const orderDateStr = orderDate.toISOString().split('T')[0];
    const gameDateStr = gameDate.toISOString().split('T')[0];
    
    if (orderDateStr !== gameDateStr) {
      return false;
    }
    
    // 2. 홈팀 매칭
    const homeMatch = this.isTeamMatch(order.homeTeam, gameResult.homeTeam);
    if (!homeMatch) {
      return false;
    }
    
    // 3. 어웨이팀 매칭
    const awayMatch = this.isTeamMatch(order.awayTeam, gameResult.awayTeam);
    if (!awayMatch) {
      return false;
    }
    
    return true;
  }

  /**
   * 디버깅용 매칭 정보 출력
   * @param {Object} order - Exchange 주문
   * @param {Object} gameResult - 경기 결과
   * @returns {Object} 매칭 정보
   */
  getMatchingInfo(order, gameResult) {
    const orderDate = new Date(order.commenceTime);
    const gameDate = new Date(gameResult.commenceTime);
    
    const orderDateStr = orderDate.toISOString().split('T')[0];
    const gameDateStr = gameDate.toISOString().split('T')[0];
    
    const homeSimilarity = this.calculateSimilarity(order.homeTeam, gameResult.homeTeam);
    const awaySimilarity = this.calculateSimilarity(order.awayTeam, gameResult.awayTeam);
    
    return {
      dateMatch: orderDateStr === gameDateStr,
      orderDate: orderDateStr,
      gameDate: gameDateStr,
      homeMatch: this.isTeamMatch(order.homeTeam, gameResult.homeTeam),
      homeSimilarity,
      awayMatch: this.isTeamMatch(order.awayTeam, gameResult.awayTeam),
      awaySimilarity,
      overallMatch: this.isGameMatch(order, gameResult)
    };
  }
}

export default new TeamMatchingService();
