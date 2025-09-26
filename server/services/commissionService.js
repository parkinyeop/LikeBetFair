/**
 * 통합 수수료 계산 서비스
 * 모든 수수료 계산 로직을 중앙화하여 모듈화 및 확장성을 확보합니다.
 */

import CommissionSettingsService from './commissionSettingsService.js';
import User from '../models/userModel.js';
import { Op } from 'sequelize';

class CommissionService {
  constructor() {
    this.policies = {
      // VIP 등급별 할인율 (향후 데이터베이스로 이관 예정)
      vipDiscounts: {
        'bronze': 0.05,   // 5% 할인
        'silver': 0.10,   // 10% 할인
        'gold': 0.20,     // 20% 할인
        'platinum': 0.30, // 30% 할인
        'diamond': 0.40   // 40% 할인
      },

      // 최소 수수료율 보장
      minimumRate: 0.005, // 0.5%

      // 거래량 기반 할인 기준점 (월간 베팅 기준)
      volumeThresholds: [
        { amount: 10000000, discount: 0.05 }, // 1천만원 이상: 5% 할인
        { amount: 50000000, discount: 0.10 }, // 5천만원 이상: 10% 할인
        { amount: 100000000, discount: 0.15 } // 1억원 이상: 15% 할인
      ]
    };
  }

  /**
   * 통합 수수료 계산 메인 메서드
   * @param {Object} options - 수수료 계산 옵션
   * @param {number} options.winnings - 총 당첨금액
   * @param {number} options.stake - 베팅 원금
   * @param {string} options.platform - 'sportsbook' | 'exchange'
   * @param {Object} options.user - 사용자 정보 (VIP 등급 등)
   * @param {Object} options.bet - 베팅 정보 (프로모션 등)
   * @param {Object} options.policies - 추가 정책 (이벤트, 특별 할인 등)
   * @returns {Object} { commissionAmount, appliedRate, breakdown, savings }
   */
  async calculate(options) {
    const { winnings, stake, platform, user, bet, policies = {} } = options;

    // 1. 기본 수익 계산
    const profit = winnings - stake;
    if (profit <= 0) {
      return {
        commissionAmount: 0,
        appliedRate: 0,
        breakdown: [{ type: 'no_profit', description: '수익 없음 - 수수료 없음' }],
        savings: 0
      };
    }

    // 2. 기본 수수료율 조회
    const baseCommissionRate = await CommissionSettingsService.getCommissionRate(platform);

    // 3. 정책별 수수료 조정
    const adjustedRate = await this.applyCommissionPolicies(baseCommissionRate, {
      user,
      bet,
      platform,
      policies
    });

    // 4. 최종 수수료 계산
    const commissionAmount = Math.max(0, profit * adjustedRate.finalRate);

    return {
      commissionAmount,
      appliedRate: adjustedRate.finalRate,
      breakdown: adjustedRate.breakdown,
      savings: baseCommissionRate - adjustedRate.finalRate,
      originalAmount: profit * baseCommissionRate
    };
  }

  /**
   * 정책 기반 수수료율 조정
   * @param {number} baseRate - 기본 수수료율
   * @param {Object} context - 조정 컨텍스트
   * @returns {Object} { finalRate, breakdown }
   */
  async applyCommissionPolicies(baseRate, context) {
    const { user, bet, platform, policies } = context;
    let currentRate = baseRate;
    const breakdown = [{
      type: 'base',
      rate: baseRate,
      description: `기본 ${platform} 수수료율 (${(baseRate * 100).toFixed(2)}%)`
    }];

    // VIP 등급 할인 적용
    if (user && user.vipTier) {
      const vipDiscount = this.getVipDiscount(user.vipTier);
      if (vipDiscount > 0) {
        const originalRate = currentRate;
        currentRate = currentRate * (1 - vipDiscount);
        breakdown.push({
          type: 'vip_discount',
          rate: currentRate - originalRate,
          description: `VIP ${user.vipTier} 등급 할인 (-${(vipDiscount * 100).toFixed(1)}%)`
        });
      }
    }

    // 프로모션 할인 적용
    if (policies.promotionCode) {
      const promoDiscount = await this.getPromotionDiscount(policies.promotionCode);
      if (promoDiscount > 0) {
        const originalRate = currentRate;
        currentRate = currentRate * (1 - promoDiscount);
        breakdown.push({
          type: 'promotion',
          rate: currentRate - originalRate,
          description: `프로모션 ${policies.promotionCode} 할인 (-${(promoDiscount * 100).toFixed(1)}%)`
        });
      }
    }

    // 거래량 기반 할인 (주간/월간 베팅 규모)
    if (user && user.id) {
      const volumeDiscount = await this.getVolumeDiscount(user.id, platform);
      if (volumeDiscount > 0) {
        const originalRate = currentRate;
        currentRate = currentRate * (1 - volumeDiscount);
        breakdown.push({
          type: 'volume_discount',
          rate: currentRate - originalRate,
          description: `거래량 할인 (-${(volumeDiscount * 100).toFixed(1)}%)`
        });
      }
    }

    // 특별 이벤트 할인 적용
    if (policies.specialEvent) {
      const eventDiscount = policies.specialEvent.discountRate || 0;
      if (eventDiscount > 0) {
        const originalRate = currentRate;
        currentRate = currentRate * (1 - eventDiscount);
        breakdown.push({
          type: 'special_event',
          rate: currentRate - originalRate,
          description: `특별 이벤트 할인: ${policies.specialEvent.name} (-${(eventDiscount * 100).toFixed(1)}%)`
        });
      }
    }

    // 최소 수수료율 보장
    if (currentRate < this.policies.minimumRate) {
      const originalRate = currentRate;
      currentRate = this.policies.minimumRate;
      breakdown.push({
        type: 'minimum_rate',
        rate: currentRate - originalRate,
        description: `최소 수수료율 보장 (${(this.policies.minimumRate * 100).toFixed(2)}%)`
      });
    }

    // 최대 할인 제한 (원래 수수료의 50%까지만 할인)
    const maxDiscountRate = baseRate * 0.5;
    if (currentRate < maxDiscountRate) {
      const originalRate = currentRate;
      currentRate = maxDiscountRate;
      breakdown.push({
        type: 'max_discount_limit',
        rate: currentRate - originalRate,
        description: '최대 할인 한도 적용 (50% 할인 한도)'
      });
    }

    return {
      finalRate: Math.max(0, currentRate),
      breakdown
    };
  }

