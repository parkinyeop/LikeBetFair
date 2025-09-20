import Settings from '../models/settingsModel.js';
import { adjustOddsPayout } from '../utils/oddsUtils.js';

/**
 * 익스체인지 배당율 환수율 관리 서비스
 */
class ExchangeOddsReturnRateService {
  
  /**
   * 배당율 환수율 설정 조회
   */
  static async getOddsReturnRateSettings() {
    try {
      const returnRateSetting = await Settings.findOne({ 
        where: { key: 'exchange_odds_return_rate' } 
      });
      const enabledSetting = await Settings.findOne({ 
        where: { key: 'exchange_odds_return_rate_enabled' } 
      });

      const returnRate = returnRateSetting ? parseFloat(returnRateSetting.value) : 0.95; // 기본 95%
      const enabled = enabledSetting ? enabledSetting.value === 'true' : true;

      return {
        returnRate,
        enabled
      };
    } catch (error) {
      console.error('[ExchangeOddsReturnRate] 설정 조회 오류:', error);
      return {
        returnRate: 0.95, // 기본 95%
        enabled: true
      };
    }
  }

  /**
   * 배당율 환수율 설정 업데이트
   */
  static async updateOddsReturnRateSettings({ returnRate, enabled }) {
    try {
      const updates = [];
      
      if (returnRate !== undefined) {
        updates.push(Settings.upsert({ 
          key: 'exchange_odds_return_rate', 
          value: returnRate.toString(), 
          description: '익스체인지 배당율 환수율 (0.95 = 95%)', 
          category: 'exchange_odds' 
        }));
      }
      
      if (enabled !== undefined) {
        updates.push(Settings.upsert({ 
          key: 'exchange_odds_return_rate_enabled', 
          value: enabled.toString(), 
          description: '익스체인지 배당율 환수율 적용 활성화 여부', 
          category: 'exchange_odds' 
        }));
      }

      await Promise.all(updates);
      console.log('[ExchangeOddsReturnRate] 설정 업데이트 완료:', { returnRate, enabled });
      return { success: true };
    } catch (error) {
      console.error('[ExchangeOddsReturnRate] 설정 업데이트 오류:', error);
      return { success: false, error: '설정 업데이트 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 배당율에 환수율 적용
   * @param {number} originalOdds - 원본 배당율
   * @returns {number} - 환수율이 적용된 배당율
   */
  static async applyReturnRateToOdds(originalOdds) {
    if (originalOdds === null || originalOdds === undefined) {
      return null;
    }

    const settings = await this.getOddsReturnRateSettings();

    if (!settings.enabled) {
      return originalOdds; // 환수율 적용 비활성화 시 원본 반환
    }

    const returnRate = settings.returnRate || 0.95;
    
    // 환수율 계산: 원본 배당률 × 환수율
    const adjustedOdds = originalOdds * returnRate;
    
    console.log(`[ExchangeOddsReturnRate] 배당율 조정: ${originalOdds} × ${returnRate} = ${adjustedOdds.toFixed(2)}`);
    
    return parseFloat(adjustedOdds.toFixed(2)); // 소수점 2자리로 반환
  }

  /**
   * 배당율 배열에 환수율 적용 (새로운 메서드)
   * @param {number[]} oddsArray - 원본 배당율 배열
   * @returns {number[]} - 환수율이 적용된 배당율 배열
   */
  static async applyReturnRateToOddsArray(oddsArray) {
    if (!oddsArray || !Array.isArray(oddsArray) || oddsArray.length === 0) {
      return oddsArray;
    }

    const settings = await this.getOddsReturnRateSettings();

    if (!settings.enabled) {
      return oddsArray; // 환수율 적용 비활성화 시 원본 반환
    }

    const returnRate = settings.returnRate || 0.95;
    
    // oddsUtils의 adjustOddsPayout 함수 사용
    const adjustedOdds = adjustOddsPayout(oddsArray, returnRate);
    
    console.log(`[ExchangeOddsReturnRate] 배당율 배열 조정: [${oddsArray.join(', ')}] × ${returnRate} = [${adjustedOdds.join(', ')}]`);
    
    return adjustedOdds;
  }
}

export default ExchangeOddsReturnRateService;