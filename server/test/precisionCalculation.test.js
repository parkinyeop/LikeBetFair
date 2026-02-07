/**
 * 정밀 계산 유틸리티 단위 테스트
 * Exchange 정산 로직의 정확성을 검증합니다.
 */

import PrecisionCalculation from '../utils/precisionCalculation.js';

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

  run() {
    console.log('🧪 정밀 계산 유틸리티 테스트 시작...\n');

    for (const { name, fn } of this.tests) {
      try {
        fn();
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
}

const test = new TestRunner();

// 1. 기본 산술 연산 테스트
test.test('정수 변환 테스트', () => {
  test.assertEqual(PrecisionCalculation.toInteger(123.45), 12345);
  test.assertEqual(PrecisionCalculation.toInteger(100.00), 10000);
  test.assertEqual(PrecisionCalculation.toDecimal(12345), 123.45);
});

test.test('덧셈 정확성', () => {
  test.assertEqual(PrecisionCalculation.add(100.11, 200.22), 300.33);
  test.assertEqual(PrecisionCalculation.add(999.99, 0.01), 1000.00);
});

test.test('뺄셈 정확성', () => {
  test.assertEqual(PrecisionCalculation.subtract(1000.00, 123.45), 876.55);
  test.assertEqual(PrecisionCalculation.subtract(500.67, 100.33), 400.34);
});

test.test('곱셈 정확성', () => {
  test.assertEqual(PrecisionCalculation.multiply(100.50, 2.0), 201.00);
  test.assertEqual(PrecisionCalculation.multiply(123.45, 1.5), 185.18);
});

test.test('나눗셈 정확성', () => {
  test.assertEqual(PrecisionCalculation.divide(200.00, 2.0), 100.00);
  test.assertEqual(PrecisionCalculation.divide(100.00, 4.0), 25.00);
  test.assertEqual(PrecisionCalculation.divide(100.00, 0), 0); // 0으로 나누기 방지
});

// 2. Exchange 특화 계산 테스트
test.test('Back 매치금액 계산', () => {
  // Back 1000원, 배당률 2.5 → 매치금액 1500원
  test.assertEqual(PrecisionCalculation.calculateBackMatchAmount(1000, 2.5), 1500.00);

  // Back 500.33원, 배당률 1.8 → 매치금액 400.264원
  test.assertEqual(PrecisionCalculation.calculateBackMatchAmount(500.33, 1.8), 400.26);
});

test.test('Lay 지분비율 계산', () => {
  // Lay 500원, Back 매치금액 1000원 → 지분비율 50%
  test.assertEqual(PrecisionCalculation.calculateLayShareRatio(500, 1000), 0.5);

  // Lay 300원, Back 매치금액 1500원 → 지분비율 20%
  test.assertEqual(PrecisionCalculation.calculateLayShareRatio(300, 1500), 0.2);

  // Back 매치금액이 0인 경우 → 지분비율 0%
  test.assertEqual(PrecisionCalculation.calculateLayShareRatio(500, 0), 0);
});

test.test('Lay 승리 시 수익 계산', () => {
  // Lay 500원, Back 1000원, 지분비율 50% → Lay 수익 1000원 (500 + 500)
  test.assertEqual(PrecisionCalculation.calculateLayWinAmount(500, 1000, 0.5), 1000.00);

  // Lay 300원, Back 1500원, 지분비율 20% → Lay 수익 600원 (300 + 300)
  test.assertEqual(PrecisionCalculation.calculateLayWinAmount(300, 1500, 0.2), 600.00);
});

// 3. 실제 시나리오 테스트
test.test('복합 시나리오: 1:1 완전 매칭', () => {
  const backStake = 1000.33;
  const layStake = 500.67;
  const price = 2.15;

  const backMatchAmount = PrecisionCalculation.calculateBackMatchAmount(backStake, price);
  test.assertEqual(backMatchAmount, 1150.38); // 1000.33 * (2.15 - 1)

  const layShareRatio = PrecisionCalculation.calculateLayShareRatio(layStake, backMatchAmount);
  test.assertEqual(layShareRatio, 0.435); // 500.67 / 1150.38 ≈ 0.435

  const layWinAmount = PrecisionCalculation.calculateLayWinAmount(layStake, backStake, layShareRatio);
  test.assertEqual(layWinAmount, 935.81); // 500.67 + (1000.33 * 0.435)
});

test.test('부분 매칭 시나리오', () => {
  const backStake = 2000.50;
  const layStake = 750.25;
  const price = 1.75;

  const backMatchAmount = PrecisionCalculation.calculateBackMatchAmount(backStake, price);
  const layShareRatio = PrecisionCalculation.calculateLayShareRatio(layStake, backMatchAmount);
  const layWinAmount = PrecisionCalculation.calculateLayWinAmount(layStake, backStake, layShareRatio);

  // 결과가 음수가 아닌지 확인
  if (layWinAmount < 0) {
    throw new Error(`Lay 수익이 음수입니다: ${layWinAmount}`);
  }

  // Lay 수익이 합리적인 범위인지 확인
  if (layWinAmount > layStake + backStake) {
    throw new Error(`Lay 수익이 전체 베팅금액을 초과합니다: ${layWinAmount}`);
  }
});

test.test('극한 케이스: 매우 작은 금액', () => {
  test.assertEqual(PrecisionCalculation.add(0.01, 0.01), 0.02);
  test.assertEqual(PrecisionCalculation.subtract(0.03, 0.01), 0.02);
  test.assertEqual(PrecisionCalculation.multiply(0.01, 100), 1.00);
});

test.test('극한 케이스: 매우 큰 금액', () => {
  test.assertEqual(PrecisionCalculation.add(99999.99, 0.01), 100000.00);
  test.assertEqual(PrecisionCalculation.subtract(100000.00, 99999.99), 0.01);
});

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  test.run();
}

export default test;