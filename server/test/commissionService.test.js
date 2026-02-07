/**
 * CommissionService 단위 테스트
 * 통합 수수료 계산 로직의 정확성을 검증합니다.
 */

import CommissionService from '../services/commissionService.js';
import CommissionSettingsService from '../services/commissionSettingsService.js';

// 간단한 테스트 러너
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 CommissionService 단위 테스트 시작...\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 테스트 결과: ${this.passed}개 통과, ${this.failed}개 실패`);
  }

  assertEqual(actual, expected, message = '') {
    if (Math.abs(actual - expected) > 0.01) { // 0.01원 이하 차이는 허용
      throw new Error(`Expected ${expected}, but got ${actual}. ${message}`);
    }
  }

  assertArrayEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}. ${message}`);
    }
  }

  assertTrue(condition, message = '') {
    if (!condition) {
      throw new Error(`Expected true, but got false. ${message}`);
    }
  }
}

const test = new TestRunner();

// Mock CommissionSettingsService
const originalGetCommissionRate = CommissionSettingsService.getCommissionRate;
CommissionSettingsService.getCommissionRate = async (platform) => {
  return platform === 'sportsbook' ? 0.05 : 0.03; // 5%, 3%
};

// 1. 기본 수수료 계산 테스트
test.test('기본 수수료 계산 - 스포츠북', async () => {
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook',
    user: null,
    policies: {}
  });

  test.assertEqual(result.commissionAmount, 50); // (2000-1000) * 0.05 = 50
  test.assertEqual(result.appliedRate, 0.05);
  test.assertEqual(result.savings, 0);
});

test.test('기본 수수료 계산 - Exchange', async () => {
  const result = await CommissionService.calculate({
    winnings: 3000,
    stake: 1000,
    platform: 'exchange',
    user: null,
    policies: {}
  });

  test.assertEqual(result.commissionAmount, 60); // (3000-1000) * 0.03 = 60
  test.assertEqual(result.appliedRate, 0.03);
});

test.test('수익 없음 - 수수료 없음', async () => {
  const result = await CommissionService.calculate({
    winnings: 1000,
    stake: 1000,
    platform: 'sportsbook',
    user: null,
    policies: {}
  });

  test.assertEqual(result.commissionAmount, 0);
  test.assertEqual(result.appliedRate, 0);
  test.assertTrue(result.breakdown[0].description.includes('수익 없음'));
});

// 2. VIP 등급 할인 테스트
test.test('VIP 등급 할인 - Bronze (5%)', async () => {
  const user = { vipTier: 'bronze' };
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook',
    user: user,
    policies: {}
  });

  // 기본 5% → Bronze 5% 할인 → 4.75%
  test.assertEqual(result.commissionAmount, 47.5); // 1000 * 0.0475 = 47.5
  test.assertEqual(result.appliedRate, 0.0475);
  test.assertEqual(result.savings, 0.0025); // 0.05 - 0.0475
});

test.test('VIP 등급 할인 - Gold (20%)', async () => {
  const user = { vipTier: 'gold' };
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook',
    user: user,
    policies: {}
  });

  // 기본 5% → Gold 20% 할인 → 4%
  test.assertEqual(result.commissionAmount, 40); // 1000 * 0.04 = 40
  test.assertEqual(result.appliedRate, 0.04);
  test.assertEqual(result.savings, 0.01);
});

test.test('VIP 등급 할인 - Diamond (40%)', async () => {
  const user = { vipTier: 'diamond' };
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'exchange',
    user: user,
    policies: {}
  });

  // 기본 3% → Diamond 40% 할인 → 1.8%
  test.assertEqual(result.commissionAmount, 18); // 1000 * 0.018 = 18
  test.assertEqual(result.appliedRate, 0.018);
  test.assertEqual(result.savings, 0.012);
});

// 3. 프로모션 할인 테스트
test.test('프로모션 할인 - WELCOME10', async () => {
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook',
    user: null,
    policies: { promotionCode: 'WELCOME10' }
  });

  // 기본 5% → 10% 프로모션 할인 → 4.5%
  test.assertEqual(result.commissionAmount, 45); // 1000 * 0.045 = 45
  test.assertEqual(result.appliedRate, 0.045);
});

test.test('프로모션 할인 - VIP30', async () => {
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'exchange',
    user: null,
    policies: { promotionCode: 'VIP30' }
  });

  // 기본 3% → 30% 프로모션 할인 → 2.1%
  test.assertEqual(result.commissionAmount, 21); // 1000 * 0.021 = 21
  test.assertEqual(result.appliedRate, 0.021);
});

// 4. 복합 할인 테스트
test.test('복합 할인 - VIP + 프로모션', async () => {
  const user = { vipTier: 'silver' }; // 10% 할인
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook',
    user: user,
    policies: { promotionCode: 'WELCOME10' } // 10% 할인
  });

  // 기본 5% → Silver 10% 할인 → 4.5% → 프로모션 10% 할인 → 4.05%
  test.assertEqual(result.commissionAmount, 40.5); // 1000 * 0.0405 = 40.5
  test.assertEqual(result.appliedRate, 0.0405);
  test.assertTrue(result.breakdown.length >= 3); // 기본 + VIP + 프로모션
});

test.test('특별 이벤트 할인', async () => {
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'exchange',
    user: null,
    policies: {
      specialEvent: {
        name: '여름 이벤트',
        discountRate: 0.15 // 15% 할인
      }
    }
  });

  // 기본 3% → 특별 이벤트 15% 할인 → 2.55%
  test.assertEqual(result.commissionAmount, 25.5); // 1000 * 0.0255 = 25.5
  test.assertEqual(result.appliedRate, 0.0255);
});

