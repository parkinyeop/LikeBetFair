# 전체 정산 시스템 로직 분석 문서 (Gemini 분석용)

## 🚨 발견된 치명적 버그

**문제**: 스포츠북 베팅 `c27e2ed2-b2f4-4cbd-af93-2932467dea4b`가 **경기 결과가 없는데도 정산 완료됨**

### 로그 증거

```log
[적중 지급] 베팅 c27e2ed2-b2f4-4cbd-af93-2932467dea4b: 총 46720원 → 수수료 1836원 차감 → 실제 지급 44884원

// 하지만 같은 베팅의 멀티베팅 선택들은 경기 결과를 찾지 못함:
🔍 [DEBUG] 매칭 시작: 베팅 524a07c7-b1be-413f-962e-6f29b0e52af7, 선택 Jeju United FC vs Jeonbuk Hyundai Motors
❌ 매칭 실패 상세 분석:
   - gameResult 존재: false
   - gameResult.score: undefined
   
[멀티베팅 처리] 선택 1: Jeju United FC vs Jeonbuk Hyundai Motors → pending
[멀티베팅 처리] 선택 2: Gwangju FC vs Daegu FC → pending
[멀티베팅 처리] 선택 3: Sangju Sangmu FC vs Ulsan Hyundai FC → pending
[멀티베팅 처리] 최종 상태: pending (이전: pending)
```

**의문점**: 
1. 경기 결과가 없는데 어떻게 46720원이 지급되었는가?
2. 모든 선택이 pending인데 어떻게 won으로 판정되었는가?
3. 정산 로직에 조건 검증을 우회하는 버그가 있는가?

---

## 시스템 구조

### 데이터베이스 테이블
- **Bets**: 스포츠북 베팅 (ID: UUID 형식)
- **ExchangeOrders**: 익스체인지 주문 (ID: Integer 형식)
- **GameResults**: 경기 결과 데이터
- **PaymentHistory**: 결제/환불 내역
- **AdminCommission**: 수수료 기록

### 정산 프로세스
```
settlementScheduler.js (매 15분마다)
├─ 1. betResultService.updateBetResults() - 스포츠북 정산
├─ 2. exchangeSettlementService.settleAllConnectedOrders() - 익스체인지 일반 주문
└─ 3. multibetSettlementService.settleAllMultibetOrders() - 익스체인지 멀티베팅
```

---

## 1. 스포츠북 정산 로직 (betResultService.js)

### 핵심 정산 함수: `processBetResult(bet)`

