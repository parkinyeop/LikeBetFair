// 정규화 및 매핑 유틸 함수 모듈

/**
 * 팀명 정규화: 영문/숫자/한글만 남기고, 공백 및 특수문자 제거, 소문자 변환
 */
function normalizeTeamName(team) {
  if (!team) return '';
  return team
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 글로벌 팀명 매핑 (베팅 사이트명 -> DB 저장명)
 * 모든 리그의 팀명을 통합하여 관리
 */
const globalTeamMapping = {
  // === MLS (미국 프로축구) ===
  'intermiamicf': 'intermiami',
  'intermiami': 'intermiami',
  'newenglandrevolution': 'newenglandrevolution',
  'newyorkcityfc': 'newyorkcityfc',
  'torontofc': 'torontofc',
  'atlantaunitedfc': 'atlantaunited',
  'atlantaunited': 'atlantaunited',
  'chicagofirefc': 'chicagofire',
  'chicagofire': 'chicagofire',
  'coloradorapids': 'coloradorapids',
  'columbuscrewsc': 'columbuscrew',
  'columbuscrew': 'columbuscrew',
  'dccunited': 'dccunited',
  'fcincinnati': 'fcincinnati',
  'fcdallas': 'fcdallas',
  'houstondynamofc': 'houstondynamo',
  'houstondynamo': 'houstondynamo',
  'lafc': 'lafc',
  'lagalaxy': 'lagalaxy',
  'minnesotaunitedfc': 'minnesotaunited',
  'minnesotaunited': 'minnesotaunited',
  'montrealimpact': 'montrealimpact',
  'nashvillesc': 'nashvillesc',
  'newyorkredbulls': 'newyorkredbulls',
  'orlandocitysc': 'orlandocity',
  'orlandocity': 'orlandocity',
  'philadelphiaunion': 'philadelphiaunion',
  'portlandtimbers': 'portlandtimbers',
  'realsaltlake': 'realsaltlake',
  'sanantoniobsc': 'sanantoniobsc',
  'seattlesoundersfc': 'seattlesounders',
  'seattlesounders': 'seattlesounders',
  'sportingkansascity': 'sportingkansascity',
  'vancouverwhitecapsfc': 'vancouverwhitecaps',
  'vancouverwhitecaps': 'vancouverwhitecaps',

  // === KBO (한국 프로야구) ===
  'kiwoomhe': 'kiwoomheroes',
  'kiwoomheroes': 'kiwoomheroes',
  'hanwhaea': 'hanwhaeagles', // 수정: hanwhaegles → hanwhaeagles
  'hanwhaegles': 'hanwhaeagles', // 수정: hanwhaegles → hanwhaeagles
  'hanwhaeagles': 'hanwhaeagles',
  'ktwiz': 'ktwiz',
  'ncdinos': 'ncdinos',
  'kiatigers': 'kiatigers',
  'ssglanders': 'ssglanders',
  'lottegiants': 'lottegiants',
  'doosanbears': 'doosanbears',
  'lgtwins': 'lgtwins',
  'samsunglions': 'samsunglions',

  // === MLB (미국 프로야구) ===
  'arizonadiamondbacks': 'arizonadiamondbacks',
  'atlantabraves': 'atlantabraves',
  'baltimoreorioles': 'baltimoreorioles',
  'bostonredsox': 'bostonredsox',
  'chicagocubs': 'chicagocubs',
  'chicagowhitesox': 'chicagowhitesox',
  'cincinnatireds': 'cincinnatireds',
  'clevelandguardians': 'clevelandguardians',
  'coloradorockies': 'coloradorockies',
  'detroittigers': 'detroittigers',
  'houstonastros': 'houstonastros',
  'kansascityroyals': 'kansascityroyals',
  'losangelesangels': 'losangelesangels',
  'losangelesdodgers': 'losangelesdodgers',
  'miamimarlins': 'miamimarlins',
  'milwaukeebrewers': 'milwaukeebrewers',
  'minnesotatwins': 'minnesotatwins',
  'newyorkmets': 'newyorkmets',
  'newyorkyankees': 'newyorkyankees',
  'oaklandathletics': 'oaklandathletics',
  'philadelphiaphillies': 'philadelphiaphillies',
  'pittsburghpirates': 'pittsburghpirates',
  'sandiegopadres': 'sandiegopadres',
  'sanfranciscogiants': 'sanfranciscogiants',
  'seattlemariners': 'seattlemariners',
  'stlouiscardinals': 'stlouiscardinals',
  'tampabayrays': 'tampabayrays',
  'texasrangers': 'texasrangers',
  'torontobluejays': 'torontobluejays',
  'washingtonnationals': 'washingtonnationals',

  // === NBA (미국 프로농구) ===
  'atlantahawks': 'atlantahawks',
  'bostonceltics': 'bostonceltics',
  'brooklynnets': 'brooklynnets',
  'charlottehornets': 'charlottehornets',
  'chicagobulls': 'chicagobulls',
  'clevelandcavaliers': 'clevelandcavaliers',
  'dallasmavericks': 'dallasmavericks',
  'denvernuggets': 'denvernuggets',
  'detroitpistons': 'detroitpistons',
  'goldenstatewarriors': 'goldenstatewarriors',
  'houstonrockets': 'houstonrockets',
  'indianapacers': 'indianapacers',
  'laclippers': 'laclippers',
  'lalakers': 'lalakers',
  'memphisgrizzlies': 'memphisgrizzlies',
  'miamiheat': 'miamiheat',
  'milwaukeebucks': 'milwaukeebucks',
  'minnesotatimberwolves': 'minnesotatimberwolves',
  'neworleanspelicans': 'neworleanspelicans',
  'newyorkknicks': 'newyorkknicks',
  'oklahomacitythunder': 'oklahomacitythunder',
  'orlandomagic': 'orlandomagic',
  'philadelphia76ers': 'philadelphia76ers',
  'phoenixsuns': 'phoenixsuns',
  'portlandtrailblazers': 'portlandtrailblazers',
  'sacramentokings': 'sacramentokings',
  'sanantoniospurs': 'sanantoniospurs',
  'torontoraptors': 'torontoraptors',
  'utahjazz': 'utahjazz',
  'washingtonwizards': 'washingtonwizards',

  // === KBL (한국 프로농구) ===
  'seoulskknights': 'seoulskknights',
  'changwonlgsakers': 'changwonlgsakers',
  'ulsanhyundaimobisphoebus': 'ulsanhyundaimobisphoebus',
  'busanktsonicboom': 'busanktsonicboom',
  'wonjudoosanpromy': 'wonjudoosanpromy',
  'goyangorion': 'goyangorion',
  'suwonsamsungthunders': 'suwonsamsungthunders',
  'jeonjukcc': 'jeonjukcc',
  'daegukogas': 'daegukogas',
  'anyangkgc': 'anyangkgc',

  // === 중국 슈퍼리그 (CSL) ===
  'qingdaohainiufc': 'qingdaohainiu',
  'qingdaohainiu': 'qingdaohainiu',
  'shanghaishenhuafc': 'shanghaishenhua',
  'shanghaishenhua': 'shanghaishenhua',
  'tianjinjinmentigerfc': 'tianjinjinmentiger',
  'tianjinjinmentiger': 'tianjinjinmentiger',
  'zhejiang': 'zhejiangprofessional',
  'zhejiangfc': 'zhejiangprofessional',
  'zhejiangprofessional': 'zhejiangprofessional',
  'beijingguoanfc': 'beijingguoan',
  'beijingguoan': 'beijingguoan',
  'shandongtaishanfc': 'shandongtaishan',
  'shandongtaishan': 'shandongtaishan',
  'wuhanthreetownsfc': 'wuhanthreetowns',
  'wuhanthreetowns': 'wuhanthreetowns',
  'changchunyataifc': 'changchunyatai',
  'changchunyatai': 'changchunyatai',
  'qingdaowestcoastfc': 'qingdaowestcoast',
  'qingdaowestcoast': 'qingdaowestcoast',
  'meizhouhakkafc': 'meizhouhakka',
  'meizhouhakka': 'meizhouhakka',
  'chengdurongchengfc': 'chengdurongcheng',
  'chengdurongcheng': 'chengdurongcheng',
  'shenzhenpengcityfc': 'shenzhenpengcity',
  'shenzhenpengcity': 'shenzhenpengcity',

  // === 기타 리그들 ===
  // EPL, 라리가, 분데스리가, 세리에A, J리그 등은 필요시 추가
};

/**
 * 팀명 비교용 정규화: 더 엄격한 정규화 (앞뒤 공백, 대소문자, 특수문자 모두 제거)
 */
function normalizeTeamNameForComparison(team) {
  if (!team) return '';
  
  let normalized = team
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/\s+/g, '');
  
  // 북메이커 접미사 제거 (FanDuel, DraftKings, BetRivers 등)
  normalized = normalized.replace(/(fanduel|draftkings|betrivers)$/i, '');
  
  // 글로벌 팀명 매핑 적용
  if (globalTeamMapping[normalized]) {
    normalized = globalTeamMapping[normalized];
  }
  
  return normalized;
}

