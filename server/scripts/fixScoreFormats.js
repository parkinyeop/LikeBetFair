import sequelize from '../models/db.js';
import { QueryTypes } from 'sequelize';

async function fixScoreFormats() {
  try {
    console.log('=== 스코어 형태 일괄 수정 시작 ===\n');
    
    // 1. 문제 있는 데이터 조회
    const problemScores = await sequelize.query(`
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
        AND "subCategory" IN ('KBO', 'MLB', 'MLS')
      ORDER BY "subCategory", "commenceTime" DESC
    `, { type: QueryTypes.SELECT });
    
    console.log(`총 ${problemScores.length}개 검토 대상 발견\n`);
    
    let fixedCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    const fixLog = {
      KBO: { fixed: 0, skipped: 0, errors: 0 },
      MLB: { fixed: 0, skipped: 0, errors: 0 },
      MLS: { fixed: 0, skipped: 0, errors: 0 }
    };
    
    for (const row of problemScores) {
      try {
        let parsedScore = JSON.parse(row.score_text);
        let needsFix = false;
        let newScore = null;
        
        // JSON 문자열로 저장된 경우 다시 파싱
        if (typeof parsedScore === 'string') {
          parsedScore = JSON.parse(parsedScore);
        }
        
        if (Array.isArray(parsedScore) && parsedScore.length === 2) {
          // 문자열 배열이거나 null 포함 배열인지 확인
          if (typeof parsedScore[0] === 'string' || parsedScore[0] === null ||
              typeof parsedScore[1] === 'string' || parsedScore[1] === null) {
            
            needsFix = true;
            
            // 올바른 객체 배열 형태로 변환
            newScore = [
              {
                name: row.homeTeam,
                score: parsedScore[0] !== null ? parsedScore[0].toString() : "0"
              },
              {
                name: row.awayTeam,
                score: parsedScore[1] !== null ? parsedScore[1].toString() : "0"
              }
            ];
          }
        }
        
        if (needsFix) {
          // 데이터베이스 업데이트
          await sequelize.query(`
            UPDATE "GameResults" 
            SET score = :newScore
            WHERE id = :id
          `, {
            replacements: {
              id: row.id,
              newScore: JSON.stringify(newScore)
            },
            type: QueryTypes.UPDATE
          });
          
          fixedCount++;
          fixLog[row.subCategory].fixed++;
          
          console.log(`✅ 수정완료: ${row.homeTeam} vs ${row.awayTeam} (${row.subCategory})`);
          console.log(`   이전: ${JSON.stringify(parsedScore)}`);
          console.log(`   이후: ${JSON.stringify(newScore)}`);
          console.log(`   ID: ${row.id}\n`);
          
        } else {
          skipCount++;
          fixLog[row.subCategory].skipped++;
        }
        
      } catch (error) {
        errorCount++;
        fixLog[row.subCategory].errors++;
        console.error(`❌ 오류: ${row.id} - ${error.message}`);
      }
    }
    
    // 결과 요약
    console.log('=== 수정 결과 요약 ===');
    console.log(`총 처리: ${problemScores.length}개`);
    console.log(`수정됨: ${fixedCount}개`);
    console.log(`건너뜀: ${skipCount}개`);
    console.log(`오류: ${errorCount}개\n`);
    
    console.log('=== 리그별 상세 ===');
    Object.keys(fixLog).forEach(league => {
      const log = fixLog[league];
      console.log(`${league}: 수정 ${log.fixed}개, 건너뜀 ${log.skipped}개, 오류 ${log.errors}개`);
    });
    
    await sequelize.close();
    console.log('\n수정 완료!');
    
  } catch (error) {
    console.error('스크립트 오류:', error);
    await sequelize.close();
  }
}

fixScoreFormats();
