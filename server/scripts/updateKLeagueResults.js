import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import axios from 'axios';

/**
 * K리그 기존 경기 결과 업데이트 스크립트
 * 이미 데이터베이스에 있는 경기들의 결과만 업데이트
 */
async function updateKLeagueResults() {
  try {
    console.log('=== 🔄 K리그 기존 경기 결과 업데이트 시작 ===\n');
    
    const now = new Date();
    
    // 1. 과거 경기 중 아직 scheduled 상태인 것들 찾기
    const pastScheduledGames = await GameResult.findAll({
      where: {
        subCategory: 'KLEAGUE1',
        status: 'scheduled',
        commenceTime: { [Op.lt]: now }
      },
      order: [['commenceTime', 'DESC']]
    });
    
    console.log(`📊 업데이트 대상 경기: ${pastScheduledGames.length}개\n`);
    
    if (pastScheduledGames.length === 0) {
      console.log('✅ 업데이트할 경기가 없습니다.');
      return;
    }
    
    // 2. TheSportsDB API에서 최신 결과 가져오기
    const leagueId = 4689; // K리그 1
    const currentYear = new Date().getFullYear();
    
    console.log(`🌐 TheSportsDB API 요청 중... (리그 ID: ${leagueId}, 시즌: ${currentYear})`);
    
    const response = await axios.get(`https://www.thesportsdb.com/api/v1/json/116108/eventsseason.php?id=${leagueId}&s=${currentYear}`);
    
    if (!response.data || !response.data.events) {
      throw new Error('TheSportsDB API 응답이 올바르지 않습니다.');
    }
    
    const apiEvents = response.data.events;
    console.log(`📡 API에서 ${apiEvents.length}개 경기 데이터 수신\n`);
    
    // 3. API 데이터를 맵으로 변환 (팀명 + 날짜로 매칭)
    const apiEventMap = new Map();
    
    apiEvents.forEach(event => {
      if (event.strHomeTeam && event.strAwayTeam && event.dateEvent) {
        const homeTeam = event.strHomeTeam.toLowerCase().replace(/\s+/g, '');
        const awayTeam = event.strAwayTeam.toLowerCase().replace(/\s+/g, '');
        const eventDate = new Date(event.dateEvent);
        const key = `${homeTeam}_${awayTeam}_${eventDate.toISOString().split('T')[0]}`;
        
        apiEventMap.set(key, event);
      }
    });
    
    console.log(`🗂️ API 이벤트 맵 생성 완료: ${apiEventMap.size}개\n`);
    
    // 4. 각 경기 결과 업데이트
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const game of pastScheduledGames) {
      try {
        // 팀명 정규화
        const homeTeam = game.homeTeam.toLowerCase().replace(/\s+/g, '');
        const awayTeam = game.awayTeam.toLowerCase().replace(/\s+/g, '');
        const gameDate = new Date(game.commenceTime);
        const dateKey = gameDate.toISOString().split('T')[0];
        
        // API에서 매칭되는 경기 찾기
        const key = `${homeTeam}_${awayTeam}_${dateKey}`;
        const apiEvent = apiEventMap.get(key);
        
        if (!apiEvent) {
          console.log(`❌ 매칭 실패: ${game.homeTeam} vs ${game.awayTeam} (${dateKey})`);
          continue;
        }
        
        // 경기 상태 및 결과 업데이트
        let newStatus = 'scheduled';
        let newResult = 'pending';
        let newScore = null;
        
        if (apiEvent.strStatus === 'Match Finished') {
          newStatus = 'finished';
          
          // 스코어 처리
          if (apiEvent.intHomeScore !== null && apiEvent.intAwayScore !== null) {
            const homeScore = parseInt(apiEvent.intHomeScore);
            const awayScore = parseInt(apiEvent.intAwayScore);
            
            newScore = JSON.stringify([
              {"name": game.homeTeam, "score": homeScore.toString()},
              {"name": game.awayTeam, "score": awayScore.toString()}
            ]);
            
            // 결과 판정
            if (homeScore > awayScore) {
              newResult = 'home_win';
            } else if (awayScore > homeScore) {
              newResult = 'away_win';
            } else {
              newResult = 'draw';
            }
          }
        } else if (apiEvent.strStatus === 'Live') {
          newStatus = 'live';
        } else if (apiEvent.strStatus === 'Cancelled' || apiEvent.strStatus === 'Postponed') {
          newStatus = 'cancelled';
          newResult = 'cancelled';
        }
        
        // 데이터베이스 업데이트
        await game.update({
          status: newStatus,
          result: newResult,
          score: newScore,
          lastUpdated: new Date()
        });
        
        console.log(`✅ 업데이트 완료: ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   상태: ${game.status} → ${newStatus}`);
        console.log(`   결과: ${game.result} → ${newResult}`);
        console.log(`   스코어: ${newScore ? newScore : 'null'}`);
        console.log('');
        
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ 업데이트 실패: ${game.homeTeam} vs ${game.awayTeam}`);
        console.error(`   오류: ${error.message}`);
        console.log('');
        errorCount++;
      }
    }
    
    console.log(`=== 📊 업데이트 결과 ===`);
    console.log(`✅ 성공: ${updatedCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📋 총 처리: ${pastScheduledGames.length}개`);
    
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  updateKLeagueResults()
    .then(() => {
      console.log('\n✅ K리그 결과 업데이트 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default updateKLeagueResults; 