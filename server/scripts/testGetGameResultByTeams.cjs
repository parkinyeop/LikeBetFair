const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bettingDB',
  user: 'postgres',
  password: ''
});

// normalizeTeamNameForComparison 함수 모의 구현 (실제 로직과 유사하게)
function normalizeTeamNameForComparison(teamName) {
  if (!teamName) return '';
  return teamName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// normalizeCategoryPair 함수 모의 구현
function normalizeCategoryPair(mainCategory, subCategory) {
  return { mainCategory: mainCategory || 'baseball' };
}

// calculateTeamNameSimilarity 함수 모의 구현
function calculateTeamNameSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Levenshtein 거리 계산
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

async function testGetGameResultByTeams() {
  try {
    console.log('=== getGameResultByTeams 함수 매칭 로직 테스트 ===');
    
    // 미정산 베팅의 KBO selection들
    const testSelections = [
      {
        desc: 'NC Dinos vs Samsung Lions',
        commence_time: '2025-07-09T09:30:00.000Z',
        team: 'samsunglions',
        mainCategory: 'baseball',
        subCategory: 'KBO'
      },
      {
        desc: 'Hanwha Eagles vs Kia Tigers',
        commence_time: '2025-07-09T09:30:00.000Z',
        team: 'hanwhaeagles',
        mainCategory: 'baseball',
        subCategory: 'KBO'
      },
      {
        desc: 'LG Twins vs Kiwoom Heroes',
        commence_time: '2025-07-09T09:30:00.000Z',
        team: 'kiwoomheroes',
        mainCategory: 'baseball',
        subCategory: 'KBO'
      },
      {
        desc: 'Lotte Giants vs Doosan Bears',
        commence_time: '2025-07-09T09:30:00.000Z',
        team: 'lottegiants',
        mainCategory: 'baseball',
        subCategory: 'KBO'
      },
      {
        desc: 'SSG Landers vs KT Wiz',
        commence_time: '2025-07-09T09:30:00.000Z',
        team: 'ssglanders',
        mainCategory: 'baseball',
        subCategory: 'KBO'
      }
    ];
    
    for (const selection of testSelections) {
      console.log(`\n--- 테스트: ${selection.desc} ---`);
      
      // 1. selection 파싱
      const desc = selection.desc;
      const teams = desc ? desc.split(' vs ') : [];
      if (teams.length !== 2) {
        console.log(`❌ Invalid game description format: ${desc}`);
        continue;
      }
      
      // 2. 팀명 정규화
      const homeTeamNorm = normalizeTeamNameForComparison(teams[0].trim());
      const awayTeamNorm = normalizeTeamNameForComparison(teams[1].trim());
      console.log(`팀명 정규화: ${teams[0].trim()} -> ${homeTeamNorm}, ${teams[1].trim()} -> ${awayTeamNorm}`);
      
      // 3. 카테고리 정규화
      const selCatNorm = normalizeCategoryPair(selection.mainCategory, selection.subCategory).mainCategory;
      console.log(`카테고리: ${selCatNorm}`);
      
      // 4. commence_time 파싱
      let commenceTime;
      try {
        commenceTime = new Date(selection.commence_time);
        if (isNaN(commenceTime.getTime())) {
          console.log(`❌ Invalid commence_time format: ${selection.commence_time}`);
          continue;
        }
        console.log(`경기 시간: ${commenceTime.toISOString()}`);
      } catch (error) {
        console.log(`❌ Error parsing commence_time: ${selection.commence_time}`);
        continue;
      }
      
      // 5. ±2시간 범위로 후보군 조회
      const startTime = new Date(commenceTime.getTime() - 2 * 60 * 60 * 1000);
      const endTime = new Date(commenceTime.getTime() + 2 * 60 * 60 * 1000);
      
      const candidatesQuery = `
        SELECT 
          id,
          "homeTeam",
          "awayTeam",
          "commenceTime",
          status,
          result,
          score,
          "mainCategory",
          "subCategory"
        FROM "GameResults"
        WHERE "commenceTime" BETWEEN $1 AND $2
        ORDER BY "commenceTime" ASC
      `;
      
      const candidates = await pool.query(candidatesQuery, [startTime, endTime]);
      console.log(`후보군(±2시간): ${candidates.rows.length}개`);
      
      // 6. 후보군을 status별로 분리
      const finishedCandidates = candidates.rows.filter(c => c.status === 'finished');
      const scheduledCandidates = candidates.rows.filter(c => c.status !== 'finished');
      
      console.log(`finished 후보: ${finishedCandidates.length}개, scheduled 후보: ${scheduledCandidates.length}개`);
      
      // 7. 매칭 시도
      let matched = false;
      
      // 1차: finished 후보군에서 매칭
      for (const candidate of finishedCandidates) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
        const dbCatNorm = normalizeCategoryPair(candidate.mainCategory, candidate.subCategory).mainCategory;
        
        console.log(`후보(finished): id=${candidate.id}, homeTeam=${candidate.homeTeam}(${dbHomeNorm}), awayTeam=${candidate.awayTeam}(${dbAwayNorm})`);
        
        if (
          ((dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
           (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)) &&
          (!selCatNorm || !dbCatNorm || selCatNorm === dbCatNorm)
        ) {
          console.log(`✅ 매칭 성공(카테고리 포함, finished): candidate.id=${candidate.id}`);
          console.log(`   스코어: ${JSON.stringify(candidate.score)}`);
          console.log(`   결과: ${candidate.result}`);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // 2차: scheduled 후보군에서 매칭
        for (const candidate of scheduledCandidates) {
          const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
          const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
          const dbCatNorm = normalizeCategoryPair(candidate.mainCategory, candidate.subCategory).mainCategory;
          
          console.log(`후보(scheduled): id=${candidate.id}, homeTeam=${candidate.homeTeam}(${dbHomeNorm}), awayTeam=${candidate.awayTeam}(${dbAwayNorm})`);
          
          if (
            ((dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
             (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)) &&
            (!selCatNorm || !dbCatNorm || selCatNorm === dbCatNorm)
          ) {
            console.log(`✅ 매칭 성공(카테고리 포함, scheduled): candidate.id=${candidate.id}`);
            matched = true;
            break;
          }
        }
      }
      
      if (!matched) {
        // 3차: 카테고리 무시, 팀명만 일치 (finished 우선)
        for (const candidate of finishedCandidates) {
          const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
          const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
          
          if (
            (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
            (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
          ) {
            console.log(`✅ 매칭 성공(카테고리 무시, finished): candidate.id=${candidate.id}`);
            matched = true;
            break;
          }
        }
      }
      
      if (!matched) {
        // 4차: scheduled 후보군에서 카테고리 무시
        for (const candidate of scheduledCandidates) {
          const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
          const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
          
          if (
            (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
            (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
          ) {
            console.log(`✅ 매칭 성공(카테고리 무시, scheduled): candidate.id=${candidate.id}`);
            matched = true;
            break;
          }
        }
      }
      
      if (!matched) {
        console.log(`❌ 매칭 실패: desc=${desc}, homeTeamNorm=${homeTeamNorm}, awayTeamNorm=${awayTeamNorm}`);
        
        // ±12시간으로 확장 시도
        const startTime12 = new Date(commenceTime.getTime() - 12 * 60 * 60 * 1000);
        const endTime12 = new Date(commenceTime.getTime() + 12 * 60 * 60 * 1000);
        
        const candidates12Query = `
          SELECT 
            id,
            "homeTeam",
            "awayTeam",
            "commenceTime",
            status,
            result,
            score
          FROM "GameResults"
          WHERE "commenceTime" BETWEEN $1 AND $2
          ORDER BY "commenceTime" ASC
        `;
        
        const candidates12 = await pool.query(candidates12Query, [startTime12, endTime12]);
        console.log(`후보군(±12시간): ${candidates12.rows.length}개`);
        
        for (const candidate of candidates12.rows) {
          const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
          const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
          
          if (
            (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
            (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
          ) {
            console.log(`✅ ±12시간 확장 매칭 성공: candidate.id=${candidate.id}`);
            matched = true;
            break;
          }
        }
      }
      
      if (!matched) {
        console.log(`❌ 최종 매칭 실패`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testGetGameResultByTeams(); 