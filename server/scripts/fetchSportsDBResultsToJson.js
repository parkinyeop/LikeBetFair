import axios from 'axios';
import fs from 'fs';

const API_KEY = '116108';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const LEAGUE_ID = '4830'; // KBO
const DATE = '2025-06-20';

async function main() {
  const url = `${BASE_URL}/${API_KEY}/eventsday.php?d=${DATE}&id=${LEAGUE_ID}`;
  try {
    const res = await axios.get(url);
    const events = res.data.events || [];
    fs.writeFileSync('server/kbo_20250620_tmp.json', JSON.stringify(events, null, 2), 'utf-8');
    console.log(`KBO ${DATE} 경기 ${events.length}건을 server/kbo_20250620_tmp.json에 저장 완료.`);
  } catch (e) {
    console.error(e.message);
  }
}

main(); 