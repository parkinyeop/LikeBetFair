# 정산 시스템 개선 계획

## 현재 문제점 요약

### 🔴 Critical (긴급)
1. **멀티배팅 Push 환불 동시성 문제**
   - 위치: `multibetSettlementService.js:29, 1189-1250`
   - 원인: `pendingLayRefund` 클래스 변수 사용
   - 영향: 동시 정산 시 환불액 충돌

2. **제로섬 검증 부재**
   - 위치: 모든 정산 로직
   - 원인: Pot 분배 후 검증 누락
   - 영향: 금액 불일치 감지 불가

3. **Push 환불 2단계 처리**
   - 위치: `multibetSettlementService.js:986-1042, 1189-1250`
   - 원인: 계산과 실행 분리
   - 영향: 트랜잭션 일관성 문제

---

## 즉시 적용 (Hot Fix)

### 1. Push 환불 중복 방지 강화

#### Before (현재 코드)
```javascript
if (this.pendingLayRefund && this.pendingLayRefund > 0) {
  const existingPushRefund = await PaymentHistory.findOne({
    where: { betId: `EXCHANGE_${order.id}_PUSH_REFUND` },
    transaction
  });

  if (existingPushRefund) {
    console.log(`⚠️ Push 환불 스킵: 이미 처리됨`);
    this.pendingLayRefund = 0;
  } else {
    // 환불 처리
  }
}
```

#### After (개선 코드)
```javascript
async processLayRefund(order, refundAmount, transaction) {
  // 1. User Lock 획득 (비관적 락)
  const user = await User.findByPk(order.userId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!user) {
    throw new Error(`사용자를 찾을 수 없습니다: ${order.userId}`);
  }

  // 2. 중복 체크 (트랜잭션 내에서 확실하게)
  const existingPushRefund = await PaymentHistory.findOne({
    where: {
      betId: `EXCHANGE_${order.id}_PUSH_REFUND`,
      userId: user.id
    },
    transaction
  });

  if (existingPushRefund) {
    console.log(`⚠️ Push 환불 스킵: 이미 처리됨 (주문 ${order.id}, 금액 ${existingPushRefund.amount})`);
    return {
      alreadyRefunded: true,
      amount: Number(existingPushRefund.amount)
    };
  }

  // 3. balanceService 사용하여 환불 처리
  await balanceService.updateBalance(
    user.id,
    refundAmount,
    `멀티배팅 Push 환불 (배당률 조정으로 인한 Lay 담보금 환불) - 주문 #${order.id}`,
    {
      transactionType: 'exchange_push_refund',
      relatedOrderId: order.id,
      metadata: {
        reason: 'multibet_push',
        originalAmount: refundAmount
      }
    },
    transaction
  );

  console.log(`✅ Push 환불 완료: 주문 ${order.id}, 금액 ${refundAmount.toLocaleString()}원`);

  return {
    alreadyRefunded: false,
    refundAmount
  };
}
```

#### 적용 방법
1. `multibetSettlementService.js`의 `processPayment` 함수 수정
2. `this.pendingLayRefund` 사용 부분을 함수 파라미터로 변경
3. 중복 체크 로직 강화

---

### 2. 제로섬 검증 추가

#### 새로운 검증 함수
```javascript
/**
 * 제로섬 검증: Pot 총액 = 분배 총액
 */
async validateZeroSum(match, backProfit, layProfit, pushRefund = 0, transaction) {
  const potAmount = Number(match.potAmount || 0);
  const totalDistributed = backProfit + layProfit + pushRefund;

  const diff = Math.abs(potAmount - totalDistributed);

  // 1센트(0.01원) 이상 차이나면 에러
  if (diff > 0.01) {
    const error = new Error(
      `제로섬 위반: Pot ${potAmount.toLocaleString()}원, ` +
      `분배 ${totalDistributed.toLocaleString()}원 (Back ${backProfit.toLocaleString()} + ` +
      `Lay ${layProfit.toLocaleString()} + Push 환불 ${pushRefund.toLocaleString()}), ` +
      `차이 ${diff.toLocaleString()}원`
    );

    console.error(`❌ [제로섬 검증 실패]`, {
      matchId: match.id,
      potAmount,
      backProfit,
      layProfit,
      pushRefund,
      totalDistributed,
      diff
    });

    throw error;
  }

  console.log(
    `✅ [제로섬 검증 통과] Pot: ${potAmount.toLocaleString()}원 = ` +
    `분배: ${totalDistributed.toLocaleString()}원 ` +
    `(Back ${backProfit.toLocaleString()} + Lay ${layProfit.toLocaleString()} + ` +
    `Push ${pushRefund.toLocaleString()})`
  );

  return true;
}
```

#### 적용 위치
1. **단일 베팅 정산**: `exchangeSettlementService.js:settlePair` 함수 끝
2. **멀티배팅 정산**: `multibetSettlementService.js:settleMatchedBackOrders` 함수 끝
3. **Push 환불 후**: `processPushRefund` 함수 끝

---

### 3. Push 환불 트랜잭션 통합

#### Before (2단계 분리)
```javascript
// calculateExchangeProfit에서 계산
if (hasPush) {
  const layRefund = originalLayStake - newLayStake;
  this.pendingLayRefund = layRefund;  // 🔴 클래스 변수에 저장
}

