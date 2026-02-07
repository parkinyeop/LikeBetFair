import Settings from '../models/settingsModel.js';

/**
 * 베팅 금액 설정 관리 서비스
 * 스포츠북과 익스체인지의 최대/최소 베팅 금액을 관리
 */
class BettingAmountSettingsService {
  
  /**
   * 모든 베팅 금액 설정 조회
   */
  static async getBettingAmountSettings() {
    try {
      console.log('🔍 [BettingAmountSettings] 베팅 금액 설정 조회 시작');
      
      const settings = await Settings.findAll({
        where: {
          category: 'betting_limits'
        }
      });

      // 설정을 객체로 변환
      const settingsMap = {};
      settings.forEach(setting => {
        settingsMap[setting.key] = parseInt(setting.value);
      });

      const result = {
        sportsbook: {
          minBetAmount: settingsMap['sportsbook_min_bet_amount'] || 1000,
          maxBetAmount: settingsMap['sportsbook_max_bet_amount'] || 1000000
        },
        exchange: {
          minBetAmount: settingsMap['exchange_min_bet_amount'] || 5000,
          maxBetAmount: settingsMap['exchange_max_bet_amount'] || 5000000
        }
      };

      console.log('✅ [BettingAmountSettings] 베팅 금액 설정 조회 완료:', result);
      return result;
    } catch (error) {
      console.error('❌ [BettingAmountSettings] 베팅 금액 설정 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 플랫폼의 베팅 금액 설정 조회
   */
  static async getPlatformBettingSettings(platform) {
    try {
      console.log(`🔍 [BettingAmountSettings] ${platform} 베팅 설정 조회 시작`);
      
      const settings = await this.getBettingAmountSettings();
      
      if (platform === 'sportsbook') {
        return settings.sportsbook;
      } else if (platform === 'exchange') {
        return settings.exchange;
      } else {
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
      }
    } catch (error) {
      console.error(`❌ [BettingAmountSettings] ${platform} 베팅 설정 조회 실패:`, error);
      throw error;
    }
  }

  /**
   * 베팅 금액 설정 업데이트
   */
  static async updateBettingAmountSettings(platform, settings) {
    try {
      console.log(`🔧 [BettingAmountSettings] ${platform} 베팅 설정 업데이트 시작:`, settings);
      
      const updates = [];
      
      if (platform === 'sportsbook') {
        if (settings.minBetAmount !== undefined) {
          updates.push({
            key: 'sportsbook_min_bet_amount',
            value: settings.minBetAmount.toString()
          });
        }
        if (settings.maxBetAmount !== undefined) {
          updates.push({
            key: 'sportsbook_max_bet_amount', 
            value: settings.maxBetAmount.toString()
          });
        }
      } else if (platform === 'exchange') {
        if (settings.minBetAmount !== undefined) {
          updates.push({
            key: 'exchange_min_bet_amount',
            value: settings.minBetAmount.toString()
          });
        }
        if (settings.maxBetAmount !== undefined) {
          updates.push({
            key: 'exchange_max_bet_amount',
            value: settings.maxBetAmount.toString()
          });
        }
      } else {
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
      }

      // 각 설정 업데이트
      for (const update of updates) {
        await Settings.upsert({
          key: update.key,
          value: update.value,
          description: `${platform} ${update.key.includes('min') ? '최소' : '최대'} 베팅 금액 (원)`,
          category: 'betting_limits'
        });
      }

      console.log(`✅ [BettingAmountSettings] ${platform} 베팅 설정 업데이트 완료`);
      
      // 업데이트된 설정 반환
      return await this.getPlatformBettingSettings(platform);
    } catch (error) {
      console.error(`❌ [BettingAmountSettings] ${platform} 베팅 설정 업데이트 실패:`, error);
      throw error;
    }
  }

  /**
   * 베팅 금액 검증
   */
  static async validateBettingAmount(platform, amount) {
    try {
      const settings = await this.getPlatformBettingSettings(platform);
      
      if (amount < settings.minBetAmount) {
        return {
          isValid: false,
          reason: `최소 베팅 금액은 ${settings.minBetAmount.toLocaleString()}원입니다.`
        };
      }
      
      if (amount > settings.maxBetAmount) {
        return {
          isValid: false,
          reason: `최대 베팅 금액은 ${settings.maxBetAmount.toLocaleString()}원입니다.`
        };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error(`❌ [BettingAmountSettings] ${platform} 베팅 금액 검증 실패:`, error);
      return {
        isValid: false,
        reason: '베팅 금액 검증 중 오류가 발생했습니다.'
      };
    }
  }
}

export default BettingAmountSettingsService;
