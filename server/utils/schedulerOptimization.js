/**
 * 스케줄러 최적화 유틸리티
 * 불필요한 정산 실행을 방지하여 시스템 리소스를 절약합니다.
 */

import GameResult from '../models/gameResultModel.js';
import ExchangeOrder from '../models/exchangeOrderModel.js';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';

class SchedulerOptimization {
  constructor() {
    this.metrics = {
      totalChecks: 0,
      skippedExecutions: 0,
      executedSettlements: 0,
      startTime: Date.now()
    };
  }

  /**
   * Exchange 정산 필요성 검증
   * @param {number} timeWindowMinutes - 검증할 시간 범위 (분)
   * @returns {Object} 검증 결과
   */
  async checkExchangeSettlementNeeded(timeWindowMinutes = 6) {
    this.metrics.totalChecks++;

    const timeWindowAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    // 1. 최근 완료된 경기 결과 확인
    const recentFinishedGames = await GameResult.count({
      where: {
        status: 'finished',
        updatedAt: { [Op.gte]: timeWindowAgo }
      }
    });

    // 2. 정산 대상 Exchange 주문 확인
    const pendingExchangeOrders = await ExchangeOrder.count({
      where: {
        status: { [Op.in]: ['matched', 'partially_matched'] },
        settledAt: null
      }
    });

    // 3. 만료된 미매칭 주문 확인 (취소 대상)
    const expiredOrders = await ExchangeOrder.count({
      where: {
        status: { [Op.in]: ['open', 'partially_matched'] },
        createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24시간 이상 된 주문
      }
    });

    const shouldExecute = recentFinishedGames > 0 || pendingExchangeOrders > 0 || expiredOrders > 0;

    if (!shouldExecute) {
      this.metrics.skippedExecutions++;
    } else {
      this.metrics.executedSettlements++;
    }

    return {
      shouldExecute,
      recentGames: recentFinishedGames,
      pendingOrders: pendingExchangeOrders,
      expiredOrders: expiredOrders,
      reason: this.getSkipReason(recentFinishedGames, pendingExchangeOrders, expiredOrders),
      metrics: this.getEfficiencyMetrics()
    };
  }

  /**
   * 베팅 정산 필요성 검증
   * @param {Object} gameUpdateResult - 경기 결과 업데이트 결과
   * @returns {Object} 검증 결과
   */
  checkBetSettlementNeeded(gameUpdateResult) {
    const updatedCount = gameUpdateResult?.updatedCount || 0;
    const shouldExecute = updatedCount > 0;

    if (!shouldExecute) {
      this.metrics.skippedExecutions++;
    } else {
      this.metrics.executedSettlements++;
    }

    return {
      shouldExecute,
      updatedGames: updatedCount,
      reason: shouldExecute ?
        `${updatedCount}개 경기 결과 업데이트됨` :
        '경기 결과 업데이트 없음',
      metrics: this.getEfficiencyMetrics()
    };
  }

  /**
   * 시간대별 스케줄링 권장사항
   * @returns {Object} 스케줄링 권장사항
   */
  getSmartSchedulingRecommendation() {
    const currentHour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());

    // 피크 시간대 정의
    const isPeakHours = (currentHour >= 18 && currentHour <= 23) || // 저녁 피크
                       (isWeekend && currentHour >= 12 && currentHour <= 23); // 주말 오후~저녁

    // 비활성 시간대 정의
    const isQuietHours = currentHour >= 2 && currentHour <= 6; // 새벽 시간

    let recommendedInterval;
    let reason;

    if (isQuietHours) {
      recommendedInterval = 10; // 10분 간격 (느리게)
      reason = '새벽 시간대 - 활동 적음';
    } else if (isPeakHours) {
      recommendedInterval = 3; // 3분 간격 (빠르게)
      reason = '피크 시간대 - 높은 활동성';
    } else {
      recommendedInterval = 5; // 5분 간격 (기본)
      reason = '일반 시간대';
    }

    return {
      currentHour,
      isWeekend,
      isPeakHours,
      isQuietHours,
      recommendedInterval,
      reason
    };
  }

  /**
   * 건너뛰기 이유 생성
   */
  getSkipReason(recentGames, pendingOrders, expiredOrders) {
    const reasons = [];

    if (recentGames === 0) reasons.push('신규 경기 결과 없음');
    if (pendingOrders === 0) reasons.push('정산 대상 주문 없음');
    if (expiredOrders === 0) reasons.push('만료 주문 없음');

    return reasons.length > 0 ? reasons.join(', ') : '정산 진행 필요';
  }

  /**
   * 효율성 메트릭 조회
   * @returns {Object} 효율성 통계
   */
  getEfficiencyMetrics() {
    const totalExecutions = this.metrics.executedSettlements + this.metrics.skippedExecutions;
    const efficiencyRate = totalExecutions > 0 ?
      (this.metrics.skippedExecutions / totalExecutions * 100).toFixed(1) : 0;

    const runtimeMinutes = (Date.now() - this.metrics.startTime) / (1000 * 60);

    return {
      totalChecks: this.metrics.totalChecks,
      executedSettlements: this.metrics.executedSettlements,
      skippedExecutions: this.metrics.skippedExecutions,
      efficiencyRate: parseFloat(efficiencyRate),
      runtimeMinutes: runtimeMinutes.toFixed(1),
      resourceSaving: `CPU/DB 연결 ${efficiencyRate}% 절약`
    };
  }

  /**
   * 상세 효율성 리포트 생성
   * @returns {Object} 상세 리포트
   */
  generateEfficiencyReport() {
    const metrics = this.getEfficiencyMetrics();
    const recommendation = this.getSmartSchedulingRecommendation();

    return {
      summary: {
        message: 'Scheduler Optimization Report',
        generatedAt: new Date().toISOString(),
        efficiency: metrics,
        scheduling: recommendation
      },
      performance: {
        totalResourceSaving: `${metrics.efficiencyRate}%`,
        avgChecksPerHour: (metrics.totalChecks / (metrics.runtimeMinutes / 60)).toFixed(1),
        avgExecutionsPerHour: (metrics.executedSettlements / (metrics.runtimeMinutes / 60)).toFixed(1)
      },
      recommendations: [
        metrics.efficiencyRate > 70 ?
          '우수한 효율성 - 현재 최적화 유지' :
          '효율성 개선 가능 - 조건 재검토 권장',
        recommendation.isPeakHours ?
          '피크 시간대 - 모니터링 강화 권장' :
          '일반 시간대 - 현재 설정 유지'
      ]
    };
  }

  /**
   * 메트릭 초기화
   */
  resetMetrics() {
    this.metrics = {
      totalChecks: 0,
      skippedExecutions: 0,
      executedSettlements: 0,
      startTime: Date.now()
    };
  }
}

// 싱글톤 인스턴스 생성
const schedulerOptimization = new SchedulerOptimization();

export default schedulerOptimization;