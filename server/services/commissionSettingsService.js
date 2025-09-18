import Settings from '../models/settingsModel.js';

/**
 * 수수료율 설정 관리 서비스
 */
class CommissionSettingsService {
  
  /**
   * 플랫폼별 수수료율 조회
   * @param {string} platform - 'sportsbook' 또는 'exchange'
   * @returns {number} 수수료율 (0.0 ~ 1.0)
   */
  static async getCommissionRate(platform) {
    try {
      const settingKey = platform === 'sportsbook' 
        ? 'sportsbook_commission_rate' 
        : 'exchange_commission_rate';
        
      const setting = await Settings.findOne({
        where: { key: settingKey },
        attributes: ['value']
      });

      if (setting) {
        return parseFloat(setting.value) || 0;
      }

      // 기본값 반환
      return platform === 'sportsbook' ? 0.05 : 0.03;
    } catch (error) {
      console.error(`[CommissionSettings] ${platform} 수수료율 조회 오류:`, error);
      return platform === 'sportsbook' ? 0.05 : 0.03; // 기본값
    }
  }

  /**
   * 모든 수수료율 설정 조회
   * @returns {Object} 플랫폼별 수수료율
   */
  static async getAllCommissionRates() {
    try {
      const settings = await Settings.findAll({
        where: { 
          key: { 
            [require('sequelize').Op.in]: [
              'sportsbook_commission_rate', 
              'exchange_commission_rate'
            ] 
          } 
        },
        attributes: ['key', 'value']
      });

      const result = {
        sportsbook: 0.05, // 기본값
        exchange: 0.03    // 기본값
      };

      settings.forEach(setting => {
        if (setting.key === 'sportsbook_commission_rate') {
          result.sportsbook = parseFloat(setting.value) || 0.05;
        } else if (setting.key === 'exchange_commission_rate') {
          result.exchange = parseFloat(setting.value) || 0.03;
        }
      });

      return result;
    } catch (error) {
      console.error('[CommissionSettings] 수수료율 조회 오류:', error);
      return {
        sportsbook: 0.05,
        exchange: 0.03
      };
    }
  }

  /**
   * 수수료율 업데이트
   * @param {string} platform - 'sportsbook' 또는 'exchange'
   * @param {number} rate - 수수료율 (0.0 ~ 1.0)
   * @returns {Object} 결과
   */
  static async updateCommissionRate(platform, rate) {
    try {
      if (rate < 0 || rate > 1) {
        return { success: false, error: '수수료율은 0과 1 사이여야 합니다.' };
      }

      const settingKey = platform === 'sportsbook' 
        ? 'sportsbook_commission_rate' 
        : 'exchange_commission_rate';

      const description = platform === 'sportsbook' 
        ? '스포츠북 수수료율' 
        : '익스체인지 수수료율';

      await Settings.upsert({
        key: settingKey,
        value: rate.toString(),
        description: description,
        category: 'commission_settings'
      });

      console.log(`[CommissionSettings] ${platform} 수수료율 업데이트: ${(rate * 100).toFixed(2)}%`);
      return { success: true };
    } catch (error) {
      console.error(`[CommissionSettings] ${platform} 수수료율 업데이트 오류:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 수수료 계산
   * @param {number} winnings - 당첨금
   * @param {number} stake - 베팅금
   * @param {number} commissionRate - 수수료율
   * @returns {number} 수수료 금액
   */
  static calculateCommission(winnings, stake, commissionRate) {
    const profit = winnings - stake;
    return Math.max(0, profit * commissionRate);
  }
}

export default CommissionSettingsService;
