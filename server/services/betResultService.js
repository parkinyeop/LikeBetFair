import Bet from '../models/betModel.js';
import GameResult from '../models/gameResultModel.js';
import User from '../models/userModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import AdminCommission from '../models/adminCommissionModel.js';
import CommissionSettingsService from './commissionSettingsService.js';
import CommissionService from './commissionService.js';
import simplifiedOddsValidation from './simplifiedOddsValidation.js';
import { Op, fn, col } from 'sequelize';
import sequelize from '../models/sequelize.js';
import { normalizeTeamName, normalizeTeamNameForComparison, normalizeCategory, normalizeCategoryPair, normalizeOption, calculateTeamNameSimilarity, findBestTeamMatch } from '../normalizeUtils.js';
import { ADMIN_CONFIG } from '../config/centralizedConfig.js';
import settlementValidation from '../utils/settlementValidation.js';

// 배당률 제공 카테고리만 허용 (gameResultService와 동일하게 유지)
const allowedCategories = ['baseball', 'soccer', 'basketball'];

class BetResultService {
  constructor() {
    this.marketResultMap = {
      '승/패': this.determineWinLoseResult.bind(this),
      '언더/오버': this.determineOverUnderResult.bind(this),
      '핸디캡': this.determineHandicapResult.bind(this)
    };
  }

  // 배팅 결과 업데이트 메인 함수
  async updateBetResults() {
    try {
      console.log('Starting bet results update...');
      // GameResult status 자동 보정: score/result가 있고 status가 finished가 아니면 finished로 변경
      const unfinished = await GameResult.findAll({ where: { status: { [Op.not]: 'finished' } } });
      let fixedCount = 0;
      for (const gr of unfinished) {
        if (gr.result && gr.result !== 'pending' && gr.score && Array.isArray(gr.score) && gr.score.length > 0) {
          await gr.update({ status: 'finished' });
          fixedCount++;
        }
      }
      if (fixedCount > 0) {
        console.log(`[자동보정] status가 finished가 아닌데 결과/스코어가 있는 GameResult ${fixedCount}건을 finished로 보정함`);
      }
      
      // pending 상태의 배팅들 조회
      const pendingBets = await Bet.findAll({
        where: { status: 'pending' },
        include: [{ model: User, attributes: ['email', 'username'] }]
      });

      console.log(`Found ${pendingBets.length} pending bets to process`);

      // 🔒 이미 환불 처리된 베팅 제외
      const filteredBets = [];
      for (const bet of pendingBets) {
        const existingRefund = await PaymentHistory.findOne({
          where: {
            betId: bet.id,
            memo: { [Op.like]: '%환불%' }
          }
        });
        
        if (existingRefund) {
          console.log(`[스케줄러] 이미 환불 처리된 베팅 제외: ${bet.id}`);
          // 베팅 상태를 cancelled로 강제 업데이트
          bet.status = 'cancelled';
          await bet.save();
          continue;
        }
        
        filteredBets.push(bet);
      }

      console.log(`Processing ${filteredBets.length} bets (${pendingBets.length - filteredBets.length} excluded due to refunds)`);

      let updatedCount = 0;
      let errorCount = 0;

      for (const bet of filteredBets) {
        try {
          const isCompleted = await this.processBetResult(bet);
          if (isCompleted) {
            updatedCount++;
          }
        } catch (error) {
          console.error(`Error processing bet ${bet.id}:`, error.message);
          errorCount++;
        }
      }

      console.log(`Bet results update completed: ${updatedCount} updated, ${errorCount} errors`);
      return { updatedCount, errorCount };
    } catch (error) {
      console.error('Error updating bet results:', error);
      throw error;
    }
  }

  // 개별 배팅 결과 처리 (스코어 유무 기반)
  async processBetResult(bet, options = {}) {
    const { transaction, dryRun = false } = options;
    // ✅ 이미 완료된 베팅은 건너뛰기 (중복 처리 방지)
    if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'cancelled') {
      console.log(`[베팅 처리] 이미 완료된 베팅 ${bet.id} (${bet.status}) 건너뛰기`);
      return true;
    }
    
    // ✅ 환불 기록이 있으면 무조건 cancelled로 고정
    const whereCond = {
      betId: bet.id,
      memo: { [Op.like]: '%환불%' }
    };
    const existingRefund = await PaymentHistory.findOne({ where: whereCond });
    if (existingRefund) {
      if (bet.status !== 'cancelled') {
        bet.status = 'cancelled';
        if (Array.isArray(bet.selections)) {
          bet.selections = bet.selections.map(sel => ({ ...sel, result: 'cancelled' }));
        }
        await bet.save();
      }
      return true;
    }

    const selections = bet.selections;
    let hasPending = false;
    let hasLost = false;
    let hasWon = false;
    let hasCancelled = false;

    // selections deep copy for comparison
    const prevSelections = JSON.stringify(bet.selections);
    const prevStatus = bet.status;