// 5. 최소 수수료율 보장 테스트
test.test('최소 수수료율 보장', async () => {
  const user = { vipTier: 'diamond' }; // 40% 할인 → 매우 큰 할인
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'exchange',
    user: user,
    policies: {
      promotionCode: 'VIP30', // 30% 추가 할인
      specialEvent: {
        name: '극한 할인 이벤트',
        discountRate: 0.80 // 80% 할인
      }
    }
  });

  // 극한 할인 적용 시에도 최소 수수료율 0.5% 보장
  test.assertEqual(result.appliedRate, 0.005); // 최소 0.5%
  test.assertEqual(result.commissionAmount, 5); // 1000 * 0.005 = 5
});

// 6. 최대 할인 제한 테스트
test.test('최대 할인 한도 적용', async () => {
  const user = { vipTier: 'diamond' }; // 40% 할인
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook', // 기본 5%
    user: user,
    policies: {
      promotionCode: 'VIP30', // 30% 할인
      specialEvent: {
        name: '극한 할인',
        discountRate: 0.60 // 60% 할인
      }
    }
  });

  // 최대 할인 한도: 원래 수수료의 50%까지만 할인 (5% → 2.5% 최소)
  test.assertEqual(result.appliedRate, 0.025); // 최소 2.5% (5%의 50%)
  test.assertEqual(result.commissionAmount, 25); // 1000 * 0.025 = 25
});

// 7. 간단한 계산 메서드 테스트
test.test('간단한 수수료 계산 메서드', async () => {
  const amount = await CommissionService.calculateSimple(2000, 1000, 'sportsbook');
  test.assertEqual(amount, 50); // (2000-1000) * 0.05 = 50
});

test.test('간단한 수수료 계산 - VIP 사용자', async () => {
  const user = { vipTier: 'gold' };
  const amount = await CommissionService.calculateSimple(2000, 1000, 'sportsbook', user);
  test.assertEqual(amount, 40); // (2000-1000) * 0.04 = 40 (20% 할인 적용)
});

// 8. 정책 업데이트 테스트
test.test('VIP 정책 업데이트', async () => {
  // 기존 Gold 할인율 확인
  const originalDiscount = CommissionService.getVipDiscount('gold');
  test.assertEqual(originalDiscount, 0.20);

  // VIP 정책 업데이트
  CommissionService.updatePolicy('vipDiscounts', { 'gold': 0.25 });

  // 업데이트된 할인율 확인
  const updatedDiscount = CommissionService.getVipDiscount('gold');
  test.assertEqual(updatedDiscount, 0.25);

  // 원래 상태로 복구
  CommissionService.updatePolicy('vipDiscounts', { 'gold': 0.20 });
});

// 9. 에러 케이스 테스트
test.test('손실 베팅 - 수수료 없음', async () => {
  const result = await CommissionService.calculate({
    winnings: 500, // 손실
    stake: 1000,
    platform: 'sportsbook',
    user: null,
    policies: {}
  });

  test.assertEqual(result.commissionAmount, 0);
  test.assertEqual(result.appliedRate, 0);
});

test.test('존재하지 않는 VIP 등급', async () => {
  const user = { vipTier: 'unknown' };
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook',
    user: user,
    policies: {}
  });

  // 알 수 없는 VIP 등급은 할인 없음
  test.assertEqual(result.commissionAmount, 50); // 기본 5% 적용
  test.assertEqual(result.appliedRate, 0.05);
});

test.test('존재하지 않는 프로모션 코드', async () => {
  const result = await CommissionService.calculate({
    winnings: 2000,
    stake: 1000,
    platform: 'sportsbook',
    user: null,
    policies: { promotionCode: 'INVALID' }
  });

  // 알 수 없는 프로모션 코드는 할인 없음
  test.assertEqual(result.commissionAmount, 50); // 기본 5% 적용
  test.assertEqual(result.appliedRate, 0.05);
});

// 10. 실제 시나리오 테스트
test.test('실제 시나리오 - 스포츠북 대형 베팅', async () => {
  const user = { vipTier: 'platinum' }; // 30% 할인
  const result = await CommissionService.calculate({
    winnings: 10000000, // 1천만원 당첨
    stake: 5000000,     // 5백만원 베팅
    platform: 'sportsbook',
    user: user,
    policies: { promotionCode: 'SUMMER20' } // 20% 할인
  });

  // 수익: 5백만원, 기본 5% → 30% VIP 할인 → 3.5% → 20% 프로모션 할인 → 2.8%
  const expectedCommission = 5000000 * 0.028; // 140,000원
  test.assertEqual(result.commissionAmount, expectedCommission);
  test.assertEqual(result.appliedRate, 0.028);
});

test.test('실제 시나리오 - Exchange 소액 베팅', async () => {
  const user = { vipTier: 'bronze' }; // 5% 할인
  const result = await CommissionService.calculate({
    winnings: 11000, // 1만 1천원 당첨
    stake: 10000,    // 1만원 베팅
    platform: 'exchange',
    user: user,
    policies: {}
  });

  // 수익: 1천원, 기본 3% → 5% VIP 할인 → 2.85%
  const expectedCommission = 1000 * 0.0285; // 28.5원
  test.assertEqual(result.commissionAmount, expectedCommission);
  test.assertEqual(result.appliedRate, 0.0285);
});

// 원래 메서드 복구
CommissionSettingsService.getCommissionRate = originalGetCommissionRate;

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  test.run();
}

export default test;