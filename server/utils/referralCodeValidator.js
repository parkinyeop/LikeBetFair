import User from '../models/userModel.js';
import ReferralCode from '../models/referralCodeModel.js';
import { Op } from 'sequelize';

/**
 * 추천코드 중복 검사 통합 유틸리티
 * ReferralCode 테이블과 User 테이블을 모두 검사하여 완전한 중복 방지
 */
export class ReferralCodeValidator {
  
  /**
   * 추천코드 중복 검사
   * @param {string} code - 검사할 추천코드
   * @param {string|null} excludeUserId - 제외할 사용자 ID (업데이트 시 사용)
   * @returns {Promise<{isValid: boolean, message: string|null}>}
   */
  static async validateCode(code) {
    try {
      // 1. 기본 형식 검증
      if (!code || typeof code !== 'string') {
        return { isValid: false, message: '추천코드가 입력되지 않았습니다.' };
      }

      if (code.length !== 4) {
        return { isValid: false, message: '추천코드는 정확히 4자리여야 합니다.' };
      }

      // 영문 대문자와 숫자만 허용
      const validPattern = /^[A-Z0-9]{4}$/;
      if (!validPattern.test(code)) {
        return { isValid: false, message: '추천코드는 영문 대문자와 숫자만 사용 가능합니다.' };
      }

      // 2. ReferralCode 테이블 중복 검사
      const existingReferralCode = await ReferralCode.findOne({ 
        where: { code: code.toUpperCase() } 
      });
      
      if (existingReferralCode) {
        return { 
          isValid: false, 
          message: `추천코드 '${code.toUpperCase()}'는 이미 관리자가 생성한 코드입니다.` 
        };
      }

      // 3. User 테이블 중복 검사
      const existingUser = await User.findOne({ 
        where: { referralCode: code.toUpperCase() } 
      });
      
      if (existingUser) {
        return { 
          isValid: false, 
          message: `추천코드 '${code.toUpperCase()}'는 이미 다른 사용자가 사용 중입니다.` 
        };
      }

      return { isValid: true, message: null };

    } catch (error) {
      console.error('ReferralCode validation error:', error);
      return { isValid: false, message: '추천코드 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 사용자 업데이트 시 추천코드 중복 검사
   * @param {string} code - 검사할 추천코드
   * @param {string} userId - 업데이트할 사용자 ID
   * @returns {Promise<{isValid: boolean, message: string|null}>}
   */
  static async validateCodeForUser(code, userId) {
    try {
      // 1. 기본 형식 검증
      if (!code || typeof code !== 'string') {
        return { isValid: false, message: '추천코드가 입력되지 않았습니다.' };
      }

      if (code.length !== 4) {
        return { isValid: false, message: '추천코드는 정확히 4자리여야 합니다.' };
      }

      // 영문 대문자와 숫자만 허용
      const validPattern = /^[A-Z0-9]{4}$/;
      if (!validPattern.test(code)) {
        return { isValid: false, message: '추천코드는 영문 대문자와 숫자만 사용 가능합니다.' };
      }

      // 2. ReferralCode 테이블 중복 검사
      const existingReferralCode = await ReferralCode.findOne({ 
        where: { code: code.toUpperCase() } 
      });
      
      if (existingReferralCode) {
        return { 
          isValid: false, 
          message: `추천코드 '${code.toUpperCase()}'는 이미 관리자가 생성한 코드입니다.` 
        };
      }

      // 3. User 테이블 중복 검사 (자신 제외)
      const existingUser = await User.findOne({ 
        where: { 
          referralCode: code.toUpperCase(),
          id: { [Op.ne]: userId }
        } 
      });
      
      if (existingUser) {
        return { 
          isValid: false, 
          message: `추천코드 '${code.toUpperCase()}'는 이미 다른 사용자가 사용 중입니다.` 
        };
      }

      return { isValid: true, message: null };

    } catch (error) {
      console.error('ReferralCode validation error:', error);
      return { isValid: false, message: '추천코드 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 추천인 코드 존재 검사
   * @param {string} code - 검사할 추천인 코드
   * @returns {Promise<{exists: boolean, message: string|null}>}
   */
  static async validateReferrerCode(code) {
    try {
      if (!code || typeof code !== 'string') {
        return { exists: false, message: '추천인 코드가 입력되지 않았습니다.' };
      }

      const referralCode = await ReferralCode.findOne({
        where: { code: code.toUpperCase(), isActive: true }
      });

      if (!referralCode) {
        return { 
          exists: false, 
          message: `추천인 코드 '${code.toUpperCase()}'는 존재하지 않거나 비활성화된 코드입니다.` 
        };
      }

      return { exists: true, message: null };

    } catch (error) {
      console.error('Referrer code validation error:', error);
      return { exists: false, message: '추천인 코드 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 랜덤 추천코드 생성
   * @param {number} maxAttempts - 최대 시도 횟수
   * @returns {Promise<string|null>}
   */
  static async generateRandomCode(maxAttempts = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // 생성된 코드가 중복되지 않는지 확인
      const validation = await this.validateCode(result);
      if (validation.isValid) {
        return result;
      }
    }
    
    return null; // 모든 시도 실패
  }
}

export default ReferralCodeValidator;
