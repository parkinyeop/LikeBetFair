const { Sequelize } = require('sequelize');

// 데이터베이스 연결 설정
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bettingDB',
  logging: false
});

// 강력한 팀명 정규화 함수
function normalizeTeamName(teamName) {
  if (!teamName) return '';
  
  let normalized = teamName.trim().toLowerCase();
  
  // 공통 접미사 제거 (FC, United, City, Athletic 등)
  const suffixes = [
    ' fc', ' football club', ' united', ' city', ' athletic', ' atletico',
    ' real', ' sporting', ' club', ' team', ' fc.', ' united fc', ' city fc'
  ];
  
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.replace(suffix, '');
      break;
    }
  }
  
  // 특수문자 제거
  normalized = normalized.replace(/[^\w\s]/g, '');
  
  // 공백 제거
  normalized = normalized.replace(/\s/g, '');
  
  return normalized;
}

// 팀명 유사도 계산 (Levenshtein 거리 기반)
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (str1.length === 0) return 0.0;
  if (str2.length === 0) return 0.0;
  
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
  
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (matrix[str2.length][str1.length] / maxLength);
}

// 팀명 매칭 함수 (고급 버전)
function isTeamMatch(team1, team2, threshold = 0.8) {
  if (!team1 || !team2) return false;
  
  const norm1 = normalizeTeamName(team1);
  const norm2 = normalizeTeamName(team2);
  
  // 정확한 매칭
  if (norm1 === norm2) return true;
  
  // 유사도 기반 매칭
  const similarity = calculateSimilarity(norm1, norm2);
  if (similarity >= threshold) return true;
  
  // 부분 매칭 (한 팀명이 다른 팀명에 포함되는 경우)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // 길이가 비슷한 경우 더 엄격한 임계값 적용
  if (Math.abs(norm1.length - norm2.length) <= 2) {
    if (similarity >= 0.7) return true;
  }
  
  return false;
}