    // 각 선택에 대해 스코어 유무로 결과 처리
    for (const selection of selections) {
      const desc = selection.desc;
      const teams = desc ? desc.split(' vs ') : [];
      if (teams.length !== 2) {
        selection.result = 'pending';
        hasPending = true;
        continue;
      }
      
      const homeTeam = teams[0].trim();
      const awayTeam = teams[1].trim();
      let commenceTime;
      try {
        console.log(`🔍 [DEBUG] commence_time 파싱: "${selection.commence_time}"`);
        // 이미 UTC 형식이면 'Z' 추가하지 않음
        const timeStr = selection.commence_time.includes('Z') || selection.commence_time.includes('+') 
          ? selection.commence_time 
          : selection.commence_time + 'Z';
        commenceTime = new Date(timeStr);
        console.log(`🔍 [DEBUG] 파싱된 시간: ${commenceTime.toISOString()}`);
        if (isNaN(commenceTime.getTime())) {
          console.log(`❌ [DEBUG] 유효하지 않은 시간: ${selection.commence_time}`);
          selection.result = 'pending';
          hasPending = true;
          continue;
        }
      } catch (error) {
        console.log(`❌ [DEBUG] 시간 파싱 오류: ${error.message}, 원본: "${selection.commence_time}"`);
        selection.result = 'pending';
        hasPending = true;
        continue;
      }

      // 해당 경기의 GameResult 조회 (스코어 유무 확인) - 정규화된 팀명으로 매칭
      const normalizedHomeTeam = normalizeTeamNameForComparison(homeTeam);
      const normalizedAwayTeam = normalizeTeamNameForComparison(awayTeam);
      
      // 🚀 Admin API와 동일한 매칭 로직 적용
      console.log(`🔍 [DEBUG] 매칭 시작: 베팅 ${bet.id}, 선택 ${selection.desc}`);
      console.log(`   - 팀: ${homeTeam} vs ${awayTeam}`);
      console.log(`   - 시간: ${commenceTime.toISOString()}`);
      
      const gameResult = await GameResult.findOne({
        where: {
          [Op.or]: [
            {
              homeTeam: { [Op.iLike]: `%${homeTeam.trim()}%` },
              awayTeam: { [Op.iLike]: `%${awayTeam.trim()}%` }
            },
            {
              homeTeam: { [Op.iLike]: `%${awayTeam.trim()}%` },
              awayTeam: { [Op.iLike]: `%${homeTeam.trim()}%` }
            }
          ],
          commenceTime: {
            [Op.gte]: new Date(commenceTime.getTime() - 24 * 60 * 60 * 1000), // 1일 전
            [Op.lte]: new Date(commenceTime.getTime() + 24 * 60 * 60 * 1000)  // 1일 후
          }
        },
        order: [
          // 가장 최근에 생성된 경기 결과 우선
          ['createdAt', 'DESC']
        ]
      });

      // 🛡️ GUARD CLAUSE: GameResult 데이터 무결성 검증 (Soft Validation)
      let validationResult = null;
      let validatedScore = null;

      if (gameResult) {
        console.log(`🔍 [DEBUG] 검증 시작: 베팅 ${bet.id}, 선택 ${selection.desc}`);
        validationResult = await settlementValidation.softValidateGameResult(
          gameResult,
          { id: bet.id, selections: [selection] },
          { validateTeamNames: false } // 팀명 검증은 현재 단계에서 제외
        );
        
        console.log(`🔍 [DEBUG] 검증 결과:`, {
          isValid: validationResult.isValid,
          isSoftFail: validationResult.isSoftFail,
          issues: validationResult.issues,
          warnings: validationResult.warnings
        });

        // 검증된 스코어 데이터 사용 (유효한 경우)
        if (validationResult.score) {
          validatedScore = validationResult.score;
          console.log(`[SETTLEMENT] Bet ${bet.id} using validated score:`, validatedScore);
        }
      }

      // 검증 실패 시 기존 로직 유지 (Soft Fail)
      if (!gameResult || (validationResult && validationResult.isSoftFail)) {
        console.warn(`[SETTLEMENT] Bet ${bet.id} selection validation issues, falling back to legacy logic`);

        // 🚀 Phase 1.2: 매칭 실패 시 상세 디버깅 로그 추가
        if (!gameResult) {
          console.error(`❌ 매칭 실패 상세 분석:`);
          console.error(`   - 베팅 ID: ${bet.id}`);
          console.error(`   - 베팅 팀: ${homeTeam} vs ${awayTeam}`);
          console.error(`   - 정규화된 팀명: ${normalizedHomeTeam} vs ${normalizedAwayTeam}`);
          console.error(`   - 베팅 시간: ${commenceTime.toISOString()}`);
          console.error(`   - 검색 시간 범위: ${new Date(commenceTime.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()} ~ ${new Date(commenceTime.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()}`);
          
          // 매칭 실패 시, 원인 추적을 위해 유사한 경기들을 검색하여 로그에 남김
          try {
            const similarGames = await GameResult.findAll({
              where: {
                [Op.or]: [
                  { homeTeam: { [Op.iLike]: `%${homeTeam.slice(0, 5)}%` } },
                  { awayTeam: { [Op.iLike]: `%${awayTeam.slice(0, 5)}%` } },
                  { homeTeam: { [Op.iLike]: `%${awayTeam.slice(0, 5)}%` } },
                  { awayTeam: { [Op.iLike]: `%${homeTeam.slice(0, 5)}%` } }
                ]
              },
              limit: 5,
              order: [['commenceTime', 'DESC']]
            });
            
            if (similarGames.length > 0) {
              console.error(`   - DB 내 유사한 경기들:`, similarGames.map(g => 
                `[${g.status}] ${g.homeTeam} vs ${g.awayTeam} (${g.commenceTime.toISOString()})`
              ));
            } else {
              console.error(`   - DB 내 유사한 경기를 찾을 수 없음.`);
            }
          } catch (debugError) {
            console.error(`   - 디버깅 정보 수집 중 오류:`, debugError.message);
          }
        }

        // 기존 스코어 체크 로직 유지
        console.log(`🔍 [DEBUG] 스코어 검증:`);
        console.log(`   - gameResult 존재: ${!!gameResult}`);
        console.log(`   - gameResult.score: ${JSON.stringify(gameResult?.score)}`);
        console.log(`   - score 타입: ${typeof gameResult?.score}`);
        console.log(`   - score 배열 여부: ${Array.isArray(gameResult?.score)}`);
        console.log(`   - score 길이: ${gameResult?.score?.length || 0}`);
        
        if (!gameResult || !gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length === 0) {
          // 경기 시간이 지났고 스코어가 없으면 cancelled로 처리 (연기/취소 가능성)
          const gameTime = new Date(selection.commence_time + 'Z');
          const now = new Date();
          const hoursSinceGame = (now - gameTime) / (1000 * 60 * 60);

          if (hoursSinceGame > 2) { // 2시간 이상 지났으면
            selection.result = 'cancelled';
            hasCancelled = true;
          } else {
            selection.result = 'pending';
            hasPending = true;
          }
          continue;
        }
      }

      // 취소/연기 처리
      if (gameResult.status === 'cancelled' || gameResult.result === 'cancelled' ||
          gameResult.status === 'postponed' || gameResult.result === 'postponed') {
        selection.result = 'cancelled';
        hasCancelled = true;
        continue;
      }

      // 스코어가 있으면 결과 처리 (검증된 스코어 우선 사용)
      console.log(`🔍 [DEBUG] 베팅 선택 처리 중:`);
      console.log(`   - 선택: ${selection.desc}`);
      console.log(`   - 마켓: ${selection.market}`);
      console.log(`   - 팀/옵션: ${selection.team}`);
      console.log(`   - 포인트: ${selection.point}`);
      console.log(`   - 경기 결과 상태: ${gameResult.status}`);
      console.log(`   - 경기 결과: ${gameResult.result}`);
      console.log(`   - 스코어: ${JSON.stringify(gameResult.score)}`);
      
      const selectionResult = this.determineSelectionResult(selection, gameResult, validatedScore);
      console.log(`   - 판정 결과: ${selectionResult}`);
      
      selection.result = selectionResult;
      
      if (selection.result === 'pending') hasPending = true;
      else if (selection.result === 'lost' || selection.result === 'draw') hasLost = true;
      else if (selection.result === 'won') hasWon = true;
      else if (selection.result === 'cancelled') hasCancelled = true;
    }

