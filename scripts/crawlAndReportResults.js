import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';

const leagueMap = {
  'KBO': 4830,
  'MLB': 4424,
  'NBA': 4387,
  'NHL': 4380,
  'NFL': 4391,
  'K리그': 4689,
  'J리그': 4340,
  '세리에A': 4332,
  '브라질': 4364,
  'MLS': 4346,
  '아르헨티나': 4367,
  '중국': 4688,
  '스페인2부': 4396,
  '스웨덴': 4429
};

const minDate = '2025-06-12';
const today = new Date().toISOString().slice(0, 10);

function dateToISO(dateStr) {
  // '19 Jun' -> '2025-06-19' (올해 기준)
  const [day, mon] = dateStr.split(' ');
  const monthMap = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  return `2025-${monthMap[mon]}-${day.padStart(2, '0')}`;
}

(async () => {
  const allResults = {};
  for (const [league, id] of Object.entries(leagueMap)) {
    const url = `https://www.thesportsdb.com/league/${id}`;
    try {
      const { data: html } = await axios.get(url);
      const $ = load(html);
      const results = [];
      $('td').filter((i, el) => $(el).text().trim().match(/^\d{1,2} [A-Z][a-z]{2}$/)).each((i, el) => {
        const row = $(el).parent();
        const tds = row.find('td');
        if (tds.length >= 4) {
          const date = $(tds[0]).text().trim();
          const isoDate = dateToISO(date);
          if (isoDate >= minDate && isoDate <= today) {
            const home = $(tds[1]).text().trim();
            const score = $(tds[2]).text().trim();
            const away = $(tds[3]).text().trim();
            results.push({ date: isoDate, home, score, away });
          }
        }
      });
      allResults[league] = results;
      console.log(`\n[${league}] ${results.length}경기`);
      console.log(results.slice(0, 3)); // 샘플 3개만 출력
    } catch (err) {
      console.error(`\n[${league}] 크롤링 실패:`, err.message);
    }
  }
  // 전체 요약
  const total = Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n총 ${total}경기 크롤링 완료.`);

  // 누락 리그 리포트
  let missingCount = 0;
  for (const [league, id] of Object.entries(leagueMap)) {
    const results = allResults[league] || [];
    if (results.length === 0) {
      console.log(`[누락 리그] ${league} (ID: ${id}): 0경기`);
      missingCount++;
    }
  }
  if (missingCount === 0) {
    console.log('\n모든 리그에서 경기 데이터가 크롤링되었습니다.');
  }

  // (선택) 크롤링 결과를 파일로 저장
  fs.writeFileSync('allResults.json', JSON.stringify(allResults, null, 2));
})(); 