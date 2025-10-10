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

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();
import directMatchingService from './directMatchingService.js';

/**
 * 멀티배팅 전용 정산 서비스
 * 모든 경기 결과를 종합하여 멀티배팅 정산 처리
 */
class MultibetSettlementService {
  
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
    const { status, homeScore, awayScore, score } = gameResult;
    const { team: selectedTeam } = selection;

    // 경기 취소/연기
    if (status === 'cancelled' || status === 'postponed') {
      return 'cancelled';
    }

    // ✅ 정책: result 필드 사용 금지 - 항상 스코어 기반 판정
    console.log(`[MULTIBET] 스코어 기반 판정 시작 - status: ${status}`);

    // 스코어 기반 판정 (검증된 스코어 우선 사용)
    let actualHomeScore = homeScore;
    let actualAwayScore = awayScore;

    // 검증된 스코어가 있으면 우선 사용
    if (validatedScore) {
      actualHomeScore = validatedScore.home;
      actualAwayScore = validatedScore.away;
      console.log(`[MULTIBET] 검증된 스코어 사용: ${actualHomeScore}-${actualAwayScore}`);
    }
    // score JSON에서 스코어 추출 시도 (fallback)
    else if ((actualHomeScore === null || actualHomeScore === undefined) && score) {
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

    // 승부 판정
    const homeWon = actualHomeScore > actualAwayScore;
    const awayWon = actualAwayScore > actualHomeScore;
    const draw = actualHomeScore === actualAwayScore;

    // 선택한 팀이 홈팀인지 어웨이팀인지 확인
    const isHomeTeam = selectedTeam === gameResult.homeTeam ||
                      selectedTeam.includes(gameResult.homeTeam) ||
                      gameResult.homeTeam.includes(selectedTeam);

    if (isHomeTeam) {
      if (homeWon) {
        return 'won';
      }
      if (awayWon || draw) {
        return 'lost';
      }
    } else {
      if (awayWon) {
        return 'won';
      }
      if (homeWon || draw) {
        return 'lost';
      }
    }

    return 'pending';
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
  
    // ✅ [Phase 2 핵심 수정] pending인 경기가 하나라도 있으면 즉시 반환
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
    const hasLost = results.includes('lost');
    const allWon = results.every(r => r === 'won');
    const hasCancelled = results.includes('cancelled');
  
    let finalResult;
    let reason;
  
    if (hasLost) {
      finalResult = 'lost';
      reason = '하나 이상의 경기에서 패배했습니다.';
    } else if (allWon) {
      finalResult = 'won';
      reason = '모든 경기에서 승리했습니다.';
    } else if (hasCancelled) {
      // 패배 없이, 승리 또는 취소만 있는 경우
      finalResult = 'cancelled';
      reason = '패배한 경기는 없으나, 일부 경기가 취소되었습니다.';
    } else {
      // 예외적인 경우 (e.g., 모든 경기가 draw인데 처리 로직이 없는 경우)
      finalResult = 'pending';
      reason = '최종 결과를 판정할 수 없습니다.';
    }
  
    console.log(`[Multibet] 🎯 최종 판정: ${finalResult} (사유: ${reason})`);
  
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
    
    const profit = await this.calculateProfit(order, finalResult);

    await order.update({
      status: orderStatus,
      settledAt: new Date(),
      actualProfit: profit,
      profitLoss: profit
    }, { transaction });
    
    // 정산 결과에 따른 결제 처리
    await this.processPayment(order, finalResult, settlementResult, transaction);

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
   * @returns {number} 수익/손실 금액
   */
  async calculateExchangeProfit(order, result) {
    console.log(`💰 익스체인지 수익 계산 시작: 주문 ${order.id}, 결과: ${result}`);

    if (result === 'pending') {
      console.log(`⏳ 대기 중: 수익 0원`);
      return 0;
    }

    if (result === 'cancelled') {
      // 취소 시 체결된 금액 환불 (익스체인지도 동일)
      const effectiveAmount = order.filledAmount || order.stakeAmount || order.amount;
      console.log(`🔄 취소 환불: +${effectiveAmount} (체결된 금액 환불)`);
      return effectiveAmount;
    }

    // ✅ 매칭된 주문들을 조회하여 실제 수익/손실 계산 (양방향 조회)
    // ExchangeOrderMatch 테이블의 originalSide를 사용하여 Back/Lay 구분
    const matches = await ExchangeOrderMatch.findAll({
      where: {
        [Op.or]: [
          { originalOrderId: order.id },
          { matchingOrderId: order.id }
        ],
        status: 'active'
      }
    });

    if (matches.length === 0) {
      console.log(`❌ 매칭 정보 없음: 수익 0원`);
      return 0;
    }

    let totalProfit = 0;

    for (const match of matches) {
      const matchedAmount = match.matchedAmount;
      // ✅ 핵심: ExchangeOrderMatch.originalSide를 사용하여 Back/Lay 구분
      // ExchangeOrder.side가 아닌 Match 테이블의 originalSide를 기준으로 정산
      const isBackSide = match.originalSide === 'back';

      if (result === 'won') {
        if (isBackSide) {
          // Back 승리: 매칭된 금액만큼 수익
          totalProfit += matchedAmount;
          console.log(`🏆 Back 승리 매칭: +${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        } else {
          // Lay 승리: 매칭된 금액 손실
          totalProfit -= matchedAmount;
          console.log(`💸 Lay 패배: -${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        }
      } else { // result === 'lost'
        if (isBackSide) {
          // Back 패배: 매칭된 금액 손실
          totalProfit -= matchedAmount;
          console.log(`💸 Back 패배: -${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        } else {
          // Lay 승리: 매칭된 금액만큼 수익
          totalProfit += matchedAmount;
          console.log(`🏆 Lay 승리 매칭: +${matchedAmount} (vs 주문 ${match.matchingOrderId})`);
        }
      }
    }

    console.log(`📊 총 수익/손실: ${totalProfit}원 (${matches.length}개 매칭 기준)`);
    return totalProfit;
  }

  /**
   * 수익/손실 계산 (호환성을 위한 래퍼 함수)
   * @param {Object} order - 주문
   * @param {string} result - 최종 결과
   * @returns {Promise<number>} 수익/손실 금액
   */
  async calculateProfit(order, result) {
    return await this.calculateExchangeProfit(order, result);
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

      // 2단계: 수익 계산 (성능 측정)
      const profitStartTime = Date.now();
      const profit = await this.calculateProfit(order, result);
      console.log(`⏱️ 수익 계산 완료: ${Date.now() - profitStartTime}ms`);

      // 3단계: 잔액 업데이트 준비
      const currentBalance = parseFloat(user.balance) || 0;
      const profitAmount = parseFloat(profit) || 0;
      const newBalance = currentBalance + profitAmount;

      // 4단계: 메모 생성 (미리 준비)
      const memo = this.generatePaymentMemo(order, result, settlementResult, profit);

      // 5단계: 데이터베이스 업데이트 (병렬 실행 + 성능 측정)
      const saveStartTime = Date.now();
      await Promise.all([
        user.update({ balance: newBalance }, { transaction }),
        PaymentHistory.create({
          userId: order.userId,
          betId: `EXCHANGE_${order.id}`,
          amount: profitAmount,
          balanceAfter: newBalance,
          memo: memo,
          paidAt: new Date()
        }, { transaction })
      ]);
      console.log(`⏱️ DB 저장 완료: ${Date.now() - saveStartTime}ms`);

      const totalTime = Date.now() - paymentStartTime;
      console.log(`💰 결제 완료: ${currentBalance} → ${newBalance} (총 ${totalTime}ms)`);

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
      // ⚠️ 'active' 상태 추가: 레거시 Lay 멀티배팅 주문들이 active 상태로 남아있을 수 있음
      const unsettledOrders = await ExchangeOrder.findAll({
        where: {
          isMultibet: true,
          status: { [Op.in]: ['matched', 'partially_matched', 'active'] }, // ✅ 'active' 추가
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
  
}

export default new MultibetSettlementService();