    // 전체 베팅 상태 집계 (멀티베팅 로직 포함)
    let betStatus = this.determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections);
    
    // 멀티베팅 디버깅 로그
    if (selections.length > 1) {
      console.log(`[멀티베팅 처리] 베팅 ID: ${bet.id}, 선택 개수: ${selections.length}`);
      selections.forEach((sel, idx) => {
        console.log(`[멀티베팅 처리] 선택 ${idx + 1}: ${sel.desc} → ${sel.result}`);
      });
      console.log(`[멀티베팅 처리] 최종 상태: ${betStatus} (이전: ${prevStatus})`);
    }
    
    const newSelectionsStr = JSON.stringify(selections);
    const statusChanged = betStatus !== prevStatus;
    const selectionsChanged = newSelectionsStr !== prevSelections;
    if (statusChanged || selectionsChanged) {
      // 외부에서 전달된 트랜잭션이 있으면 사용, 없으면 새로 생성
      const t = transaction || await Bet.sequelize.transaction();
      const shouldCommit = !transaction; // 외부 트랜잭션이면 커밋하지 않음
      
      try {
        bet.status = betStatus;
        bet.selections = [...selections];
        await bet.save({ transaction: t });
        
        if (!dryRun) {
          if (betStatus === 'won') {
            await this.processBetWinnings(bet, t);
          } else if (betStatus === 'cancelled') {
            await this.processBetRefund(bet, t);
          }
        }
        
        if (shouldCommit) {
          await t.commit();
        }
      } catch (err) {
        if (shouldCommit) {
          await t.rollback();
        }
        throw err;
      }
    }
    return bet.status !== 'pending';
  }

  // 🆕 베팅 전체 상태 결정 로직 (취소 경기 포함) - 멀티베팅 수정
  determineBetStatus(hasPending, hasWon, hasLost, hasCancelled, selections) {
    // 모든 selection이 취소된 경우
    if (hasCancelled && !hasWon && !hasLost && !hasPending) {
      return 'cancelled';
    }

    // pending이 있으면 대기
    if (hasPending) {
      return 'pending';
    }

    // 멀티베팅 핵심 로직: 하나라도 실패하면 전체 실패
    // draw 결과도 lost로 처리
    const hasAnyFailure = selections.some(s => s.result === 'lost' || s.result === 'draw');
    
    if (hasAnyFailure) {
      console.log(`[멀티베팅 판정] 실패한 선택 발견 - 전체 베팅 실패`);
      return 'lost';
    }

    // 멀티베팅에서는 모든 선택이 성공해야 전체 성공
    const allNonCancelledSelections = selections.filter(s => s.result !== 'cancelled');
    const allWonSelections = allNonCancelledSelections.filter(s => s.result === 'won');
    
    // 취소되지 않은 모든 선택이 성공인 경우만 전체 성공
    if (allNonCancelledSelections.length > 0 && allWonSelections.length === allNonCancelledSelections.length) {
      console.log(`[멀티베팅 판정] 모든 선택 성공 (${allWonSelections.length}/${allNonCancelledSelections.length}) - 전체 베팅 성공`);
      return 'won';
    }

    // 모든 selection이 취소된 경우
    if (selections.every(s => s.result === 'cancelled')) {
      return 'cancelled';
    }

    return 'pending';
  }

  // 🆕 베팅 적중 시 상금 지급 (수수료 차감 포함)
  async processBetWinnings(bet, transaction) {
    // 이미 지급된 베팅인지 확인
    const existingPayment = await PaymentHistory.findOne({
      where: {
        betId: bet.id,
        memo: { [Op.like]: '%베팅 적중 지급%' }
      },
      transaction
    });
    
    if (existingPayment) {
      console.log(`[적중 지급] 이미 지급된 베팅 ${bet.id} 건너뛰기`);
      return;
    }
    
    const user = await User.findByPk(bet.userId, { 
      transaction, 
      lock: transaction.LOCK.UPDATE 
    });
    
    if (user) {
      // 취소된 selection이 있는 경우 배당률 재계산
      const adjustedWinnings = this.calculateAdjustedWinnings(bet);
      const hasCancelledSelections = bet.selections.some(s => s.result === 'cancelled');
      
      // 🆕 통합 수수료 계산 (정책 기반)
      const commissionCalculation = await CommissionService.calculate({
        winnings: adjustedWinnings,
        stake: bet.stake,
        platform: 'sportsbook',
        user: user,
        bet: bet,
        policies: {} // 향후 프로모션 코드 등 추가 가능
      });

      const commissionAmount = commissionCalculation.commissionAmount;

      // 수수료 계산 상세 로깅
      await CommissionService.logCommissionCalculation(user.id, commissionCalculation, {
        platform: 'sportsbook',
        betId: bet.id
      });
      
      // 실제 지급할 금액 (수수료 차감 후)
      const netWinnings = adjustedWinnings - commissionAmount;
      
      user.balance = Number(user.balance) + Number(netWinnings);
      await user.save({ transaction });
      
      // 🆕 수수료가 있는 경우 AdminCommission 기록
      if (commissionAmount > 0) {
        // 시스템 관리자 ID (첫 번째 사용자를 시스템 관리자로 사용)
        const systemAdminId = ADMIN_CONFIG.SYSTEM_ADMIN_ID || '6576a77d-713b-46b8-99e8-91f66a20a8cb';
        
        await AdminCommission.create({
          adminId: systemAdminId, // 시스템 관리자 ID
          userId: user.id,
          betId: bet.id, // 스포츠북은 betId 사용
          exchangeOrderId: null, // 스포츠북은 exchangeOrderId 사용하지 않음
          betAmount: bet.stake,
          winAmount: adjustedWinnings,
          commissionRate: commissionCalculation.appliedRate,
          commissionAmount: commissionAmount,
          status: 'paid',
          paidAt: new Date(),
          type: 'sportsbook' // 스포츠북 수수료 구분
        }, { transaction });
        
        // 🆕 수수료 차감 기록을 PaymentHistory에 저장
        await PaymentHistory.create({
          userId: user.id,
          betId: bet.id,
          amount: -commissionAmount, // 음수로 수수료 차감 표시
          memo: `스포츠북 수수료 (${(commissionCalculation.appliedRate * 100).toFixed(2)}%)${commissionCalculation.savings > 0 ? ` - 할인 적용됨` : ''}`,
          paidAt: new Date(),
          balanceAfter: user.balance
        }, { transaction });
        
        console.log(`[수수료 차감] 베팅 ${bet.id}: ${commissionAmount}원 차감 (${(commissionCalculation.appliedRate * 100).toFixed(2)}%)`);
      }
      
      // 🆕 추천인 수수료 지급 로직
      if (user.referredBy) {
        await this.processReferralCommission(user, bet, adjustedWinnings, transaction);
      }
      
      // 🆕 실제 상금 지급 기록
      await PaymentHistory.create({
        userId: user.id,
        betId: bet.id,
        amount: netWinnings,
        memo: hasCancelledSelections ? '베팅 적중 지급 (일부 경기 취소 반영, 수수료 차감 후)' : '베팅 적중 지급 (수수료 차감 후)',
        paidAt: new Date(),
        balanceAfter: user.balance
      }, { transaction });
      
      console.log(`[적중 지급] 베팅 ${bet.id}: 총 ${adjustedWinnings}원 → 수수료 ${commissionAmount}원 차감 → 실제 지급 ${netWinnings}원`);
    } else {
      throw new Error(`[BetResultService] 적중 지급 실패: userId=${bet.userId} (유저 없음)`);
    }
  }

  // 🆕 베팅 환불 처리 (중복 환불 방지)
  async processBetRefund(bet, transaction, memo = '경기 취소로 인한 환불') {
    // 이미 환불된 베팅인지 확인
    const existingRefund = await PaymentHistory.findOne({
      where: {
        betId: bet.id,
        memo: { [Op.like]: '%환불%' }
      },
      transaction
    });
    
    if (existingRefund) {
      console.log(`[환불 처리] 이미 환불된 베팅 ${bet.id} 건너뛰기`);
      return;
    }
    
    const user = await User.findByPk(bet.userId, { 
      transaction, 
      lock: transaction.LOCK.UPDATE 
    });
    
    if (user) {
      user.balance = Number(user.balance) + Number(bet.stake);
      await user.save({ transaction });
      
      await PaymentHistory.create({
        userId: user.id,
        betId: bet.id,
        amount: bet.stake,
        memo: memo,
        paidAt: new Date(),
        balanceAfter: user.balance
      }, { transaction });
      
      console.log(`[환불 처리] 베팅 ${bet.id}: ${bet.stake}원 환불`);
    } else {
      throw new Error(`[BetResultService] 환불 실패: userId=${bet.userId} (유저 없음)`);
    }
  }

  // 🆕 취소된 selection을 고려한 상금 재계산
  calculateAdjustedWinnings(bet) {
    const selections = bet.selections;
    let adjustedOdds = 1.0;
    
    for (const selection of selections) {
      if (selection.result === 'won') {
        // 실제 승리한 경우만 배당률 곱하기
        adjustedOdds *= selection.odds || 1.0;
      } else if (selection.result === 'cancelled') {
        // 취소된 경우는 배당률 1.0으로 처리 (무효)
        adjustedOdds *= 1.0;
      }
      // lost나 pending은 전체 베팅에 영향을 주므로 여기서는 고려하지 않음
    }
    
    // 원래 잠재 수익과 조정된 수익 중 작은 값 반환 (안전장치)
    const adjustedWinnings = Number(bet.stake) * adjustedOdds;
    return Math.min(adjustedWinnings, Number(bet.potentialWinnings));
  }

  // 🚫 더 이상 사용하지 않는 메서드 (스코어 유무 기반으로 변경됨)
  // async getGameResultByTeams(selection, pendingGameResultsCache = null) {
  //   try {
  //     const desc = selection.desc;
  //     const teams = desc ? desc.split(' vs ') : [];
  //     if (teams.length !== 2) {
  //       console.log(`[getGameResultByTeams] Invalid game description format: ${desc}`);
  //       return null;
  //     }
  //     // team 정규화 적용 (비교용)
  //     const homeTeamNorm = normalizeTeamNameForComparison(teams[0].trim());
  //     const awayTeamNorm = normalizeTeamNameForComparison(teams[1].trim());
  //     // 날짜 추출 (commence_time)
  //     let commenceTime;
  //     try {
  //         commenceTime = new Date(selection.commence_time);
  //         if (isNaN(commenceTime.getTime())) {
  //           console.log(`[getGameResultByTeams] Invalid commence_time format: ${selection.commence_time} for game: ${desc}`);
  //           return null;
  //         }
  //     } catch (error) {
  //       console.log(`[getGameResultByTeams] Error parsing commence_time: ${selection.commence_time} for game: ${desc}`);
  //       return null;
  //     }
  //     // 날짜 범위 (해당 날짜 00:00~23:59)
  //     const dayStart = new Date(commenceTime);
  //     dayStart.setUTCHours(0,0,0,0);
  //     const dayEnd = new Date(commenceTime);
  //     dayEnd.setUTCHours(23,59,59,999);
  //     // pendingGameResultsCache가 없으면 한 번만 조회
  //     let pendingGameResults = pendingGameResultsCache;
  //     if (!pendingGameResults) {
  //       pendingGameResults = await GameResult.findAll({
  //         where: {
  //           commenceTime: { [Op.between]: [dayStart, dayEnd] },
  //           status: 'finished'
  //         }
  //       });
  //     }
  //     // 메모리상에서 팀명 매칭
  //     for (const candidate of pendingGameResults) {
  //       const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
  //       const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);
  //       if (
  //         (dbHomeNorm === homeTeamNorm && dbAwayNorm === awayTeamNorm) ||
  //         (dbHomeNorm === awayTeamNorm && dbAwayNorm === homeTeamNorm)
  //       ) {
  //         return candidate;
  //       }
  //     }
  //     // 매칭 실패
  //     return null;
  //   } catch (error) {
  //     console.error('[getGameResultByTeams] Error:', error.stack || error);
  //     return null;
  //   }
  // }

  // 🚫 더 이상 사용하지 않는 메서드들 (스코어 유무 기반으로 변경됨)
  // async collectAllBettingGames() {
  //   try {
  //     console.log('Collecting all games that have betting odds...');
  //     
  //     // 모든 배팅에서 고유한 게임 목록 추출
  //     const allBets = await Bet.findAll({
  //       attributes: ['selections']
  //     });

  //     const uniqueGames = new Map();

  //     allBets.forEach(bet => {
  //       bet.selections.forEach(selection => {
  //         const gameKey = selection.desc;
  //         if (gameKey && !uniqueGames.has(gameKey)) {
  //           uniqueGames.set(gameKey, {
  //             desc: selection.desc,
  //             commence_time: selection.commence_time,
  //             gameId: selection.gameId,
  //             market: selection.market
  //           });
  //         }
  //       });
  //     });

  //     const gamesList = Array.from(uniqueGames.values());
  //     console.log(`Found ${gamesList.length} unique games with betting odds`);
  //     
  //     return gamesList;
  //   } catch (error) {
  //     console.error('Error collecting betting games:', error);
  //     throw error;
  //   }
  // }

  // // 누락된 경기 결과 식별
  // async identifyMissingGameResults() {
  //   try {
  //     console.log('Identifying missing game results...');
  //     
  //     const bettingGames = await this.collectAllBettingGames();
  //     const missingGames = [];

  //     for (const game of bettingGames) {
  //         const gameResult = await this.getGameResultByTeams(game);
  //         if (!gameResult) {
  //           missingGames.push(game);
  //         }
  //       }

  //     console.log(`Found ${missingGames.length} games missing results out of ${bettingGames.length} total games`);
  //     return missingGames;
  //   } catch (error) {
  //     console.error('Error identifying missing game results:', error);
  //     throw error;
  //   }
  // }

  // // 기존 gameId로 조회하는 메서드 (하위 호환성)
  // async getGameResult(gameId) {
  //   try {
  //     const gameResult = await GameResult.findOne({
  //       where: {
  //         id: gameId
  //       }
  //     });

  //     return gameResult;
  //   } catch (error) {
  //     console.error('Error getting game result:', error);
  //     return null;
  //   }
  // }

  // 개별 selection 결과 판정
  determineSelectionResult(selection, gameResult, validatedScore = null) {
    // market alias 매핑
    let marketType = selection.market;
    if (marketType === 'h2h') marketType = '승/패';
    if (marketType === 'totals') marketType = '언더/오버';
    if (marketType === 'spreads') marketType = '핸디캡';
    if (marketType === 'Win/Loss') marketType = '승/패';
    if (marketType === 'Over/Under') marketType = '언더/오버';
    if (marketType === 'Handicap') marketType = '핸디캡'; // 핸디캡 매핑 추가
    
    const resultFunction = this.marketResultMap[marketType];
    if (resultFunction) {
      return resultFunction(selection, gameResult, validatedScore);
    }
    return 'pending';
  }

  // 승/패 결과 판정
  determineWinLoseResult(selection, gameResult, validatedScore = null) {
    // 경기 취소 또는 연기 시 즉시 환불
    if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
        gameResult.result === 'postponed' || gameResult.status === 'postponed') {
      return 'cancelled';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // team 정규화 적용 (비교용)
    const selectedTeam = normalizeTeamNameForComparison(selection.team);
    const gameResultData = gameResult.result;
    const homeTeam = normalizeTeamNameForComparison(gameResult.homeTeam);
    const awayTeam = normalizeTeamNameForComparison(gameResult.awayTeam);

    if (gameResultData === 'home_win') {
      return selectedTeam === homeTeam ? 'won' : 'lost';
    } else if (gameResultData === 'away_win') {
      return selectedTeam === awayTeam ? 'won' : 'lost';
    } else if (gameResultData === 'draw') {
      // 무승부: 승/패 선택 모두 실패 (베팅에서는 lost 처리)
      return 'lost';
    }

    return 'pending';
  }

  // 언더/오버 결과 판정
  determineOverUnderResult(selection, gameResult, validatedScore = null) {
    // 경기 취소 또는 연기 시 즉시 환불
    if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
        gameResult.result === 'postponed' || gameResult.status === 'postponed') {
      return 'cancelled';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // robust하게 옵션 추출 (예: 'Overbet365', 'UnderPinnacle', 'Over 2.5' 등)
    let option = '';
    let point = selection.point;
    
    if (selection.option && selection.option !== '') {
      option = normalizeOption(selection.option);
    } else if (selection.team && selection.team !== '') {
      // "Over 2.5" 형식에서 옵션과 포인트 분리
      const teamMatch = selection.team.match(/^(Over|Under)\s+([\d.]+)$/);
      if (teamMatch) {
        option = teamMatch[1];
        point = parseFloat(teamMatch[2]);
        console.log(`[언더/오버 파싱] 팀명에서 추출: 옵션="${option}", 포인트=${point}`);
      } else {
        option = normalizeOption(selection.team);
      }
    } else {
      // option과 team이 모두 빈 문자열인 경우 기본값으로 Over 가정
      option = 'Over';
      console.log(`[언더/오버 판정] option과 team이 비어있음. 기본값 'Over'로 설정`);
    }
    
    // 스코어에서 총 점수 계산 (검증된 스코어 우선 사용)
    const scoreToUse = validatedScore || gameResult.score;
    const totalScore = validatedScore ?
      (validatedScore.home + validatedScore.away) :
      this.calculateTotalScore(scoreToUse);

    // point가 없으면 무효
    if (typeof point !== 'number' || isNaN(point)) {
      return 'cancelled';
    }

    // 무효 조건: totalScore와 point가 같으면 push/cancel 처리
    if (totalScore === point) {
      return 'cancelled';
    }

    console.log(`[언더/오버 판정] 총점: ${totalScore}, 기준: ${point}, 타입: ${option}`);
    
    if (option === 'Over') {
      const result = totalScore > point ? 'won' : 'lost';
      console.log(`[언더/오버 판정] Over ${point}: ${totalScore} > ${point} = ${result}`);
      return result;
    } else if (option === 'Under') {
      const result = totalScore < point ? 'won' : 'lost';
      console.log(`[언더/오버 판정] Under ${point}: ${totalScore} < ${point} = ${result}`);
      return result;
    }

    console.log(`[언더/오버 판정] 알 수 없는 옵션: ${option}`);
    return 'pending';
  }

  // 핸디캡 결과 판정
  determineHandicapResult(selection, gameResult, validatedScore = null) {
    // 경기 취소 또는 연기 시 즉시 환불
    if (gameResult.result === 'cancelled' || gameResult.status === 'cancelled' ||
        gameResult.result === 'postponed' || gameResult.status === 'postponed') {
      return 'cancelled';
    }

    if (gameResult.result === 'pending') {
      return 'pending';
    }

    // 핸디캡 베팅에서 팀명과 핸디캡 분리 (개선된 로직)
    let selectedTeam, handicap;
    
    // selection.point가 있으면 이를 우선 사용
    if (selection.point !== undefined) {
      handicap = selection.point;
      // 팀명에서 핸디캡 제거
      if (selection.team && (selection.team.includes(' -') || selection.team.includes(' +'))) {
        const match = selection.team.match(/^(.+?)\s*([+-]+[\d.]+)$/);
        if (match) {
          selectedTeam = normalizeTeamNameForComparison(match[1].trim());
          console.log(`[핸디캡 파싱] point 사용, 팀명: "${selectedTeam}", 핸디캡: ${handicap} (원본: "${selection.team}")`);
        } else {
          selectedTeam = normalizeTeamNameForComparison(selection.team);
          console.log(`[핸디캡 파싱] point 사용, 정규식 매칭 실패, 팀명: "${selectedTeam}", 핸디캡: ${handicap}`);
        }
      } else {
        selectedTeam = normalizeTeamNameForComparison(selection.team);
        console.log(`[핸디캡 파싱] point 사용, 기본 방식, 팀명: "${selectedTeam}", 핸디캡: ${handicap}`);
      }
    } else if (selection.team && (selection.team.includes(' -') || selection.team.includes(' +'))) {
      // "Kia Tigers -1", "Lotte Giants +1", "Ulsan Hyundai FC --0.75" 형식에서 팀명과 핸디캡 분리
      const match = selection.team.match(/^(.+?)\s*([+-]+[\d.]+)$/);
      if (match) {
        selectedTeam = normalizeTeamNameForComparison(match[1].trim());
        // 핸디캡 값 파싱 (예: "--0.75" -> -0.75, "+1" -> 1)
        const handicapStr = match[2];
        if (handicapStr.startsWith('--')) {
          handicap = -parseFloat(handicapStr.substring(2));
        } else if (handicapStr.startsWith('-')) {
          handicap = -parseFloat(handicapStr.substring(1));
        } else if (handicapStr.startsWith('+')) {
          handicap = parseFloat(handicapStr.substring(1));
        } else {
          handicap = parseFloat(handicapStr);
        }
        console.log(`[핸디캡 파싱] 팀명 파싱, 팀명: "${selectedTeam}", 핸디캡: ${handicap} (원본: "${handicapStr}")`);
      } else {
        selectedTeam = normalizeTeamNameForComparison(selection.team);
        handicap = 0;
        console.log(`[핸디캡 파싱] 정규식 매칭 실패, 팀명: "${selectedTeam}", 핸디캡: ${handicap}`);
      }
    } else {
      // 기존 방식 (selection.team이 팀명만 있는 경우)
      selectedTeam = normalizeTeamNameForComparison(selection.team);
      handicap = selection.handicap || 0;
      console.log(`[핸디캡 파싱] 기본 방식, 팀명: "${selectedTeam}", 핸디캡: ${handicap}`);
    }
    
    // 스코어 계산 (검증된 스코어 우선 사용)
    let homeScore, awayScore;
    if (validatedScore) {
      homeScore = validatedScore.home;
      awayScore = validatedScore.away;
      console.log(`[핸디캡] 검증된 스코어 사용: ${homeScore}-${awayScore}`);
    } else {
      const scoreResult = this.extractHomeAwayScores(gameResult.score, gameResult.homeTeam, gameResult.awayTeam);
      homeScore = scoreResult.homeScore;
      awayScore = scoreResult.awayScore;
    }

    // 핸디캡 적용 (팀명 비교용 정규화)
    const homeTeamNorm = normalizeTeamNameForComparison(gameResult.homeTeam);
    const awayTeamNorm = normalizeTeamNameForComparison(gameResult.awayTeam);
    
    // 디버깅 로그 추가
    console.log(`[핸디캡 매칭] 베팅 팀: "${selectedTeam}", 핸디캡: ${handicap}`);
    console.log(`[핸디캡 매칭] 경기 홈팀: "${homeTeamNorm}", 원정팀: "${awayTeamNorm}"`);
    console.log(`[핸디캡 매칭] 스코어: ${homeScore}-${awayScore}`);
    
    // 정확한 매칭 시도
    if (selectedTeam === homeTeamNorm) {
      const adjustedScore = homeScore + handicap;
      const result = adjustedScore > awayScore ? 'won' : 'lost';
      console.log(`[핸디캡 매칭] 홈팀 정확 매칭: ${adjustedScore} vs ${awayScore} = ${result}`);
      return result;
    } else if (selectedTeam === awayTeamNorm) {
      const adjustedScore = awayScore + handicap;
      const result = adjustedScore > homeScore ? 'won' : 'lost';
      console.log(`[핸디캡 매칭] 원정팀 정확 매칭: ${adjustedScore} vs ${homeScore} = ${result}`);
      return result;
    }

    // 부분 매칭 시도 (더 유연한 매칭)
    const homeTeamMatch = this.findBestTeamMatch(selectedTeam, gameResult.homeTeam);
    const awayTeamMatch = this.findBestTeamMatch(selectedTeam, gameResult.awayTeam);
    
    if (homeTeamMatch.similarity > 0.7) {
      const adjustedScore = homeScore + handicap;
      const result = adjustedScore > awayScore ? 'won' : 'lost';
      console.log(`[핸디캡 매칭] 홈팀 부분 매칭 (${homeTeamMatch.similarity}): ${adjustedScore} vs ${awayScore} = ${result}`);
      return result;
    } else if (awayTeamMatch.similarity > 0.7) {
      const adjustedScore = awayScore + handicap;
      const result = adjustedScore > homeScore ? 'won' : 'lost';
      console.log(`[핸디캡 매칭] 원정팀 부분 매칭 (${awayTeamMatch.similarity}): ${adjustedScore} vs ${homeScore} = ${result}`);
      return result;
    }

    console.log(`[핸디캡 매칭] 팀명 매칭 실패: "${selectedTeam}" not found in ["${homeTeamNorm}", "${awayTeamNorm}"]`);
    console.log(`[핸디캡 매칭] 부분 매칭 시도: 홈팀 ${homeTeamMatch.similarity}, 원정팀 ${awayTeamMatch.similarity}`);
    return 'pending';
  }

  // 스코어 형식 검증 및 정규화 함수 추가
  validateAndNormalizeScore(scoreData) {
    if (!scoreData) {
      return null;
    }

    // 문자열인 경우 JSON 파싱 시도
    if (typeof scoreData === 'string') {
      try {
        scoreData = JSON.parse(scoreData);
      } catch (e) {
        console.error('[Score Validation] JSON 파싱 실패:', e.message, scoreData);
        return null;
      }
    }

    // 배열이 아닌 경우
    if (!Array.isArray(scoreData)) {
      console.error('[Score Validation] 배열이 아님:', scoreData);
      return null;
    }

    // 잘못된 형식: ["1", "0"] 형태 감지
    if (scoreData.length === 2 && 
        typeof scoreData[0] === 'string' && 
        typeof scoreData[1] === 'string' &&
        !scoreData[0].hasOwnProperty('name') && 
        !scoreData[1].hasOwnProperty('name')) {
      console.error('[Score Validation] 잘못된 스코어 형식 감지 (The Odds API 형식):', scoreData);
      console.error('[Score Validation] 올바른 형식: [{"name":"팀명","score":"점수"}]');
      return null;
    }

    // 올바른 형식: [{"name":"팀명","score":"점수"}] 형태 검증
    if (scoreData.length >= 2 && 
        scoreData[0].hasOwnProperty('name') && 
        scoreData[0].hasOwnProperty('score') &&
        scoreData[1].hasOwnProperty('name') && 
        scoreData[1].hasOwnProperty('score')) {
      return scoreData;
    }

    console.error('[Score Validation] 알 수 없는 스코어 형식:', scoreData);
    return null;
  }

  // 스코어에서 총 점수 계산 (방어 코드 포함)
  calculateTotalScore(scoreData) {
    const normalizedScore = this.validateAndNormalizeScore(scoreData);
    if (!normalizedScore) {
      console.error('[Score Calculation] 스코어 형식 검증 실패');
      return 0;
    }

    try {
      return normalizedScore.reduce((sum, score) => {
        const scoreValue = parseInt(score.score || 0);
        return sum + (isNaN(scoreValue) ? 0 : scoreValue);
      }, 0);
    } catch (error) {
      console.error('[Score Calculation] 총점 계산 오류:', error.message);
      return 0;
    }
  }

  // 스코어에서 홈/원정 점수 추출 (방어 코드 포함)
  extractHomeAwayScores(scoreData, homeTeam, awayTeam) {
    const normalizedScore = this.validateAndNormalizeScore(scoreData);
    if (!normalizedScore) {
      console.error('[Score Extraction] 스코어 형식 검증 실패');
      return { homeScore: 0, awayScore: 0 };
    }

    try {
      let homeScore = 0, awayScore = 0;
      
      for (const score of normalizedScore) {
        if (score.name === homeTeam) {
          homeScore = parseInt(score.score || 0);
        } else if (score.name === awayTeam) {
          awayScore = parseInt(score.score || 0);
        }
      }

      return { homeScore, awayScore };
    } catch (error) {
      console.error('[Score Extraction] 점수 추출 오류:', error.message);
      return { homeScore: 0, awayScore: 0 };
    }
  }

  // 사용자별 배팅 통계
  async getUserBetStats(userId) {
    try {
      const bets = await Bet.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      const stats = {
        total: bets.length,
        pending: 0,
        won: 0,
        lost: 0,
        cancelled: 0,
        totalStake: 0,
        totalWinnings: 0,
        winRate: 0
      };

      bets.forEach(bet => {
        stats[bet.status]++;
        stats.totalStake += parseFloat(bet.stake);
        
        if (bet.status === 'won') {
          stats.totalWinnings += parseFloat(bet.potentialWinnings);
        }
      });

      const completedBets = stats.won + stats.lost;
      stats.winRate = completedBets > 0 ? (stats.won / completedBets * 100).toFixed(2) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting user bet stats:', error);
      throw error;
    }
  }

  // 전체 배팅 통계
  async getOverallBetStats() {
    try {
      const stats = await Bet.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('stake')), 'totalStake'],
          [fn('SUM', col('potentialWinnings')), 'totalWinnings']
        ],
        group: ['status'],
        raw: true
      });

      return stats;
    } catch (error) {
      console.error('Error getting overall bet stats:', error);
      throw error;
    }
  }

  // 특정 배팅 상세 정보
  async getBetDetails(betId) {
    try {
      const bet = await Bet.findByPk(betId, {
        include: [{ model: User, attributes: ['email'] }]
      });

      if (!bet) {
        return null;
      }

      // 각 selection의 경기 결과 정보 추가
      const selectionsWithResults = [];
      for (const selection of bet.selections) {
        const gameResult = await this.getGameResultByTeams(selection);
        selectionsWithResults.push({
          ...selection,
          gameResult: gameResult ? {
            status: gameResult.status,
            result: gameResult.result,
            score: gameResult.score,
            homeTeam: gameResult.homeTeam,
            awayTeam: gameResult.awayTeam
          } : null
        });
      }

      return {
        ...bet.toJSON(),
        selections: selectionsWithResults
      };
    } catch (error) {
      console.error('Error getting bet details:', error);
      throw error;
    }
  }

  // 특정 desc/commence_time 리스트만 업데이트하는 임시 함수
  async updateSpecificSelections() {
    // 예시: desc, commence_time 쌍 리스트
    const targets = [
      { desc: 'LG Twins vs NC Dinos', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Samsung Lions vs Doosan Bears', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Lotte Giants vs Hanwha Eagles', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Kia Tigers vs KT Wiz', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Kiwoom Heroes vs SSG Landers', commence_time: '2025-06-19T09:30:00.000Z' },
      { desc: 'Jeonbuk Hyundai Motors vs FC Seoul', commence_time: '2025-06-21T10:00:00.000Z' },
      { desc: 'Pohang Steelers vs Jeju United FC', commence_time: '2025-06-21T10:00:00.000Z' },
      { desc: 'Gwangju FC vs Daejeon Citizen', commence_time: '2025-06-22T10:00:00.000Z' },
      { desc: 'Sangju Sangmu FC vs FC Anyang', commence_time: '2025-06-22T10:00:00.000Z' }
    ];
    for (const target of targets) {
      // 해당 selection이 포함된 모든 Bet을 찾음
      const bets = await Bet.findAll({
        where: {},
      });
      for (const bet of bets) {
        let updated = false;
        for (const selection of bet.selections) {
          if (selection.desc === target.desc && selection.commence_time === target.commence_time) {
            const gameResult = await this.getGameResultByTeams(selection);
            if (gameResult) {
              const selectionResult = this.determineSelectionResult(selection, gameResult, null);
              selection.result = selectionResult;
              updated = true;
              console.log(`[updateSpecificSelections] desc=${selection.desc}, commence_time=${selection.commence_time}, result=${selectionResult}`);
            } else {
              console.log(`[updateSpecificSelections] desc=${selection.desc}, commence_time=${selection.commence_time}, result=매칭실패`);
            }
          }
        }
        if (updated) {
          await bet.update({ selections: bet.selections });
        }
      }
    }
  }

  // 🆕 추천인 수수료 지급 처리
  async processReferralCommission(user, bet, adjustedWinnings, transaction) {
    try {
      // ReferralCode 테이블에서 추천인 정보 조회
      const ReferralCode = (await import('../models/referralCodeModel.js')).default;
      const referralCode = await ReferralCode.findOne({
        where: { 
          code: user.referredBy, 
          isActive: true 
        },
        transaction
      });

      if (!referralCode) {
        console.log(`[추천인 수수료] 추천코드 '${user.referredBy}'를 찾을 수 없거나 비활성화됨`);
        return;
      }

      // 추천인 사용자 조회
      const referrerUser = await User.findByPk(referralCode.adminId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!referrerUser) {
        console.log(`[추천인 수수료] 추천인 사용자 ID '${referralCode.adminId}'를 찾을 수 없음`);
        return;
      }

      // 추천인 수수료 계산 (승리 금액의 5%)
      const referralCommissionRate = referralCode.commissionRate || 0.05;
      const referralCommissionAmount = Math.floor(adjustedWinnings * referralCommissionRate);

      if (referralCommissionAmount <= 0) {
        console.log(`[추천인 수수료] 수수료 금액이 0원 이하: ${referralCommissionAmount}원`);
        return;
      }

      // 추천인 잔액 증가
      referrerUser.balance = Number(referrerUser.balance) + Number(referralCommissionAmount);
      await referrerUser.save({ transaction });

      // 추천인 수수료 기록을 AdminCommission에 저장
      await AdminCommission.create({
        adminId: referrerUser.id,
        userId: user.id,
        betId: bet.id, // 스포츠북은 betId 사용
        exchangeOrderId: null, // 스포츠북은 exchangeOrderId 사용하지 않음
        betAmount: bet.stake,
        winAmount: adjustedWinnings,
        commissionRate: referralCommissionRate,
        commissionAmount: referralCommissionAmount,
        status: 'paid',
        paidAt: new Date(),
        type: 'referral' // 추천인 수수료 구분
      }, { transaction });

      // 추천인에게 지급된 수수료 기록을 PaymentHistory에 저장
      await PaymentHistory.create({
        userId: referrerUser.id,
        betId: bet.id,
        amount: referralCommissionAmount,
        memo: `추천인 수수료 (${user.email} 베팅 승리, ${(referralCommissionRate * 100).toFixed(2)}%)`,
        paidAt: new Date(),
        balanceAfter: referrerUser.balance
      }, { transaction });

      // 추천코드 사용자 수 증가
      await referralCode.incrementUserCount({ transaction });

      console.log(`[추천인 수수료] 베팅 ${bet.id}: 추천인 ${referrerUser.email}에게 ${referralCommissionAmount}원 지급 (${(referralCommissionRate * 100).toFixed(2)}%)`);

    } catch (error) {
      console.error(`[추천인 수수료] 처리 중 오류 발생:`, error);
      // 추천인 수수료 처리 실패는 전체 베팅 승리 처리를 중단시키지 않음
    }
  }
}

const betResultService = new BetResultService();
export default betResultService; 