```javascript
// 파일: server/services/betResultService.js
async processBetResult(bet) {
  // ✅ 이미 완료된 베팅은 건너뛰기
  if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'cancelled') {
    return true;
  }
  
  const selections = bet.selections;
  let hasPending = false;
  let hasLost = false;
  let hasWon = false;
  let hasCancelled = false;

  // 각 선택에 대해 스코어 유무로 결과 처리
  for (const selection of selections) {
    const teams = selection.desc.split(' vs ');
    const homeTeam = teams[0].trim();
    const awayTeam = teams[1].trim();
    const commenceTime = new Date(selection.commence_time);

    // 경기 결과 조회 (±48시간 범위)
    const candidateGames = await GameResult.findAll({
      where: {
        commenceTime: {
          [Op.gte]: new Date(commenceTime.getTime() - 48 * 60 * 60 * 1000),
          [Op.lte]: new Date(commenceTime.getTime() + 48 * 60 * 60 * 1000)
        },
        status: { [Op.in]: ['finished', 'cancelled', 'postponed', 'scheduled'] }
      }
    });

    // 정규화된 팀명으로 매칭
    let gameResult = null;
    for (const candidate of candidateGames) {
      const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
      const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
      
      if ((dbHomeNorm === normalizedHomeTeam && dbAwayNorm === normalizedAwayTeam) ||
          (dbHomeNorm === normalizedAwayTeam && dbAwayNorm === normalizedHomeTeam)) {
        gameResult = candidate;
        break;
      }
    }

    // 🛡️ GUARD CLAUSE: GameResult 검증 (Soft Validation)
    if (gameResult) {
      validationResult = await settlementValidation.softValidateGameResult(
        gameResult, bet, { validateTeamNames: false }
      );
    }

    // ⚠️ 검증 실패 시 기존 로직 유지 (Soft Fail)
    if (!gameResult || (validationResult && validationResult.isSoftFail)) {
      console.warn(`[SETTLEMENT] Bet ${bet.id} selection validation issues, falling back to legacy logic`);
      
      // 🚨 여기가 문제! 스코어가 없으면 pending/cancelled로 처리해야 하는데...
      if (!gameResult || !gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) {
        const gameTime = new Date(selection.commence_time + 'Z');
        const now = new Date();
        const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);

        if (hoursSinceGame > 2) {
          selection.result = 'cancelled';  // ⚠️ 2시간 이상 지나면 cancelled
          hasCancelled = true;
        } else {
          selection.result = 'pending';    // ⚠️ 2시간 이내면 pending
          hasPending = true;
        }
        continue;
      }
    }

    // ✅ 취소/연기 처리
    if (isGameCancelledOrPostponed(gameResult)) {
      selection.result = 'cancelled';
      hasCancelled = true;
      continue;
    }

    // ✅ 스코어가 있으면 결과 처리
    const selectionResult = this.determineSelectionResult(selection, gameResult, validatedScore);
    selection.result = selectionResult;
    
    if (selection.result === 'pending') hasPending = true;
    else if (selection.result === 'lost' || selection.result === 'draw') hasLost = true;
    else if (selection.result === 'won') hasWon = true;
    else if (selection.result === 'cancelled') hasCancelled = true;
  }

  // 전체 베팅 상태 집계
  let betStatus = this.determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections);
  
  // 🚨 여기서 won으로 판정되면 상금 지급!
  if (betStatus === 'won') {
    await this.processBetWinnings(bet, transaction);
  }
}
```

### 베팅 상태 결정 로직: `determineBetStatus()`

```javascript
determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections) {
  // 모든 selection이 취소된 경우
  if (hasCancelled && !hasWon && !hasLost && !hasPending) {
    return 'cancelled';
  }

  // pending이 있으면 대기
  if (hasPending) {
    return 'pending';
  }

  // ⚠️ 멀티베팅: 하나라도 실패하면 전체 실패
  const hasAnyFailure = selections.some(s => s.result === 'lost' || s.result === 'draw');
  
  if (hasAnyFailure) {
    return 'lost';
  }

  // ⚠️ 멀티베팅: 모든 선택이 성공해야 전체 성공
  const allNonCancelledSelections = selections.filter(s => s.result !== 'cancelled');
  const allWonSelections = allNonCancelledSelections.filter(s => s.result === 'won');
  
  // 🚨 여기서 문제 발생 가능!
  // 취소되지 않은 모든 선택이 성공인 경우만 전체 성공
  if (allNonCancelledSelections.length > 0 && allWonSelections.length === allNonCancelledSelections.length) {
    return 'won';
  }

  // 모든 selection이 취소된 경우
  if (selections.every(s => s.result === 'cancelled')) {
    return 'cancelled';
  }

  return 'pending';
}
```

### 승리 시 상금 지급: `processBetWinnings()`

```javascript
async processBetWinnings(bet, transaction) {
  // 중복 지급 방지
  const existingPayment = await PaymentHistory.findOne({
    where: {
      betId: bet.id,
      memo: { [Op.like]: '%베팅 적중 지급%' }
    }
  });
  
  if (existingPayment) {
    console.log(`[적중 지급] 이미 지급된 베팅 ${bet.id} 건너뛰기`);
    return;
  }
  
  const user = await User.findByPk(bet.userId, { transaction });
  
  if (user) {
    // 취소된 selection이 있는 경우 배당률 재계산
    const adjustedWinnings = this.calculateAdjustedWinnings(bet);
    
    // 수수료 계산
    const commissionCalculation = await CommissionService.calculate({
      winnings: adjustedWinnings,
      stake: bet.stake,
      platform: 'sportsbook',
      user: user,
      bet: bet
    });

    const commissionAmount = commissionCalculation.commissionAmount;
    const netWinnings = adjustedWinnings - commissionAmount;
    
    // 💰 잔액 증가 및 지급
    user.balance = Number(user.balance) + Number(netWinnings);
    await user.save({ transaction });
    
    // 결제 내역 기록
    await PaymentHistory.create({
      userId: user.id,
      betId: bet.id,
      amount: netWinnings,
      memo: '베팅 적중 지급 (수수료 차감 후)',
      paidAt: new Date(),
      balanceAfter: user.balance
    }, { transaction });
    
    console.log(`[적중 지급] 베팅 ${bet.id}: 총 ${adjustedWinnings}원 → 수수료 ${commissionAmount}원 차감 → 실제 지급 ${netWinnings}원`);
  }
}
```

