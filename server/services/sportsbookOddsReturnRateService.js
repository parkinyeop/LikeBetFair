import Settings from '../models/settingsModel.js';
import { adjustOddsPayout } from '../utils/oddsUtils.js';

/**
 * 스포츠북 배당율 환수율 관리 서비스
 * 기존 exchangeOddsReturnRateService.js와 동일한 패턴으로 구현
 */
class SportsbookOddsReturnRateService {
  
  /**
   * 스포츠북 배당율 환수율 설정 조회
   */
  static async getOddsReturnRateSettings() {
    try {
      const returnRateSetting = await Settings.findOne({ 
        where: { key: 'sportsbook_odds_return_rate' } 
      });
      const enabledSetting = await Settings.findOne({ 
        where: { key: 'sportsbook_odds_return_rate_enabled' } 
      });

      const returnRate = returnRateSetting ? parseFloat(returnRateSetting.value) : 0.95; // 기본 95%
      const enabled = enabledSetting ? enabledSetting.value === 'true' : true;

      return {
        returnRate,
        enabled
      };
    } catch (error) {
      console.error('[SportsbookOddsReturnRate] 설정 조회 오류:', error);
      return {
        returnRate: 0.95, // 기본 95%
        enabled: true
      };
    }
  }

  /**
   * 스포츠북 배당율 환수율 설정 업데이트
   */
  static async updateOddsReturnRateSettings({ returnRate, enabled }) {
    try {
      console.log('[SportsbookOddsReturnRate] 설정 업데이트:', { returnRate, enabled });
      
      const updates = [];
      
      if (returnRate !== undefined) {
        updates.push(Settings.upsert({ 
          key: 'sportsbook_odds_return_rate', 
          value: returnRate.toString(), 
          description: '스포츠북 배당율 환수율 (0.95 = 95%)', 
          category: 'sportsbook_odds' 
        }));
      }
      
      if (enabled !== undefined) {
        updates.push(Settings.upsert({ 
          key: 'sportsbook_odds_return_rate_enabled', 
          value: enabled.toString(), 
          description: '스포츠북 배당율 환수율 적용 활성화 여부', 
          category: 'sportsbook_odds'
        }));
      }

      await Promise.all(updates);
      
      console.log('[SportsbookOddsReturnRate] 설정 업데이트 완료');
      
      return {
        success: true,
        message: '스포츠북 환수율 설정이 성공적으로 업데이트되었습니다.'
      };
    } catch (error) {
      console.error('[SportsbookOddsReturnRate] 설정 업데이트 오류:', error);
      return {
        success: false,
        message: '설정 업데이트 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 배당율 배열에 환수율 적용 (올바른 방식)
   * @param {number[]} oddsArray - 원본 배당율 배열
   * @returns {number[]} - 환수율이 적용된 배당율 배열
   */
  static async applyReturnRateToOddsArray(oddsArray) {
    if (!oddsArray || !Array.isArray(oddsArray) || oddsArray.length === 0) {
      return oddsArray;
    }

    const settings = await this.getOddsReturnRateSettings();
    console.log(`[SportsbookOddsReturnRate] 설정 확인:`, settings);

    if (!settings.enabled) {
      console.log(`[SportsbookOddsReturnRate] 환수율 적용 비활성화됨 - 원본 반환`);
      return oddsArray; // 환수율 적용 비활성화 시 원본 반환
    }

    const returnRate = settings.returnRate || 0.95;
    
    // oddsUtils의 adjustOddsPayout 함수 사용 (올바른 방식)
    const adjustedOdds = adjustOddsPayout(oddsArray, returnRate);
    
    console.log(`[SportsbookOddsReturnRate] 배당율 배열 조정: [${oddsArray.join(', ')}] → [${adjustedOdds.join(', ')}] (환수율: ${(returnRate * 100).toFixed(1)}%)`);
    
    return adjustedOdds;
  }

  /**
   * 단일 배당율에 환수율 적용 (단일 배당률용)
   * @param {number} odds - 원본 배당율
   * @returns {number} - 환수율이 적용된 배당율
   */
  static async applyReturnRateToSingleOdds(odds) {
    if (!odds || typeof odds !== 'number' || odds <= 0) {
      return odds;
    }

    const settings = await this.getOddsReturnRateSettings();

    if (!settings.enabled) {
      return odds; // 환수율 적용 비활성화 시 원본 반환
    }

    const returnRate = settings.returnRate || 0.95;
    
    // 단일 배당률의 경우: odds / returnRate (익스체인지와 동일한 방식)
    const adjustedOdds = odds / returnRate;
    
    console.log(`[SportsbookOddsReturnRate] 단일 배당율 조정: ${odds} / ${returnRate} = ${adjustedOdds.toFixed(3)} (환수율: ${(returnRate * 100).toFixed(1)}%)`);
    
    return adjustedOdds;
  }
}

export default SportsbookOddsReturnRateService;
