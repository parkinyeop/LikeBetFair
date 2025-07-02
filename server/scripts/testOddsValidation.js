import oddsValidationService from '../services/oddsValidationService.js';
import oddsHistoryService from '../services/oddsHistoryService.js';
import OddsCache from '../models/oddsCacheModel.js';
import sequelize from '../models/sequelize.js';

// 테스트용 베팅 데이터
const testBetData = {
  id: 'test-bet-123',
  selections: [
    {
      team: 'Toronto Blue Jays',
      odds: 1.85,
      desc: 'Toronto Blue Jays vs New York Yankees',
      commence_time: '2025-07-02T21:00:00Z',
      market: '승/패'
    },
    {
      team: 'Over',
      odds: 1.92,
      desc: 'Toronto Blue Jays vs New York Yankees - 총점',
      commence_time: '2025-07-02T21:00:00Z',
      market: '언더/오버',
      option: 'Over',
      point: 8.5
    }
  ],
  createdAt: new Date('2025-07-02T20:30:00Z'), // 베팅 시점
  totalOdds: 3.55
};

// 테스트용 현재 배당율 데이터
const testCurrentOdds = {
  homeTeam: 'Toronto Blue Jays',
  awayTeam: 'New York Yankees',
  commenceTime: new Date('2025-07-02T21:00:00Z'),
  bookmakers: [
    {
      title: 'DraftKings',
      last_update: '2025-07-02T20:25:00Z',
      markets: [
        {
          key: 'h2h',
          outcomes: [
            { name: 'Toronto Blue Jays', price: 1.88 },
            { name: 'New York Yankees', price: 1.95 }
          ]
        },
        {
          key: 'totals',
          outcomes: [
            { name: 'Over', price: 1.90, point: 8.5 },
            { name: 'Under', price: 1.93, point: 8.5 }
          ]
        }
      ]
    },
    {
      title: 'FanDuel',
      last_update: '2025-07-02T20:28:00Z',
      markets: [
        {
          key: 'h2h',
          outcomes: [
            { name: 'Toronto Blue Jays', price: 1.90 },
            { name: 'New York Yankees', price: 1.92 }
          ]
        },
        {
          key: 'totals',
          outcomes: [
            { name: 'Over', price: 1.94, point: 8.5 },
            { name: 'Under', price: 1.89, point: 8.5 }
          ]
        }
      ]
    }
  ]
};

