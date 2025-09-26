# CommissionService 확장 로드맵

## 📋 현재 상태 (Phase 1 완료)

### ✅ 구현 완료 사항
- **통합 CommissionService 구현** (`server/services/commissionService.js`)
- **기존 서비스 연동** (betResultService, exchangeSettlementService, newExchangeSettlementService)
- **기본 정책 시스템** (VIP 등급, 프로모션, 거래량 기반 할인)
- **포괄적인 단위 테스트** (21개 테스트 케이스)

### 🎯 현재 지원 기능
- VIP 등급별 할인: Bronze(5%) ~ Diamond(40%)
- 프로모션 코드 할인: WELCOME10(10%), SUMMER20(20%), VIP30(30%)
- 거래량 기반 할인: 월간 베팅 규모 기반
- 특별 이벤트 할인: 시즌/이벤트별 맞춤 할인
- 최소 수수료율 보장: 0.5% 최소 보장
- 최대 할인 제한: 원래 수수료의 50%까지만 할인

---

## 🚀 Phase 2: VIP 시스템 자동화 (예상 기간: 2-3주)

### 목표
사용자의 베팅 활동에 따른 자동 VIP 등급 관리 시스템 구현

### 구현 사항

#### 1. 데이터베이스 스키마 확장
```sql
-- User 모델 확장
ALTER TABLE Users ADD COLUMN vip_tier VARCHAR(20) DEFAULT 'bronze';
ALTER TABLE Users ADD COLUMN total_bet_volume DECIMAL(15,2) DEFAULT 0;
ALTER TABLE Users ADD COLUMN monthly_bet_volume DECIMAL(15,2) DEFAULT 0;
ALTER TABLE Users ADD COLUMN vip_tier_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- VIP 등급 히스토리 테이블
CREATE TABLE VipTierHistory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES Users(id),
    previous_tier VARCHAR(20),
    new_tier VARCHAR(20),
    promotion_reason TEXT,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monthly_volume DECIMAL(15,2),
    total_volume DECIMAL(15,2)
);
```

#### 2. VIP 관리 서비스 구현
```javascript
// server/services/vipManagementService.js
class VipManagementService {
  // VIP 등급 기준
  static VIP_THRESHOLDS = {
    bronze: { monthly: 0, total: 0 },
    silver: { monthly: 5000000, total: 10000000 },      // 월 500만원, 총 1천만원
    gold: { monthly: 20000000, total: 50000000 },       // 월 2천만원, 총 5천만원
    platinum: { monthly: 50000000, total: 200000000 },  // 월 5천만원, 총 2억원
    diamond: { monthly: 100000000, total: 500000000 }   // 월 1억원, 총 5억원
  };

  async updateUserVipTier(userId);
  async calculateMonthlyVolume(userId);
  async promoteUser(userId, newTier, reason);
  async scheduleVipReview(); // 매월 1일 실행
}
```

#### 3. 관리자 VIP 관리 페이지
- **경로**: `pages/admin/vip-management.tsx`
- **기능**:
  - VIP 등급별 사용자 현황
  - 수동 등급 조정 기능
  - VIP 승급 히스토리 조회
  - VIP 혜택 설정 관리

---

## 🎟️ Phase 3: 프로모션 시스템 (예상 기간: 3-4주)

### 목표
동적 프로모션 코드 관리 및 사용 추적 시스템 구현

### 구현 사항

#### 1. 프로모션 데이터베이스 설계
```sql
-- 프로모션 코드 테이블
CREATE TABLE PromotionCodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_rate DECIMAL(5,4) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('sportsbook', 'exchange', 'both')),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    max_uses_per_user INT DEFAULT 1,
    min_bet_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2) DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES Users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 프로모션 사용 히스토리
CREATE TABLE PromotionUsage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID REFERENCES PromotionCodes(id),
    user_id UUID REFERENCES Users(id),
    bet_id UUID REFERENCES Bets(id),
    exchange_order_id INT REFERENCES ExchangeOrders(id),
    original_commission DECIMAL(10,2),
    discounted_commission DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. 프로모션 관리 서비스
```javascript
// server/services/promotionService.js
class PromotionService {
  async createPromotion(promotionData);
  async validatePromotionCode(code, userId, betAmount, platform);
  async applyPromotion(promotionId, userId, betId);
  async getPromotionUsageStats(promotionId);
  async deactivateExpiredPromotions();
}
```

#### 3. 관리자 프로모션 관리 페이지
- **경로**: `pages/admin/promotions.tsx`
- **기능**:
  - 프로모션 코드 생성/수정/삭제
  - 사용 통계 및 효과 분석
  - 만료 예정 프로모션 알림
  - 사용자별 프로모션 사용 히스토리

---

## 📊 Phase 4: 고급 정책 시스템 (예상 기간: 4-6주)

### 목표
시간대별, 스포츠별, 이벤트별 차등 수수료 정책 구현

### 구현 사항

#### 1. 동적 수수료 정책 테이블
```sql
-- 수수료 정책 테이블
CREATE TABLE CommissionPolicies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    platform VARCHAR(20) NOT NULL,
    sport_key VARCHAR(50), -- 특정 스포츠에만 적용 (NULL이면 전체)
    time_based_rules JSONB, -- 시간대별 규칙
    event_based_rules JSONB, -- 이벤트별 규칙
    user_segment_rules JSONB, -- 사용자 세그먼트별 규칙
    base_rate_modifier DECIMAL(5,4) DEFAULT 1.0, -- 기본 수수료율 배수
    effective_from TIMESTAMP NOT NULL,
    effective_until TIMESTAMP,
    priority INT DEFAULT 0, -- 우선순위 (높을수록 우선)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 수수료 정책 히스토리