/**
 * 카테고리/리그명 정규화: 소문자 변환 및 주요 리그명 통일
 */
function normalizeCategory(cat) {
  if (!cat) return '';
  return cat.toLowerCase().replace(/baseball_kbo|korean kbo league|kbo/g, 'kbo');
}

/**
 * 경기 시간(ISO string 등) -> Date 객체로 변환, 파싱 실패시 null 반환
 */
function normalizeCommenceTime(commenceTime) {
  try {
    const date = new Date(commenceTime);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * desc에서 팀명 추출 및 정규화: "팀1 vs 팀2" 형태에서 [팀1, 팀2] 반환
 */
function extractTeamsFromDesc(desc) {
  if (!desc || typeof desc !== 'string') return [];
  const parts = desc.split(/\s+vs\s+|\s+VS\s+/i);
  if (parts.length !== 2) return [];
  return [normalizeTeamName(parts[0]), normalizeTeamName(parts[1])];
}

/**
 * market/option 표준화: market, option 값을 표준화된 값으로 변환
 */
const marketMap = {
  '승/패': 'h2h',
  '언더/오버': 'totals',
  '핸디캡': 'spreads',
  'h2h': 'h2h',
  'totals': 'totals',
  'spreads': 'spreads',
};
function normalizeMarket(market) {
  if (!market) return 'h2h';
  return marketMap[market] || 'h2h';
}
function normalizeOption(option) {
  if (!option) return '';
  if (/over/i.test(option)) return 'Over';
  if (/under/i.test(option)) return 'Under';
  return option;
}

/**
 * 메인/서브 카테고리 정규화 매핑 및 함수 (2024-06-23 기준)
 */
const mainCategoryMap = {
  'kbo': 'baseball',
  'baseball_kbo': 'baseball',
  'mlb': 'baseball',
  'baseball_mlb': 'baseball',
  'npb': 'baseball',
  'baseball_npb': 'baseball',
  'cpbl': 'baseball',
  'baseball_cpbl': 'baseball',
  'soccer': 'soccer',
  '축구': 'soccer',
  'epl': 'soccer',
  'basketball': 'basketball',
  '농구': 'basketball',
  'nba': 'basketball',
  'kbl': 'basketball',
  'hockey': 'hockey',
  '아이스하키': 'hockey',
  'nhl': 'hockey',
  'khl': 'hockey',
};
const subCategoryMap = {
  'kbo': 'KBO',
  'baseball_kbo': 'KBO',
  'korean kbo league': 'KBO',
  'mlb': 'MLB',
  'baseball_mlb': 'MLB',
  'npb': 'NPB',
  'baseball_npb': 'NPB',
  'cpbl': 'CPBL',
  'baseball_cpbl': 'CPBL',
  'epl': 'EPL',
  'premier league': 'EPL',
  '라리가': '라리가',
  'laliga': '라리가',
  '분데스리가': '분데스리가',
  'bundesliga': '분데스리가',
  '세리에a': '세리에A',
  'serie a': '세리에A',
  'j리그': 'J리그',
  'j1리그': 'J리그',
  'nba': 'NBA',
  'kbl': 'KBL',
  '유로리그': '유로리그',
  'euroleague': '유로리그',
  'nhl': 'NHL',
  'khl': 'KHL',
};
function normalizeMainCategory(main) {
  if (!main) return '';
  return mainCategoryMap[main.toLowerCase()] || main.toLowerCase();
}
function normalizeSubCategory(sub) {
  if (!sub) return '';
  return subCategoryMap[sub.toLowerCase()] || sub;
}
function normalizeCategoryPair(main, sub) {
  return {
    mainCategory: normalizeMainCategory(main),
    subCategory: normalizeSubCategory(sub).toUpperCase(),
  };
}

/**
 * sportKey에서 mainCategory, subCategory를 추출 (예: baseball_kbo → baseball, KBO)
 */
function parseMainAndSubFromSportKey(sportKey) {
  if (!sportKey) return { mainCategory: '', subCategory: '' };
  const parts = sportKey.split('_');
  const main = parts[0] || '';
  const sub = parts.slice(1).join('_') || '';
  return normalizeCategoryPair(main, sub);
}

/**
 * 레벤슈타인 거리 계산 (편집 거리)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} 편집 거리
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  const n = str1.length;
  const m = str2.length;

  // 초기화
  for (let i = 0; i <= n; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j;
  }

  // 동적 프로그래밍
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // 삭제
        matrix[i][j - 1] + 1,     // 삽입
        matrix[i - 1][j - 1] + cost // 교체
      );
    }
  }

  return matrix[n][m];
}

/**
 * 문자열 유사도 계산 (0-1 사이, 1이 완전 일치)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} 유사도 (0-1)
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
}

/**
 * 팀명 유사도 매칭 (여러 방식 조합)
 * @param {string} team1 
 * @param {string} team2 
 * @returns {number} 유사도 점수 (0-1)
 */
function calculateTeamNameSimilarity(team1, team2) {
  if (!team1 || !team2) return 0;
  
  // 정규화된 팀명으로 비교
  const norm1 = normalizeTeamNameForComparison(team1);
  const norm2 = normalizeTeamNameForComparison(team2);
  
  // 완전 일치
  if (norm1 === norm2) return 1.0;
  
  // 1. 기본 문자열 유사도
  const basicSimilarity = calculateStringSimilarity(norm1, norm2);
  
  // 2. 단어 기반 유사도 (공백으로 분리)
  const words1 = norm1.split(/\s+/).filter(w => w.length > 0);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 0);
  
  let wordMatches = 0;
  const maxWords = Math.max(words1.length, words2.length);
  
  if (maxWords > 0) {
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (calculateStringSimilarity(word1, word2) > 0.8) {
          wordMatches++;
          break;
        }
      }
    }
    const wordSimilarity = wordMatches / maxWords;
    
    // 3. 조합 점수 (기본 유사도 70% + 단어 유사도 30%)
    return basicSimilarity * 0.7 + wordSimilarity * 0.3;
  }
  
  return basicSimilarity;
}