async function testOddsValidation() {
  try {
    console.log('🧪 배당율 검증 시스템 테스트 시작');
    console.log('═'.repeat(50));

    // 1. 베팅 시점 배당율 검증 테스트
    console.log('\n📊 1. 베팅 요청 시점 배당율 검증');
    console.log('-'.repeat(30));
    
    for (const selection of testBetData.selections) {
      console.log(`\n테스트 대상: ${selection.desc}`);
      console.log(`요청 배당율: ${selection.odds}`);
      
      const validation = await oddsValidationService.validateBetOdds(selection);
      
      console.log(`검증 결과: ${validation.isValid ? '✅ 통과' : '❌ 실패'}`);
      console.log(`사유: ${validation.reason}`);
      if (validation.currentOdds) {
        console.log(`현재 시장 배당율: ${validation.currentOdds}`);
      }
      if (validation.deviation) {
        console.log(`편차: ${(validation.deviation * 100).toFixed(2)}%`);
      }
    }

    // 2. 정산 시점 배당율 검증 테스트
    console.log('\n\n🏆 2. 정산 시점 배당율 검증');
    console.log('-'.repeat(30));
    
    const settlementValidation = await oddsValidationService.validateSettlementOdds(testBetData);
    
    console.log(`\n정산 검증 결과: ${settlementValidation.isValid ? '✅ 통과' : '❌ 실패'}`);
    console.log(`권장 조치: ${settlementValidation.action}`);
    console.log(`의심 항목 수: ${settlementValidation.suspiciousCount}`);
    
    console.log('\n세부 검증 결과:');
    settlementValidation.validationResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.selection}`);
      console.log(`     배당율: ${result.odds}`);
      console.log(`     검증: ${result.isValid ? '✅' : '❌'} - ${result.reason}`);
      if (result.suspicious) {
        console.log(`     ⚠️  수동 검토 필요`);
      }
    });

    // 3. 수상한 패턴 탐지 테스트
    console.log('\n\n🕵️ 3. 수상한 배당율 패턴 탐지');
    console.log('-'.repeat(30));
    
    const suspiciousPatterns = await oddsValidationService.detectSuspiciousPatterns(testBetData);
    
    if (suspiciousPatterns.length > 0) {
      console.log('🚨 수상한 패턴 발견:');
      suspiciousPatterns.forEach(pattern => {
        console.log(`  - ${pattern}`);
      });
    } else {
      console.log('✅ 수상한 패턴 없음');
    }

    // 4. 극단적 케이스 테스트
    console.log('\n\n⚡ 4. 극단적 케이스 테스트');
    console.log('-'.repeat(30));
    
    const extremeCases = [
      {
        name: '매우 낮은 배당율',
        selection: { ...testBetData.selections[0], odds: 0.5 }
      },
      {
        name: '매우 높은 배당율',
        selection: { ...testBetData.selections[0], odds: 150.0 }
      },
      {
        name: '시장 대비 큰 편차',
        selection: { ...testBetData.selections[0], odds: 3.50 }
      }
    ];

    for (const testCase of extremeCases) {
      console.log(`\n${testCase.name} 테스트:`);
      const validation = await oddsValidationService.validateBetOdds(testCase.selection);
      console.log(`  결과: ${validation.isValid ? '✅ 통과' : '❌ 실패'}`);
      console.log(`  사유: ${validation.reason}`);
      if (validation.code) {
        console.log(`  코드: ${validation.code}`);
      }
    }

    console.log('\n═'.repeat(50));
    console.log('🎉 배당율 검증 시스템 테스트 완료');

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
  } finally {
    await sequelize.close();
  }
}

// 모의 데이터 설정 (실제 DB 없이 테스트)
async function setupMockData() {
  // OddsCache의 getCurrentMarketOdds 메서드를 모킹
  const originalGetCurrentMarketOdds = oddsValidationService.getCurrentMarketOdds;
  
  oddsValidationService.getCurrentMarketOdds = async function(selection) {
    console.log(`[MOCK] 모의 시장 데이터 조회: ${selection.team || selection.option}`);
    
    // 토론토 블루제이스 배당율 반환
    if (selection.team === 'Toronto Blue Jays') {
      return {
        odds: 1.89,
        bookmaker: 'DraftKings',
        lastUpdate: '2025-07-02T20:25:00Z'
      };
    }
    
    // Over 배당율 반환
    if (selection.option === 'Over' && selection.point === 8.5) {
      return {
        odds: 1.92,
        bookmaker: 'FanDuel',
        lastUpdate: '2025-07-02T20:28:00Z'
      };
    }
    
    return null;
  };

  // 히스토리 서비스 모킹
  const originalGetValidationHistory = oddsHistoryService.getValidationHistory;
  
  oddsHistoryService.getValidationHistory = async function(selection, betTime) {
    console.log(`[MOCK] 모의 히스토리 데이터 조회: ${selection.team || selection.option}`);
    
    // 베팅 시점의 배당율 반환 (약간의 차이 있음)
    if (selection.team === 'Toronto Blue Jays') {
      return {
        odds: 1.87, // 베팅 요청 1.85와 약간 차이
        timestamp: new Date('2025-07-02T20:28:00Z'),
        bookmaker: 'DraftKings',
        timeDifference: 2 * 60 * 1000 // 2분 차이
      };
    }
    
    if (selection.option === 'Over') {
      return {
        odds: 1.91, // 베팅 요청 1.92와 근소한 차이
        timestamp: new Date('2025-07-02T20:29:00Z'),
        bookmaker: 'FanDuel', 
        timeDifference: 1 * 60 * 1000 // 1분 차이
      };
    }
    
    return null;
  };
}

// 실행
setupMockData();
testOddsValidation(); 