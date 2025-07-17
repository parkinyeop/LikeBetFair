import sequelize from '../models/db.js';
import { QueryTypes } from 'sequelize';

async function findScoreDataSources() {
  try {
    console.log('=== 스코어 데이터 생성 원인 분석 ===\n');
    
    // 문자열 배열 형태의 스코어만 조회
    const stringArrayScores = await sequelize.query(`
      SELECT 
        id,
        "subCategory",
        score::text as score_text,
        "homeTeam",
        "awayTeam",
        "commenceTime",
        "createdAt",
        "updatedAt"
      FROM "GameResults"
      WHERE score IS NOT NULL 
        AND status = 'finished'
        AND "subCategory" IN ('KBO', 'MLB', 'MLS')
      ORDER BY "subCategory", "commenceTime" DESC
    `, { type: QueryTypes.SELECT });
    
    console.log(`총 ${stringArrayScores.length}개 샘플 발견\n`);
    
    const leagueAnalysis = {};
    
    stringArrayScores.forEach(row => {
      const subCategory = row.subCategory;
      
      if (!leagueAnalysis[subCategory]) {
        leagueAnalysis[subCategory] = {
          stringArrays: [],
          objectArrays: [],
          nullArrays: []
        };
      }
      
      let parsedScore = null;
      try {
        parsedScore = JSON.parse(row.score_text);
        
        if (Array.isArray(parsedScore)) {
          if (parsedScore.length > 0) {
            // null 포함된 배열 체크
            if (parsedScore.includes(null)) {
              leagueAnalysis[subCategory].nullArrays.push({
                id: row.id,
                score: parsedScore,
                teams: `${row.homeTeam} vs ${row.awayTeam}`,
                date: row.commenceTime ? row.commenceTime.toString().slice(0,10) : 'unknown',
                created: row.createdAt ? row.createdAt.toString().slice(0,19) : 'unknown',
                updated: row.updatedAt ? row.updatedAt.toString().slice(0,19) : 'unknown'
              });
            } else if (typeof parsedScore[0] === 'string') {
              leagueAnalysis[subCategory].stringArrays.push({
                id: row.id,
                score: parsedScore,
                teams: `${row.homeTeam} vs ${row.awayTeam}`,
                date: row.commenceTime ? row.commenceTime.toString().slice(0,10) : 'unknown',
                created: row.createdAt ? row.createdAt.toString().slice(0,19) : 'unknown',
                updated: row.updatedAt ? row.updatedAt.toString().slice(0,19) : 'unknown'
              });
            } else if (typeof parsedScore[0] === 'object') {
              leagueAnalysis[subCategory].objectArrays.push({
                id: row.id,
                score: parsedScore,
                teams: `${row.homeTeam} vs ${row.awayTeam}`,
                date: row.commenceTime ? row.commenceTime.toString().slice(0,10) : 'unknown',
                created: row.createdAt ? row.createdAt.toString().slice(0,19) : 'unknown',
                updated: row.updatedAt ? row.updatedAt.toString().slice(0,19) : 'unknown'
              });
            }
          }
        }
      } catch (error) {
        console.log(`❌ JSON 파싱 오류: ${row.id} - ${row.score_text}`);
      }
    });
    
    // 결과 분석
    Object.keys(leagueAnalysis).forEach(league => {
      console.log(`=== ${league} 분석 ===`);
      const data = leagueAnalysis[league];
      
      console.log(`문자열 배열: ${data.stringArrays.length}개`);
      console.log(`객체 배열: ${data.objectArrays.length}개`);
      console.log(`null 포함 배열: ${data.nullArrays.length}개`);
      
      if (data.stringArrays.length > 0) {
        console.log('\n🔍 문자열 배열 샘플:');
        data.stringArrays.slice(0, 3).forEach((sample, idx) => {
          console.log(`  ${idx + 1}. ${sample.teams} (${sample.date})`);
          console.log(`     스코어: ${JSON.stringify(sample.score)}`);
          console.log(`     생성일: ${sample.created}`);
          console.log(`     수정일: ${sample.updated}`);
          console.log(`     ID: ${sample.id}`);
        });
      }
      
      if (data.nullArrays.length > 0) {
        console.log('\n🔍 null 포함 배열 샘플:');
        data.nullArrays.slice(0, 3).forEach((sample, idx) => {
          console.log(`  ${idx + 1}. ${sample.teams} (${sample.date})`);
          console.log(`     스코어: ${JSON.stringify(sample.score)}`);
          console.log(`     생성일: ${sample.created}`);
          console.log(`     수정일: ${sample.updated}`);
          console.log(`     ID: ${sample.id}`);
        });
      }
      
      console.log('');
    });
    
    await sequelize.close();
    
  } catch (error) {
    console.error('분석 오류:', error);
    await sequelize.close();
  }
}

findScoreDataSources(); 