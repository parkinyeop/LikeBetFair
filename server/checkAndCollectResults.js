const GameResult = require('./models/gameResultModel');
const Bet = require('./models/betModel');
const { Op } = require('sequelize');

async function checkAndCollectResults() {
  try {
    console.log('=== 배팅 경기 결과 확인 및 수집 시작 ===\n');

    // 1. 모든 배팅에서 고유한 경기 목록 추출
    const allBets = await Bet.findAll({
      attributes: ['selections']
    });

    const uniqueGames = new Map();
    allBets.forEach(bet => {
      bet.selections.forEach(selection => {
        const gameKey = selection.desc;
        if (gameKey && !uniqueGames.has(gameKey)) {
          uniqueGames.set(gameKey, {
            desc: selection.desc,
            commence_time: selection.commence_time,
            teams: selection.desc.split(' vs ').map(team => team.trim())
          });
        }
      });
    });

    console.log(`총 배팅 경기 수: ${uniqueGames.size}개\n`);

    // 2. 각 경기의 결과 존재 여부 확인
    const missingGames = [];
    for (const [key, game] of uniqueGames) {
      const gameResult = await GameResult.findOne({
        where: {
          [Op.or]: [
            {
              homeTeam: game.teams[0],
              awayTeam: game.teams[1]
            },
            {
              homeTeam: game.teams[1],
              awayTeam: game.teams[0]
            }
          ],
          commenceTime: {
            [Op.between]: [
              new Date(game.commence_time),
              new Date(new Date(game.commence_time).getTime() + 24 * 60 * 60 * 1000)
            ]
          }
        }
      });

      if (!gameResult) {
        missingGames.push(game);
      }
    }

    if (missingGames.length === 0) {
      console.log('✅ 모든 배팅 경기의 결과가 DB에 존재합니다.');
      return;
    }

    console.log(`❌ 결과가 없는 경기 수: ${missingGames.length}개`);
    missingGames.forEach((game, idx) => {
      console.log(`\n[${idx + 1}] ${game.desc}`);
      console.log(`    시작시간: ${new Date(game.commence_time).toLocaleString()}`);
      console.log(`    홈팀: ${game.teams[0]}`);
      console.log(`    원정팀: ${game.teams[1]}`);
    });

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

checkAndCollectResults(); 