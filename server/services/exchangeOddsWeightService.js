import Settings from '../models/settingsModel.js';

/**
 * 익스체인지 배당율 가중치 관리 서비스 (단순화 버전)
 */
class ExchangeOddsWeightService {
  
  /**
   * 배당율 가중치 설정 조회
   */
  static async getOddsWeightSettings() {
    try {
      const weightSetting = await Settings.findOne({ 
        where: { key: 'exchange_odds_weight_percentage' } 
      });
      const enabledSetting = await Settings.findOne({ 
        where: { key: 'exchange_odds_weight_enabled' } 
      });

      const weightPercentage = weightSetting ? parseFloat(weightSetting.value) : 0.1; // 기본 10%
      const enabled = enabledSetting ? enabledSetting.value === 'true' : true;

      return {
        weightPercentage,
        enabled
      };
    } catch (error) {
      console.error('[ExchangeOddsWeight] 설정 조회 오류:', error);
      return {
        weightPercentage: 0.1, // 기본 10%
        enabled: true
      };
    }
  }

  /**
   * 배당율 가중치 설정 업데이트
   */
  static async updateOddsWeightSettings({ weightPercentage, enabled }) {
    try {
      const updates = [];
      
      if (weightPercentage !== undefined) {
        updates.push(Settings.upsert({ 
          key: 'exchange_odds_weight_percentage', 
          value: weightPercentage.toString(), 
          description: '익스체인지 배당율 가중치 퍼센트 (0.1 = 10%)', 
          category: 'exchange_odds' 
        }));
      }
      
      if (enabled !== undefined) {
        updates.push(Settings.upsert({ 
          key: 'exchange_odds_weight_enabled', 
          value: enabled.toString(), 
          description: '익스체인지 배당율 가중치 적용 활성화 여부', 
          category: 'exchange_odds' 
        }));
      }

      await Promise.all(updates);
      console.log('[ExchangeOddsWeight] 설정 업데이트 완료:', { weightPercentage, enabled });
      return { success: true };
    } catch (error) {
      console.error('[ExchangeOddsWeight] 설정 업데이트 오류:', error);
      return { success: false, error: '설정 업데이트 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 배당율에 가중치 적용 (단순화)
   * @param {number} originalOdds - 원본 배당율
   * @returns {number} - 가중치가 적용된 배당율
   */
  static async applyWeightToOdds(originalOdds) {
    if (originalOdds === null || originalOdds === undefined) {
      return null;
    }

    const settings = await this.getOddsWeightSettings();

    if (!settings.enabled) {
      return originalOdds; // 가중치 적용 비활성화 시 원본 반환
    }

    const weightPercentage = settings.weightPercentage || 0.1;
    
    // 간단한 계산: 원본 배당률 × (1 + 가중치%)
    const adjustedOdds = originalOdds * (1 + weightPercentage);
    
    console.log(`[ExchangeOddsWeight] 배당율 조정: ${originalOdds} × (1 + ${weightPercentage}) = ${adjustedOdds.toFixed(2)}`);
    
    return parseFloat(adjustedOdds.toFixed(2)); // 소수점 2자리로 반환
  }
}

export default ExchangeOddsWeightService;