/**
 * 최적 팀명 매칭 찾기
 * @param {string} targetTeam 찾고자 하는 팀명
 * @param {Array} candidateTeams 후보 팀명들
 * @param {number} threshold 최소 유사도 임계값 (기본 0.8)
 * @returns {Object|null} {team, similarity} 또는 null
 */
function findBestTeamMatch(targetTeam, candidateTeams, threshold = 0.8) {
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const candidate of candidateTeams) {
    const similarity = calculateTeamNameSimilarity(targetTeam, candidate);
    if (similarity >= threshold && similarity > bestSimilarity) {
      bestMatch = candidate;
      bestSimilarity = similarity;
    }
  }
  
  return bestMatch ? { team: bestMatch, similarity: bestSimilarity } : null;
}

export {
  normalizeTeamName,
  normalizeTeamNameForComparison,
  normalizeCategory,
  normalizeCommenceTime,
  extractTeamsFromDesc,
  normalizeMarket,
  normalizeOption,
  mainCategoryMap,
  subCategoryMap,
  normalizeMainCategory,
  normalizeSubCategory,
  normalizeCategoryPair,
  parseMainAndSubFromSportKey,
  levenshteinDistance,
  calculateStringSimilarity,
  calculateTeamNameSimilarity,
  findBestTeamMatch
}; 