import GameResult from '../models/gameResultModel.js';
import axios from 'axios';
import { normalizeTeamName } from '../normalizeUtils.js';

const API_KEY = '116108'; // 반드시 프리미엄 키 사용
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// 리그명 → SportsDB 리그ID 매핑 (필요시 확장)
const sportsDbLeagueMap = {
  'KBO': '4830',
  'MLB': '4424',
  'NBA': '4387',
  'NHL': '4380',
  'NFL': '4391',
  'K리그': '4689',
  'J리그': '5188',
  '세리에 A': '4332',
  '브라질 세리에 A': '4364',
  'MLS': '4346',
  '아르헨티나 프리메라': '4367',
  '중국 슈퍼리그': '4688',
  '스페인 2부': '4396',
  '스웨덴 알스벤스칸': '4429',
};

function getLeagueId(mainCategory) {
  // DB의 mainCategory가 영문/한글 혼용일 수 있으니 normalize 필요
  if (sportsDbLeagueMap[mainCategory]) return sportsDbLeagueMap[mainCategory];
  // MLB, KBO 등 대문자도 허용
  if (sportsDbLeagueMap[mainCategory.toUpperCase()]) return sportsDbLeagueMap[mainCategory.toUpperCase()];
  return null;
}

async function fetchScoreFromSportsDB(leagueId, date, homeNorm, awayNorm) {
  const url = `${BASE_URL}/${API_KEY}/eventsday.php?d=${date}&id=${leagueId}`;
  try {
    const res = await axios.get(url);
    const events = res.data.events || [];
    for (const event of events) {
      const eventHomeNorm = normalizeTeamName(event.strHomeTeam);
      const eventAwayNorm = normalizeTeamName(event.strAwayTeam);
      if (
        (eventHomeNorm === homeNorm && eventAwayNorm === awayNorm) ||
        (eventHomeNorm === awayNorm && eventAwayNorm === homeNorm)
      ) {
        return {
          home: event.strHomeTeam,
          away: event.strAwayTeam,
          homeScore: event.intHomeScore,
          awayScore: event.intAwayScore,
          status: event.strStatus,
        };
      }
    }
  } catch (err) {
    console.error(`[API 에러] ${url} - ${err.message}`);
  }
  return null;
}

async function main() {
  const allGames = await GameResult.findAll();
  let missingScores = [];
  for (const game of allGames) {
    if (game.status === 'finished' && (!game.score || game.score === '' || game.score === '[null, null]' || game.score === null)) {
      const date = game.commenceTime.toISOString().slice(0, 10);
      const leagueId = getLeagueId(game.mainCategory);
      if (!leagueId) continue;
      const homeNorm = normalizeTeamName(game.homeTeam);
      const awayNorm = normalizeTeamName(game.awayTeam);
      const fetched = await fetchScoreFromSportsDB(leagueId, date, homeNorm, awayNorm);
      if (fetched) {
        missingScores.push({
          id: game.id,
          date,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          ...fetched
        });
      }
    }
  }
  console.log(`\n[스포츠DB에서 스코어를 찾은 경기]`);
  missingScores.forEach(g => {
    console.log(`${g.date} | ${g.homeTeam} vs ${g.awayTeam} | API: ${g.home} ${g.homeScore} - ${g.awayScore} ${g.away} | status: ${g.status}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); }); 