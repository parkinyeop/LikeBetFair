import GameResult from '../models/gameResultModel.js';
import axios from 'axios';

const API_KEY = '116108'; // v1 API 프리미엄 키
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const sportsDbLeagueMap = {
  'K리그': '4689',
  'J리그': '5188',
  '세리에 A': '4332',
  '브라질 세리에 A': '4364',
  'MLS': '4346',
  '아르헨티나 프리메라': '4367',
  '중국 슈퍼리그': '4688',
  '스페인 2부': '4396',
  '스웨덴 알스벤스칸': '4429',
  'NBA': '4387',
  'MLB': '4424',
  'KBO': '4830',
  'NFL': '4391',
  'NHL': '4380'
};

const START_DATE = '2025-06-20';

function mapStatus(status) {
  if (!status) return 'scheduled';
  const s = status.toLowerCase();
  if (s.includes('finished')) return 'finished';
  if (s === 'ns' || s === 'not started') return 'scheduled';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'postponed') return 'postponed';
  if (s === 'in progress' || s === 'playing' || s === 'live') return 'in_progress';
  return 'scheduled';
}

async function main() {
  let totalUpserts = 0;
  for (const [category, leagueId] of Object.entries(sportsDbLeagueMap)) {
    // v1 API: eventsday.php?d=YYYY-MM-DD&id={leagueId}
    // 2025-06-20~오늘까지 날짜별로 순회
    const today = new Date();
    let d = new Date(START_DATE);
    while (d <= today) {
      const dateStr = d.toISOString().slice(0, 10);
      const url = `${BASE_URL}/${API_KEY}/eventsday.php?d=${dateStr}&id=${leagueId}`;
      try {
        const res = await axios.get(url);
        const events = res.data.events || [];
        for (const event of events) {
          await GameResult.upsert({
            mainCategory: category,
            subCategory: leagueId,
            homeTeam: event.strHomeTeam,
            awayTeam: event.strAwayTeam,
            commenceTime: new Date(event.dateEvent + ' ' + (event.strTime || '00:00:00')),
            status: mapStatus(event.strStatus),
            score: [event.intHomeScore, event.intAwayScore],
            result: null, // 판정 로직 필요시 추가
            eventId: event.idEvent,
            lastUpdated: new Date()
          });
          totalUpserts++;
          console.log(`[${category}] ${event.strHomeTeam} vs ${event.strAwayTeam} | ${event.dateEvent} | ${event.intHomeScore}:${event.intAwayScore} | status: ${mapStatus(event.strStatus)}`);
        }
      } catch (err) {
        console.error(`[${category}] ${dateStr} 에러:`, err.message);
      }
      d.setDate(d.getDate() + 1);
    }
  }
  console.log(`\n총 ${totalUpserts}건 upsert 완료.`);
}

main(); 