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
 * 중국 슈퍼리그 팀명 매핑 (베팅 사이트명 -> DB 저장명)
 */
const cslTeamMapping = {
  'qingdaohainiufc': 'qingdaohainiu',
  'shanghaishenhuafc': 'shanghaishenhua',
  'tianjinjinmentigerfc': 'tianjinjinmentiger',
  'zhejiang': 'zhejiangprofessional',
  'zhejiangfc': 'zhejiangprofessional',
  'beijingguoanfc': 'beijingguoan',
  'shandongtaishanfc': 'shandongtaishan',
  'wuhanthreetownsfc': 'wuhanthreetowns',
  'changchunyataifc': 'changchunyatai',
  'qingdaowestcoastfc': 'qingdaowestcoast',
  'meizhouhakkafc': 'meizhouhakka',
  'chengdurongchengfc': 'chengdurongcheng',
  'shenzhenpengcityfc': 'shenzhenpengcity'
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
  
  // 중국 슈퍼리그 팀명 매핑 적용
  if (cslTeamMapping[normalized]) {
    normalized = cslTeamMapping[normalized];
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
}; 