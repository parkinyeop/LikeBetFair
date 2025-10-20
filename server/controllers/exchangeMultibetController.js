import { ExchangeOrder, User } from '../models/index.js';
import { ExchangeMultibetValidationService } from '../services/exchangeMultibetValidation.js';
import BettingAmountSettingsService from '../services/bettingAmountSettingsService.js';
import balanceService from '../services/balanceService.js';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

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

      // 3. 베팅 금액 검증 (동적 설정 사용)
      try {
        const bettingSettings = await BettingAmountSettingsService.getPlatformBettingSettings('exchange');
        console.log('🎯 [ExchangeMultibet] 익스체인지 베팅 설정:', bettingSettings);
        
        if (bettingSettings.minBetAmount && stake < bettingSettings.minBetAmount) {
          console.log('❌ [ExchangeMultibet] 최소 베팅 금액 미달:', { 
            stake, 
            minBetAmount: bettingSettings.minBetAmount 
          });
          return res.status(400).json({ 
            success: false,
            message: `최소 베팅 금액은 ${bettingSettings.minBetAmount.toLocaleString()}원입니다.` 
          });
        }
        
        if (bettingSettings.maxBetAmount && stake > bettingSettings.maxBetAmount) {
          console.log('❌ [ExchangeMultibet] 최대 베팅 금액 초과:', { 
            stake, 
            maxBetAmount: bettingSettings.maxBetAmount 
          });
          return res.status(400).json({ 
            success: false,
            message: `최대 베팅 금액은 ${bettingSettings.maxBetAmount.toLocaleString()}원입니다.` 
          });
        }
      } catch (settingsError) {
        console.error('❌ [ExchangeMultibet] 베팅 설정 조회 오류:', settingsError);
        // 설정 조회 실패 시 기본값 사용 (기존 동작 유지)
        if (stake < 1000) {
          return res.status(400).json({ 
            success: false, 
            message: '최소 베팅 금액은 1,000원입니다.' 
          });
        }
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
      
      // ✅ 환수율 적용 제거 (각 레그의 배당률에 이미 적용되어 있음)
      // 프론트엔드에서 이미 환수율이 적용된 배당률을 받으므로 백엔드에서 중복 적용하지 않음
      const adjustedTotalOdds = calculatedTotalOdds;
      
      console.log(`📊 totalOdds 계산: ${calculatedTotalOdds} (환수율 이미 적용됨)`);
      console.log(`📊 프론트엔드 ${totalOdds} vs 백엔드 ${adjustedTotalOdds}`);
      
      // 6. 멀티배팅 주문 생성 (기존 ExchangeOrders 테이블 사용)
      console.log('🔍 [MultibetController] ExchangeOrder.create 시작...');
      
      // 🆕 단일 경기 멀티배팅인 경우 line과 selection 추출
      let lineValue = 0;
      let selectionValue = null;
      
      if (selections.length === 1) {
        const firstSelection = selections[0];
        
        // "Under 2", "Over 2.5" 형식에서 line 추출
        if (firstSelection.team || firstSelection.selection) {
          const teamOrSelection = firstSelection.team || firstSelection.selection;
          const match = teamOrSelection.match(/^(Under|Over)\s+([\d.]+)$/);
          if (match) {
            lineValue = parseFloat(match[2]); // 2 또는 2.5
            selectionValue = teamOrSelection; // "Under 2"
            console.log(`🔍 [MultibetController] line 추출 성공: ${lineValue}, selection: ${selectionValue}`);
          } else {
            selectionValue = teamOrSelection;
            console.log(`🔍 [MultibetController] selection 설정: ${selectionValue}`);
          }
        }
      }
      
      const multibetOrder = await ExchangeOrder.create({
        userId,
        gameId: 'multibet_' + Date.now(), // 멀티배팅용 고유 ID
        market: 'multibet',
        line: lineValue, // 🆕 단일 경기인 경우 line 저장
        // ⚠️ 중요: 멀티배팅은 항상 'back'으로 생성됩니다.
        // Lay 멀티배팅은 매칭을 통해서만 생성되며, 정산 시에는 ExchangeOrderMatch.originalSide를 사용하므로
        // 이 필드가 'back'이어도 정산에는 영향을 주지 않습니다.
        side: 'back', // 멀티배팅은 항상 back (사용자 베팅)
        price: adjustedTotalOdds, // ✅ 환수율 적용된 totalOdds 사용
        amount: stake,
        status: 'open',
        selection: selectionValue, // 🆕 단일 경기인 경우 selection 저장
        stakeAmount: stake,
        potentialProfit: parseFloat((stake * adjustedTotalOdds - stake).toFixed(2)), // ✅ 환수율 적용된 수익 계산
        isMultibet: true,
        totalOdds: adjustedTotalOdds, // ✅ 환수율 적용된 totalOdds 사용
        potentialWinnings: parseFloat((stake * adjustedTotalOdds).toFixed(2)), // ✅ 환수율 적용된 수익 계산
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
            commenceTime: s.commenceTime ? new Date(s.commenceTime).toISOString() : new Date().toISOString(), // UTC로 정규화
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
        commenceTime: selections[0]?.commenceTime ? new Date(selections[0].commenceTime) : new Date(), // UTC로 변환하여 저장
        sportKey: selections[0]?.sportKey || 'multibet'
      }, { transaction });
      console.log('✅ [MultibetController] ExchangeOrder.create 성공:', multibetOrder.id);

      // 6. 사용자 잔액 차감 (✅ balanceService 사용)
      console.log('🔍 [MultibetController] 사용자 잔액 차감 시작...');
      await balanceService.deductBalance(
        userId,
        stake,
        `익스체인지 멀티배팅 주문 생성 (${selections.length}개 경기)`,
        null, // 주문 생성 시점에는 betId 없음
        transaction
      );
      console.log('✅ [MultibetController] 사용자 잔액 차감 완료 (PaymentHistory 기록됨)');

      // 7. 거래 커밋
      console.log('🔍 [MultibetController] 트랜잭션 커밋 시작...');
      await transaction.commit();
      console.log('✅ [MultibetController] 트랜잭션 커밋 완료');

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
          balance: multibetOrder.stakeAmount // ✅ 차감 후 잔액은 user를 다시 조회해야 정확함
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

        // ✅ balanceService를 사용하여 사용자 잔액 환불
        await balanceService.addBalance(
          userId,
          multibet.stakeAmount,
          `익스체인지 멀티배팅 취소 환불 (${multibet.selectionCount}개 경기)`,
          `EXCHANGE_MULTIBET_${multibet.id}`,
          transaction
        );

        await transaction.commit();

        // 환불 후 최신 잔액 조회
        const user = await User.findByPk(userId);

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