---

## 2. 익스체인지 정산 로직 (exchangeSettlementService.js)

### 주요 메서드 체인

```
settleAllConnectedOrders()
  ├─ refundUnmatchedOpenOrders() - 미매칭 주문 환불
  ├─ groupMatchedOrders() - 주문 쌍 그룹화
  ├─ settlePair() - 매칭된 주문 쌍 정산
  │   ├─ determineWinner() - 승부 판정
  │   ├─ updateUserBalance() - 잔액 업데이트 (수수료 차감)
  │   └─ cancelRemainingAmount() - 부분 매칭 환불
  └─ settleOrphanedOrder() - 고아 주문 정산
```

### 핵심 정산 함수: `settlePair()`

```javascript
async settlePair(pair, gameResult, transaction) {
  const [order1, order2] = pair;
  const backOrder = order1.side === 'back' ? order1 : order2;
  const layOrder = order1.side === 'lay' ? order1 : order2;
  
  // 승부 판정
  const isBackWin = this.determineWinner(backOrder, gameResult);
  
  // 수익 계산 (정밀 계산)
  const backMatchAmount = PrecisionCalculation.calculateBackMatchAmount(backStakeAmount, backOrder.price);
  const layShareRatio = PrecisionCalculation.calculateLayShareRatio(layStakeAmount, backMatchAmount);
  
  let backWinAmount, layWinAmount;
  
  if (isBackWin) {
    backWinAmount = layStakeAmount;
    layWinAmount = -layStakeAmount;
  } else {
    backWinAmount = -layStakeAmount;
    layWinAmount = PrecisionCalculation.calculateLayWinAmount(layStakeAmount, backStakeAmount, layShareRatio);
  }
  
  // 사용자 잔고 업데이트 (수수료 차감 포함)
  await this.updateUserBalance(backOrder, backWinAmount, gameResult, isBackWin, transaction);
  await this.updateUserBalance(layOrder, layWinAmount, gameResult, isBackWin, transaction);
  
  // 주문 상태 업데이트
  await backOrder.update({ status: 'settled', actualProfit: backWinAmount, settledAt: new Date() });
  await layOrder.update({ status: 'settled', actualProfit: layWinAmount, settledAt: new Date() });
}
```

---

## 3. 멀티베팅 정산 로직 (multibetSettlementService.js)

### 주요 메서드 체인

```
settleAllMultibetOrders()
  ├─ ExchangeOrder.findAll() - 정산 대상 조회 (limit: 50)
  ├─ settleMultibetOrder() - 개별 멀티베팅 정산 (15초 타임아웃)
  │   ├─ checkOrderMatches() - 매치 여부 확인
  │   ├─ collectAllGameResults() - 모든 경기 결과 수집
  │   │   └─ findGameResult() - 개별 경기 결과 조회 (±6시간 범위)
  │   ├─ determineMultibetResult() - 멀티베팅 판정
  │   ├─ processMultibetSettlement() - 정산 처리
  │   └─ processPayment() - 결제 처리
  └─ processUnmatchedOrderCancellation() - 미매칭 주문 취소
```

### 경기 결과 조회: `findGameResult()`

