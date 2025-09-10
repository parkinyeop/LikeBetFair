import { ExchangeOrder, User } from '../models/index.js';
import { ExchangeMultibetValidationService } from '../services/exchangeMultibetValidation.js';
import sequelize from '../models/sequelize.js';

/**
 * 익스체인지 멀티배팅 컨트롤러
 * 기존 ExchangeOrders 테이블을 사용하여 멀티배팅 구현
 */
class ExchangeMultibetController {

  /**
   * 🎯 멀티배팅 주문 생성
   */
  static async createMultibet(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { selections, stake, totalOdds, description } = req.body;
      const userId = req.user.userId;

      console.log('🎯 [MultibetController] 멀티배팅 주문 생성 시작:', {
        userId,
        selectionCount: selections?.length,
        stake,
        totalOdds,
        description
      });

      // 🆕 selections 데이터 상세 로그 (별도 파일로 저장)
      if (selections && selections.length > 0) {
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        
        const debugInfo = {
          timestamp: new Date().toISOString(),
          userId,
          selectionCount: selections.length,
          firstSelection: {
            commenceTime: selections[0].commenceTime,
            type: typeof selections[0].commenceTime,
            homeTeam: selections[0].homeTeam,
            awayTeam: selections[0].awayTeam
          },
          allSelections: selections.map((selection, index) => ({
            index: index + 1,
            commenceTime: selection.commenceTime,
            type: typeof selection.commenceTime,
            homeTeam: selection.homeTeam,
            awayTeam: selection.awayTeam
          }))
        };
        
        const logFile = path.join(process.cwd(), 'logs/multibet-debug.log');
        const logEntry = `\n🎯 ===== 멀티배팅 주문 생성 디버깅 =====\n${JSON.stringify(debugInfo, null, 2)}\n🎯 ======================================\n`;
        
        fs.appendFileSync(logFile, logEntry);
        console.log('🔍 멀티배팅 디버깅 로그가 multibet-debug.log에 저장되었습니다.');
      }

      // 1. 기본 데이터 검증
      if (!selections || !Array.isArray(selections) || selections.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: '선택된 베팅이 없습니다.' 
        });
      }

      if (!stake || stake <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: '베팅 금액이 유효하지 않습니다.' 
        });
      }

      if (!totalOdds || totalOdds <= 1) {
        return res.status(400).json({ 
          success: false, 
          message: '총 배당율이 유효하지 않습니다.' 
        });
      }

      // 2. 사용자 존재 확인 및 잔액 검증
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: '사용자를 찾을 수 없습니다.' 
        });
      }

      // 3. 베팅 금액 검증 (스포츠북과 동일: 최소 1000원, 최대는 잔액 한도)
      if (stake < 1000) {
        return res.status(400).json({ 
          success: false, 
          message: '최소 베팅 금액은 1,000원입니다.' 
        });
      }

      if (stake > user.balance) {
        return res.status(400).json({ 
          success: false, 
          message: '잔액이 부족합니다.' 
        });
      }

      // 4. 멀티배팅 검증 (스포츠북과 동일한 규칙)
      const validation = await ExchangeMultibetValidationService.validateMultibet(
        userId, 
        selections, 
        stake, 
        totalOdds
      );

      if (!validation.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: validation.reason 
        });
      }

      // 5. totalOdds 재계산 (프론트엔드와 동일한 로직)
      const calculatedTotalOdds = selections.reduce((acc, selection) => {
        return acc * (parseFloat(selection.odds) || 1);
      }, 1);
      
      console.log(`📊 totalOdds 계산: 프론트엔드 ${totalOdds} vs 백엔드 ${calculatedTotalOdds}`);
      
      // 6. 멀티배팅 주문 생성 (기존 ExchangeOrders 테이블 사용)
      const multibetOrder = await ExchangeOrder.create({
        userId,
        gameId: 'multibet_' + Date.now(), // 멀티배팅용 고유 ID
        market: 'multibet',
        line: 0,
        side: 'back', // 멀티배팅은 항상 back (사용자 베팅)
        price: calculatedTotalOdds, // 계산된 totalOdds 사용
        amount: stake,
        status: 'open',
        stakeAmount: stake,
        potentialProfit: parseFloat((stake * calculatedTotalOdds - stake).toFixed(2)), // 🆕 소수점 처리
        isMultibet: true,
        totalOdds: calculatedTotalOdds, // 계산된 totalOdds 사용
        potentialWinnings: parseFloat((stake * calculatedTotalOdds).toFixed(2)), // 🆕 소수점 처리
        selectionCount: selections.length,
        selectionDetails: {
          selections: selections.map(s => ({
            gameId: s.gameId,
            market: s.market,
            selection: s.selection,
            team: s.team || s.selection, // 🆕 team 필드 추가
            odds: s.odds,
            homeTeam: s.homeTeam,
            awayTeam: s.awayTeam,
            commenceTime: s.commenceTime || new Date().toISOString(), // 이미 UTC ISO 문자열이므로 그대로 사용
            sportKey: s.sportKey,
            desc: s.desc || `${s.homeTeam} vs ${s.awayTeam}`, // 🆕 desc 필드 추가
            option: s.option, // 🆕 option 필드 추가 (Over/Under용)
            point: s.point // 🆕 point 필드 추가 (Over/Under용)
          })),
          multibetType: 'accumulator',
          description: description || '멀티배팅'
        },
        description: description || '멀티배팅',
        // 🆕 필수 필드들 추가
        originalAmount: stake,
        remainingAmount: stake,
        filledAmount: 0,
        partiallyFilled: false,
        autoSettlement: true,
        homeTeam: selections[0]?.homeTeam || '멀티배팅',
        awayTeam: selections[0]?.awayTeam || '멀티배팅',
        commenceTime: selections[0]?.commenceTime ?
          (selections[0].commenceTime.endsWith('Z') ? selections[0].commenceTime : selections[0].commenceTime + 'Z') :
          new Date().toISOString(), // UTC ISO 문자열로 저장 (VARCHAR 컬럼)
        sportKey: selections[0]?.sportKey || 'multibet'
      }, { transaction });

      // 6. 사용자 잔액 차감
      user.balance -= stake;
      await user.save({ transaction });

      // 7. 거래 커밋
      await transaction.commit();

      console.log('✅ [MultibetController] 멀티배팅 주문 생성 성공:', {
        multibetId: multibetOrder.id,
        userId,
        stake,
        selectionCount: selections.length
      });

      res.status(201).json({
        success: true,
        message: '멀티배팅 주문이 성공적으로 생성되었습니다.',
        data: {
          multibet: {
            id: multibetOrder.id,
            status: multibetOrder.status,
            totalStake: multibetOrder.stakeAmount,
            totalOdds: multibetOrder.totalOdds,
            potentialWinnings: multibetOrder.potentialWinnings,
            selectionCount: multibetOrder.selectionCount,
            createdAt: multibetOrder.createdAt
          },
          selections: multibetOrder.selectionDetails.selections,
          balance: user.balance
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [MultibetController] 멀티배팅 주문 생성 실패:', error);
      
      res.status(500).json({
        success: false,
        message: '멀티배팅 주문 생성 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  /**
   * 멀티배팅 주문 조회
   */
  static async getMultibet(req, res) {
    try {
      const { multibetId } = req.params;
      const userId = req.user.userId;

      console.log(`[MultibetController] 멀티배팅 조회 - ID: ${multibetId}, 사용자: ${userId}`);

      // 멀티배팅 조회 (본인 것만)
      const multibet = await ExchangeOrder.findOne({
        where: { 
          id: multibetId, 
          userId,
          isMultibet: true
        }
      });

      if (!multibet) {
        return res.status(404).json({
          success: false,
          message: '멀티배팅을 찾을 수 없습니다.'
        });
      }

      res.json({
        success: true,
        data: multibet
      });

    } catch (error) {
      console.error('[MultibetController] 멀티배팅 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '멀티배팅 조회 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  /**
   * 사용자의 멀티배팅 목록 조회
   */
  static async getUserMultibets(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, status } = req.query;

      console.log(`[MultibetController] 사용자 멀티배팅 목록 조회 - 사용자: ${userId}, 페이지: ${page}, 상태: ${status}`);

      // 필터 조건 구성
      const whereClause = { 
        userId,
        isMultibet: true
      };
      if (status) {
        whereClause.status = status;
      }

      // 페이징 처리
      const offset = (page - 1) * limit;
      
      const { count, rows: multibets } = await ExchangeOrder.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          multibets,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('[MultibetController] 사용자 멀티배팅 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '멀티배팅 목록 조회 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  /**
   * 멀티배팅 취소
   */
  static async cancelMultibet(req, res) {
    try {
      const { multibetId } = req.params;
      const userId = req.user.userId;

      console.log(`[MultibetController] 멀티배팅 취소 - ID: ${multibetId}, 사용자: ${userId}`);

      const transaction = await sequelize.transaction();

      try {
        // 멀티배팅 조회 및 권한 확인
        const multibet = await ExchangeOrder.findOne({
          where: { 
            id: multibetId, 
            userId,
            isMultibet: true
          },
          transaction
        });

        if (!multibet) {
          return res.status(404).json({
            success: false,
            message: '멀티배팅을 찾을 수 없습니다.'
          });
        }

        if (multibet.status !== 'open') {
          return res.status(400).json({
            success: false,
            message: '취소할 수 없는 상태입니다.'
          });
        }

        // 상태 변경 및 환불
        multibet.status = 'cancelled';
        await multibet.save({ transaction });

        // 사용자 잔액 환불
        const user = await User.findByPk(userId, { transaction });
        user.balance += multibet.stakeAmount;
        await user.save({ transaction });

        await transaction.commit();

        res.json({
          success: true,
          message: '멀티배팅이 성공적으로 취소되었습니다.',
          data: {
            multibetId: multibet.id,
            refundedAmount: multibet.stakeAmount,
            newBalance: user.balance
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('[MultibetController] 멀티배팅 취소 오류:', error);
      res.status(500).json({
        success: false,
        message: '멀티배팅 취소 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }
}

export { ExchangeMultibetController };
