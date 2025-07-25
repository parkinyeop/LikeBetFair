async function checkCurrentGames() {
  console.log('🔍 현재 시간 기준 유효한 경기 확인...\n');

  const now = new Date();
  const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
  const bettingDeadlineMinutes = 10; // 경기 시작 10분 전까지 베팅 가능

  console.log(`현재 시간: ${now.toISOString()}`);
  console.log(`7일 후: ${maxDate.toISOString()}\n`);

  const activeLeagues = [
    'baseball_kbo',
    'baseball_mlb', 
    'soccer_korea_kleague1',
    'soccer_japan_j_league',
    'soccer_brazil_campeonato',
    'soccer_usa_mls',
    'soccer_argentina_primera_division',
    'soccer_china_superleague'
  ];

  let totalValidGames = 0;
  let totalAfterDedup = 0;

  for (const sportKey of activeLeagues) {
    try {
      console.log(`${sportKey}:`);
      
      const response = await fetch(`https://likebetfair.onrender.com/api/odds/${sportKey}`);
      const data = await response.json();
      
      console.log(`  전체 경기: ${data.length}개`);
      
      // 1. 시간 필터링
      const filteredGames = data.filter((game) => {
        const gameTime = new Date(game.commence_time);
        return gameTime >= now && gameTime <= maxDate;
      });
      
      console.log(`  시간 필터링 후: ${filteredGames.length}개`);
      
      // 2. 중복 제거 시뮬레이션 (합리적 기준)
      const uniqueGamesMap = new Map();
      filteredGames.forEach((game) => {
        const key = `${game.home_team}|${game.away_team}|${game.commence_time}`;
        if (!uniqueGamesMap.has(key)) {
          uniqueGamesMap.set(key, game);
        } else {
          const prev = uniqueGamesMap.get(key);
          // 1. 공식 배당이 있으면 우선
          if (!prev.officialOdds && game.officialOdds) {
            uniqueGamesMap.set(key, game);
            return;
          }
          if (prev.officialOdds && !game.officialOdds) {
            return;
          }
          // 2. bookmakers 개수 비교
          const prevBookmakers = Array.isArray(prev.bookmakers) ? prev.bookmakers.length : 0;
          const gameBookmakers = Array.isArray(game.bookmakers) ? game.bookmakers.length : 0;
          if (gameBookmakers > prevBookmakers) {
            uniqueGamesMap.set(key, game);
            return;
          }
          if (gameBookmakers < prevBookmakers) {
            return;
          }
          // 3. 업데이트 시간 비교
          const prevUpdate = new Date(prev.lastUpdated || prev.commence_time);
          const gameUpdate = new Date(game.lastUpdated || game.commence_time);
          if (gameUpdate > prevUpdate) {
            uniqueGamesMap.set(key, game);
            return;
          }
          // 4. 동점이면 기존 데이터 유지
        }
      });
      const uniqueGames = Array.from(uniqueGamesMap.values());
      
      console.log(`  중복 제거 후: ${uniqueGames.length}개`);
      console.log(`  중복 제거된 경기: ${filteredGames.length - uniqueGames.length}개`);
      
      // 3. 베팅 가능 여부 필터링
      const bettableGames = uniqueGames.filter((game) => {
        const gameTime = new Date(game.commence_time);
        const bettingDeadline = new Date(gameTime.getTime() - bettingDeadlineMinutes * 60 * 1000);
        return now < bettingDeadline;
      });
      
      console.log(`  베팅 가능한 경기: ${bettableGames.length}개`);
      console.log(`  베팅 불가능한 경기: ${uniqueGames.length - bettableGames.length}개`);
      
      if (bettableGames.length > 0) {
        console.log(`  첫 번째 베팅 가능 경기: ${bettableGames[0].home_team} vs ${bettableGames[0].away_team} (${bettableGames[0].commence_time})`);
      }
      
      totalValidGames += filteredGames.length;
      totalAfterDedup += bettableGames.length;
      
      console.log('');
      
    } catch (error) {
      console.error(`Error fetching ${sportKey}:`, error.message);
    }
  }

  console.log('==================================================');
  console.log(`총 시간 필터링된 경기 수: ${totalValidGames}개`);
  console.log(`총 베팅 가능한 경기 수: ${totalAfterDedup}개`);
  console.log('==================================================');
}

checkCurrentGames().catch(console.error); 