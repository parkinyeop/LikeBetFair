import axios from 'axios';

const API_KEY = process.env.THESPORTSDB_API_KEY || '123';
const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventspastleague.php?id=4830`;

(async () => {
  try {
    const res = await axios.get(url);
    const events = res.data.events || [];
    // 전체 dateEvent 값 분포 출력
    const dateCounts = events.reduce((acc, ev) => {
      acc[ev.dateEvent] = (acc[ev.dateEvent] || 0) + 1;
      return acc;
    }, {});
    console.log('dateEvent 분포:', dateCounts);
    // 2025-06-19 경기 전체 출력
    const filtered = events.filter(ev => ev.dateEvent === '2025-06-19');
    console.log('2025-06-19 경기:', filtered.map(ev => ({
      id: ev.idEvent,
      home: ev.strHomeTeam,
      away: ev.strAwayTeam,
      date: ev.dateEvent,
      status: ev.strStatus,
      homeScore: ev.intHomeScore,
      awayScore: ev.intAwayScore
    })));
  } catch (err) {
    console.error(err);
  }
})(); 