// ... 다른 함수들 ...

// processPayment에서 실행
if (this.pendingLayRefund > 0) {
  // 환불 처리
}
```

#### After (1단계 통합)
```javascript
async settleMultibetOrder(order, transaction) {
  // ... 경기 결과 수집 ...

  // 정산 계산
  const settlementResult = await this.calculateExchangeProfit(
    order,
    finalResult,
    gameResults
  );

  // 즉시 제로섬 검증
  await this.validateZeroSum(
    match,
    settlementResult.backProfit,
    settlementResult.layProfit,
    settlementResult.pushRefund,
    transaction
  );

  // 즉시 환불 처리 (계산과 실행을 한 트랜잭션 내에서)
  if (settlementResult.pushRefund > 0) {
    await this.processLayRefund(
      order,
      settlementResult.pushRefund,
      transaction
    );
  }

  // ... 나머지 정산 처리 ...
}
```

---

## 단기 개선 (1-2주)

### 4. balanceService 완전 통합

#### 현재 문제
여러 곳에서 직접 User 잔액 업데이트:
```javascript
await user.update({ balance: newBalance }, { transaction });
await PaymentHistory.create({ ... }, { transaction });
```

#### 개선 방향
모든 잔액 변경을 balanceService로 통합:
```javascript
await balanceService.updateBalance(
  userId,
  amount,
  memo,
  {
    transactionType: 'exchange_settlement',
    relatedOrderId: order.id,
    metadata: { /* 상세 정보 */ }
  },
  transaction
);
```

#### 적용 대상
- `exchangeSettlementService.js`: 모든 잔액 업데이트
- `multibetSettlementService.js`: 모든 잔액 업데이트
- `exchangeWebSocketService.js`: 주문 취소 시 환불

---

### 5. 정산 순서 독립성 보장

#### 현재 문제
레이 주문이 먼저 정산되어야 백 주문도 정산됨:
```javascript
// multibetSettlementService.js:814-819
if (order.side === 'lay') {
  await this.settleMatchedBackOrders(order, finalResult, transaction);
}
```

#### 개선 방향
백/레이 순서 무관하게 정산:
```javascript
async settleMatchedOrders(order, finalResult, transaction) {
  const matches = await ExchangeOrderMatch.findAll({
    where: {
      [Op.or]: [
        { originalOrderId: order.id },
        { matchingOrderId: order.id }
      ],
      status: 'matched'
    },
    transaction
  });

  for (const match of matches) {
    // 이미 정산된 매칭은 스킵
    if (match.settledAt) {
      console.log(`⏭️  매칭 ${match.id} 이미 정산됨, 스킵`);
      continue;
    }

    // 백과 레이 주문 모두 조회
    const [backOrder, layOrder] = await this.getBackAndLayOrders(match, transaction);

    // 제로섬 정산 실행
    await this.settleMatchPair(backOrder, layOrder, match, finalResult, transaction);
  }
}
```

---

## 중기 개선 (1-2개월)

### 6. 정산 서비스 통합

#### 목표
3개 서비스 → 1개 통합 서비스

#### 구조
```javascript
class UnifiedSettlementService {
  constructor() {
    this.singleBetHandler = new SingleBetSettlementHandler();
    this.multiBetHandler = new MultiBetSettlementHandler();
    this.pushRefundHandler = new PushRefundHandler();  // ✨ 통합
    this.zeroSumValidator = new ZeroSumValidator();    // ✨ 통합
  }