CREATE TABLE CommissionPolicyHistory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES Users(id),
    bet_id UUID,
    exchange_order_id INT,
    applied_policies JSONB, -- 적용된 정책들
    base_rate DECIMAL(5,4),
    final_rate DECIMAL(5,4),
    commission_amount DECIMAL(10,2),
    savings_amount DECIMAL(10,2),
    platform VARCHAR(20),
    calculation_breakdown JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. 고급 정책 엔진
```javascript
// server/services/advancedCommissionPolicyEngine.js
class AdvancedCommissionPolicyEngine {
  // 시간대별 수수료 정책
  async getTimeBasedRate(baseRate, currentTime, sportKey);

  // 스포츠별 수수료 정책
  async getSportBasedRate(baseRate, sportKey, eventImportance);

  // 사용자 세그먼트별 정책
  async getUserSegmentRate(baseRate, user, bettingPattern);

  // 이벤트별 특별 정책 (월드컵, 올림픽 등)
  async getEventBasedRate(baseRate, eventType, eventDate);

  // 정책 우선순위 해결
  async resolvePolicyConflicts(applicablePolicies);
}
```

#### 3. 실시간 정책 관리 대시보드
- **경로**: `pages/admin/commission-policies.tsx`
- **기능**:
  - 실시간 수수료 정책 설정
  - A/B 테스트 기능
  - 정책 효과 분석 및 시각화
  - 자동 정책 추천 시스템

---

## 🔍 Phase 5: 분석 및 최적화 (예상 기간: 2-3주)

### 목표
수수료 정책의 효과 분석 및 최적화 도구 구현

### 구현 사항

#### 1. 수수료 분석 대시보드
```javascript
// server/services/commissionAnalyticsService.js
class CommissionAnalyticsService {
  // 수수료 수익 분석
  async getCommissionRevenueAnalytics(startDate, endDate);

  // 정책별 효과 분석
  async getPolicyEffectivenessAnalysis(policyId);

  // 사용자 세그먼트별 분석
  async getUserSegmentCommissionAnalysis();

  // 예측 모델 (수수료 정책 변경 시 예상 효과)
  async predictPolicyImpact(proposedPolicy);
}
```

#### 2. 실시간 모니터링
- 수수료 수익 실시간 추적
- 정책 변경 효과 즉시 분석
- 이상 패턴 자동 감지
- 수익 최적화 추천

#### 3. 머신러닝 기반 최적화
- 사용자별 최적 수수료율 예측
- 이탈 방지를 위한 동적 할인 제안
- 수익 극대화 정책 자동 생성

---

## 🎯 예상 ROI 및 효과

### 수치적 효과
- **개발 생산성**: 30% 향상 (중복 코드 제거)
- **정책 변경 시간**: 90% 단축 (하드코딩 → 동적 설정)
- **사용자 만족도**: 25% 향상 (맞춤형 할인 혜택)
- **수수료 수익**: 15-20% 증가 (최적화된 정책)

### 비즈니스 효과
- **고객 유지율 개선**: VIP 시스템을 통한 충성도 향상
- **신규 고객 유치**: 매력적인 프로모션 정책
- **운영 효율성**: 자동화된 정책 관리
- **의사결정 지원**: 데이터 기반 정책 수립

---

## 📅 전체 일정

| Phase | 기간 | 주요 구현 사항 | 예상 인력 |
|-------|------|---------------|----------|
| Phase 1 | ✅ 완료 | 기본 CommissionService | 1명 |
| Phase 2 | 2-3주 | VIP 시스템 자동화 | 1명 |
| Phase 3 | 3-4주 | 프로모션 시스템 | 1-2명 |
| Phase 4 | 4-6주 | 고급 정책 시스템 | 2명 |
| Phase 5 | 2-3주 | 분석 및 최적화 | 1명 |
| **총합** | **11-16주** | **완전한 수수료 관리 시스템** | **최대 2명** |

---

## 🚨 주의사항 및 리스크

### 기술적 리스크
- **성능**: 복잡한 정책 계산으로 인한 응답 속도 저하
- **데이터 일관성**: 실시간 정책 변경 시 진행 중인 베팅 처리
- **확장성**: 대량 트래픽 시 정책 엔진 부하

### 비즈니스 리스크
- **수익 감소**: 과도한 할인 정책으로 인한 수익성 악화
- **사용자 혼란**: 복잡한 정책으로 인한 사용자 경험 저하
- **규제 준수**: 수수료 정책의 법적 요구사항 준수

### 완화 방안
- **점진적 도입**: 단계별 테스트 및 검증
- **모니터링 강화**: 실시간 효과 추적 및 조정
- **사용자 교육**: 명확한 정책 안내 및 혜택 설명
- **백업 계획**: 문제 발생 시 이전 정책으로 즉시 롤백

---

*최종 업데이트: 2025년 1월*
*작성자: Claude (AI Assistant)*
*검토 필요: 개발팀, 비즈니스팀*