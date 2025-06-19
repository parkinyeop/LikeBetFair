const BetResultService = require('./services/betResultService');

(async () => {
  const service = new BetResultService();
  const missingGames = await service.identifyMissingGameResults();

  if (missingGames.length === 0) {
    console.log('✅ 모든 배팅 경기의 결과가 결과DB에 존재합니다.');
  } else {
    console.log(`❌ 결과DB에 없는 배팅 경기 수: ${missingGames.length}개`);
    missingGames.forEach((game, idx) => {
      console.log(`  ${idx + 1}. ${game.desc} | 시작시간: ${game.commence_time}`);
    });
  }
  process.exit(0);
})(); 