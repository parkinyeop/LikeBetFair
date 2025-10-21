import ExchangeOrder from '../models/exchangeOrderModel.js';
import ExchangeOrderMatch from '../models/exchangeOrderMatchModel.js';
import PaymentHistory from '../models/paymentHistoryModel.js';
import User from '../models/userModel.js';
import GameResult from '../models/gameResultModel.js';
import { Op } from 'sequelize';
import createScriptSequelize from '../config/scriptDatabase.js';
import settlementValidation from '../utils/settlementValidation.js';
import GameResultQuery from '../utils/gameResultQuery.js';
import { getLocationConfig } from '../config/gameResultQuery.js';
import { getSettlementWaitHours } from '../config/settlementConfig.js';
import settlementLogger from '../utils/settlementLogger.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();
import directMatchingService from './directMatchingService.js';

/**
 * 멀티배팅 전용 정산 서비스
 * 모든 경기 결과를 종합하여 멀티배팅 정산 처리
 */
class MultibetSettlementService {
  
  constructor() {
    this.pendingLayRefund = 0; // Push로 인한 Lay 환불 금액
  }
  
  /**
   * 멀티배팅 주문 정산 (부분 매칭 상관없이 그룹으로 처리)
   * @param {Object} order - 멀티배팅 주문
   * @returns {Object} 정산 결과
   */
  async settleMultibetOrder(order) {
    const settlementStartTime = Date.now();
    const transaction = await sequelize.transaction();

    try {
      console.log(`🎯 멀티배팅 정산 시작: 주문 ${order.id}`);
      
      // ✅ 정산 시작 로깅
      settlementLogger.logSettlement('MULTIBET_START', order.id, {
        userId: order.userId,
        originalAmount: order.originalAmount,
        filledAmount: order.filledAmount,
        remainingAmount: order.remainingAmount,
        partiallyFilled: order.partiallyFilled,
        status: order.status,
        isMultibet: order.isMultibet
      });

      if (!order.isMultibet) {
        throw new Error('멀티배팅 주문이 아닙니다.');
      }

      if (!order.selectionDetails?.selections) {
        throw new Error('선택된 경기가 없습니다.');
      }

      // 1단계: 매치 여부 확인 (성능 측정)
      const matchCheckStartTime = Date.now();
      const hasMatches = await this.checkOrderMatches(order.id);
      console.log(`⏱️ 매치 확인 완료: ${Date.now() - matchCheckStartTime}ms`);

      if (!hasMatches) {
        console.log(`⚠️ 매치되지 않은 주문: ${order.id} - 만료 취소 처리`);
        await this.processUnmatchedOrderCancellation(order, transaction);
        await transaction.commit();
        const totalTime = Date.now() - settlementStartTime;
        console.log(`🔄 주문 취소 완료: ${order.id} (총 ${totalTime}ms)`);
        return { message: 'Unmatched order cancelled', orderId: order.id };
      }

      // 이미 정산된 경우 스킵
      if (order.status === 'settled') {
        console.log(`⚠️ 이미 정산된 주문: ${order.id}`);
        await transaction.commit();
        const totalTime = Date.now() - settlementStartTime;
        console.log(`⚠️ 중복 정산 방지: ${order.id} (총 ${totalTime}ms)`);
        return { message: 'Already settled', orderId: order.id };
      }

      // 2단계: 모든 경기 결과 수집 (성능 측정)
      const gameResultsStartTime = Date.now();
      const gameResults = await this.collectAllGameResults(order.selectionDetails.selections);
      console.log(`⏱️ 경기 결과 수집 완료: ${Date.now() - gameResultsStartTime}ms (${gameResults.length}개)`);

      // 3단계: 멀티배팅 승패 판정
      const judgmentStartTime = Date.now();
      const settlementResult = this.determineMultibetResult(gameResults);
      console.log(`⏱️ 승패 판정 완료: ${Date.now() - judgmentStartTime}ms (결과: ${settlementResult.finalResult})`);

      // 4단계: 정산 처리 (성능 측정)
      const processStartTime = Date.now();
      const settlement = await this.processMultibetSettlement(order, settlementResult, transaction);
      console.log(`⏱️ 정산 처리 완료: ${Date.now() - processStartTime}ms`);

      await transaction.commit();

      const totalTime = Date.now() - settlementStartTime;
      console.log(`✅ 멀티배팅 정산 완료: 주문 ${order.id} (총 ${totalTime}ms)`);

      return settlement;

    } catch (error) {
      await transaction.rollback();
      const totalTime = Date.now() - settlementStartTime;
      console.error(`❌ 멀티배팅 정산 실패: 주문 ${order.id} (총 ${totalTime}ms)`, error);
      throw error;
    }
  }
  
  /**
   * 주문의 매치 여부 확인 (ExchangeOrder의 matchedOrderId 사용)
   * @param {number} orderId - 주문 ID
   * @returns {boolean} 매치 여부
   */
  async checkOrderMatches(orderId) {
    const order = await ExchangeOrder.findByPk(orderId);

    if (!order) {
      console.log(`❌ 주문 ${orderId}를 찾을 수 없음`);
      return false;
    }

    const isMatched = order.matchedOrderId !== null;
    console.log(`🔍 주문 ${orderId} 매치 확인: ${isMatched ? '매칭됨' : '매칭 안됨'} (매칭ID: ${order.matchedOrderId})`);
    return isMatched;
  }
  
  /**
   * 매치되지 않은 주문 취소 처리
   * @param {Object} order - 주문
   * @param {Object} transaction - 트랜잭션
   */
  async processUnmatchedOrderCancellation(order, transaction) {
    console.log(`🔄 매치되지 않은 주문 취소 처리: ${order.id}`);
    
    // 1. 주문 상태를 cancelled로 변경
    await order.update({
      status: 'cancelled',
      settlementNote: '매치되지 않아 만료 취소',
      settledAt: new Date()
    }, { transaction });
    
    // 2. 사용자 잔액 환불
    const user = await User.findByPk(order.userId, { transaction });
    const refundAmount = order.stakeAmount || order.amount;
    const currentBalance = parseFloat(user.balance) || 0;
    const newBalance = currentBalance + refundAmount;
    
    await user.update({ balance: newBalance }, { transaction });
    
    // 3. 환불 내역 기록
    await PaymentHistory.create({
      userId: order.userId,
      betId: `EXCHANGE_${order.id}`,
      amount: refundAmount,
      type: 'refund',
      memo: `Exchange 멀티배팅 주문 만료로 인한 자동 환불 (매치되지 않음)`,
      status: 'completed',
      balanceAfter: newBalance,
      paidAt: new Date()
    }, { transaction });
    
    console.log(`✅ 매치되지 않은 주문 취소 완료: ${order.id} - 환불: ${refundAmount}원`);
  }
  
