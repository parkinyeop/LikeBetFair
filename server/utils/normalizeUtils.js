/**
 * 팀명 정규화 유틸리티 함수들
 */

/**
 * 팀명을 비교용으로 정규화합니다.
 * - 소문자 변환
 * - 공백 제거
 * - 특수문자 제거
 * - 일반적인 축약형 처리
 */
function normalizeTeamNameForComparison(teamName) {
  if (!teamName || typeof teamName !== 'string') {
    return '';
  }

  let normalized = teamName.toLowerCase()
    .trim()
    // 공백과 하이픈 제거
    .replace(/[\s\-_]/g, '')
    // 특수문자 제거 (알파벳과 숫자만 유지)
    .replace(/[^a-z0-9]/g, '')
    // 일반적인 축약형 처리
    .replace(/fc$/, '')
    .replace(/sc$/, '')
    .replace(/cf$/, '')
    .replace(/ac$/, '')
    .replace(/united$/, '')
    .replace(/city$/, '')
    .replace(/town$/, '')
    .replace(/rovers$/, '')
    .replace(/wanderers$/, '')
    .replace(/athletic$/, '')
    .replace(/sporting$/, '')
    .replace(/real$/, '')
    .replace(/atletico$/, '')
    .replace(/atletico$/, '')
    .replace(/deportivo$/, '')
    .replace(/club$/, '')
    .replace(/association$/, '')
    .replace(/football$/, '')
    .replace(/soccer$/, '');

  return normalized;
}

/**
 * 팀명 매칭을 위한 정규화된 이름 반환
 */
function getNormalizedTeamName(teamName) {
  return normalizeTeamNameForComparison(teamName);
}

/**
 * 두 팀명이 같은 팀을 가리키는지 확인
 */
function isSameTeam(team1, team2) {
  const norm1 = normalizeTeamNameForComparison(team1);
  const norm2 = normalizeTeamNameForComparison(team2);
  
  if (!norm1 || !norm2) return false;
  
  // 완전 일치
  if (norm1 === norm2) return true;
  
  // 부분 일치 (한쪽이 다른 쪽을 포함)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }
  
  return false;
}

module.exports = {
  normalizeTeamNameForComparison,
  getNormalizedTeamName,
  isSameTeam
};
