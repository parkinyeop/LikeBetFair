import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';
import axios from 'axios';
import createScriptSequelize from '../config/scriptDatabase.js';
const sequelize = createScriptSequelize();

const CSL_LEAGUE_ID = '4359';  // 중국 슈퍼리그 TheSportsDB ID
const API_KEY = process.env.THESPORTSDB_API_KEY || '116108';      // TheSportsDB API 키

async function collectCSLData() {
  console.log('🇨🇳 중국 슈퍼리그 데이터 수집 시작...');
  
  try {
    // 2025년 중국 슈퍼리그 시즌 데이터 가져오기
    const response = await axios.get(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsseason.php?id=${CSL_LEAGUE_ID}&s=2025`);
    
    if (!response.data || !response.data.events) {
      console.log('❌ 중국 슈퍼리그 데이터를 찾을 수 없습니다.');
      return;
    }

    const events = response.data.events;
    console.log(`📊 총 ${events.length}개의 경기 데이터 발견`);

    let savedCount = 0;
    let updatedCount = 0;

    for (const event of events) {
      try {
        // 기본 데이터 검증
        if (!event.strHomeTeam || !event.strAwayTeam || !event.dateEvent) {
          continue;
        }

        // 팀명 정규화
        const homeTeam = normalizeTeamName(event.strHomeTeam);
        const awayTeam = normalizeTeamName(event.strAwayTeam);
        
        // 경기 시간 설정 (날짜 파싱 개선)
        let gameDate;
        try {
          if (event.strTime && event.strTime !== '') {
            gameDate = new Date(event.dateEvent + 'T' + event.strTime + 'Z');
          } else {
            gameDate = new Date(event.dateEvent + 'T15:00:00Z');
          }
          
          // 유효한 날짜인지 확인
          if (isNaN(gameDate.getTime())) {
            console.log(`⚠️ 잘못된 날짜 형식: ${event.dateEvent}, ${event.strTime}`);
            continue;
          }
        } catch (error) {
          console.log(`⚠️ 날짜 파싱 오류: ${event.dateEvent}, ${event.strTime}`, error.message);
          continue;
        }
        
        // 경기 상태 결정
        let status = 'scheduled';
        let result = null;
        let score = null;

        if (event.strStatus === 'Match Finished' && event.intHomeScore !== null && event.intAwayScore !== null) {
          status = 'finished';
          
          // 스코어 형식: [{"name":"팀명","score":"점수"}]
          score = JSON.stringify([
            {"name": homeTeam, "score": event.intHomeScore.toString()},
            {"name": awayTeam, "score": event.intAwayScore.toString()}
          ]);
          
          // 경기 결과 결정
          const homeScore = parseInt(event.intHomeScore);
          const awayScore = parseInt(event.intAwayScore);
          
          if (homeScore > awayScore) {
            result = 'home_win';
          } else if (awayScore > homeScore) {
            result = 'away_win';
          } else {
            result = 'draw';
          }
        } else if (event.strStatus === 'Not Started' || !event.strStatus) {
          status = 'scheduled';
        } else {
          status = 'in_progress';
        }

        // 데이터베이스에 저장 또는 업데이트
        const [gameResult, created] = await GameResult.findOrCreate({
          where: {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: gameDate
          },
          defaults: {
            mainCategory: 'soccer',
            subCategory: 'CSL',
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: gameDate,
            status: status,
            score: score,
            result: result,
            eventId: event.idEvent,
            lastUpdated: new Date()
          }
        });

        if (created) {
          savedCount++;
          console.log(`✅ 새 경기 저장: ${homeTeam} vs ${awayTeam} (${event.dateEvent})`);
        } else {
          // 기존 경기 업데이트 (상태나 스코어가 변경된 경우)
          let needsUpdate = false;
          const updates = {};

          if (gameResult.status !== status) {
            updates.status = status;
            needsUpdate = true;
          }

          if (score && gameResult.score !== score) {
            updates.score = score;
            updates.result = result;
            needsUpdate = true;
          }

          if (!gameResult.eventId && event.idEvent) {
            updates.eventId = event.idEvent;
            needsUpdate = true;
          }

          if (needsUpdate) {
            updates.lastUpdated = new Date();
            await gameResult.update(updates);
            updatedCount++;
            console.log(`🔄 경기 업데이트: ${homeTeam} vs ${awayTeam} (${status})`);
          }
        }

      } catch (error) {
        console.error(`❌ 경기 처리 중 오류 (${event.strHomeTeam} vs ${event.strAwayTeam}):`, error.message);
      }
    }

    console.log(`\n🎉 중국 슈퍼리그 데이터 수집 완료!`);
    console.log(`📊 통계:`);
    console.log(`   - 새로 저장된 경기: ${savedCount}개`);
    console.log(`   - 업데이트된 경기: ${updatedCount}개`);
    console.log(`   - 총 처리된 경기: ${savedCount + updatedCount}개`);

    // 현재 시즌 상태 확인
    const finishedGames = await GameResult.count({
      where: {
        mainCategory: 'soccer',
        subCategory: 'CSL',
        status: 'finished'
      }
    });

    const scheduledGames = await GameResult.count({
      where: {
        mainCategory: 'soccer',
        subCategory: 'CSL',
        status: 'scheduled'
      }
    });

    console.log(`\n📈 현재 시즌 상태:`);
    console.log(`   - 완료된 경기: ${finishedGames}개`);
    console.log(`   - 예정된 경기: ${scheduledGames}개`);

  } catch (error) {
    console.error('❌ 중국 슈퍼리그 데이터 수집 중 오류:', error.message);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  collectCSLData()
    .then(async () => {

      console.log('✅ 중국 슈퍼리그 데이터 수집 스크립트 완료');
      process.exit(0);
    
      // 데이터베이스 연결 종료
      console.log('🔌 데이터베이스 연결 종료 중...');
      await sequelize.close();
      console.log('✅ 데이터베이스 연결 종료 완료');
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default collectCSLData; 