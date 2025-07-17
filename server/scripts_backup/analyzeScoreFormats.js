import sequelize from '../models/db.js';
import { QueryTypes } from 'sequelize';

async function analyzeScoreFormats() {
  try {
    console.log('=== 전체 DB 스코어 형태 분석 시작 ===\n');
    
    // 먼저 잘못된 JSON 데이터 찾기
    console.log('1. 전체 스코어 데이터 분석...');
    const invalidJsonResults = await sequelize.query(`
      SELECT 
        id,
        "subCategory",
        score::text as score_text,
        "homeTeam",
        "awayTeam",
        "commenceTime"
      FROM "GameResults"
      WHERE score IS NOT NULL 
        AND status = 'finished'
      ORDER BY "subCategory", "commenceTime" DESC
    `, { type: QueryTypes.SELECT });
    
    console.log(`총 ${invalidJsonResults.length}개 샘플 조회\n`);
    
    // 리그별 분석
    const scoreFormats = {};
    let invalidJsonCount = 0;
    
    invalidJsonResults.forEach(row => {
      const subCategory = row.subCategory;
      
      if (!scoreFormats[subCategory]) {
        scoreFormats[subCategory] = {
          samples: [],
          stringArrayCount: 0,
          objectArrayCount: 0,
          invalidJsonCount: 0,
          otherCount: 0,
          total: 0
        };
      }
      
      scoreFormats[subCategory].total++;
      
      let scoreType = 'unknown';
      let scoreValue = row.score_text;
      let parsedScore = null;
      
      try {
        // JSON 파싱 시도
        parsedScore = JSON.parse(scoreValue);
        
        // JSON 문자열로 저장된 경우 다시 파싱
        if (typeof parsedScore === 'string') {
          parsedScore = JSON.parse(parsedScore);
        }
        
        if (Array.isArray(parsedScore)) {
          if (parsedScore.length > 0) {
            if (typeof parsedScore[0] === 'string') {
              scoreType = 'string_array';
              scoreFormats[subCategory].stringArrayCount++;
            } else if (typeof parsedScore[0] === 'object' && parsedScore[0] !== null) {
              scoreType = 'object_array';
              scoreFormats[subCategory].objectArrayCount++;
            }
          }
        } else {
          scoreType = 'other';
          scoreFormats[subCategory].otherCount++;
        }
      } catch (error) {
        scoreType = 'invalid_json';
        scoreFormats[subCategory].invalidJsonCount++;
        invalidJsonCount++;
        console.log(`❌ 잘못된 JSON: ${row.id} (${subCategory}) - ${scoreValue}`);
      }
      
      // 각 리그별로 3개 샘플만 저장
      if (scoreFormats[subCategory].samples.length < 3) {
        scoreFormats[subCategory].samples.push({
          id: row.id,
          scoreText: scoreValue,
          parsedScore: parsedScore,
          type: scoreType,
          teams: `${row.homeTeam} vs ${row.awayTeam}`,
          date: row.commenceTime ? row.commenceTime.toString().slice(0,10) : 'unknown'
        });
      }
    });
    
    console.log(`\n잘못된 JSON 데이터: ${invalidJsonCount}개\n`);
    
    // 결과 출력
    Object.keys(scoreFormats).sort().forEach(subCategory => {
      const data = scoreFormats[subCategory];
      console.log(`=== ${subCategory} ===`);
      console.log(`총 경기: ${data.total}개`);
      console.log(`- 문자열 배열 ["1","2"]: ${data.stringArrayCount}개`);
      console.log(`- 객체 배열 [{"name":"팀","score":"점수"}]: ${data.objectArrayCount}개`);
      console.log(`- 잘못된 JSON: ${data.invalidJsonCount}개`);
      console.log(`- 기타 형태: ${data.otherCount}개`);
      
      console.log('\n샘플:');
      data.samples.forEach((sample, idx) => {
        console.log(`  ${idx + 1}. ${sample.teams} (${sample.date})`);
        console.log(`     타입: ${sample.type}`);
        console.log(`     원본: ${sample.scoreText}`);
        if (sample.parsedScore) {
          console.log(`     파싱: ${JSON.stringify(sample.parsedScore)}`);
        }
        console.log(`     ID: ${sample.id}`);
      });
      console.log('');
    });
    
    // 문제 분석
    console.log('=== 문제 분석 ===');
    Object.keys(scoreFormats).forEach(subCategory => {
      const data = scoreFormats[subCategory];
      if (data.invalidJsonCount > 0) {
        console.log(`🚨 ${subCategory}: 잘못된 JSON 데이터 ${data.invalidJsonCount}개 - 긴급 수정 필요`);
      } else if (data.stringArrayCount > 0 && data.objectArrayCount > 0) {
        console.log(`❌ ${subCategory}: 혼재 (string: ${data.stringArrayCount}, object: ${data.objectArrayCount})`);
      } else if (data.stringArrayCount > 0) {
        console.log(`⚠️  ${subCategory}: 문자열 배열만 (${data.stringArrayCount}개) - 수정 필요`);
      } else if (data.objectArrayCount > 0) {
        console.log(`✅ ${subCategory}: 객체 배열만 (${data.objectArrayCount}개) - 정상`);
      } else if (data.otherCount > 0) {
        console.log(`❓ ${subCategory}: 기타 형태 (${data.otherCount}개) - 확인 필요`);
      }
    });
    
    await sequelize.close();
    
  } catch (error) {
    console.error('분석 오류:', error);
    await sequelize.close();
  }
}

analyzeScoreFormats(); 