```javascript
async findGameResult(selection) {
  const { homeTeam, awayTeam, commenceTime } = selection;

  // 🚀 중앙화된 경기 결과 조회 사용
  const config = getLocationConfig('multibetSettlement');
  
  let gameResult;
  
  if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
    gameResult = await GameResultQuery.findByTeamsAndTime(
      homeTeam, awayTeam, commenceTime, 'multibetSettlement'
    );
  } else {
    // 레거시 로직: 정확한 시간으로 먼저 검색
    gameResult = await GameResult.findOne({
      where: {
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: commenceTime,
        status: 'finished'
      }
    });

    // 정확한 시간으로 찾지 못하면 시간 범위로 검색 (±6시간)
    if (!gameResult) {
      const targetTime = new Date(commenceTime);
      const startTime = new Date(targetTime.getTime() - (6 * 60 * 60 * 1000));
      const endTime = new Date(targetTime.getTime() + (6 * 60 * 60 * 1000));
      
      gameResult = await GameResult.findOne({
        where: {
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          commenceTime: { [Op.between]: [startTime, endTime] },
          status: 'finished'
        }
      });
    }
  }

  // 🛡️ 검증
  if (gameResult) {
    const validationResult = await settlementValidation.softValidateGameResult(
      gameResult, 
      { id: `multibet-${selection.homeTeam}-${selection.awayTeam}`, selections: [selection] },
      { validateTeamNames: false }
    );

    if (validationResult.isSoftFail) {
      console.warn(`[MULTIBET_SETTLEMENT] GameResult validation issues, continuing with legacy logic`);
    }

    return { ...gameResult.toJSON(), validatedScore: validationResult.score };
  } else {
    return null;
  }
}
```

### 멀티베팅 판정: `determineMultibetResult()`

```javascript
determineMultibetResult(gameResults) {
  const results = gameResults.map(gr => gr.gameResult?.result || gr.result);

  // pending을 취소로 처리
  const normalizedResults = results.map(result => {
    if (result === 'pending') {
      return 'cancelled';
    }
    return result;
  });

  const hasPending = normalizedResults.includes('pending');
  const hasCancelled = normalizedResults.includes('cancelled');
  const hasLost = normalizedResults.includes('lost');
  const allWon = normalizedResults.every(r => r === 'won');

  let finalResult, reason;

  if (hasPending) {
    finalResult = 'pending';
    reason = '일부 경기가 아직 완료되지 않음';
  } else if (hasCancelled) {
    finalResult = 'cancelled';
    reason = '일부 경기가 취소됨';
  } else if (hasLost) {
    finalResult = 'lost';
    reason = '일부 경기에서 패배';
  } else if (allWon) {
    finalResult = 'won';
    reason = '모든 경기에서 승리';
  } else {
    finalResult = 'pending';
    reason = '결과 판정 불가';
  }

  return { finalResult, reason, gameResults, summary: {...} };
}
```

---

## 4. 정산 검증 로직 (settlementValidation.js)

### Soft Validation 모드

```javascript
async softValidateGameResult(gameResult, bet, options = {}) {
  const result = await this.validateGameResult(gameResult, bet, options);

  if (!result.isValid) {
    console.warn(`[SOFT_VALIDATION] Bet ${bet.id} has validation issues but processing continues:`, result.issues);
  }

  // ⚠️ 검증 실패해도 isValid: true 반환! (Soft 모드)
  return {
    ...result,
    isValid: true,        // 항상 true!
    isSoftFail: !result.isValid
  };
}
```

### 스코어 검증: `validateAndParseScore()`

```javascript
validateAndParseScore(gameResult, validationResult) {
  const result = { isValid: true, score: null };

  if (!gameResult.score) {
    validationResult.issues.push('Score data is missing');
    result.isValid = false;  // ⚠️ 스코어 없으면 실패
    return result;
  }

  // 스코어 파싱 로직...
  if (Array.isArray(score) && score.length >= 2) {
    const homeScore = this.parseScoreValue(score[0].score);
    const awayScore = this.parseScoreValue(score[1].score);
    
    if (homeScore === null || awayScore === null) {
      validationResult.issues.push('Invalid score values');
      result.isValid = false;
      return result;
    }

    result.score = { home: homeScore, away: awayScore };
    return result;
  }
}
```

---

## 5. 정산 스케줄러 (settlementScheduler.js)

