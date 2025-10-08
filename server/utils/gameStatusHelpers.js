/**
 * 게임 상태 관련 헬퍼 함수들
 * 
 * result 컬럼 대신 status 컬럼을 사용하도록 마이그레이션하는 과정에서
 * 코드 일관성을 유지하기 위한 유틸리티 함수들
 */

/**
 * 경기가 종료되었는지 확인
 * @param {Object} gameResult - GameResult 객체
 * @returns {boolean} 경기 종료 여부
 */
export function isGameFinished(gameResult) {
  if (!gameResult || !gameResult.status) return false;
  return ['home_win', 'away_win', 'draw', 'finished'].includes(gameResult.status);
}

/**
 * 경기가 취소되었는지 확인
 * @param {Object} gameResult - GameResult 객체
 * @returns {boolean} 경기 취소 여부
 */
export function isGameCancelled(gameResult) {
  if (!gameResult) return false;
  return gameResult.status === 'cancelled';
}

/**
 * 경기가 연기되었는지 확인
 * @param {Object} gameResult - GameResult 객체
 * @returns {boolean} 경기 연기 여부
 */
export function isGamePostponed(gameResult) {
  if (!gameResult) return false;
  return gameResult.status === 'postponed';
}

/**
 * 경기가 취소 또는 연기되었는지 확인
 * @param {Object} gameResult - GameResult 객체
 * @returns {boolean} 경기 취소/연기 여부
 */
export function isGameCancelledOrPostponed(gameResult) {
  if (!gameResult) return false;
  return gameResult.status === 'cancelled' || gameResult.status === 'postponed';
}

/**
 * 경기가 진행 중인지 확인
 * @param {Object} gameResult - GameResult 객체
 * @returns {boolean} 경기 진행 중 여부
 */
export function isGameLive(gameResult) {
  if (!gameResult || !gameResult.status) return false;
  return gameResult.status === 'live';
}

/**
 * 경기가 예정되어 있는지 확인
 * @param {Object} gameResult - GameResult 객체
 * @returns {boolean} 경기 예정 여부
 */
export function isGameScheduled(gameResult) {
  if (!gameResult || !gameResult.status) return false;
  return gameResult.status === 'scheduled';
}

/**
 * 경기가 대기 중인지 확인 (scheduled 또는 live)
 * @param {Object} gameResult - GameResult 객체
 * @returns {boolean} 경기 대기 중 여부
 */
export function isGamePending(gameResult) {
  if (!gameResult || !gameResult.status) return true;
  return ['scheduled', 'live'].includes(gameResult.status);
}

/**
 * 경기 결과 상태 반환 (기존 result 역할)
 * status로부터 result 값을 유도
 * 
 * @deprecated result 컬럼 대신 status를 직접 사용하세요
 * @param {Object} gameResult - GameResult 객체
 * @returns {string} 경기 결과 ('home_win', 'away_win', 'draw', 'cancelled', 'postponed', 'pending')
 */
export function getGameResult(gameResult) {
  if (!gameResult || !gameResult.status) return 'pending';
  
  // status가 이미 result 역할을 할 수 있음
  if (gameResult.status === 'home_win') return 'home_win';
  if (gameResult.status === 'away_win') return 'away_win';
  if (gameResult.status === 'draw') return 'draw';
  if (gameResult.status === 'cancelled') return 'cancelled';
  if (gameResult.status === 'postponed') return 'postponed';
  if (gameResult.status === 'finished') {
    // finished 상태인 경우 score로부터 결과 판정
    return determineResultFromScore(gameResult);
  }
  
  return 'pending'; // scheduled, live
}

/**
 * 스코어로부터 경기 결과 판정
 * @param {Object} gameResult - GameResult 객체
 * @returns {string} 경기 결과
 */
function determineResultFromScore(gameResult) {
  if (!gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length !== 2) {
    return 'pending';
  }
  
  const homeScore = parseInt(gameResult.score[0].score);
  const awayScore = parseInt(gameResult.score[1].score);
  
  if (isNaN(homeScore) || isNaN(awayScore)) {
    return 'pending';
  }
  
  if (homeScore > awayScore) return 'home_win';
  if (awayScore > homeScore) return 'away_win';
  return 'draw';
}

/**
 * 특정 팀이 이겼는지 확인
 * @param {Object} gameResult - GameResult 객체
 * @param {string} selectedTeam - 선택한 팀 이름
 * @param {string} homeTeam - 홈팀 이름
 * @param {string} awayTeam - 원정팀 이름
 * @returns {boolean} 팀 승리 여부
 */
export function didTeamWin(gameResult, selectedTeam, homeTeam, awayTeam) {
  if (!gameResult || !gameResult.status) return false;
  
  // 정규화된 팀명으로 비교
  const normalizedSelected = normalizeTeamForComparison(selectedTeam);
  const normalizedHome = normalizeTeamForComparison(homeTeam);
  const normalizedAway = normalizeTeamForComparison(awayTeam);
  
  if (gameResult.status === 'home_win' && normalizedSelected === normalizedHome) {
    return true;
  }
  
  if (gameResult.status === 'away_win' && normalizedSelected === normalizedAway) {
    return true;
  }
  
  if (gameResult.status === 'draw' && selectedTeam === 'Draw') {
    return true;
  }
  
  return false;
}

/**
 * 팀명을 비교 가능한 형태로 정규화
 * @param {string} teamName - 팀 이름
 * @returns {string} 정규화된 팀 이름
 */
function normalizeTeamForComparison(teamName) {
  if (!teamName) return '';
  return teamName.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * status 값으로부터 호환성을 위한 result 값 생성
 * API 응답 등에서 기존 result 필드를 유지해야 할 때 사용
 * 
 * @param {Object} gameResult - GameResult 객체
 * @returns {string} result 값
 */
export function getResultForCompatibility(gameResult) {
  // status를 그대로 result로 사용
  return gameResult?.status || 'pending';
}

/**
 * 경기 상태 디버그 정보 출력
 * @param {Object} gameResult - GameResult 객체
 * @param {string} prefix - 로그 접두사
 */
export function logGameStatus(gameResult, prefix = '') {
  if (!gameResult) {
    console.log(`${prefix}경기 결과 없음`);
    return;
  }
  
  console.log(`${prefix}경기 상태:`, {
    status: gameResult.status,
    homeTeam: gameResult.homeTeam,
    awayTeam: gameResult.awayTeam,
    score: gameResult.score,
    isFinished: isGameFinished(gameResult),
    isCancelled: isGameCancelled(gameResult),
    isPostponed: isGamePostponed(gameResult),
    isPending: isGamePending(gameResult),
  });
}



