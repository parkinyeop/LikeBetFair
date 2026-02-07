import dotenv from 'dotenv';
import createScriptSequelize from '../config/scriptDatabase.js';

dotenv.config();

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

async function checkUnsettledBets() {
  try {
    console.log('🔍 Render 서버 정산되지 않은 배팅 확인 시작...');
    console.log('환경:', process.env.NODE_ENV || 'development');
    
    // 1. 데이터베이스 연결 확인
    console.log('\n1️⃣ 데이터베이스 연결 확인...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공!');
    
    // 2. 정산되지 않은 배팅 조회
    console.log('\n2️⃣ 정산되지 않은 배팅 조회...');
    
    const [unsettledBets] = await sequelize.query(`
      SELECT 
        b.id,
        b."userId",
        u.username,
        b.selections,
        b.stake,
        b."potentialWinnings",
        b."totalOdds",
        b.status,
        b."createdAt",
        b."updatedAt",
        gr."homeTeam",
        gr."awayTeam",
        gr.score,
        gr.status as "game_status",
        gr."commenceTime" as "game_commence_time"
      FROM "Bets" b
      LEFT JOIN "Users" u ON b."userId" = u.id
      LEFT JOIN "GameResults" gr ON b.selections->0->>'desc' LIKE '%' || gr."homeTeam" || '%' AND b.selections->0->>'desc' LIKE '%' || gr."awayTeam" || '%'
      WHERE b.status IN ('pending', 'active')
      ORDER BY b."createdAt" ASC
    `);
    
    console.log(`📊 정산되지 않은 배팅 총 ${unsettledBets.length}개 발견`);
    
    if (unsettledBets.length === 0) {
      console.log('✅ 모든 배팅이 정산되었습니다!');
      return;
    }
    
    // 3. 배팅별 상세 정보 출력
    console.log('\n3️⃣ 정산되지 않은 배팅 상세 정보:');
    console.log('='.repeat(120));
    
    unsettledBets.forEach((bet, index) => {
      console.log(`\n${index + 1}. 배팅 ID: ${bet.id}`);
      console.log(`   사용자: ${bet.username} (ID: ${bet.userId})`);
      
      // selections 정보 파싱
      if (bet.selections && Array.isArray(bet.selections)) {
        bet.selections.forEach((sel, selIndex) => {
          console.log(`   선택 ${selIndex + 1}: ${sel.team || '팀명 없음'}`);
          console.log(`   배당: ${sel.odds || bet.totalOdds}`);
          console.log(`   설명: ${sel.desc || '설명 없음'}`);
          console.log(`   마켓: ${sel.market || '마켓 없음'}`);
        });
      }
      
      console.log(`   배팅금액: ${bet.stake?.toLocaleString()}원`);
      console.log(`   예상 수익: ${bet.potentialWinnings?.toLocaleString()}원`);
      console.log(`   상태: ${bet.status}`);
      console.log(`   배팅 시간: ${bet.createdAt}`);
      
      if (bet.homeTeam && bet.awayTeam) {
        console.log(`   경기: ${bet.homeTeam} vs ${bet.awayTeam}`);
        if (bet.score && Array.isArray(bet.score)) {
          const homeScore = bet.score.find(s => s.name === bet.homeTeam)?.score;
          const awayScore = bet.score.find(s => s.name === bet.awayTeam)?.score;
          if (homeScore && awayScore) {
            console.log(`   스코어: ${homeScore} - ${awayScore}`);
          }
        }
        console.log(`   경기 상태: ${bet.game_status || '알 수 없음'}`);
        console.log(`   경기 시작: ${bet.game_commence_time || '알 수 없음'}`);
      } else {
        console.log(`   경기 정보: 매칭되지 않음`);
      }
      
      console.log('-'.repeat(80));
    });
    
    // 4. 통계 정보
    console.log('\n4️⃣ 통계 정보:');
    
    // 상태별 통계
    const statusStats = {};
    unsettledBets.forEach(bet => {
      statusStats[bet.status] = (statusStats[bet.status] || 0) + 1;
    });
    
    console.log('상태별 배팅 수:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}개`);
    });
    
    // 스포츠별 통계
    const sportStats = {};
    unsettledBets.forEach(bet => {
      if (bet.selections && Array.isArray(bet.selections)) {
        bet.selections.forEach(sel => {
          if (sel.sport_key) {
            sportStats[sel.sport_key] = (sportStats[sel.sport_key] || 0) + 1;
          }
        });
      }
    });
    
    console.log('\n스포츠별 배팅 수:');
    Object.entries(sportStats).forEach(([sport, count]) => {
      console.log(`  ${sport}: ${count}개`);
    });
    
    // 마켓별 통계
    const marketStats = {};
    unsettledBets.forEach(bet => {
      if (bet.selections && Array.isArray(bet.selections)) {
        bet.selections.forEach(sel => {
          if (sel.market) {
            marketStats[sel.market] = (marketStats[sel.market] || 0) + 1;
          }
        });
      }
    });
    
    console.log('\n마켓별 배팅 수:');
    Object.entries(marketStats).forEach(([market, count]) => {
      console.log(`  ${market}: ${count}개`);
    });
    
    // 5. 경기 결과가 있는데 배팅이 정산되지 않은 경우
    console.log('\n5️⃣ 경기 결과는 있지만 배팅이 정산되지 않은 경우:');
    const [unsettledWithResults] = await sequelize.query(`
      SELECT 
        b.id,
        b.selections,
        b.status as "bet_status",
        gr.status as "game_status",
        gr."homeTeam",
        gr."awayTeam",
        gr.score,
        gr."commenceTime"
      FROM "Bets" b
      LEFT JOIN "GameResults" gr ON b.selections->0->>'desc' LIKE '%' || gr."homeTeam" || '%' AND b.selections->0->>'desc' LIKE '%' || gr."awayTeam" || '%'
      WHERE b.status IN ('pending', 'active')
      AND gr.status IN ('finished', 'cancelled', 'postponed')
    `);
    
    if (unsettledWithResults.length > 0) {
      console.log(`⚠️ 경기 결과는 있지만 배팅이 정산되지 않은 배팅: ${unsettledWithResults.length}개`);
      unsettledWithResults.forEach((bet, index) => {
        console.log(`\n  ${index + 1}. 배팅 ID: ${bet.id}`);
        if (bet.selections && Array.isArray(bet.selections)) {
          bet.selections.forEach((sel, selIndex) => {
            console.log(`     선택 ${selIndex + 1}: ${sel.team || '팀명 없음'}`);
          });
        }
        console.log(`     배팅 상태: ${bet.bet_status}`);
        console.log(`     경기: ${bet.homeTeam} vs ${bet.awayTeam}`);
        if (bet.score && Array.isArray(bet.score)) {
          const homeScore = bet.score.find(s => s.name === bet.homeTeam)?.score;
          const awayScore = bet.score.find(s => s.name === bet.awayTeam)?.score;
          if (homeScore && awayScore) {
            console.log(`     스코어: ${homeScore} - ${awayScore}`);
          }
        }
        console.log(`     경기 상태: ${bet.game_status}`);
        console.log(`     경기 시작: ${bet.commenceTime}`);
      });
    } else {
      console.log('✅ 모든 정산되지 않은 배팅은 아직 경기 결과가 없습니다.');
    }
    
    // 6. 총 배팅 금액 및 예상 수익
    const totalAmount = unsettledBets.reduce((sum, bet) => sum + (bet.stake || 0), 0);
    const totalPotentialWinnings = unsettledBets.reduce((sum, bet) => sum + (bet.potentialWinnings || 0), 0);
    
    console.log('\n6️⃣ 금액 통계:');
    console.log(`총 배팅 금액: ${totalAmount.toLocaleString()}원`);
    console.log(`총 예상 수익: ${totalPotentialWinnings.toLocaleString()}원`);
    console.log(`예상 순수익: ${(totalPotentialWinnings - totalAmount).toLocaleString()}원`);
    
    console.log('\n✅ 정산되지 않은 배팅 확인 완료!');
    
  } catch (error) {
    console.error('❌ 정산되지 않은 배팅 확인 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// 스크립트 실행
checkUnsettledBets(); 