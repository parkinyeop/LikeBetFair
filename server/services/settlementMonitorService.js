import { Op } from 'sequelize';
import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';

/**
 * 🚀 Phase 2.2: 정산 상태 모니터링 서비스
 * 정산 시스템의 상태를 지속적으로 추적하고, 장기간 해결되지 않는 베팅을 식별
 */
class SettlementMonitorService {
  constructor() {
    this.alertThresholds = {
      stuckBetsDays: 7,        // 7일 이상 pending인 베팅 알림
      criticalStuckDays: 30,   // 30일 이상 pending인 베팅 긴급 알림
      largeAmountThreshold: 100000 // 10만원 이상 베팅 알림
    };
  }

  /**
   * 현재 모든 베팅의 상태별 통계 조회
   * @returns {Promise<Object>} 상태별 통계
   */
  async getSettlementStats() {
    try {
      const stats = await Bet.findAll({
        attributes: [
          'status',
          [Bet.sequelize.fn('COUNT', '*'), 'count'],
          [Bet.sequelize.fn('SUM', Bet.sequelize.col('stake')), 'totalStake'],
          [Bet.sequelize.fn('AVG', Bet.sequelize.col('stake')), 'avgStake']
        ],
        group: ['status'],
        raw: true
      });

      // 통계 데이터 포맷팅
      const formattedStats = {};
      stats.forEach(stat => {
        formattedStats[stat.status] = {
          count: parseInt(stat.count),
          totalStake: parseFloat(stat.totalStake || 0),
          avgStake: parseFloat(stat.avgStake || 0)
        };
      });

      return {
        summary: formattedStats,
        totalBets: stats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
        totalStake: stats.reduce((sum, stat) => sum + parseFloat(stat.totalStake || 0), 0),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 정산 통계 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 7일 이상 'pending' 상태에 머물러 있는 비정상 베팅 탐지
   * @returns {Promise<Array>} stuck 베팅 목록
   */
  async findStuckBets() {
    try {
      const thresholdDate = new Date(Date.now() - this.alertThresholds.stuckBetsDays * 24 * 60 * 60 * 1000);
      
      const stuckBets = await Bet.findAll({
        where: {
          status: 'pending',
          createdAt: { [Op.lt]: thresholdDate }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      // 각 베팅에 대한 경기 결과 상태 확인
      const enrichedStuckBets = await Promise.all(
        stuckBets.map(async (bet) => {
          const gameResults = [];
          
          for (const selection of bet.selections) {
            try {
              const desc = selection.desc;
              const teams = desc ? desc.split(' vs ') : [];
              
              if (teams.length === 2) {
                const homeTeam = teams[0].trim();
                const awayTeam = teams[1].trim();
                
                // commence_time 유효성 검사 및 수정
                let commenceTime;
                if (selection.commence_time) {
                  if (typeof selection.commence_time === 'string') {
                    // ISO 문자열인지 확인
                    if (selection.commence_time.includes('T') || selection.commence_time.includes('Z')) {
                      commenceTime = new Date(selection.commence_time);
                    } else {
                      // YYYY-MM-DD 형식인 경우 시간 추가
                      commenceTime = new Date(selection.commence_time + 'T00:00:00Z');
                    }
                  } else if (selection.commence_time instanceof Date) {
                    commenceTime = selection.commence_time;
                  } else {
                    // 잘못된 형식인 경우 건너뛰기
                    console.warn(`베팅 ${bet.id}의 잘못된 commence_time:`, selection.commence_time);
                    continue;
                  }
                } else {
                  console.warn(`베팅 ${bet.id}에 commence_time이 없습니다.`);
                  continue;
                }
                
                // 유효한 날짜인지 확인
                if (isNaN(commenceTime.getTime())) {
                  console.warn(`베팅 ${bet.id}의 유효하지 않은 날짜:`, selection.commence_time);
                  continue;
                }
                
                // 경기 결과 조회 (개선된 매칭 로직 사용)
                const gameResult = await GameResult.findOne({
                  where: {
                    [Op.or]: [
                      {
                        homeTeam: { [Op.iLike]: `%${homeTeam}%` },
                        awayTeam: { [Op.iLike]: `%${awayTeam}%` }
                      },
                      {
                        homeTeam: { [Op.iLike]: `%${awayTeam}%` },
                        awayTeam: { [Op.iLike]: `%${homeTeam}%` }
                      }
                    ],
                    commenceTime: {
                      [Op.between]: [
                        new Date(commenceTime.getTime() - 30 * 24 * 60 * 60 * 1000),
                        new Date(commenceTime.getTime() + 30 * 24 * 60 * 60 * 1000)
                      ]
                    }
                  },
                  order: [['commenceTime', 'ASC']]
                });
                
                gameResults.push({
                  selection: selection,
                  gameResult: gameResult,
                  hasResult: !!gameResult,
                  isFinished: gameResult ? gameResult.status === 'finished' : false
                });
              }
            } catch (error) {
              console.error(`베팅 ${bet.id} 경기 결과 조회 오류:`, error);
              gameResults.push({
                selection: selection,
                gameResult: null,
                hasResult: false,
                isFinished: false,
                error: error.message
              });
            }
          }
          
          return {
            ...bet.toJSON(),
            gameResults: gameResults,
            daysSinceCreated: Math.floor((Date.now() - new Date(bet.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            isCritical: (Date.now() - new Date(bet.createdAt).getTime()) > (this.alertThresholds.criticalStuckDays * 24 * 60 * 60 * 1000),
            isLargeAmount: parseFloat(bet.stake) >= this.alertThresholds.largeAmountThreshold
          };
        })
      );

      return enrichedStuckBets;
    } catch (error) {
      console.error('❌ stuck 베팅 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 정산 시스템 상태 진단
   * @returns {Promise<Object>} 시스템 상태 정보
   */
  async diagnoseSettlementSystem() {
    try {
      const stats = await this.getSettlementStats();
      const stuckBets = await this.findStuckBets();
      
      // 시스템 상태 점수 계산 (0-100)
      let healthScore = 100;
      const issues = [];
      
      // 1. Pending 베팅 비율 체크
      const pendingRatio = stats.summary.pending ? 
        (stats.summary.pending.count / stats.totalBets) * 100 : 0;
      
      if (pendingRatio > 20) {
        healthScore -= 30;
        issues.push(`높은 pending 비율: ${pendingRatio.toFixed(1)}%`);
      } else if (pendingRatio > 10) {
        healthScore -= 15;
        issues.push(`중간 pending 비율: ${pendingRatio.toFixed(1)}%`);
      }
      
      // 2. Stuck 베팅 체크
      if (stuckBets.length > 0) {
        const criticalCount = stuckBets.filter(bet => bet.isCritical).length;
        const largeAmountCount = stuckBets.filter(bet => bet.isLargeAmount).length;
        
        if (criticalCount > 0) {
          healthScore -= 40;
          issues.push(`긴급 stuck 베팅: ${criticalCount}개 (30일 이상)`);
        } else {
          healthScore -= 20;
          issues.push(`일반 stuck 베팅: ${stuckBets.length}개`);
        }
        
        if (largeAmountCount > 0) {
          healthScore -= 20;
          issues.push(`대액 stuck 베팅: ${largeAmountCount}개`);
        }
      }
      
      // 3. 시스템 상태 분류
      let status = 'healthy';
      if (healthScore < 30) {
        status = 'critical';
      } else if (healthScore < 60) {
        status = 'warning';
      } else if (healthScore < 80) {
        status = 'caution';
      }
      
      return {
        healthScore: Math.max(0, healthScore),
        status: status,
        issues: issues,
        stats: stats,
        stuckBets: stuckBets,
        recommendations: this.generateRecommendations(issues, stuckBets),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 시스템 진단 오류:', error);
      throw error;
    }
  }

  /**
   * 시스템 개선 권장사항 생성
   * @param {Array} issues - 발견된 문제들
   * @param {Array} stuckBets - stuck 베팅 목록
   * @returns {Array} 권장사항
   */
  generateRecommendations(issues, stuckBets) {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('pending 비율'))) {
      recommendations.push('매칭 로직 개선 또는 수동 정산 실행 필요');
    }
    
    if (stuckBets.some(bet => bet.isCritical)) {
      recommendations.push('30일 이상 pending 베팅 즉시 수동 처리 필요');
    }
    
    if (stuckBets.some(bet => bet.isLargeAmount)) {
      recommendations.push('대액 베팅 우선 정산 처리 권장');
    }
    
    if (stuckBets.length > 10) {
      recommendations.push('배치 정산 스크립트 실행 권장');
    }
    
    return recommendations;
  }

  /**
   * 정산 모니터링 리포트 생성
   * @returns {Promise<Object>} 모니터링 리포트
   */
  async generateMonitoringReport() {
    try {
      console.log('📊 정산 시스템 모니터링 리포트 생성 중...');
      
      const diagnosis = await this.diagnoseSettlementSystem();
      
      const report = {
        summary: {
          timestamp: diagnosis.timestamp,
          healthScore: diagnosis.healthScore,
          status: diagnosis.status,
          totalBets: diagnosis.stats.totalBets,
          pendingBets: diagnosis.stats.summary.pending?.count || 0,
          stuckBets: diagnosis.stuckBets.length,
          criticalBets: diagnosis.stuckBets.filter(bet => bet.isCritical).length
        },
        issues: diagnosis.issues,
        recommendations: diagnosis.recommendations,
        detailedStats: diagnosis.stats,
        stuckBetsDetails: diagnosis.stuckBets.slice(0, 10), // 상위 10개만 포함
        systemInfo: {
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      };
      
      console.log('✅ 모니터링 리포트 생성 완료');
      return report;
    } catch (error) {
      console.error('❌ 모니터링 리포트 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 알림 전송 (향후 확장용)
   * @param {Object} report - 모니터링 리포트
   */
  async sendAlerts(report) {
    // TODO: 이메일, 슬랙 등 알림 시스템 연동
    if (report.summary.status === 'critical') {
      console.log('🚨 CRITICAL: 정산 시스템 상태가 위험합니다!');
      console.log('알림 전송 필요:', report.issues);
    } else if (report.summary.status === 'warning') {
      console.log('⚠️ WARNING: 정산 시스템에 문제가 있습니다.');
      console.log('주의 필요:', report.issues);
    }
  }
}

export default SettlementMonitorService;