  /**
   * VIP 등급별 할인율 조회
   * @param {string} vipTier - VIP 등급
   * @returns {number} 할인율 (0.0 ~ 1.0)
   */
  getVipDiscount(vipTier) {
    return this.policies.vipDiscounts[vipTier] || 0;
  }

  /**
   * 프로모션 할인율 조회
   * @param {string} promotionCode - 프로모션 코드
   * @returns {number} 할인율 (0.0 ~ 1.0)
   */
  async getPromotionDiscount(promotionCode) {
    // TODO: 향후 PromotionCodes 테이블에서 조회
    // 현재는 하드코딩된 값 사용
    const hardcodedPromotions = {
      'WELCOME10': 0.10,    // 10% 할인
      'SUMMER20': 0.20,     // 20% 할인
      'VIP30': 0.30         // 30% 할인
    };

    return hardcodedPromotions[promotionCode] || 0;
  }

  /**
   * 거래량 기반 할인율 계산
   * @param {string} userId - 사용자 ID
   * @param {string} platform - 플랫폼
   * @returns {number} 할인율 (0.0 ~ 1.0)
   */
  async getVolumeDiscount(userId, platform) {
    try {
      // 최근 30일 거래량 조회
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // 플랫폼별 베팅 금액 합계 조회
      let totalVolume = 0;

      if (platform === 'sportsbook') {
        // Bet 테이블에서 스포츠북 베팅 조회
        const Bet = (await import('../models/betModel.js')).default;
        const bets = await Bet.findAll({
          where: {
            userId: userId,
            createdAt: { [Op.gte]: thirtyDaysAgo }
          },
          attributes: ['stake']
        });
        totalVolume = bets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
      } else if (platform === 'exchange') {
        // ExchangeOrder 테이블에서 익스체인지 베팅 조회
        const ExchangeOrder = (await import('../models/exchangeOrderModel.js')).default;
        const orders = await ExchangeOrder.findAll({
          where: {
            userId: userId,
            createdAt: { [Op.gte]: thirtyDaysAgo }
          },
          attributes: ['stakeAmount']
        });
        totalVolume = orders.reduce((sum, order) => sum + parseFloat(order.stakeAmount), 0);
      }

      // 거래량 기준에 따른 할인율 결정
      for (const threshold of this.policies.volumeThresholds.reverse()) {
        if (totalVolume >= threshold.amount) {
          return threshold.discount;
        }
      }

      return 0;
    } catch (error) {
      console.error('[CommissionService] 거래량 기반 할인 계산 오류:', error);
      return 0;
    }
  }

  /**
   * 수수료 계산 결과 로깅
   * @param {string} userId - 사용자 ID
   * @param {Object} calculation - 계산 결과
   * @param {Object} context - 컨텍스트
   */
  async logCommissionCalculation(userId, calculation, context) {
    const logData = {
      userId,
      platform: context.platform,
      originalRate: `${((calculation.originalAmount / (calculation.originalAmount || 1)) * 100).toFixed(2)}%`,
      appliedRate: `${(calculation.appliedRate * 100).toFixed(2)}%`,
      commissionAmount: calculation.commissionAmount,
      savings: `${(calculation.savings * 100).toFixed(2)}%`,
      breakdown: calculation.breakdown.map(b => b.description).join(', ')
    };

    console.log(`[CommissionService] 사용자 ${userId} 수수료 계산:`, logData);

    // TODO: 향후 CommissionPolicyHistory 테이블에 저장
  }

  /**
   * 간단한 수수료 계산 (기존 호환성을 위한 메서드)
   * @param {number} winnings - 당첨금
   * @param {number} stake - 베팅금
   * @param {string} platform - 플랫폼
   * @param {Object} user - 사용자 정보 (선택사항)
   * @returns {number} 수수료 금액
   */
  async calculateSimple(winnings, stake, platform, user = null) {
    const result = await this.calculate({
      winnings,
      stake,
      platform,
      user,
      policies: {}
    });

    return result.commissionAmount;
  }

  /**
   * 수수료 정책 업데이트
   * @param {string} policyType - 정책 타입
   * @param {Object} newPolicy - 새 정책
   */
  updatePolicy(policyType, newPolicy) {
    if (this.policies[policyType]) {
      this.policies[policyType] = { ...this.policies[policyType], ...newPolicy };
      console.log(`[CommissionService] ${policyType} 정책 업데이트:`, newPolicy);
    }
  }

  /**
   * 현재 정책 조회
   * @returns {Object} 현재 정책 설정
   */
  getPolicies() {
    return this.policies;
  }
}

// 싱글톤 인스턴스 생성
const commissionService = new CommissionService();

export default commissionService;