  /**
   * 모든 경기 결과 수집
   * @param {Array} selections - 선택된 경기들
   * @returns {Array} 경기 결과 배열
   */
  async collectAllGameResults(selections) {
    const gameResults = [];
    
    for (const [index, selection] of selections.entries()) {
      try {
        const gameResult = await this.findGameResult(selection);
        
        gameResults.push({
          selection,
          // ✅ [Phase 1] Null 방어: gameResult가 null이면 pending 상태 객체로 대체
          gameResult: gameResult || { status: 'scheduled' },
          index: index + 1
        });
        
        // 로그 최적화: 결과가 없을 때만 로그 출력
        if (!gameResult) {
          console.log(`❌ 경기 ${index + 1}/${selections.length}: ${selection.homeTeam} vs ${selection.awayTeam} - 결과 없음 (pending 처리)`);
        }
        
      } catch (error) {
        console.error(`   오류: ${error.message}`);
        gameResults.push({
          selection,
          // ✅ [Phase 1] 오류 시에도 pending 상태 객체로 대체
          gameResult: { status: 'scheduled', error: error.message },
          error: error.message,
          index: index + 1
        });
      }
    }
    
    return gameResults;
  }
  
  /**
   * 개별 경기 결과 찾기 (기존 DirectMatchingService 활용)
   * @param {Object} selection - 선택된 경기
   * @returns {Object|null} 경기 결과
   */
  async findGameResult(selection) {
    const { homeTeam, awayTeam, commenceTime } = selection;

    console.log(`🔍 경기 결과 조회: ${homeTeam} vs ${awayTeam}`);
    console.log(`📅 경기 시간: ${commenceTime}`);

    // 직접 GameResult 모델 사용 (기존 방식으로 복원)
    try {
      // 🚀 중앙화된 경기 결과 조회 사용
      const config = getLocationConfig('multibetSettlement');
      
      let gameResult;
      
      if (config.FEATURE_FLAGS?.USE_CENTRALIZED_QUERY) {
        console.log(`[multibetSettlement] Using centralized query`);
        gameResult = await GameResultQuery.findByTeamsAndTime(
          homeTeam,
          awayTeam,
          commenceTime,
          'multibetSettlement'
        );
      } else {
        // 레거시 로직 (Feature Flag가 비활성화된 경우)
        console.log(`[multibetSettlement] Using legacy query`);
        
        // 정확한 시간으로 먼저 검색
        gameResult = await GameResult.findOne({
          where: {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: commenceTime,
            status: 'finished'
          }
        });

        // 정확한 시간으로 찾지 못하면 시간 범위로 검색 (±6시간)
        if (!gameResult) {
          const targetTime = new Date(commenceTime);
          const startTime = new Date(targetTime.getTime() - (6 * 60 * 60 * 1000));
          const endTime = new Date(targetTime.getTime() + (6 * 60 * 60 * 1000));
          
          console.log(`⏰ 시간 범위 검색 (±6시간): ${startTime.toISOString()} ~ ${endTime.toISOString()}`);
          
          gameResult = await GameResult.findOne({
            where: {
              homeTeam: homeTeam,
              awayTeam: awayTeam,
              commenceTime: {
                [Op.between]: [startTime, endTime]
              },
              status: 'finished'
            }
          });
        }
      }

      if (gameResult) {
        console.log(`✅ 경기 결과 발견: ${gameResult.status} (${gameResult.score})`);

        // 🛡️ GUARD CLAUSE: GameResult 데이터 무결성 검증 (Soft Validation)
        const validationResult = await settlementValidation.softValidateGameResult(
          gameResult,
          { id: `multibet-${selection.homeTeam}-${selection.awayTeam}`, selections: [selection] },
          { validateTeamNames: false }
        );

        if (validationResult.isSoftFail) {
          console.warn(`[MULTIBET_SETTLEMENT] GameResult validation issues for ${selection.homeTeam} vs ${selection.awayTeam}, continuing with legacy logic`);
        }

        // 경기 결과 판정 (검증된 스코어 전달)
        const determinedResult = this.determineGameResult(gameResult, selection, validationResult.score);

        // 🔧 Sequelize 인스턴스인지 확인 후 처리
        const gameResultData = typeof gameResult.toJSON === 'function' 
          ? gameResult.toJSON() 
          : gameResult;

        // ✅ 정책: GameResult의 result 필드 제거 후 우리가 판정한 결과만 사용
        const { result: _unused, ...cleanGameResultData } = gameResultData;

        return {
          ...cleanGameResultData,
          result: determinedResult, // 우리가 판정한 결과 (won/lost/cancelled/pending)
          validatedScore: validationResult.score // 검증된 스코어 포함
        };
      } else {
        console.log(`❌ 경기 결과 없음: ${homeTeam} vs ${awayTeam}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ 경기 결과 조회 오류:`, error.message);
      console.error(`   경기: ${homeTeam} vs ${awayTeam}`);
      console.error(`   오류 스택:`, error.stack);
      
      // 🔧 gameResult가 있었는지 확인
      if (gameResult) {
        console.warn(`⚠️ 경기 결과는 있었으나 처리 중 오류 발생 - 안전하게 pending 처리`);
      }
      
      return null;
    }
  }
  
  /**
   * 개별 경기 결과 판정
   * @param {Object} gameResult - 경기 결과 데이터
   * @param {Object} selection - 선택된 팀
   * @returns {string} 경기 결과 (won/lost/cancelled/pending)
   */
  determineGameResult(gameResult, selection, validatedScore = null) {
    const { status, score } = gameResult;
    const { team: selectedTeam, market } = selection;

    // 경기 취소/연기
    if (status === 'cancelled' || status === 'postponed') {
      return 'cancelled';
    }

    // 경기가 finished 상태가 아니면 pending
    if (status !== 'finished') {
      return 'pending';
    }

    // 🛡️ 안전장치: 경기 시작 후 일정 시간 경과 확인 (스포츠별)
    const requiredHours = getSettlementWaitHours(gameResult.sportKey);
    
    const commenceTime = new Date(gameResult.commenceTime);
    const now = new Date();
    const hoursSinceStart = (now - commenceTime) / (1000 * 60 * 60);
    
    if (hoursSinceStart < requiredHours) {
      console.log(`[정산 대기] 경기 시작 후 ${hoursSinceStart.toFixed(1)}시간 - ${requiredHours}시간 대기 (${gameResult.sportKey})`);
      return 'pending';
    }

    // ✅ 정책: result 필드 사용 금지 - 항상 스코어 기반 판정
    console.log(`[MULTIBET] 스코어 기반 판정 시작 - status: ${status}, market: ${market}`);

    // 스코어 기반 판정 (검증된 스코어 우선 사용)
    let actualHomeScore = null;
    let actualAwayScore = null;

    // 검증된 스코어가 있으면 우선 사용
    if (validatedScore) {
      actualHomeScore = validatedScore.home;
      actualAwayScore = validatedScore.away;
      console.log(`[MULTIBET] 검증된 스코어 사용: ${actualHomeScore}-${actualAwayScore}`);
    }
    // score JSON에서 스코어 추출 시도 (fallback)
    else if (score) {
      try {
        let scoreData;
        if (typeof score === 'string') {
          scoreData = JSON.parse(score);
        } else {
          scoreData = score;
        }

        if (Array.isArray(scoreData) && scoreData.length >= 2) {
          // ✅ 수정: name으로 팀을 찾아서 스코어 추출
          const homeScoreEntry = scoreData.find(s => s.name === gameResult.homeTeam);
          const awayScoreEntry = scoreData.find(s => s.name === gameResult.awayTeam);
          
          if (homeScoreEntry && awayScoreEntry) {
            actualHomeScore = parseInt(homeScoreEntry.score);
            actualAwayScore = parseInt(awayScoreEntry.score);
            console.log(`[MULTIBET] 스코어 파싱 성공: ${gameResult.homeTeam} ${actualHomeScore}-${actualAwayScore} ${gameResult.awayTeam}`);
          } else {
            console.log(`[MULTIBET] 스코어 파싱 실패: 팀명 매칭 안됨`, { homeTeam: gameResult.homeTeam, awayTeam: gameResult.awayTeam, scoreData });
          }
        }
      } catch (e) {
        console.log(`[MULTIBET] 스코어 파싱 오류:`, e.message);
      }
    }

    // 경기 미완료
    if (status !== 'finished' || actualHomeScore === null || actualAwayScore === null ||
        actualHomeScore === undefined || actualAwayScore === undefined || isNaN(actualHomeScore) || isNaN(actualAwayScore)) {
      return 'pending';
    }

    // 🆕 총점(Under/Over) 베팅 처리
    if (market === '총점' || market === 'totals') {
      return this.determineTotalResult(selectedTeam, actualHomeScore, actualAwayScore);
    }

    // 승부 판정
    const homeWon = actualHomeScore > actualAwayScore;
    const awayWon = actualAwayScore > actualHomeScore;
    const isDraw = actualHomeScore === actualAwayScore;

    // ✅ Draw 선택 처리 (Draw, 무승부 등) - 대소문자 무관
    const selectedTeamLower = selectedTeam?.toLowerCase() || '';
    if (selectedTeamLower === 'draw' || selectedTeam === '무승부' || selectedTeamLower === 'x') {
      if (isDraw) {
        console.log(`[승/패 판정] Draw 선택 맞음 (${actualHomeScore}-${actualAwayScore}) → won`);
        return 'won';
      } else {
        console.log(`[승/패 판정] Draw 선택 틀림 (${actualHomeScore}-${actualAwayScore}) → lost`);
        return 'lost';
      }
    }

    // 선택한 팀이 홈팀인지 어웨이팀인지 확인
    const isHomeTeam = selectedTeam === gameResult.homeTeam ||
                      selectedTeam.includes(gameResult.homeTeam) ||
                      gameResult.homeTeam.includes(selectedTeam);

    if (isHomeTeam) {
      if (homeWon) {
        return 'won';
      }
      if (awayWon || isDraw) {
        return 'lost';
      }
    } else {
      if (awayWon) {
        return 'won';
      }
      if (homeWon || isDraw) {
        return 'lost';
      }
    }

    return 'pending';
  }

  /**
   * 🆕 총점(Under/Over) 베팅 결과 판정
   * @param {string} selectedTeam - 선택된 팀 (예: "Under 2", "Over 2.5")
   * @param {number} homeScore - 홈팀 점수
   * @param {number} awayScore - 어웨이팀 점수
   * @returns {string} 베팅 결과 (won/lost/cancelled)
   */
  determineTotalResult(selectedTeam, homeScore, awayScore) {
    const totalScore = homeScore + awayScore;
    
    // "Under 2", "Over 2.5" 형식에서 옵션과 포인트 추출
    const match = selectedTeam.match(/^(Under|Over)\s+([\d.]+)$/);
    if (!match) {
      console.warn(`[MULTIBET] 총점 베팅 형식 오류: ${selectedTeam}`);
      return 'cancelled';
    }
    
    const option = match[1]; // "Under" 또는 "Over"
    const point = parseFloat(match[2]); // 2 또는 2.5
    
    console.log(`[MULTIBET] 총점 베팅 판정: ${option} ${point}, 실제 총점: ${totalScore}`);
    
    // Push 조건 (총점 = 기준점)
    if (totalScore === point) {
      console.log(`[MULTIBET] Push 조건: 총점 ${totalScore} = 기준 ${point} → cancelled`);
      return 'cancelled';
    }
    
    // Under/Over 판정
    if (option === 'Under') {
      const result = totalScore < point ? 'won' : 'lost';
      console.log(`[MULTIBET] Under ${point}: ${totalScore} < ${point} = ${result}`);
      return result;
    } else if (option === 'Over') {
      const result = totalScore > point ? 'won' : 'lost';
      console.log(`[MULTIBET] Over ${point}: ${totalScore} > ${point} = ${result}`);
      return result;
    }
    
    console.warn(`[MULTIBET] 알 수 없는 옵션: ${option}`);
    return 'cancelled';
  }
  
  /**
   * 멀티배팅 최종 결과 판정
   * @param {Array} gameResults - 모든 경기 결과
   * @returns {Object} 정산 결과
   */
  determineMultibetResult(gameResults) {
    // ✅ [Phase 2] 각 선택의 최종 결과 추출 - result 필드 대신 내부 판정 결과 사용
    const results = gameResults.map(gr => {
      if (!gr.gameResult) return 'pending';
      
      // gameResult 내부에 이미 판정된 result가 있으면 사용 (determineGameResult의 반환값)
      if (gr.gameResult.result) {
        return gr.gameResult.result;
      }
      
      // 없으면 status 기반으로 pending 여부만 확인
      return gr.gameResult.status === 'finished' ? 'pending' : 'pending';
    });
    console.log(`[Multibet] 📊 경기별 결과 집계: ${results.join(', ')}`);

    // ✅ 멀티배팅 조기 정산 로직:
    // 1. 하나라도 lost가 있으면 즉시 패배 (나머지 경기 불필요)
    const hasLost = results.includes('lost');
    if (hasLost) {
      console.log(`[Multibet] 💥 조기 정산: 하나 이상의 경기에서 패배 -> 전체 패배`);
      return {
        finalResult: 'lost',
        reason: '하나 이상의 경기에서 패배했습니다.',
        gameResults,
        summary: this.generateSummary(results)
      };
    }

    // 2. pending이 있으면 대기 (패배가 없는 경우만)
    if (results.includes('pending')) {
      console.log(`[Multibet] ⏳ pending 경기가 포함되어 있어 정산을 대기합니다.`);
      return {
        finalResult: 'pending',
        reason: '일부 경기가 아직 완료되지 않았습니다.',
        gameResults,
        summary: this.generateSummary(results)
      };
    }

    // ✅ [Phase 2] pending이 없을 때만 최종 결과 판정
    // ✅ Push (cancelled) 처리: cancelled를 제외하고 승패 판정 (스포츠북 방식)
    const nonCancelledResults = results.filter(r => r !== 'cancelled');
    const allNonCancelledWon = nonCancelledResults.every(r => r === 'won');
    const hasLostInNonCancelled = nonCancelledResults.some(r => r === 'lost');
    const cancelledCount = results.filter(r => r === 'cancelled').length;
  
    let finalResult;
    let reason;

    // 모든 경기가 취소된 경우
    if (results.every(r => r === 'cancelled')) {
      finalResult = 'cancelled';
      reason = '모든 경기가 취소되었습니다.';
    }
    // 취소되지 않은 경기 중 하나라도 패배가 있으면 전체 패배
    else if (hasLostInNonCancelled) {
      finalResult = 'lost';
      reason = cancelledCount > 0 
        ? `일부 경기에서 패배했습니다 (${cancelledCount}개 경기 Push 처리됨).`
        : '하나 이상의 경기에서 패배했습니다.';
    }
    // 취소되지 않은 모든 경기가 승리
    else if (nonCancelledResults.length > 0 && allNonCancelledWon) {
      finalResult = 'won';
      reason = cancelledCount > 0 
        ? `${nonCancelledResults.length}개 경기 승리 (${cancelledCount}개 경기 Push 처리됨)`
        : '모든 경기에서 승리했습니다.';
    }
    // 예외 처리
    else {
      finalResult = 'pending';
      reason = '최종 결과를 판정할 수 없습니다.';
    }
  
    console.log(`[Multibet] 🎯 최종 판정: ${finalResult} (사유: ${reason})`);
    if (cancelledCount > 0) {
      console.log(`[Multibet] 📊 Push 처리: ${cancelledCount}개 경기, 배당률 1.0으로 조정됨`);
    }
  
    return {
      finalResult,
      reason,
      gameResults,
      summary: this.generateSummary(results)
    };
  }
  
  /**
   * ✅ [Phase 2] Summary 생성 헬퍼 함수
   * @param {Array} results - 경기 결과 배열
   * @returns {Object} 요약 정보
   */
  generateSummary(results) {
    return {
      total: results.length,
      won: results.filter(r => r === 'won').length,
      lost: results.filter(r => r === 'lost').length,
      cancelled: results.filter(r => r === 'cancelled').length,
      pending: results.filter(r => r === 'pending').length
    };
  }
  
  /**
   * 멀티배팅 정산 처리
   * @param {Object} order - 멀티배팅 주문
   * @param {Object} settlementResult - 정산 결과
   * @param {Object} transaction - 트랜잭션
   * @returns {Object} 정산 처리 결과
   */
  async processMultibetSettlement(order, settlementResult, transaction) {
    const { finalResult } = settlementResult;
    
    // ✅ [Phase 3] 이중 안전장치: pending이면 즉시 반환 (정산하지 않음)
    if (finalResult === 'pending') {
      console.log(`⏳ 주문 ${order.id}: 경기 완료 대기 중 - 정산하지 않음`);
      return {
        orderId: order.id,
        finalResult: 'pending',
        profit: 0,
        message: '경기 완료 대기 중',
        gameResults: settlementResult.gameResults,
        summary: settlementResult.summary
      };
    }
    
    // 주문 상태 업데이트
    let orderStatus;
    if (finalResult === 'cancelled') {
      orderStatus = 'cancelled';
    } else {
      orderStatus = 'settled';
    }
    
    // ✅ gameResults 전달하여 Push 처리
    const profit = await this.calculateProfit(order, finalResult, settlementResult.gameResults);

    await order.update({
      status: orderStatus,
      settledAt: new Date(),
      actualProfit: profit,
      profitLoss: profit
    }, { transaction });
    
    // 정산 결과에 따른 결제 처리
    await this.processPayment(order, finalResult, settlementResult, transaction);
    
    // ✅ 제로썸 정산: 백 주문 정산 시 매칭된 레이 주문들을 함께 정산
    await this.settleMatchedLayOrders(order, finalResult, transaction);
    
    // ✅ 부분 매칭 환불 처리
    if (order.partiallyFilled && order.remainingAmount > 0) {
      console.log(`   🔄 부분 매칭 환불 처리: 주문 ${order.id}, 남은 금액 ${order.remainingAmount}원`);
      
      const user = await User.findByPk(order.userId, { transaction });
      const refundAmount = parseFloat(order.remainingAmount);
      const currentBalance = parseFloat(user.balance);
      const newBalance = currentBalance + refundAmount;
      
      // ✅ 환불 전 로깅
      settlementLogger.logRefund(order.id, refundAmount, `부분 매칭 환불 - 남은 금액: ${refundAmount}, 체결: ${order.filledAmount}`);
      
      await user.update({ balance: newBalance }, { transaction });
      
      await PaymentHistory.create({
        userId: order.userId,
        betId: `EXCHANGE_${order.id}`,
        amount: refundAmount,
        balanceAfter: newBalance,
        memo: `Exchange 주문 경기 시작으로 부분 매칭된 주문의 남은 금액 자동 환불 (경기: ${order.homeTeam} vs ${order.awayTeam}, 경기 시작됨)`,
        paidAt: new Date()
      }, { transaction });
      
      await order.update({ remainingAmount: 0 }, { transaction });
      
      // ✅ 환불 후 로깅
      settlementLogger.logPayment(order.id, refundAmount, currentBalance, newBalance, '부분 매칭 환불 완료');
      
      console.log(`   ✅ 환불 완료: ${refundAmount.toLocaleString()}원`);
    }

    return {
      orderId: order.id,
      finalResult,
      profit: profit,
      gameResults: settlementResult.gameResults,
      summary: settlementResult.summary
    };
  }
  
  /**
   * 익스체인지 방식 수익/손실 계산 (매칭 테이블 기반)
   * 
   * ⚠️ 중요: 이 함수는 ExchangeOrderMatch 테이블의 originalSide를 사용합니다.
   * ExchangeOrder.side 필드가 아닌 ExchangeOrderMatch.originalSide를 기준으로 정산하므로,
   * 멀티배팅 주문의 side 필드가 'back'으로 저장되어도 정산에는 영향을 주지 않습니다.
   * 
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @param {Array} gameResults - 경기 결과 배열 (Push 확인용)
   * @returns {number} 수익/손실 금액
   */
  async calculateExchangeProfit(order, result, gameResults = []) {
    console.log(`💰 익스체인지 Pot 정산: 주문 ${order.id}, 결과: ${result}`);

    if (result === 'pending') {
      console.log(`⏳ 대기 중`);
      return 0;
    }

    if (result === 'cancelled') {
      // 전체 취소 시 담보금 환불
      const effectiveAmount = order.stakeAmount || order.amount;
      console.log(`🔄 전체 취소 환불: ${effectiveAmount.toLocaleString()}원`);
      return effectiveAmount;
    }

    // ✅ 매칭된 Pot들 조회
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        [Op.or]: [
          { originalOrderId: order.id },
          { matchingOrderId: order.id }
        ]
      }
    });

    if (matches.length === 0) {
      console.log(`❌ 매칭 정보 없음`);
      return 0;
    }

    let totalProfit = 0;
    let totalLayRefund = 0; // Push로 인한 Lay 환불 총액

    for (const match of matches) {
      let finalPot = Number(match.potAmount || 0);
      
      // 현재 주문이 original인지 matching인지 확인
      const isOriginalOrder = (match.originalOrderId === order.id);
      const currentOrderSide = isOriginalOrder ? match.originalSide : match.matchingSide;

      console.log(`   📦 Pot #${match.id}: ${finalPot.toLocaleString()}원 (원본)`);

      // ✅ Push 처리: 멀티배팅에서 cancelled가 있으면 배당률 재계산
      const hasPush = gameResults.some(gr => gr.result === 'cancelled');
      
      if (hasPush && order.isMultibet) {
        // 원래 배당률과 조정된 배당률 계산
        const originalOdds = Number(order.totalOdds || order.price || 1.0);
        const adjustedOdds = this.calculateAdjustedOddsFromResults(order, gameResults);
        
        console.log(`   🔄 Push 감지: 배당률 ${originalOdds.toFixed(3)} → ${adjustedOdds.toFixed(3)}`);
        
        // Back 담보금과 Lay 담보금
        const backStake = Number(match.backStake || 0);
        const originalLayStake = Number(match.layStake || 0);
        
        // 새로운 Lay 담보금 계산 (조정된 배당률 기준)
        const newLayStake = backStake * (adjustedOdds - 1);
        
        // Lay 환불 금액
        const layRefund = originalLayStake - newLayStake;
        
        if (layRefund > 0) {
          totalLayRefund += layRefund;
          console.log(`   💸 Lay 환불: ${layRefund.toLocaleString()}원 (${originalLayStake.toLocaleString()} → ${newLayStake.toLocaleString()})`);
        }
        
        // 새로운 Pot = Back 담보 + 새 Lay 담보
        finalPot = backStake + newLayStake;
        console.log(`   📦 조정된 Pot: ${finalPot.toLocaleString()}원`);
      }

      // 🎯 핵심: 승리 시 Pot 전체, 패배 시 0원
      if (result === 'won') {
        totalProfit += finalPot;  // ✅ Pot 전체 획득
        console.log(`   🏆 ${currentOrderSide} 승리: +${finalPot.toLocaleString()}원 (Pot 획득)`);
      } else if (result === 'lost') {
        // 패배 시 0원 (담보금 손실)
        console.log(`   💸 ${currentOrderSide} 패배: Pot 손실`);
      }
    }

    if (totalLayRefund > 0) {
      console.log(`📊 총 Lay 환불: ${totalLayRefund.toLocaleString()}원 (별도 처리 필요)`);
      // Lay 환불은 processPayment에서 별도로 처리
      this.pendingLayRefund = totalLayRefund;
    }

    console.log(`📊 총 actualProfit: ${totalProfit.toLocaleString()}원 (${matches.length}개 Pot)`);
    return totalProfit;
  }

  /**
   * 조정된 배당률 계산 (Push 반영)
   * @param {Object} order - 주문
   * @param {Array} gameResults - 경기 결과 배열
   * @returns {number} 조정된 배당률
   */
  calculateAdjustedOddsFromResults(order, gameResults) {
    const selections = order.selectionDetails?.selections || [];
    
    if (selections.length === 0 || gameResults.length === 0) {
      return Number(order.totalOdds || order.price || 1.0);
    }
    
    let adjustedOdds = 1.0;
    
    for (let i = 0; i < Math.min(selections.length, gameResults.length); i++) {
      const selection = selections[i];
      const gameResult = gameResults[i];
      
      if (gameResult?.result === 'won') {
        // 승리한 경기: 원래 배당률
        adjustedOdds *= (selection.odds || 1.0);
      } else if (gameResult?.result === 'cancelled') {
        // Push: 배당률 1.0
        adjustedOdds *= 1.0;
      }
      // lost는 이미 승패 판정에서 처리됨
    }
    
    return adjustedOdds;
  }

  /**
   * 수익/손실 계산 (호환성을 위한 래퍼 함수)
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @param {Array} gameResults - 경기 결과 배열
   * @returns {Promise<number>} 수익/손실 금액
   */
  async calculateProfit(order, result, gameResults = []) {
    return await this.calculateExchangeProfit(order, result, gameResults);
  }
  
  /**
   * 결제 처리
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @param {Object} settlementResult - 정산 결과
   * @param {Object} transaction - 트랜잭션
   */
  async processPayment(order, result, settlementResult, transaction) {
    const paymentStartTime = Date.now();

    try {
      console.log(`💰 결제 처리 시작: 주문 ${order.id}`);

      // 1단계: 병렬로 필요한 데이터 조회 (성능 측정)
      const queryStartTime = Date.now();
      const [user, existingPayment] = await Promise.all([
        User.findByPk(order.userId, {
          transaction,
          attributes: ['id', 'balance'] // 필요한 필드만 조회
        }),
        PaymentHistory.findOne({
          where: {
            betId: `EXCHANGE_${order.id}`
          },
          transaction,
          attributes: ['id'] // 존재 여부만 확인
        })
      ]);
      console.log(`⏱️ 데이터 조회 완료: ${Date.now() - queryStartTime}ms`);

      if (existingPayment) {
        console.log(`⚠️ 주문 ${order.id}는 이미 정산됨 (${Date.now() - paymentStartTime}ms)`);
        return;
      }

      // 2단계: 수익 계산 및 매치 정보 수집 (성능 측정)
      const profitStartTime = Date.now();
      const profit = await this.calculateProfit(order, result, settlementResult.gameResults);

      // 🎯 매치 정보 수집 (Pot 정보 추적용)
      const matches = await ExchangeOrderMatch.findAll({
        where: {
          [Op.or]: [
            { originalOrderId: order.id },
            { matchingOrderId: order.id }
          ]
        },
        transaction
      });

      // Pot 정보 집계
      const potInfo = {
        totalPot: 0,
        totalBackStake: 0,
        totalLayStake: 0,
        matches: []
      };

      for (const match of matches) {
        const potAmount = Number(match.potAmount || 0);

        // ✅ settlementResult에서 backStake/layStake 추출 (있으면)
        let backStake = 0;
        let layStake = 0;

        if (match.settlementResult) {
          backStake = Number(match.settlementResult.backStake || 0);
          layStake = Number(match.settlementResult.layStake || 0);
        } else {
          // fallback: 역계산
          if (match.originalSide === 'back') {
            backStake = match.matchedAmount;
            layStake = Math.floor(match.matchedAmount * (match.matchedPrice - 1));
          } else {
            backStake = Math.floor(match.matchedAmount * (match.matchedPrice - 1));
            layStake = match.matchedAmount;
          }
        }

        potInfo.totalPot += potAmount;
        potInfo.totalBackStake += backStake;
        potInfo.totalLayStake += layStake;

        potInfo.matches.push({
          matchId: match.id,
          potAmount: potAmount,
          backStake: backStake,  // ✅ 추가
          layStake: layStake,    // ✅ 추가
          potCalculation: `${backStake} + ${layStake} = ${potAmount}`,  // ✅ 추가
          matchedAmount: match.matchedAmount,
          matchedPrice: match.matchedPrice,
          originalSide: match.originalSide,
          matchingSide: match.matchingSide
        });
      }

      console.log(`⏱️ 수익 계산 완료: ${Date.now() - profitStartTime}ms (Pot 총액: ${potInfo.totalPot.toLocaleString()}원)`);

      // ✅ Push로 인한 Lay 환불 처리
      if (this.pendingLayRefund && this.pendingLayRefund > 0) {
        console.log(`🔄 Push로 인한 Lay 환불 처리: ${this.pendingLayRefund.toLocaleString()}원`);
        
        // Lay 주문 찾기 (매칭된 주문)
        for (const match of matches) {
          const isOriginalOrder = (match.originalOrderId === order.id);
          const layOrderId = isOriginalOrder ? match.matchingOrderId : match.originalOrderId;
          const layOrderSide = isOriginalOrder ? match.matchingSide : match.originalSide;
          
          // Lay 주문인 경우만 환불
          if (layOrderSide === 'lay') {
            const layOrder = await ExchangeOrder.findByPk(layOrderId, { transaction });
            const layUser = await User.findByPk(layOrder.userId, { transaction });
            
            if (layUser) {
              const refundAmount = this.pendingLayRefund;
              const currentLayBalance = parseFloat(layUser.balance) || 0;
              const newLayBalance = Math.round(currentLayBalance + refundAmount);
              
              await layUser.update({ balance: newLayBalance }, { transaction });
              
              // PaymentHistory 기록
              await PaymentHistory.create({
                userId: layUser.id,
                betId: `EXCHANGE_${layOrderId}`,
                amount: refundAmount,
                balanceAfter: newLayBalance,
                memo: `멀티배팅 Push 환불 (배당률 조정으로 인한 Lay 담보금 환불) - 주문 #${order.id}`,
                transactionType: 'exchange_push_refund',
                status: 'completed',
                relatedOrderId: layOrderId,
                metadata: {
                  reason: 'multibet_push',
                  originalOrderId: order.id,
                  matchId: match.id
                },
                paidAt: new Date()
              }, { transaction });
              
              console.log(`✅ Lay 환불 완료: 사용자 ${layUser.id}, ${refundAmount.toLocaleString()}원`);
            }
          }
        }
        
        // 환불 완료 후 초기화
        this.pendingLayRefund = 0;
      }

      // 🎯 3단계: actualProfit = Pot 획득 금액 (담보금 포함)
      let actualProfit = Math.round(parseFloat(profit) || 0);
      let commissionAmount = 0;
      
      // 수수료 계산 (Lay 승리 시만)
      if (actualProfit > 0 && order.side === 'lay' && result === 'won') {
        const layStake = order.stakeAmount || 0;
        const backStake = actualProfit - layStake;  // Pot에서 상대방 담보금
        
        if (backStake > 0) {
          const CommissionService = (await import('./commissionService.js')).default;
          const commissionCalculation = await CommissionService.calculate({
            winnings: backStake,
            stake: layStake,
            platform: 'exchange',
            user: user,
            bet: { id: order.id, userId: order.userId },
            policies: {}
          });
          
          commissionAmount = commissionCalculation.commissionAmount;
          actualProfit -= commissionAmount;
          console.log(`💰 수수료 차감: ${commissionAmount.toLocaleString()}원`);
        }
      }

      // ✅ 4단계: 잔액 업데이트 (단순화)
      // actualProfit = Pot 획득 금액이므로 그대로 지급
      const currentBalance = parseFloat(user.balance) || 0;
      const newBalance = Math.round(currentBalance + actualProfit);

      console.log(`💰 잔액 변화: ${currentBalance.toLocaleString()} + ${actualProfit.toLocaleString()} = ${newBalance.toLocaleString()}원`);

      // 5단계: 메모 생성
      const memo = this.generatePaymentMemo(order, result, settlementResult, actualProfit);

      console.log(`📝 PaymentHistory 기록: ${actualProfit.toLocaleString()}원 (${result})`);


      // 6단계: 데이터베이스 업데이트 (병렬 실행 + 성능 측정)
      const saveStartTime = Date.now();

      // ✅ TransactionType import
      const { TransactionType } = await import('../types/paymentHistory.js');

      // ✅ PaymentHistory 생성 전 로깅
      settlementLogger.log(`[BEFORE_PAYMENT] 주문 ${order.id} PaymentHistory 생성 직전`, {
        orderId: order.id,
        userId: order.userId,
        currentBalance,
        actualProfit,
        newBalance,
        result,
        memo
      });

      await Promise.all([
        user.update({ balance: newBalance }, { transaction }),
        PaymentHistory.create({
          userId: order.userId,
          betId: `EXCHANGE_${order.id}`,
          amount: actualProfit,  // ✅ Pot 획득 금액
          balanceAfter: newBalance,
          memo: memo,
          transactionType: TransactionType.EXCHANGE_MULTIBET_SETTLEMENT,
          status: 'completed',
          relatedOrderId: order.id,  // ✅ 주문 ID 저장
          relatedMatchId: matches.length > 0 ? matches[0].id : null,  // 🆕 대표 매치 ID 저장
          metadata: {
            // 🎯 Pot 정보 추적
            totalPot: potInfo.totalPot,
            totalBackStake: potInfo.totalBackStake,  // ✅ 추가
            totalLayStake: potInfo.totalLayStake,    // ✅ 추가
            potCalculation: `${potInfo.totalBackStake} + ${potInfo.totalLayStake} = ${potInfo.totalPot}`,  // ✅ 추가
            actualProfit: actualProfit,
            result: result,
            side: order.side,
            commissionAmount: commissionAmount,

            // 매치 상세 정보 (backStake/layStake 포함)
            matches: potInfo.matches,
            matchCount: potInfo.matches.length,

            // 주문 정보
            orderId: order.id,
            isMultibet: order.isMultibet,
            selectionCount: order.selectionCount,
            totalOdds: order.totalOdds,

            // 정산 결과 정보
            settlementReason: settlementResult.reason,
            gameResults: settlementResult.summary
          },
          paidAt: new Date()
        }, { transaction })
      ]);
      
      // ✅ PaymentHistory 생성 후 로깅
      settlementLogger.log(`[AFTER_PAYMENT] 주문 ${order.id} PaymentHistory 생성 완료`, {
        orderId: order.id,
        amount: actualProfit,
        balanceAfter: newBalance,
        memo
      });
      
      console.log(`⏱️ DB 저장 완료: ${Date.now() - saveStartTime}ms`);

      // ❌ 제거: 매치 상태 업데이트는 settleMatchedLayOrders에서 수행
      // 백 주문 정산 시점에 매치를 settled로 변경하면,
      // settleMatchedLayOrders에서 status='active'인 매치를 찾지 못함
      //
      // 7단계: 매치 상태 업데이트 (settled로 변경) → settleMatchedLayOrders로 이동
      console.log(`⏱️ 매치 상태 업데이트는 레이 정산 시점에 수행됨`);
      
      // 7단계: 수수료 차감 기록 (Lay 승리 시)
      if (commissionAmount > 0) {
        await PaymentHistory.create({
          userId: order.userId,
          betId: `EXCHANGE_${order.id}_COMMISSION`,  // ✅ 중복 방지를 위해 suffix 추가
          amount: -commissionAmount,
          memo: `익스체인지 수수료 (상대 담보금 기준)`,
          balanceAfter: newBalance,
          transactionType: 'EXCHANGE_COMMISSION',  // ✅ 수수료 타입
          status: 'completed',
          relatedOrderId: order.id,
          metadata: {
            orderId: order.id,
            commissionAmount: commissionAmount,
            totalPot: potInfo.totalPot,
            side: order.side
          },
          paidAt: new Date()
        }, { transaction });
        console.log(`⏱️ 수수료 차감 기록 완료: -${commissionAmount}원`);
      }

      const totalTime = Date.now() - paymentStartTime;
      console.log(`💰 백 주문 결제 완료: ${currentBalance} → ${newBalance} (총 ${totalTime}ms)`);

    } catch (error) {
      const totalTime = Date.now() - paymentStartTime;
      console.error(`❌ 결제 처리 실패 (주문 ${order.id}, ${totalTime}ms):`, error.message);
      throw error;
    }
  }
  
  /**
   * 결제 메모 생성
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @param {Object} settlementResult - 정산 결과
   * @returns {Promise<string>} 결제 메모
   */
  generatePaymentMemo(order, result, settlementResult, profit) {
    const { summary } = settlementResult;
    const gameCount = summary.total;
    const wonCount = summary.won;
    
    if (result === 'cancelled') {
      return `Exchange 멀티배팅 취소 환불 (${gameCount}개 경기 중 ${summary.cancelled}개 취소) - 환불: ${profit}원`;
    } else if (result === 'won') {
      return `Exchange 멀티배팅 승리 수익 (${gameCount}개 경기 모두 승리) - 수익: ${profit}원`;
    } else {
      return `Exchange 멀티배팅 패배 손실 (${gameCount}개 경기 중 ${wonCount}개 승리) - 손실: ${Math.abs(profit)}원`;
    }
  }

  /**
   * 모든 정산 가능한 멀티배팅 주문 정산
   * @returns {Object} 정산 결과
   */
  async settleAllMultibetOrders() {
    const startTime = Date.now();
    const TIMEOUT_MS = 30000; // 30초 타임아웃
    
    try {
      console.log('🎯 모든 멀티배팅 주문 정산 시작...');
      
      // 정산 가능한 멀티배팅 주문들 조회
      // ✅ 수정: 레이 주문 제외 (레이는 ExchangeOrderMatch 기반 제로썸 정산만 사용)
      const unsettledOrders = await ExchangeOrder.findAll({
        where: {
          isMultibet: true,
          side: 'back',  // ✅ 백 주문만 조회 (레이는 제외)
          status: { [Op.in]: ['matched', 'partially_matched', 'active'] },
          settledAt: null
        },
        order: [['createdAt', 'ASC']],
        limit: 50 // 한 번에 최대 50개 처리 (10에서 증대)
      });

      console.log(`📋 정산 대상 멀티배팅 주문: ${unsettledOrders.length}개`);

      if (unsettledOrders.length === 0) {
        console.log('✅ 정산할 멀티배팅 주문이 없습니다.');
        return { settledCount: 0, message: 'No orders to settle' };
      }

      let settledCount = 0;
      let errorCount = 0;
      let timeoutCount = 0;
      const results = [];

      // 개별 주문 타임아웃 설정 (15초)
      const INDIVIDUAL_TIMEOUT_MS = 15000;

      for (const order of unsettledOrders) {
        // 전체 타임아웃 체크
        if (Date.now() - startTime > TIMEOUT_MS) {
          console.log(`⏰ 전체 타임아웃 도달 (${TIMEOUT_MS}ms), 남은 주문 ${unsettledOrders.length - settledCount - errorCount}개 건너뜀`);
          timeoutCount = unsettledOrders.length - settledCount - errorCount;
          break;
        }

        try {
          // 개별 주문 타임아웃 적용
          const settlePromise = this.settleMultibetOrder(order);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`개별 주문 타임아웃 (${order.id})`)), INDIVIDUAL_TIMEOUT_MS)
          );

          const result = await Promise.race([settlePromise, timeoutPromise]);
          results.push({ orderId: order.id, result });
          settledCount++;
          console.log(`✅ 주문 ${order.id} 정산 완료`);
        } catch (error) {
          errorCount++;
          if (error.message && error.message.includes('타임아웃')) {
            console.log(`⏰ 주문 ${order.id} 정산 타임아웃 (${INDIVIDUAL_TIMEOUT_MS}ms 초과)`);
            results.push({ orderId: order.id, error: 'timeout' });
          } else {
            console.log(`❌ 주문 ${order.id} 정산 실패: ${error.message}`);
            results.push({ orderId: order.id, error: error.message });
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`\n🎉 멀티배팅 정산 완료! (${duration}ms)`);
      console.log(`📊 성공: ${settledCount}개, 실패: ${errorCount}개, 타임아웃: ${timeoutCount}개`);

      return {
        settledCount,
        errorCount,
        timeoutCount,
        totalOrders: unsettledOrders.length,
        duration,
        results
      };

    } catch (error) {
      console.error('❌ 멀티배팅 정산 실패:', error.message);
      throw error;
    }
    // finally 블록 제거: DB 연결은 애플리케이션 생명주기와 함께 관리되어야 합니다.
    // sequelize.close()를 호출하면 다음 작업 시 DB 연결 오류가 발생합니다.
  }
  
  /**
   * ✅ 백 주문 정산 시 매칭된 레이 주문들을 제로썸 정산
   * @param {Object} backOrder - 백 주문 (멀티베팅)
   * @param {string} backResult - 백 주문의 정산 결과 ('won', 'lost', 'cancelled')
   * @param {Object} transaction - 트랜잭션
   */
  async settleMatchedLayOrders(backOrder, backResult, transaction) {
    try {
      console.log(`\n🔄 제로썸 정산: 백 주문 ${backOrder.id}에 매칭된 레이 주문들 정산 시작...`);
      
      // 1. ExchangeOrderMatch에서 매칭된 레이 주문 조회
      const ExchangeOrderMatch = (await import('../models/exchangeOrderMatchModel.js')).default;
      
      // ✅ FIX: status가 'active'인 매칭만 조회 (이미 settled된 매치는 제외)
      const matches = await ExchangeOrderMatch.findAll({
        where: {
          [Op.or]: [
            { originalOrderId: backOrder.id },
            { matchingOrderId: backOrder.id }
          ],
          status: 'active'  // ✅ 아직 정산되지 않은 매치만
        },
        transaction
      });

      if (matches.length === 0) {
        console.log(`   ℹ️  정산할 매칭 없음 (모두 정산됨 또는 매칭 없음)`);
        return;
      }

      console.log(`   📊 정산할 매칭: ${matches.length}개\n`);
      
      // 2. 각 매칭된 레이 주문 정산
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        // ✅ FIX: originalSide와 matchingSide를 확인하여 레이 주문 찾기
        let layOrderId;
        let isBackOriginal = false;

        if (match.originalOrderId === backOrder.id) {
          // 백 주문이 original인 경우
          isBackOriginal = true;
          if (match.originalSide === 'back' && match.matchingSide === 'lay') {
            layOrderId = match.matchingOrderId;
          } else {
            console.log(`   ⚠️  매치 ${match.id}: 백이 original인데 side가 잘못됨 (original: ${match.originalSide}, matching: ${match.matchingSide})`);
            continue;
          }
        } else if (match.matchingOrderId === backOrder.id) {
          // 백 주문이 matching인 경우
          isBackOriginal = false;
          if (match.matchingSide === 'back' && match.originalSide === 'lay') {
            layOrderId = match.originalOrderId;
          } else {
            console.log(`   ⚠️  매치 ${match.id}: 백이 matching인데 side가 잘못됨 (original: ${match.originalSide}, matching: ${match.matchingSide})`);
            continue;
          }
        } else {
          console.log(`   ⚠️  매치 ${match.id}: 백 주문 ${backOrder.id}를 찾을 수 없음`);
          continue;
        }

        const layOrder = await ExchangeOrder.findByPk(layOrderId, { transaction });

        if (!layOrder) {
          console.log(`   ❌ 레이 주문 ${layOrderId}를 찾을 수 없음`);
          continue;
        }

        console.log(`   [${i+1}/${matches.length}] 매치 ${match.id}: 레이 주문 ${layOrderId} 정산 중...`);

        // 제로썸 로직: 레이는 백의 반대 결과
        const layResult = backResult === 'won' ? 'lost' :
                          backResult === 'lost' ? 'won' :
                          'cancelled';

        console.log(`       백 결과: ${backResult} → 레이 결과: ${layResult}`);

        // 🎯 Pot 기반 정산
        const potAmount = Number(match.potAmount || 0);
        let layActualProfit = 0;

        if (layResult === 'won') {
          // 레이 승리: Pot 전체 획득
          layActualProfit = potAmount;
          console.log(`       🏆 레이 승리: Pot ${potAmount.toLocaleString()}원 획득`);
        } else if (layResult === 'lost') {
          // 레이 패배: 0원
          layActualProfit = 0;
          console.log(`       💸 레이 패배: Pot 손실`);
        } else {
          // 취소: 담보금 환불
          const layStake = layOrder.stakeAmount || 0;
          layActualProfit = layStake;
          console.log(`       🔄 취소 환불: ${layActualProfit.toLocaleString()}원`);
        }

        // ✅ FIX: 레이 주문 업데이트 (actualProfit 누적)
        const currentActualProfit = parseFloat(layOrder.actualProfit || 0);
        const newActualProfit = currentActualProfit + layActualProfit;

        // ✅ FIX: 레이 주문의 모든 매칭이 정산되었는지 확인
        const allMatches = await ExchangeOrderMatch.findAll({
          where: {
            [Op.or]: [
              { originalOrderId: layOrder.id },
              { matchingOrderId: layOrder.id }
            ]
          },
          transaction
        });

        // 현재 매치를 settled로 업데이트
        // ✅ settlementResult는 문자열로 저장 ('back_won' 또는 'lay_won')
        const settlementResultString = backResult === 'won' ? 'back_won' : 'lay_won';

        await match.update({
          status: 'settled',
          settledAt: new Date(),
          settlementResult: settlementResultString  // ✅ 문자열
        }, { transaction });

        // 모든 매치가 정산되었는지 확인 (현재 매치 제외)
        const remainingActiveMatches = allMatches.filter(m =>
          m.id !== match.id && m.status === 'active'
        ).length;

        const newStatus = remainingActiveMatches > 0 ? 'partially_matched' : 'settled';

        await ExchangeOrder.update(
          {
            status: newStatus,
            settledAt: remainingActiveMatches > 0 ? null : new Date(),
            actualProfit: sequelize.literal(`COALESCE("actualProfit", 0) + ${layActualProfit}`)
          },
          {
            where: { id: layOrder.id },
            transaction
          }
        );

        console.log(`       ✅ 레이 주문 actualProfit 누적: ${currentActualProfit.toLocaleString()} + ${layActualProfit.toLocaleString()} = ${newActualProfit.toLocaleString()}원`);
        console.log(`       ✅ 레이 주문 상태: ${newStatus} (남은 매치: ${remainingActiveMatches}개)`);
        
        // ✅ 레이 사용자 잔액 업데이트 (단순화)
        const layUser = await User.findByPk(layOrder.userId, { transaction });
        const currentLayBalance = parseFloat(layUser.balance);
        const newLayBalance = currentLayBalance + layActualProfit;
        
        await layUser.update({ balance: newLayBalance }, { transaction });

        console.log(`       💰 레이 잔액: ${currentLayBalance.toLocaleString()} + ${layActualProfit.toLocaleString()} = ${newLayBalance.toLocaleString()}원`);

        // ✅ PaymentHistory 기록
        if (layActualProfit !== 0) {
          const { TransactionType } = await import('../types/paymentHistory.js');
          
          await PaymentHistory.create({
            userId: layOrder.userId,
            betId: `EXCHANGE_${layOrder.id}_MATCH_${match.id}`,
            amount: layActualProfit,  // ✅ Pot 획득 금액
            balanceAfter: newLayBalance,
            memo: `Exchange 멀티베팅 제로썸 정산 (백 주문 ${backOrder.id} 매치 ${match.id}: ${layResult})`,
            transactionType: TransactionType.EXCHANGE_MULTIBET_SETTLEMENT,
            status: 'completed',
            relatedOrderId: layOrder.id,  // 🆕 레이 주문 ID 저장
            relatedMatchId: match.id,  // 🆕 매치 ID 저장
            metadata: {
              backOrderId: backOrder.id,
              matchId: match.id,
              layResult: layResult,
              potAmount: potAmount,
              settlementType: 'zero_sum'
            },
            paidAt: new Date()
          }, { transaction });
          console.log(`       📝 PaymentHistory 기록: ${layActualProfit.toLocaleString()}원 (주문: ${layOrder.id}, 매치: ${match.id})`);
        }

      }
      
      console.log(`\n   ✅ 제로썸 정산 완료: ${matches.length}개 레이 주문 정산됨\n`);
      
    } catch (error) {
      console.error(`   ❌ 제로썸 정산 실패:`, error);
      throw error;
    }
  }
  
}

export default new MultibetSettlementService();