```javascript
// 매 15분마다 베팅 정산
schedule.scheduleJob('*/15 * * * *', async () => {
  console.log('⚙️ [Scheduler] 베팅 정산 작업을 시작합니다...');
  try {
    // 1. 스포츠북 정산
    const betResult = await betResultService.updateBetResults();
    console.log(`✅ [Scheduler] 스포츠북 정산: ${betResult.updatedCount}개 완료`);

    // 2. 익스체인지 일반 주문 정산
    const exchangeService = new exchangeSettlementService();
    const exchangeResult = await exchangeService.settleAllConnectedOrders();
    console.log(`✅ [Scheduler] 익스체인지 일반 주문 정산: ${exchangeResult?.totalSettled || 0}개 완료`);

    // 3. 익스체인지 멀티베팅 정산
    const multibetResult = await multibetSettlementService.settleAllMultibetOrders();
    console.log(`✅ [Scheduler] 익스체인지 멀티베팅 정산: ${multibetResult?.settledCount || 0}개 완료`);
  } catch (error) {
    console.error('❌ [Scheduler] 베팅 정산 중 오류 발생:', error);
  }
});
```

---

## 🔍 Gemini에게 분석 요청할 핵심 질문들

### 1. 스포츠북 정산 버그 분석
**문제**: 베팅 `c27e2ed2-b2f4-4cbd-af93-2932467dea4b`가 경기 결과 없이 정산됨

**질문**:
1. `processBetResult()` 함수에서 `gameResult`가 null인데도 `selection.result`가 'won'으로 설정될 수 있는 경로가 있는가?
2. `determineBetStatus()` 함수가 모든 selection이 'pending'인데도 'won'을 반환할 수 있는 로직 버그가 있는가?
3. Soft Validation이 `isValid: true`를 항상 반환하는 것이 정산 로직에 영향을 미치는가?
4. `hoursSinceGame > 2` 조건이 잘못 계산되어 'cancelled' 대신 다른 결과로 처리될 가능성은?

### 2. 경기 결과 매칭 로직 분석
**문제**: 팀명 매칭 실패가 빈번함

**질문**:
1. `normalizeTeamNameForComparison()` 함수가 "Jeju United FC"와 "Jeju SK"를 다르게 처리하는가?
2. ±48시간(스포츠북) vs ±6시간(멀티베팅) 시간 범위 불일치가 문제를 유발하는가?
3. 'scheduled' 상태 경기를 후보에 포함시키는 것이 잘못된 정산을 유발할 수 있는가?

### 3. 데이터 무결성 문제
**문제**: 경기 결과 데이터 품질

**질문**:
1. GameResult 테이블에 `status: 'scheduled'`이면서 `score: null`인 데이터가 정산에 사용될 수 있는가?
2. `result: 'pending'`과 `status: 'finished'`가 동시에 존재하는 데이터가 정산 로직을 혼란시킬 수 있는가?
3. 스코어 데이터 형식 불일치 (배열 vs 객체 vs 문자열)가 파싱 오류를 일으키는가?

### 4. 트랜잭션 및 동시성 문제
**문제**: DB 연결 안정성

**질문**:
1. `sequelize.close()` 제거 후에도 트랜잭션 격리 수준이 올바르게 유지되는가?
2. 개별 타임아웃(15초)과 전체 타임아웃(30초) 사이의 충돌 가능성은?
3. `Promise.race()`를 사용한 타임아웃이 트랜잭션 롤백을 올바르게 처리하는가?

### 5. 정산 순서 및 우선순위
**문제**: 정산 순서가 결과에 영향을 주는가?

**질문**:
1. 스포츠북 → Exchange 일반 → Exchange 멀티베팅 순서가 데이터 일관성에 영향을 주는가?
2. 같은 경기에 스포츠북 베팅과 Exchange 주문이 동시에 있을 때 충돌 가능성은?
3. 멀티베팅이 일반 주문과 같은 경기를 포함할 때 이중 정산 가능성은?

---

## 📋 전체 파일 목록

### 정산 서비스 파일
1. `server/services/betResultService.js` (1340줄) - 스포츠북 정산
2. `server/services/exchangeSettlementService.js` (2664줄) - 익스체인지 정산
3. `server/services/multibetSettlementService.js` (749줄) - 멀티베팅 정산
4. `server/services/settlementMonitorService.js` (335줄) - 정산 모니터링