  async settleOrder(order, gameResult, transaction) {
    // 1. 주문 타입 판별
    const handler = order.isMultibet
      ? this.multiBetHandler
      : this.singleBetHandler;

    // 2. 정산 실행
    const result = await handler.settle(order, gameResult, transaction);

    // 3. Push 처리 (통합)
    if (result.isPush) {
      await this.pushRefundHandler.process(order, result, transaction);
    }

    // 4. 제로섬 검증 (통합)
    await this.zeroSumValidator.validate(result, transaction);

    return result;
  }
}
```

---

## 우선순위 및 타임라인

### Phase 1: 긴급 (Hot Fix) - 즉시 적용
- [ ] Push 환불 중복 방지 강화 (`processLayRefund` 함수 추가)
- [ ] 제로섬 검증 추가 (`validateZeroSum` 함수 추가)
- [ ] Push 환불 트랜잭션 통합

**예상 소요 시간**: 1-2일
**예상 효과**: 중복 환불 80% 감소, 금액 불일치 조기 발견

### Phase 2: 단기 개선 - 1-2주
- [ ] balanceService 완전 통합
- [ ] 정산 순서 독립성 보장
- [ ] 중복 환불 체크 로직 통합

**예상 소요 시간**: 1-2주
**예상 효과**: 잔액 불일치 90% 감소, 유지보수성 향상

### Phase 3: 중기 개선 - 1-2개월
- [ ] 정산 서비스 통합
- [ ] 상태 관리 리팩토링
- [ ] 이벤트 로깅 강화

**예상 소요 시간**: 1-2개월
**예상 효과**: 코드 중복 50% 감소, 버그 발생률 70% 감소

---

## 테스트 계획

### 단위 테스트
```javascript
describe('Push 환불 중복 방지', () => {
  it('같은 주문에 대해 Push 환불을 두 번 시도하면 두 번째는 스킵되어야 함', async () => {
    // Given: Push가 발생한 멀티배팅 주문
    const order = await createMultibetOrder({ hasPush: true });

    // When: 첫 번째 환불
    const result1 = await service.processLayRefund(order, 10000, transaction);

    // Then: 환불 성공
    expect(result1.alreadyRefunded).toBe(false);
    expect(result1.refundAmount).toBe(10000);

    // When: 두 번째 환불 시도
    const result2 = await service.processLayRefund(order, 10000, transaction);

    // Then: 이미 환불됨으로 스킵
    expect(result2.alreadyRefunded).toBe(true);
  });
});

describe('제로섬 검증', () => {
  it('Pot 총액과 분배 총액이 다르면 에러를 발생시켜야 함', async () => {
    // Given: Pot 100만원
    const match = { potAmount: 1000000 };

    // When: 분배 총액이 120만원 (잘못된 계산)
    const backProfit = 800000;
    const layProfit = 400000;  // 합계 120만원

    // Then: 에러 발생
    await expect(
      service.validateZeroSum(match, backProfit, layProfit, 0, transaction)
    ).rejects.toThrow('제로섬 위반');
  });
});
```

### 통합 테스트
```javascript
describe('멀티배팅 Push 정산 시나리오', () => {
  it('2경기 중 1경기 Push 시 배당률 조정 및 Lay 환불이 정확해야 함', async () => {
    // Given: 2경기 멀티배팅 (배당 2.0)
    const order = await createMultibetOrder({
      selections: [
        { odds: 2.0, result: 'won' },
        { odds: 2.0, result: 'cancelled' }  // Push
      ],
      backStake: 100000,
      totalOdds: 4.0  // 2.0 × 2.0
    });

    // When: 정산 실행
    const result = await service.settleMultibetOrder(order, transaction);

    // Then: 배당률 2.0으로 조정
    expect(result.adjustedOdds).toBe(2.0);

    // Then: Lay 환불 = 원래 Lay Stake - 조정된 Lay Stake
    const originalLayStake = 100000 * (4.0 - 1);  // 300,000
    const adjustedLayStake = 100000 * (2.0 - 1);  // 100,000
    const expectedRefund = originalLayStake - adjustedLayStake;  // 200,000

    expect(result.pushRefund).toBe(expectedRefund);

    // Then: 제로섬 검증 통과
    const potAmount = 100000 + originalLayStake;  // 400,000
    const distributed = 100000 + adjustedLayStake + expectedRefund;  // 400,000
    expect(potAmount).toBe(distributed);
  });
});
```

---

## 롤백 계획

각 개선 사항은 독립적으로 적용 가능하며, 문제 발생 시 개별 롤백 가능:

1. **Phase 1 롤백**: 커밋 단위로 롤백 가능
2. **Phase 2 롤백**: 기존 코드와 새 코드 병행 실행 (Feature Flag 사용)
3. **Phase 3 롤백**: 신규 서비스와 기존 서비스 동시 배포 후 점진적 전환

---

## 모니터링

### 추적할 지표
1. **중복 환불 발생 횟수**: 0 목표
2. **제로섬 위반 횟수**: 0 목표
3. **정산 실패율**: 0.1% 이하 목표
4. **평균 정산 시간**: 500ms 이하 목표

### 알림 설정
- 제로섬 위반 발생 시 즉시 Slack 알림
- 중복 환불 감지 시 즉시 이메일 알림
- 정산 실패율 1% 초과 시 경고

---

## 문서화

### 업데이트할 문서
1. `docs/SETTLEMENT_FLOW.md`: 정산 흐름도 업데이트
2. `docs/PUSH_REFUND.md`: Push 환불 로직 상세 문서
3. `docs/ZERO_SUM.md`: 제로섬 보장 메커니즘 문서
4. `README.md`: 개선 사항 반영