// 고급 게임 매칭 함수
async function advancedGameMatching() {
  try {
    console.log('=== 고급 게임 매칭 시작 ===');
    
    // 데이터베이스 연결 확인
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 1. 매칭이 필요한 주문들 조회
    console.log('\n1. 매칭이 필요한 주문들 조회 중...');
    const unmatchableOrders = await sequelize.query(`
      SELECT 
        eo.id,
        eo."homeTeam",
        eo."awayTeam",
        eo."commenceTime",
        eo."sportKey",
        eo.status
      FROM "ExchangeOrders" eo
      WHERE eo.status = 'matched' 
        AND eo."gameResultId" IS NULL
        AND eo."autoSettlement" = true
      ORDER BY eo."commenceTime" DESC NULLS LAST
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`매칭이 필요한 주문 수: ${unmatchableOrders.length}`);
    
    if (unmatchableOrders.length === 0) {
      console.log('✅ 모든 주문이 이미 매칭되었습니다!');
      return;
    }
    
    // 2. 각 주문별로 게임 결과 매칭 시도
    console.log('\n2. 게임 결과 매칭 시도 중...');
    let matchedCount = 0;
    let failedCount = 0;
    
    for (const order of unmatchableOrders) {
      try {
        console.log(`\n매칭 시도: ${order.homeTeam} vs ${order.awayTeam}`);
        console.log(`  정규화된 팀명: ${normalizeTeamName(order.homeTeam)} vs ${normalizeTeamName(order.awayTeam)}`);
        
        // commenceTime이 null인 경우 처리
        let searchQuery = '';
        let replacements = {};
        
        if (order.commenceTime) {
          // 시간 기반 검색 (전후 3시간)
          const orderTime = new Date(order.commenceTime);
          const startTime = new Date(orderTime.getTime() - 3 * 60 * 60 * 1000); // 3시간 전
          const endTime = new Date(orderTime.getTime() + 3 * 60 * 60 * 1000);   // 3시간 후
          
          searchQuery = `
            SELECT 
              id,
              "homeTeam",
              "awayTeam",
              "commenceTime",
              status,
              result,
              score
            FROM "GameResults"
            WHERE "commenceTime" BETWEEN :startTime AND :endTime
            ORDER BY ABS(EXTRACT(EPOCH FROM ("commenceTime" - :orderTime)))
            LIMIT 30
          `;
          
          replacements = {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            orderTime: orderTime.toISOString()
          };
        } else {
          // 시간 정보가 없는 경우 전체 검색
          searchQuery = `
            SELECT 
              id,
              "homeTeam",
              "awayTeam",
              "commenceTime",
              status,
              result,
              score
            FROM "GameResults"
            ORDER BY "commenceTime" DESC
            LIMIT 100
          `;
          
          replacements = {};
        }
        
        const gameResults = await sequelize.query(searchQuery, { 
          replacements,
          type: Sequelize.QueryTypes.SELECT 
        });
        
        if (gameResults.length > 0) {
          // 가장 적합한 매칭 찾기
          let bestMatch = null;
          let bestScore = 0;
          let bestDetails = '';
          
          for (const gameResult of gameResults) {
            let score = 0;
            let details = [];
            
            // 팀명 매칭 점수 (가장 중요)
            const homeMatch = isTeamMatch(order.homeTeam, gameResult.homeTeam);
            const awayMatch = isTeamMatch(order.awayTeam, gameResult.awayTeam);
            const homeAwaySwap = isTeamMatch(order.homeTeam, gameResult.awayTeam);
            const awayHomeSwap = isTeamMatch(order.awayTeam, gameResult.homeTeam);
            
            if (homeMatch && awayMatch) {
              score += 100; // 정확한 매칭
              details.push('정확한 팀명 매칭');
            } else if (homeAwaySwap && awayHomeSwap) {
              score += 90; // 순서가 바뀐 매칭
              details.push('순서 바뀐 팀명 매칭');
            } else {
              // 부분 매칭 점수
              const homeSimilarity = calculateSimilarity(
                normalizeTeamName(order.homeTeam), 
                normalizeTeamName(gameResult.homeTeam)
              );
              const awaySimilarity = calculateSimilarity(
                normalizeTeamName(order.awayTeam), 
                normalizeTeamName(gameResult.awayTeam)
              );
              
              if (homeSimilarity >= 0.7) score += Math.floor(homeSimilarity * 50);
              if (awaySimilarity >= 0.7) score += Math.floor(awaySimilarity * 50);
              
              if (homeSimilarity >= 0.7 || awaySimilarity >= 0.7) {
                details.push(`팀명 유사도: 홈 ${(homeSimilarity * 100).toFixed(1)}%, 원정 ${(awaySimilarity * 100).toFixed(1)}%`);
              }
            }
            
            // 시간 매칭 점수 (commenceTime이 있는 경우만)
            if (order.commenceTime && gameResult.commenceTime) {
              const timeDiff = Math.abs(new Date(gameResult.commenceTime) - new Date(order.commenceTime));
              const timeScore = Math.max(0, 30 - Math.floor(timeDiff / (30 * 60 * 1000))); // 30분당 1점 감소
              score += timeScore;
              if (timeScore > 0) details.push(`시간 매칭: ${timeScore}점`);
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestMatch = gameResult;
              bestDetails = details.join(', ');
            }
          }
          
          // 매칭 임계값 (팀명 매칭이 80점 이상이면 성공)
          if (bestMatch && bestScore >= 80) {
            console.log(`  ✅ 매칭 성공! (점수: ${bestScore})`);
            console.log(`    - 매칭 이유: ${bestDetails}`);
            console.log(`    - 매칭된 게임: ${bestMatch.homeTeam} vs ${bestMatch.awayTeam}`);
            console.log(`    - 정규화된 팀명: ${normalizeTeamName(bestMatch.homeTeam)} vs ${normalizeTeamName(bestMatch.awayTeam)}`);
            console.log(`    - 게임 시간: ${bestMatch.commenceTime}`);
            console.log(`    - 게임 상태: ${bestMatch.status}`);
            console.log(`    - 게임 결과: ${bestMatch.result}`);
            
            // ExchangeOrder 업데이트
            await sequelize.query(`
              UPDATE "ExchangeOrders"
              SET "gameResultId" = :gameResultId,
                  "updatedAt" = NOW()
              WHERE id = :orderId
            `, {
              replacements: {
                gameResultId: bestMatch.id,
                orderId: order.id
              }
            });
            
            matchedCount++;
            console.log(`    - gameResultId 연결 완료: ${bestMatch.id}`);
          } else {
            console.log(`  ❌ 적절한 매칭을 찾을 수 없음 (최고 점수: ${bestScore})`);
            if (bestDetails) console.log(`    - 최고 점수 상세: ${bestDetails}`);
            failedCount++;
          }
        } else {
          console.log(`  ❌ 매칭 가능한 게임 결과 없음`);
          failedCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ 매칭 중 오류: ${error.message}`);
        failedCount++;
      }
    }
    
    // 3. 매칭 결과 요약
    console.log('\n3. 매칭 결과 요약...');
    console.log(`✅ 매칭 성공: ${matchedCount}건`);
    console.log(`❌ 매칭 실패: ${failedCount}건`);
    
    // 4. 매칭 후 상태 확인
    if (matchedCount > 0) {
      console.log('\n4. 매칭 후 상태 확인...');
      const updatedStats = await sequelize.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN "gameResultId" IS NOT NULL THEN 1 END) as matched_orders,
          COUNT(CASE WHEN "gameResultId" IS NULL THEN 1 END) as unmatchable_orders
        FROM "ExchangeOrders"
        WHERE status = 'matched' AND "autoSettlement" = true
      `, { type: Sequelize.QueryTypes.SELECT });
      
      console.log('매칭 상태:');
      console.log(`  - 총 주문: ${updatedStats[0].total_orders}건`);
      console.log(`  - 매칭 완료: ${updatedStats[0].matched_orders}건`);
      console.log(`  - 매칭 필요: ${updatedStats[0].unmatchable_orders}건`);
    }
    
  } catch (error) {
    console.error('게임 매칭 중 오류:', error);
  } finally {
    await sequelize.close();
    console.log('\n=== 고급 게임 매칭 완료 ===');
  }
}

// 실행
advancedGameMatching().catch(console.error);
