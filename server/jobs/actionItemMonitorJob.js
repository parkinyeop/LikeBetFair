import cron from 'node-cron';
import actionItemService from '../services/actionItemService.js';

/**
 * 액션 아이템 모니터링 스케줄러
 * 다양한 주기로 시스템 상태를 체크하고 변화가 있을 때 알림을 발송
 */
class ActionItemMonitorJob {

  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
    this.lastCheckResults = new Map();
    this.webSocketService = null;
  }

  /**
   * WebSocket 서비스 설정
   * @param {Object} wsService - WebSocket 서비스 인스턴스
   */
  setWebSocketService(wsService) {
    this.webSocketService = wsService;
    console.log('📡 WebSocket 서비스가 액션 아이템 모니터에 연결되었습니다.');
  }

  /**
   * 모든 모니터링 작업 시작
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ 액션 아이템 모니터가 이미 실행 중입니다.');
      return;
    }

    console.log('🔍 액션 아이템 모니터링 시작...');
    this.isRunning = true;

    // 🔥 긴급 항목 체크 (매 5분마다로 변경)
    const dangerJob = cron.schedule('*/5 * * * *', async () => {
      await this.checkDangerItems();
    }, { scheduled: false });

    // ⚠️ 경고 항목 체크 (매 15분마다로 변경)
    const warningJob = cron.schedule('*/15 * * * *', async () => {
      await this.checkWarningItems();
    }, { scheduled: false });

    // ℹ️ 정보 항목 체크 (매 30분마다)
    const infoJob = cron.schedule('*/30 * * * *', async () => {
      await this.checkInfoItems();
    }, { scheduled: false });

    // 🔄 전체 상태 체크 (매 1시간마다)
    const fullCheckJob = cron.schedule('0 * * * *', async () => {
      await this.checkAllItems();
    }, { scheduled: false });

    // 작업 저장 및 시작
    this.jobs.set('danger', dangerJob);
    this.jobs.set('warning', warningJob);
    this.jobs.set('info', infoJob);
    this.jobs.set('full', fullCheckJob);

    // 모든 작업 시작
    this.jobs.forEach((job, type) => {
      job.start();
      console.log(`✅ ${type} 모니터링 작업이 시작되었습니다.`);
    });

    // 즉시 한 번 실행
    setTimeout(() => {
      this.checkAllItems();
    }, 5000); // 5초 후 첫 체크

    console.log('🎯 액션 아이템 모니터링이 활성화되었습니다.');
  }

  /**
   * 모든 모니터링 작업 중지
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ 액션 아이템 모니터가 실행 중이 아닙니다.');
      return;
    }

    console.log('🛑 액션 아이템 모니터링 중지...');

    this.jobs.forEach((job, type) => {
      job.stop();
      console.log(`⏹️ ${type} 모니터링 작업이 중지되었습니다.`);
    });

    this.jobs.clear();
    this.isRunning = false;

    console.log('✅ 액션 아이템 모니터링이 중지되었습니다.');
  }

  /**
   * 🔥 긴급 항목 체크 (Danger Level)
   */
  async checkDangerItems() {
    try {
      console.log('🔥 긴급 항목 체크 시작...');

      const dangerItems = await Promise.all([
        actionItemService.getStuckSettlements(),
        actionItemService.getBalanceMismatches()
      ]);

      const activeDangerItems = dangerItems.filter(item => item.count > 0);

      if (activeDangerItems.length > 0) {
        console.log(`🚨 긴급 조치 필요: ${activeDangerItems.length}개 항목`);

        // 이전 상태와 비교
        const prevDangerCount = this.lastCheckResults.get('danger') || 0;
        const currentDangerCount = activeDangerItems.reduce((sum, item) => sum + item.count, 0);

        if (currentDangerCount !== prevDangerCount) {
          console.log(`📊 긴급 항목 변화: ${prevDangerCount} → ${currentDangerCount}`);

          // WebSocket으로 즉시 알림
          this.emitActionItemsUpdate({
            type: 'danger',
            items: activeDangerItems,
            totalCount: currentDangerCount,
            previousCount: prevDangerCount,
            timestamp: new Date(),
            message: `긴급 조치가 필요한 ${currentDangerCount}개 항목이 발견되었습니다.`
          });

          this.lastCheckResults.set('danger', currentDangerCount);
        }
      } else {
        // 이전에 문제가 있었다가 해결된 경우
        const prevDangerCount = this.lastCheckResults.get('danger') || 0;
        if (prevDangerCount > 0) {
          console.log('✅ 모든 긴급 항목이 해결되었습니다.');

          this.emitActionItemsUpdate({
            type: 'danger-resolved',
            items: [],
            totalCount: 0,
            previousCount: prevDangerCount,
            timestamp: new Date(),
            message: '모든 긴급 항목이 해결되었습니다.'
          });

          this.lastCheckResults.set('danger', 0);
        }
      }

    } catch (error) {
      console.error('❌ 긴급 항목 체크 실패:', error);
    }
  }

  /**
   * ⚠️ 경고 항목 체크 (Warning Level)
   */
  async checkWarningItems() {
    try {
      console.log('⚠️ 경고 항목 체크 시작...');

      const warningItems = await Promise.all([
        actionItemService.getPendingSettlements(),
        actionItemService.getCancelledGameRefunds(),
        actionItemService.getHighVolumeUsers()
      ]);

      const activeWarningItems = warningItems.filter(item => item.count > 0);

      if (activeWarningItems.length > 0) {
        const currentWarningCount = activeWarningItems.reduce((sum, item) => sum + item.count, 0);
        const prevWarningCount = this.lastCheckResults.get('warning') || 0;

        if (currentWarningCount !== prevWarningCount) {
          console.log(`📊 경고 항목 변화: ${prevWarningCount} → ${currentWarningCount}`);

          this.emitActionItemsUpdate({
            type: 'warning',
            items: activeWarningItems,
            totalCount: currentWarningCount,
            previousCount: prevWarningCount,
            timestamp: new Date(),
            message: `주의가 필요한 ${currentWarningCount}개 항목이 있습니다.`
          });

          this.lastCheckResults.set('warning', currentWarningCount);
        }
      }

    } catch (error) {
      console.error('❌ 경고 항목 체크 실패:', error);
    }
  }

  /**
   * ℹ️ 정보 항목 체크 (Info Level)
   */
  async checkInfoItems() {
    try {
      console.log('ℹ️ 정보 항목 체크 시작...');

      const infoItems = await Promise.all([
        actionItemService.getUnprocessedMatches()
      ]);

      const activeInfoItems = infoItems.filter(item => item.count > 0);

      if (activeInfoItems.length > 0) {
        const currentInfoCount = activeInfoItems.reduce((sum, item) => sum + item.count, 0);
        const prevInfoCount = this.lastCheckResults.get('info') || 0;

        // 정보 항목은 10% 이상 변화가 있을 때만 알림
        const changePercentage = prevInfoCount > 0 ? Math.abs(currentInfoCount - prevInfoCount) / prevInfoCount : 1;

        if (changePercentage >= 0.1) {
          console.log(`📊 정보 항목 변화: ${prevInfoCount} → ${currentInfoCount}`);

          this.emitActionItemsUpdate({
            type: 'info',
            items: activeInfoItems,
            totalCount: currentInfoCount,
            previousCount: prevInfoCount,
            timestamp: new Date(),
            message: `${currentInfoCount}개의 정보 항목이 업데이트되었습니다.`
          });

          this.lastCheckResults.set('info', currentInfoCount);
        }
      }

    } catch (error) {
      console.error('❌ 정보 항목 체크 실패:', error);
    }
  }

  /**
   * 🔄 전체 항목 체크
   */
  async checkAllItems() {
    try {
      console.log('🔄 전체 액션 아이템 체크 시작...');

      const allItems = await actionItemService.getAllActionItems();

      // 심각도별 분류
      const dangerItems = allItems.filter(item => item.type === 'danger');
      const warningItems = allItems.filter(item => item.type === 'warning');
      const infoItems = allItems.filter(item => item.type === 'info');

      const summary = {
        danger: dangerItems.reduce((sum, item) => sum + item.count, 0),
        warning: warningItems.reduce((sum, item) => sum + item.count, 0),
        info: infoItems.reduce((sum, item) => sum + item.count, 0),
        total: allItems.reduce((sum, item) => sum + item.count, 0)
      };

      console.log('📊 전체 상황 요약:', summary);

      // 전체 상태 브로드캐스트
      this.emitActionItemsUpdate({
        type: 'full-check',
        items: allItems,
        summary,
        timestamp: new Date(),
        message: `전체 ${summary.total}개 항목 (긴급: ${summary.danger}, 경고: ${summary.warning}, 정보: ${summary.info})`
      });

      // 현재 상태 저장
      this.lastCheckResults.set('danger', summary.danger);
      this.lastCheckResults.set('warning', summary.warning);
      this.lastCheckResults.set('info', summary.info);

    } catch (error) {
      console.error('❌ 전체 항목 체크 실패:', error);
    }
  }

  /**
   * WebSocket을 통한 액션 아이템 업데이트 알림
   * @param {Object} updateData - 업데이트 데이터
   */
  emitActionItemsUpdate(updateData) {
    if (!this.webSocketService) {
      console.log('⚠️ WebSocket 서비스가 설정되지 않았습니다.');
      return;
    }

    try {
      // 관리자들에게만 브로드캐스트
      this.webSocketService.emitToAdmins('action-items-update', updateData);

      console.log(`📡 액션 아이템 업데이트 전송: ${updateData.type} (${updateData.totalCount}개)`);
    } catch (error) {
      console.error('❌ WebSocket 업데이트 전송 실패:', error);
    }
  }

  /**
   * 현재 모니터링 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      lastResults: Object.fromEntries(this.lastCheckResults),
      nextRuns: this.jobs.size > 0 ? {
        danger: '매 2분',
        warning: '매 10분',
        info: '매 30분',
        full: '매 1시간'
      } : {},
      uptime: this.isRunning ? 'running' : 'stopped'
    };
  }

  /**
   * 수동으로 모든 항목 체크 실행
   */
  async manualCheck() {
    console.log('🔧 수동 액션 아이템 체크 실행...');

    await Promise.all([
      this.checkDangerItems(),
      this.checkWarningItems(),
      this.checkInfoItems()
    ]);

    console.log('✅ 수동 체크 완료');
  }
}

export default new ActionItemMonitorJob();