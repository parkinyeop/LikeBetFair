/**
 * 팀명 정규화 유틸리티 함수들
 */

/**
 * 🎯 중앙화된 팀명 정규화 함수
 * @param {string} teamName - 정규화할 팀명
 * @param {Object} options - 정규화 옵션
 * @returns {string} 정규화된 팀명
 */
function normalizeTeamNameCentralized(teamName, options = {}) {
  const {
    keepSpaces = false,        // 공백 유지 여부
    removeSuffixes = true,     // 접미사 제거 여부 (FC, SC, United 등)
    removePrefixes = false,    // 접두사 제거 여부 (The, FC 등)
    removeRegions = false,     // 지역 접미사 제거 (브라질/아르헨티나)
    applyMapping = false,      // 글로벌 매핑 적용 여부
    aggressive = false,        // 완전 압축 모드 (모든 공백/특수문자 제거)
    keepKorean = true         // 한글 유지 여부
  } = options;

  if (!teamName || typeof teamName !== 'string') {
    return '';
  }

  // 1단계: 유니코드 정규화 (모든 함수 공통)
  let normalized = teamName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');  // ê → e, ã → a, ñ → n

  // 2단계: 접두사 제거 (옵션)
  if (removePrefixes) {
    normalized = normalized
      .replace(/^(The\s+|FC\s+|CF\s+|SC\s+|AC\s+)/gi, '');
  }

  // 3단계: 브라질/아르헨티나 지역 접미사 제거 (옵션)
  if (removeRegions) {
    normalized = normalized
      // 브라질 주 약어 (SP, RJ, MG, BA 등)
      .replace(/[-\s](sp|rj|mg|ba|rs|pr|pe|ce|go|sc|df|am|pa|pb|al|se|ro|ac|ap|rn|pi|to|ma|mt|ms)$/i, '')
      // 아르헨티나 지역
      .replace(/\s+(ba|cordoba|sanjuan|mendoza|santafe|entrerios|tucuman|plata)$/i, '')
      // 포르투갈/스페인어 전치사
      .replace(/\b(do|de|da|del|dels|de la|del|los|las|el|la)\b/gi, '');
  }

  // 4단계: 접미사 제거 (옵션)
  if (removeSuffixes) {
    if (aggressive) {
      // 완전 압축 모드: 단어로만 존재할 때만 제거 (atletico 같은 팀명 보호)
      normalized = normalized
        .replace(/\bfc$|\bsc$|\bcf$|\bac$/gi, '')
        .replace(/\bunited$|\bcity$|\btown$|\bclub$|\bclube$/gi, '')
        .replace(/\brovers$|\bwanderers$|\bathletic$|\bsporting$/gi, '')
        .replace(/\bassociation$|\bfootball$|\bsoccer$|\bbasketball$|\bbaseball$/gi, '');
      // ⚠️ real, atletico, deportivo는 팀명이므로 제거하지 않음
    } else {
      // 일반 모드: 단어 경계 사용
      normalized = normalized
        .replace(/\s+(FC|CF|SC|AC|United|City|Town|Club|Team|Athletic|Athletics|Rovers|Wanderers)$/gi, '')
        .replace(/\b(fc|club|team|united|city|town|athletic|sports|football|soccer|basketball|baseball)\b/gi, '');
    }
  }

  // 5단계: 특수문자 제거
  const charPattern = keepKorean ? /[^\w\s가-힣]/g : /[^\w\s]/g;
  normalized = normalized.replace(charPattern, '');

  // 6단계: 공백 처리
  if (aggressive || !keepSpaces) {
    normalized = normalized.replace(/\s+/g, ''); // 완전 제거
  } else {
    normalized = normalized.replace(/\s+/g, ' ').trim(); // 단일 공백 유지
  }

  // 7단계: 글로벌 매핑 적용 (옵션)
  if (applyMapping && typeof globalTeamMapping !== 'undefined' && globalTeamMapping[normalized]) {
    normalized = globalTeamMapping[normalized];
  }

  return normalized;
}

/**
 * 🎯 Exchange 주문용 정규화 (완전 압축)
 */
function normalizeForExchange(teamName) {
  return normalizeTeamNameCentralized(teamName, {
    aggressive: true,
    removeSuffixes: true,
    keepSpaces: false
  });
}

/**
 * 🎯 Bet 정산용 정규화 (공백 유지)
 */
function normalizeForBetSettlement(teamName) {
  return normalizeTeamNameCentralized(teamName, {
    keepSpaces: true,
    removeSuffixes: true
  });
}

/**
 * 🎯 Direct Matching용 정규화 (접두사+접미사 제거)
 */
function normalizeForDirectMatching(teamName) {
  return normalizeTeamNameCentralized(teamName, {
    keepSpaces: true,
    removeSuffixes: true,
    removePrefixes: true
  });
}

/**
 * 🎯 브라질/아르헨티나용 정규화 (지역+매핑)
 */
function normalizeForBrazilArgentina(teamName) {
  return normalizeTeamNameCentralized(teamName, {
    aggressive: true,
    removeRegions: true,
    removeSuffixes: true,
    applyMapping: true
  });
}

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
    // 🔧 유니코드 문자를 ASCII로 정규화 (NFD → NFC)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // 악센트 제거 (ê → e, ã → a, ñ → n)
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
    .replace(/soccer$/, '')
    // 브라질 팀 특수 처리
    .replace(/sportclubdorecife/, 'sportrecife')  // Sport Club do Recife → Sport Recife
    .replace(/clubdorecife/, 'recife');           // Club do Recife → Recife

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
  // 🎯 중앙화된 함수들
  normalizeTeamNameCentralized,
  normalizeForExchange,
  normalizeForBetSettlement,
  normalizeForDirectMatching,
  normalizeForBrazilArgentina,
  // 기존 함수들 (하위 호환성)
  normalizeTeamNameForComparison,
  getNormalizedTeamName,
  isSameTeam
};
