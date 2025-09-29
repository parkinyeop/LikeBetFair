/**
 * 경기 결과 조회 성능 메트릭 수집 클래스
 * 쿼리 성능, 매칭 정확도, 에러율 등을 추적
 */

import { getConfig } from '../config/gameResultQuery.js';

class GameResultQueryMetrics {
  constructor() {
    this.config = getConfig();
    this.metrics = {
      queries: [],
      errors: [],
      performance: [],
      matching: []
    };
    
    // 메트릭 초기화
    this.resetDailyMetrics();
  }

  /**
   * 쿼리 성능 추적 시작
   */
  startQueryTimer(queryType, location, teams, timeRange) {
    return {
      startTime: Date.now(),
      queryType,
      location,
      teams,
      timeRange,
      timestamp: new Date()
    };
  }

  /**
   * 쿼리 성능 추적 완료
   */
  endQueryTimer(timer, result, error = null) {
    const duration = Date.now() - timer.startTime;
    const metric = {
      ...timer,
      duration,
      success: !error,
      resultFound: !!result,
      error: error?.message || null,
      timestamp: new Date()
    };

    this.metrics.queries.push(metric);
    this.metrics.performance.push({
      location: timer.location,
      duration,
      success: !error,
      timestamp: new Date()
    });

    // 느린 쿼리 알림
    if (duration > this.config.SLOW_QUERY_THRESHOLD) {
      this.logSlowQuery(metric);
    }

    // 에러 로깅
    if (error) {
      this.metrics.errors.push({
        location: timer.location,
        error: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
    }

    return metric;
  }

  /**
   * 매칭 정확도 추적
   */
  trackMatchingAccuracy(expectedTeams, foundTeams, location, matchType) {
    const accuracy = this.calculateMatchingAccuracy(expectedTeams, foundTeams);
    
    const metric = {
      expectedTeams,
      foundTeams,
      accuracy,
      location,
      matchType,
      timestamp: new Date()
    };

    this.metrics.matching.push(metric);
    
    // 낮은 정확도 알림
    if (accuracy < 0.8) {
      this.logLowAccuracy(metric);
    }

    return metric;
  }

  /**
   * 매칭 정확도 계산
   */
  calculateMatchingAccuracy(expectedTeams, foundTeams) {
    if (!expectedTeams || !foundTeams) return 0;
    
    const expected = {
      home: expectedTeams.homeTeam?.toLowerCase().trim(),
      away: expectedTeams.awayTeam?.toLowerCase().trim()
    };
    
    const found = {
      home: foundTeams.homeTeam?.toLowerCase().trim(),
      away: foundTeams.awayTeam?.toLowerCase().trim()
    };

    let matches = 0;
    let total = 2;

    // 홈팀 매칭 확인
    if (expected.home && found.home) {
      if (expected.home === found.home || 
          expected.home.includes(found.home) || 
          found.home.includes(expected.home)) {
        matches++;
      }
    }

    // 어웨이팀 매칭 확인
    if (expected.away && found.away) {
      if (expected.away === found.away || 
          expected.away.includes(found.away) || 
          found.away.includes(expected.away)) {
        matches++;
      }
    }

    return matches / total;
  }

  /**
   * 일일 성능 리포트 생성
   */
  generateDailyReport() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMetrics = this.metrics.queries.filter(m => m.timestamp >= today);
    
    if (todayMetrics.length === 0) {
      return {
        date: today.toISOString().split('T')[0],
        message: 'No queries executed today'
      };
    }

    const report = {
      date: today.toISOString().split('T')[0],
      totalQueries: todayMetrics.length,
      successfulQueries: todayMetrics.filter(m => m.success).length,
      failedQueries: todayMetrics.filter(m => !m.success).length,
      successRate: (todayMetrics.filter(m => m.success).length / todayMetrics.length) * 100,
      averageDuration: todayMetrics.reduce((sum, m) => sum + m.duration, 0) / todayMetrics.length,
      slowQueries: todayMetrics.filter(m => m.duration > this.config.SLOW_QUERY_THRESHOLD).length,
      locationBreakdown: this.getLocationBreakdown(todayMetrics),
      errorBreakdown: this.getErrorBreakdown(),
      matchingAccuracy: this.getMatchingAccuracy()
    };

    return report;
  }

  /**
   * 위치별 성능 분석
   */
  getLocationBreakdown(metrics) {
    const breakdown = {};
    
    metrics.forEach(metric => {
      if (!breakdown[metric.location]) {
        breakdown[metric.location] = {
          total: 0,
          successful: 0,
          failed: 0,
          totalDuration: 0,
          averageDuration: 0
        };
      }
      
      breakdown[metric.location].total++;
      breakdown[metric.location].totalDuration += metric.duration;
      
      if (metric.success) {
        breakdown[metric.location].successful++;
      } else {
        breakdown[metric.location].failed++;
      }
    });

    // 평균 계산
    Object.keys(breakdown).forEach(location => {
      const data = breakdown[location];
      data.averageDuration = data.totalDuration / data.total;
      data.successRate = (data.successful / data.total) * 100;
    });

    return breakdown;
  }

  /**
   * 에러 분석
   */
  getErrorBreakdown() {
    const errorCounts = {};
    
    this.metrics.errors.forEach(error => {
      const errorType = error.error.split(':')[0] || 'Unknown';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });

    return errorCounts;
  }

  /**
   * 매칭 정확도 분석
   */
  getMatchingAccuracy() {
    if (this.metrics.matching.length === 0) return null;
    
    const totalAccuracy = this.metrics.matching.reduce((sum, m) => sum + m.accuracy, 0);
    const averageAccuracy = totalAccuracy / this.metrics.matching.length;
    
    return {
      averageAccuracy: averageAccuracy * 100,
      totalMatches: this.metrics.matching.length,
      lowAccuracyMatches: this.metrics.matching.filter(m => m.accuracy < 0.8).length
    };
  }

  /**
   * 느린 쿼리 로깅
   */
  logSlowQuery(metric) {
    if (!this.config.ENABLE_ALERTS) return;
    
    console.warn(`🐌 [SLOW_QUERY] ${metric.location}: ${metric.duration}ms`, {
      teams: metric.teams,
      queryType: metric.queryType,
      timeRange: metric.timeRange
    });
  }

  /**
   * 낮은 정확도 로깅
   */
  logLowAccuracy(metric) {
    if (!this.config.ENABLE_ALERTS) return;
    
    console.warn(`🎯 [LOW_ACCURACY] ${metric.location}: ${(metric.accuracy * 100).toFixed(1)}%`, {
      expected: metric.expectedTeams,
      found: metric.foundTeams,
      matchType: metric.matchType
    });
  }

  /**
   * 일일 메트릭 초기화
   */
  resetDailyMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 오래된 메트릭 정리 (보관 기간 초과)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.METRICS_RETENTION_DAYS);
    
    this.metrics.queries = this.metrics.queries.filter(m => m.timestamp >= retentionDate);
    this.metrics.errors = this.metrics.errors.filter(m => m.timestamp >= retentionDate);
    this.metrics.performance = this.metrics.performance.filter(m => m.timestamp >= retentionDate);
    this.metrics.matching = this.metrics.matching.filter(m => m.timestamp >= retentionDate);
  }

  /**
   * 메트릭 데이터 내보내기
   */
  exportMetrics() {
    return {
      config: this.config,
      metrics: this.metrics,
      report: this.generateDailyReport(),
      timestamp: new Date()
    };
  }

  /**
   * 메트릭 데이터 초기화
   */
  clearMetrics() {
    this.metrics = {
      queries: [],
      errors: [],
      performance: [],
      matching: []
    };
  }
}

// 싱글톤 인스턴스
const metricsInstance = new GameResultQueryMetrics();

export default metricsInstance;
