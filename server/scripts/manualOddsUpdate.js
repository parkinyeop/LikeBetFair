import oddsApiService from '../services/oddsApiService.js';

async function main() {
  try {
    console.log('전체 카테고리 배당률 데이터 수동 업데이트 시작...');
    await oddsApiService.fetchAndCacheOdds();
    console.log('전체 카테고리 배당률 데이터 수동 업데이트 완료!');
  } catch (err) {
    console.error('업데이트 중 오류:', err);
    process.exit(1);
  }
  process.exit(0);
}

main(); 