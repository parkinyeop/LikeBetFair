import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://www.thesportsdb.com/league/4830-korean-kbo-league';

(async () => {
  try {
    const { data: html } = await axios.get(url);
    const $ = load(html);
    const results = [];
    // 결과 테이블에서 6월 19일(19 Jun) 경기만 추출
    $('td:contains("19 Jun")').each((i, el) => {
      const row = $(el).parent();
      const tds = row.find('td');
      if (tds.length >= 4) {
        const date = $(tds[0]).text().trim();
        const home = $(tds[1]).text().trim();
        const score = $(tds[2]).text().trim();
        const away = $(tds[3]).text().trim();
        results.push({ date, home, score, away });
      }
    });
    console.log('2025-06-19 KBO 경기 결과:', results);
  } catch (err) {
    console.error(err);
  }
})(); 