### 정산 유틸리티
5. `server/utils/settlementValidation.js` (423줄) - 정산 검증
6. `server/utils/gameStatusHelpers.js` - 경기 상태 헬퍼
7. `server/utils/gameResultQuery.js` - 중앙화된 경기 결과 조회
8. `server/normalizeUtils.js` - 팀명 정규화

### 정산 스케줄러
9. `server/jobs/settlementScheduler.js` (42줄) - 정산 스케줄러

### 정산 테스트/디버그 스크립트
10. `server/test-manual-settlement.js`
11. `server/test-direct-settlement.js`
12. `server/test-exchange-settlement.js`
13. `server/debug-pending-settlement.js`
14. `server/check-settlement-status.js`
15. `server/scripts/fixMultibetSettlements.js`

---

## 🚨 즉시 확인이 필요한 의심 포인트

### 1. Soft Validation의 함정
```javascript
// settlementValidation.js - softValidateGameResult()
return {
  ...result,
  isValid: true,        // ⚠️ 항상 true 반환!
  isSoftFail: !result.isValid
};
```
**의심**: Soft Validation이 `isValid: true`를 항상 반환하므로, 검증 실패해도 정산이 진행될 수 있음.

### 2. 시간 조건의 허점
```javascript
// betResultService.js - processBetResult()
const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);

if (hoursSinceGame > 2) {
  selection.result = 'cancelled';  // 2시간 이상 지나면 cancelled
} else {
  selection.result = 'pending';    // 2시간 이내면 pending
}
```
**의심**: 경기 시간 계산 오류로 실제로는 경기가 끝났는데 2시간 이내로 판단될 수 있음.

### 3. 취소된 selection의 배당률 처리
```javascript
// betResultService.js - calculateAdjustedWinnings()
for (const selection of selections) {
  if (selection.result === 'won') {
    adjustedOdds *= selection.odds || 1.0;
  } else if (selection.result === 'cancelled') {
    adjustedOdds *= 1.0;  // ⚠️ 취소는 1.0 곱셈 (무효)
  }
}
```
**의심**: 모든 selection이 'cancelled'이어도 `adjustedOdds = 1.0 * 1.0 * ... = 1.0`이 되어 원금만 반환되는게 아니라 상금으로 계산될 수 있음?

### 4. 멀티베팅 판정의 논리적 허점
```javascript
// betResultService.js - determineBetStatus()
const allNonCancelledSelections = selections.filter(s => s.result !== 'cancelled');
const allWonSelections = allNonCancelledSelections.filter(s => s.result === 'won');

// 🚨 문제 시나리오:
// - allNonCancelledSelections = [] (모두 cancelled)
// - allWonSelections = []
// - allWonSelections.length === allNonCancelledSelections.length (0 === 0) → true!
if (allNonCancelledSelections.length > 0 && allWonSelections.length === allNonCancelledSelections.length) {
  return 'won';  // ⚠️ 빈 배열 비교 버그!
}
```
**의심**: `allNonCancelledSelections.length > 0` 조건이 있지만, 로직 오류로 우회될 수 있음.

---

## 💡 Gemini에게 요청할 분석 작업

1. **버그 발견**: 위 4가지 의심 포인트가 실제 버그인지 확인
2. **재현 시나리오**: 경기 결과 없이 정산되는 시나리오 재현
3. **수정 제안**: 각 버그에 대한 안전한 수정 방법 제시
4. **테스트 케이스**: 버그를 검증할 테스트 케이스 작성
5. **장기적 개선**: 정산 시스템의 근본적 개선 방안 제안

---

## 파일 위치 (Gemini 참조용)

```
/Users/inyeoppark/Documents/MyGemeProject/LikeBetFair/server/
├── services/
│   ├── betResultService.js              ← 스포츠북 정산
│   ├── exchangeSettlementService.js     ← 익스체인지 정산
│   ├── multibetSettlementService.js     ← 멀티베팅 정산
│   └── settlementMonitorService.js      ← 모니터링
├── utils/
│   ├── settlementValidation.js          ← 검증 로직
│   ├── gameStatusHelpers.js             ← 상태 헬퍼
│   └── gameResultQuery.js               ← 결과 조회
├── jobs/
│   └── settlementScheduler.js           ← 스케줄러
└── normalizeUtils.js                    ← 팀명 정규화
```

