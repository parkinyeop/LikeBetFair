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
import { isGameCancelledOrPostponed, isGameFinished, isGamePending } from '../utils/gameStatusHelpers.js';

// 배당률 제공 카테고리만 허용 (gameResultService와 동일하게 유지)
const allowedCategories = ['baseball', 'soccer', 'basketball'];

// 🔒 중복 정산 방지 플래그
let isSettling = false;

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
    // 🔒 중복 실행 방지
    if (isSettling) {
      console.log('⏭️ [SETTLEMENT_LOCK] 이미 정산이 진행 중입니다. 건너뜁니다.');
      return { updatedCount: 0, errorCount: 0, skipped: true };
    }
    
    isSettling = true;
    const startTime = Date.now();
    console.log('🔒 [SETTLEMENT_LOCK] 정산 잠금 획득');
    
    try {
      console.log('Starting bet results update...');
      // ✅ 정책: GameResult의 result 필드 사용 금지
      // ✅ The Odds API의 completed: true를 신뢰 (자동 보정 제거)
      
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
      
      // ✨ 상세 로깅 정보 추가
      return { 
        updatedCount, 
        errorCount,
        // 상세 정보
        pendingBetsChecked: pendingBets.length,
        settled: updatedCount,
        failed: errorCount,
        stillPending: pendingBets.length - updatedCount - errorCount
      };
    } catch (error) {
      console.error('Error updating bet results:', error);
      throw error;
    } finally {
      // 🔓 정산 잠금 해제
      const duration = Date.now() - startTime;
      isSettling = false;
      console.log(`🔓 [SETTLEMENT_LOCK] 정산 잠금 해제 (소요 시간: ${duration}ms)`);
    }
  }

  // 개별 배팅 결과 처리 (스코어 유무 기반)
  async processBetResult(bet) {
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
      
      // 먼저 시간 범위로 후보 경기들을 가져온 다음 메모리에서 정규화 매칭
      // ✅ 시간 범위 축소: ±48시간 → ±3시간 (다른 날짜 경기와 매칭 방지)
      const candidateGames = await GameResult.findAll({
        where: {
          commenceTime: {
            [Op.gte]: new Date(commenceTime.getTime() - 3 * 60 * 60 * 1000), // ✅ 3시간 전
            [Op.lte]: new Date(commenceTime.getTime() + 3 * 60 * 60 * 1000)  // ✅ 3시간 후
          },
          status: { [Op.in]: ['finished', 'cancelled', 'postponed', 'scheduled'] } // ✅ scheduled 추가
        },
        order: [['createdAt', 'DESC']]
      });

      // 정산을 위해 finished 상태 경기를 우선 정렬
      const statusPriority = { 'finished': 1, 'cancelled': 2, 'postponed': 3, 'scheduled': 4, 'live': 5 };
      candidateGames.sort((a, b) => {
        const priorityA = statusPriority[a.status] || 99;
        const priorityB = statusPriority[b.status] || 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB; // finished가 가장 먼저
        }
        // 같은 우선순위면 시간이 가까운 것 우선
        return Math.abs(new Date(a.commenceTime).getTime() - commenceTime.getTime()) - 
               Math.abs(new Date(b.commenceTime).getTime() - commenceTime.getTime());
      });

      // 메모리에서 정규화된 팀명으로 매칭
      let gameResult = null;
      for (const candidate of candidateGames) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);

        // 정규화된 팀명으로 매칭 (양방향)
        if ((dbHomeNorm === normalizedHomeTeam && dbAwayNorm === normalizedAwayTeam) ||
            (dbHomeNorm === normalizedAwayTeam && dbAwayNorm === normalizedHomeTeam)) {
          gameResult = candidate;
          console.log(`🎯 [매칭 성공] 정규화된 팀명으로 매칭: ${candidate.homeTeam} vs ${candidate.awayTeam}`);
          break;
        }

        // 원본 팀명으로도 시도 (기존 로직 유지)
        const homeMatch = candidate.homeTeam.toLowerCase().includes(homeTeam.toLowerCase()) ||
                         homeTeam.toLowerCase().includes(candidate.homeTeam.toLowerCase());
        const awayMatch = candidate.awayTeam.toLowerCase().includes(awayTeam.toLowerCase()) ||
                         awayTeam.toLowerCase().includes(candidate.awayTeam.toLowerCase());

        if (homeMatch && awayMatch) {
          gameResult = candidate;
          console.log(`🎯 [매칭 성공] 원본 팀명으로 매칭: ${candidate.homeTeam} vs ${candidate.awayTeam}`);
          break;
        }
      }

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
          console.error(`   - 검색 시간 범위: ${new Date(commenceTime.getTime() - 48 * 60 * 60 * 1000).toISOString()} ~ ${new Date(commenceTime.getTime() + 48 * 60 * 60 * 1000).toISOString()}`);
          console.error(`   - 후보 경기 수: ${candidateGames.length}개`);
          if (candidateGames.length > 0) {
            console.error(`   - 후보 경기 목록:`);
            candidateGames.slice(0, 5).forEach((cg, idx) => {
              console.error(`     ${idx + 1}. ${cg.homeTeam} vs ${cg.awayTeam} (${cg.commenceTime.toISOString()})`);
            });
          }
          
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
      if (isGameCancelledOrPostponed(gameResult)) {
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
      console.log(`   - 스코어: ${JSON.stringify(gameResult.score)}`);
      
      const selectionResult = this.determineSelectionResult(selection, gameResult, validatedScore);
      console.log(`   - 판정 결과: ${selectionResult}`);
      
      selection.result = selectionResult;
      
      // ✅ Push 여부 판단: cancelled인데 경기는 정상 종료된 경우
      if (selection.result === 'cancelled' && !isGameCancelledOrPostponed(gameResult)) {
        selection.isPush = true;
        console.log(`   - Push 감지: 경기는 정상 종료되었으나 무승부 조건`);
      } else {
        selection.isPush = false;
      }
      
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
      const t = await Bet.sequelize.transaction();
      try {
        bet.status = betStatus;
        bet.selections = [...selections];
        bet.changed('selections', true);  // ✅ Sequelize JSONB 업데이트 명시
        await bet.save({ transaction: t });
        if (betStatus === 'won') {
          await this.processBetWinnings(bet, t);
        } else if (betStatus === 'cancelled') {
          // ✅ 취소 사유를 구분하여 memo 생성
          const memo = this.getCancellationMemo(bet);
          await this.processBetRefund(bet, t, memo);
        }
        await t.commit();
      } catch (err) {
        await t.rollback();
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
    // 🔒 비관적 락으로 중복 체크 (트랜잭션 격리 수준 강화)
    const existingPayment = await PaymentHistory.findOne({
      where: {
        betId: bet.id,
        memo: { [Op.like]: '%베팅 적중 지급%' }
      },
      transaction,
      lock: transaction.LOCK.UPDATE // 🔒 비관적 락 추가
    });
    
    if (existingPayment) {
      console.log(`[적중 지급] 🔒 이미 지급된 베팅 ${bet.id} 건너뛰기 (중복 방지)`);
      return;
    }
    
    // 🔒 사용자 레코드에도 비관적 락 적용
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
        // SYSTEM_ADMIN_ID가 설정되지 않은 경우 AdminCommission 기록을 건너뛰기
        const systemAdminId = ADMIN_CONFIG.SYSTEM_ADMIN_ID;

        if (systemAdminId) {
          await AdminCommission.create({
            adminId: systemAdminId,
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
        } else {
          console.log(`[수수료 기록] SYSTEM_ADMIN_ID가 설정되지 않아 AdminCommission 기록을 건너뜀`);
        }
        
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
      if (user.referralCode) {
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

  // 🆕 환불 사유 메시지 생성 (Push vs 경기 취소 구분)
  getCancellationMemo(bet) {
    const selections = bet.selections || [];
    
    if (selections.length === 0) {
      return '베팅 취소로 인한 환불';
    }
    
    // 모든 선택의 result 확인
    const results = selections.map(s => s.result);
    const allCancelled = results.every(r => r === 'cancelled');
    const someCancelled = results.some(r => r === 'cancelled');
    
    // ✅ Push 여부 확인 (isPush 플래그 사용)
    const hasPush = selections.some(s => s.isPush === true);
    const allPush = selections.every(s => s.result === 'cancelled' && s.isPush === true);
    
    // ✅ 실제 경기 취소/연기 여부 확인 (isPush가 아닌 cancelled)
    const hasGameCancelled = selections.some(s => 
      s.result === 'cancelled' && s.isPush !== true
    );
    
    // 우선순위: 경기 취소 > Push > 혼합 > 기본
    if (allPush) {
      return 'Push (무승부)로 인한 환불';
    } else if (hasGameCancelled && !hasPush) {
      return '경기 취소/연기로 인한 환불';
    } else if (hasGameCancelled && hasPush) {
      return '일부 경기 취소 및 Push로 인한 환불';
    } else if (someCancelled) {
      return '일부 경기 취소로 인한 환불';
    } else {
      return '베팅 취소로 인한 환불';
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

  // 🆕 selection 기반 경기 결과 조회 (getBetDetails, 관리자 페이지용)
  async getGameResultByTeams(selection) {
    try {
      if (!selection.desc || !selection.commence_time) {
        console.log('[getGameResultByTeams] Invalid selection data:', selection);
        return null;
      }
      
      // desc에서 팀명 추출 (예: "LG Twins vs Doosan Bears")
      const parts = selection.desc.split(' vs ');
      if (parts.length !== 2) {
        console.log(`[getGameResultByTeams] Invalid desc format: ${selection.desc}`);
        return null;
      }

      const homeTeam = parts[0].trim();
      const awayTeam = parts[1].trim();
      const commenceTime = new Date(selection.commence_time);
      
      if (isNaN(commenceTime.getTime())) {
        console.log(`[getGameResultByTeams] Invalid commence_time: ${selection.commence_time}`);
        return null;
      }
      
      // 팀명 정규화
      const normalizedHomeTeam = normalizeTeamNameForComparison(homeTeam);
      const normalizedAwayTeam = normalizeTeamNameForComparison(awayTeam);
      
      // 시간 범위로 후보 경기 조회 (±48시간)
      const candidateGames = await GameResult.findAll({
        where: {
          commenceTime: {
            [Op.gte]: new Date(commenceTime.getTime() - 48 * 60 * 60 * 1000),
            [Op.lte]: new Date(commenceTime.getTime() + 48 * 60 * 60 * 1000)
          },
          status: { [Op.in]: ['finished', 'cancelled', 'postponed', 'scheduled'] }
        },
        order: [['createdAt', 'DESC']]
      });

      // 정규화된 팀명으로 매칭 (양방향)
      for (const candidate of candidateGames) {
        const dbHomeNorm = normalizeTeamNameForComparison(candidate.homeTeam);
        const dbAwayNorm = normalizeTeamNameForComparison(candidate.awayTeam);

        if ((dbHomeNorm === normalizedHomeTeam && dbAwayNorm === normalizedAwayTeam) ||
            (dbHomeNorm === normalizedAwayTeam && dbAwayNorm === normalizedHomeTeam)) {
          return candidate;
        }
      }
      
      // 원본 팀명으로도 시도
      for (const candidate of candidateGames) {
        const homeMatch = candidate.homeTeam.toLowerCase().includes(homeTeam.toLowerCase()) ||
                         homeTeam.toLowerCase().includes(candidate.homeTeam.toLowerCase());
        const awayMatch = candidate.awayTeam.toLowerCase().includes(awayTeam.toLowerCase()) ||
                         awayTeam.toLowerCase().includes(candidate.awayTeam.toLowerCase());

        if (homeMatch && awayMatch) {
          return candidate;
        }
      }

      return null;
    } catch (error) {
      console.error('[getGameResultByTeams] Error:', error);
      return null;
    }
  }

  // 🚫 더 이상 사용하지 않는 메서드 (주석처리됨)
  // async getGameResultByTeamsOLD(selection, pendingGameResultsCache = null) {
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
    // 🚨 강력한 방어 코드: score 데이터 무결성 검증
    if (!validatedScore) {
      const score = gameResult.score;

      // score가 유효하지 않으면 절대 승/패 결정하지 않음
      if (!score || !Array.isArray(score) || score.length === 0) {
        console.log(`[SELECTION GUARD] 스코어가 없거나 비어있음 - pending 처리`);
        return 'pending';
      }

      // score 배열 요소 검증: name과 score 필드가 모두 있어야 함
      const hasValidElements = score.every(s => s && s.name && (s.score !== undefined && s.score !== null));
      if (!hasValidElements) {
        console.log(`[SELECTION GUARD] 스코어 형식이 유효하지 않음 - pending 처리`);
        console.log(`[SELECTION GUARD] 문제 스코어:`, JSON.stringify(score));
        return 'pending';
      }
    }

    // market alias 매핑
    let marketType = selection.market;
    if (marketType === 'h2h') marketType = '승/패';
    if (marketType === 'totals') marketType = '언더/오버';
    if (marketType === 'spreads') marketType = '핸디캡';
    if (marketType === 'Win/Loss') marketType = '승/패';
    if (marketType === 'Over/Under') marketType = '언더/오버';
    if (marketType === 'Handicap') marketType = '핸디캡';

    const resultFunction = this.marketResultMap[marketType];
    if (resultFunction) {
      return resultFunction(selection, gameResult, validatedScore);
    }
    console.log(`[경고] 알 수 없는 마켓 타입: ${selection.market} → 변환 후: ${marketType}`);
    return 'pending';
  }

  // 승/패 결과 판정
  determineWinLoseResult(selection, gameResult, validatedScore = null) {
    // 🔴 1순위: 취소/연기 (환불 정책 - 최우선 처리)
    if (isGameCancelledOrPostponed(gameResult)) {
      return 'cancelled';
    }

    // 🟡 2순위: 예정/진행중 (대기 - 경기 결과 전)
    if (isGamePending(gameResult)) {
      return 'pending';
    }

    // 🟢 3순위: 경기 종료 (결과 판정 - 스코어 확인 필수)
    // ✅ The Odds API의 completed: true를 신뢰 (status: finished만 확인)
    if (!isGameFinished(gameResult)) {
      return 'pending';
    }

    // ✅ 스코어가 있으면 스코어로 직접 계산
    if (gameResult.score && Array.isArray(gameResult.score) && gameResult.score.length >= 2) {
      const homeScoreData = gameResult.score.find(s => s.name === gameResult.homeTeam);
      const awayScoreData = gameResult.score.find(s => s.name === gameResult.awayTeam);
      
      if (homeScoreData && awayScoreData) {
        const homeScore = parseInt(homeScoreData.score);
        const awayScore = parseInt(awayScoreData.score);
        
        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          // 🆕 Draw 선택 처리 (무승부 베팅)
          if (selection.team && selection.team.toLowerCase() === 'draw') {
            console.log(`[승/패 판정 - Draw 선택] 무승부 베팅: ${homeScore}-${awayScore}`);
            if (homeScore === awayScore) {
              console.log(`[승/패 판정 - Draw 결과] 무승부 성공!`);
              return 'won';
            } else {
              console.log(`[승/패 판정 - Draw 결과] 무승부 실패 (${homeScore}-${awayScore})`);
              return 'lost';
            }
          }
          
          const selectedTeam = normalizeTeamNameForComparison(selection.team);
          const homeTeam = normalizeTeamNameForComparison(gameResult.homeTeam);
          const awayTeam = normalizeTeamNameForComparison(gameResult.awayTeam);
          
          console.log(`[승/패 판정 - 스코어 기반] ${gameResult.homeTeam} ${homeScore}-${awayScore} ${gameResult.awayTeam}`);
          console.log(`[승/패 판정 - 팀명 매칭] 선택팀: "${selectedTeam}", 홈팀: "${homeTeam}", 원정팀: "${awayTeam}"`);
          
          // 팀명 매칭 검증 로그 추가
          const homeMatch = selectedTeam === homeTeam;
          const awayMatch = selectedTeam === awayTeam;
          console.log(`[승/패 판정 - 매칭 결과] 홈팀 매칭: ${homeMatch}, 원정팀 매칭: ${awayMatch}`);
          
          // 팀명 매칭이 실패한 경우 추가 검증
          if (!homeMatch && !awayMatch) {
            console.warn(`[승/패 판정 - 매칭 실패] 팀명 매칭 실패, 추가 검증 시도`);
            
            // 원본 팀명으로 부분 매칭 시도
            const originalSelectedTeam = selection.team.toLowerCase();
            const originalHomeTeam = gameResult.homeTeam.toLowerCase();
            const originalAwayTeam = gameResult.awayTeam.toLowerCase();
            
            const partialHomeMatch = originalSelectedTeam.includes(originalHomeTeam.split(' ')[0]) || 
                                   originalHomeTeam.includes(originalSelectedTeam.split(' ')[0]);
            const partialAwayMatch = originalSelectedTeam.includes(originalAwayTeam.split(' ')[0]) || 
                                   originalAwayTeam.includes(originalSelectedTeam.split(' ')[0]);
            
            console.log(`[승/패 판정 - 부분 매칭] 홈팀 부분 매칭: ${partialHomeMatch}, 원정팀 부분 매칭: ${partialAwayMatch}`);
            
            if (partialHomeMatch && !partialAwayMatch) {
              const result = homeScore > awayScore ? 'won' : 'lost';
              console.log(`[승/패 판정] 부분 매칭으로 홈팀 승리 판정: ${result}`);
              return result;
            } else if (partialAwayMatch && !partialHomeMatch) {
              const result = awayScore > homeScore ? 'won' : 'lost';
              console.log(`[승/패 판정] 부분 매칭으로 원정팀 승리 판정: ${result}`);
              return result;
            } else {
              console.warn(`[승/패 판정] 팀명 매칭 완전 실패 - pending 처리`);
              return 'pending';
            }
          }
          
          if (homeScore > awayScore) {
            const result = homeMatch ? 'won' : 'lost';
            console.log(`[승/패 판정] 홈 승리 (${homeScore}-${awayScore}) → ${selection.team} = ${result} (홈팀 매칭: ${homeMatch})`);
            return result;
          } else if (awayScore > homeScore) {
            const result = awayMatch ? 'won' : 'lost';
            console.log(`[승/패 판정] 원정 승리 (${homeScore}-${awayScore}) → ${selection.team} = ${result} (원정팀 매칭: ${awayMatch})`);
            return result;
          } else {
            // ✅ 무승부: Draw 선택했으면 won, 아니면 lost
            const isDraw = selection.team.toLowerCase() === 'draw';
            const result = isDraw ? 'won' : 'lost';
            console.log(`[승/패 판정] 무승부 (${homeScore}-${awayScore}) → ${selection.team} (Draw 선택: ${isDraw}) = ${result}`);
            return result;
          }
        }
      }
    }

    // 🔴 스코어 없이 finished 상태인 경우: pending 유지 (안전장치)
    console.warn(`[승/패 판정] 경기 종료 상태이지만 스코어 없음 - pending 유지`);
    return 'pending';
  }

  // 언더/오버 결과 판정
  determineOverUnderResult(selection, gameResult, validatedScore = null) {
    // 🔴 1순위: 취소/연기 (환불 정책 - 최우선 처리)
    if (isGameCancelledOrPostponed(gameResult)) {
      return 'cancelled';
    }

    // 🟡 2순위: 예정/진행중 (대기 - 경기 결과 전)
    if (isGamePending(gameResult)) {
      return 'pending';
    }

    // 🟢 3순위: 경기 종료 (결과 판정 - 스코어 확인 필수)
    if (!isGameFinished(gameResult)) {
      return 'pending';
    }

    // ✅ The Odds API의 completed: true를 신뢰 (시간 대기 제거)

    if (!gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length < 2) {
      console.warn(`[언더/오버 판정] 경기 종료 상태이지만 스코어 없음 - pending 유지`);
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

    // 스코어 계산 실패 시 pending 처리
    if (totalScore === null || totalScore === undefined) {
      console.log(`[언더/오버 판정] 스코어 계산 실패 → pending`);
      return 'pending';
    }

    // point가 없으면 무효
    if (typeof point !== 'number' || isNaN(point)) {
      console.log(`[언더/오버 판정] 포인트 없음: ${point} → cancelled`);
      return 'cancelled';
    }

    // 무효 조건: totalScore와 point가 같으면 push/cancel 처리
    if (totalScore === point) {
      console.log(`[언더/오버 판정] Push 조건: 총점 ${totalScore} = 기준 ${point} → cancelled`);
      return 'cancelled';
    }

    console.log(`[언더/오버 판정] 총점: ${totalScore}, 기준: ${point}, 타입: ${option}`);
    console.log(`[언더/오버 판정] 스코어 데이터: ${JSON.stringify(scoreToUse)}`);
    
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
    // 🔴 1순위: 취소/연기 (환불 정책 - 최우선 처리)
    if (isGameCancelledOrPostponed(gameResult)) {
      return 'cancelled';
    }

    // 🟡 2순위: 예정/진행중 (대기 - 경기 결과 전)
    if (isGamePending(gameResult)) {
      return 'pending';
    }

    // 🟢 3순위: 경기 종료 (결과 판정 - 스코어 확인 필수)
    if (!isGameFinished(gameResult)) {
      return 'pending';
    }

    // ✅ The Odds API의 completed: true를 신뢰 (시간 대기 제거)

    if (!gameResult.score || !Array.isArray(gameResult.score) || gameResult.score.length < 2) {
      console.warn(`[핸디캡 판정] 경기 종료 상태이지만 스코어 없음 - pending 유지`);
      return 'pending';
    }

    // 핸디캡 베팅에서 팀명과 핸디캡 분리 (개선된 로직)
    let selectedTeam, handicap;
    
    // 핸디캡 파싱 개선: "Sport Recife 0", "Miami Dolphins -3" 등 모든 형식 지원
    // 정규식: 팀명 + 공백 + (부호 선택적) + 숫자
    const handicapMatch = selection.team.match(/^(.+?)\s+([+-]?)(\d+(?:\.\d+)?)$/);
    
    if (handicapMatch) {
      // 매칭 성공: 팀명과 핸디캡 분리
      selectedTeam = normalizeTeamNameForComparison(handicapMatch[1].trim());
      const sign = handicapMatch[2] === '-' ? -1 : 1;
      const value = parseFloat(handicapMatch[3]);
      handicap = sign * value;
      console.log(`[핸디캡 파싱] 팀명: "${selectedTeam}", 핸디캡: ${handicap} (원본: "${selection.team}")`);
    } else if (selection.team && (selection.team.includes('--'))) {
      // 특수 케이스: "--0.75" 형식 (예: "Ulsan Hyundai FC --0.75")
      const specialMatch = selection.team.match(/^(.+?)\s*(--[\d.]+)$/);
      if (specialMatch) {
        selectedTeam = normalizeTeamNameForComparison(specialMatch[1].trim());
        handicap = -parseFloat(specialMatch[2].substring(2));
        console.log(`[핸디캡 파싱] 특수 형식, 팀명: "${selectedTeam}", 핸디캡: ${handicap} (원본: "${specialMatch[2]}")`);
      } else {
        selectedTeam = normalizeTeamNameForComparison(selection.team);
        handicap = selection.handicap || 0;
        console.log(`[핸디캡 파싱] 특수 형식 매칭 실패, 팀명: "${selectedTeam}", 핸디캡: ${handicap}`);
      }
    } else {
      // 핸디캡이 포함되지 않은 경우 (selection.handicap 필드 사용)
      selectedTeam = normalizeTeamNameForComparison(selection.team);
      handicap = selection.handicap || selection.point || 0;
      console.log(`[핸디캡 파싱] 별도 필드 사용, 팀명: "${selectedTeam}", 핸디캡: ${handicap}`);
    }
    
    // 스코어 계산 (검증된 스코어 우선 사용)
    let homeScore, awayScore;
    if (validatedScore) {
      homeScore = validatedScore.home;
      awayScore = validatedScore.away;
      console.log(`[핸디캡] 검증된 스코어 사용: ${homeScore}-${awayScore}`);
    } else {
      const scoreResult = this.extractHomeAwayScores(gameResult.score, gameResult.homeTeam, gameResult.awayTeam);

      // 스코어 추출 실패 시 pending 처리
      if (!scoreResult) {
        console.log(`[핸디캡 판정] 스코어 추출 실패 → pending`);
        return 'pending';
      }

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
    
    if (selectedTeam === homeTeamNorm) {
      const adjustedScore = homeScore + handicap;
      const result = adjustedScore > awayScore ? 'won' : 'lost';
      console.log(`[핸디캡 매칭] 홈팀 매칭: ${adjustedScore} vs ${awayScore} = ${result}`);
      return result;
    } else if (selectedTeam === awayTeamNorm) {
      const adjustedScore = awayScore + handicap;
      const result = adjustedScore > homeScore ? 'won' : 'lost';
      console.log(`[핸디캡 매칭] 원정팀 매칭: ${adjustedScore} vs ${homeScore} = ${result}`);
      return result;
    }

    console.log(`[핸디캡 매칭] 팀명 매칭 실패: "${selectedTeam}" not found in ["${homeTeamNorm}", "${awayTeamNorm}"]`);
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
      console.error('[Score Calculation] 스코어 형식 검증 실패 - null 반환');
      return null;
    }

    try {
      return normalizedScore.reduce((sum, score) => {
        const scoreValue = parseInt(score.score || 0);
        return sum + (isNaN(scoreValue) ? 0 : scoreValue);
      }, 0);
    } catch (error) {
      console.error('[Score Calculation] 총점 계산 오류:', error.message);
      return null;
    }
  }

  // 스코어에서 홈/원정 점수 추출 (방어 코드 포함)
  extractHomeAwayScores(scoreData, homeTeam, awayTeam) {
    const normalizedScore = this.validateAndNormalizeScore(scoreData);
    if (!normalizedScore) {
      console.error('[Score Extraction] 스코어 형식 검증 실패 - null 반환');
      return null;
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
      return null;
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
            result: gameResult.status, // 호환성을 위해 status를 result로 복사
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
          code: user.referralCode, 
          isActive: true 
        },
        transaction
      });

      if (!referralCode) {
        console.log(`[추천인 수수료] 추천코드 '${user.referralCode}'를 찾을 수 없거나 비활성화됨`);
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

      // 추천인 수수료 계산 (추천코드에 설정된 수수료율 사용)
      const referralCommissionRate = referralCode.commissionRate || 0;
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