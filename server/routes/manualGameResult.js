import express from 'express';
import { GameResult, ExchangeOrder } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * 수동 경기 결과 입력 API
 * POST /api/admin/manual-game-result
 */
router.post('/manual-game-result', async (req, res) => {
  try {
    const { orderId, gameResults } = req.body;
    
    if (!orderId || !gameResults || !Array.isArray(gameResults)) {
      return res.status(400).json({
        success: false,
        message: '주문 ID와 경기 결과 데이터가 필요합니다'
      });
    }

    console.log(`🔧 수동 경기 결과 입력 시작 - 주문 ID: ${orderId}`);
    console.log(`📊 입력할 경기 수: ${gameResults.length}개`);

    const savedGames = [];
    const errors = [];

    // 각 경기 결과를 GameResult 테이블에 저장
    for (const gameData of gameResults) {
      try {
        console.log(`⚽ 경기 처리: ${gameData.homeTeam} vs ${gameData.awayTeam}`);
        
        // 필수 데이터 검증
        if (!gameData.homeTeam || !gameData.awayTeam || !gameData.commenceTime) {
          throw new Error('필수 데이터가 누락되었습니다');
        }

        // 경기 결과 저장 또는 업데이트
        const [gameResult, created] = await GameResult.findOrCreate({
          where: {
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            commenceTime: new Date(gameData.commenceTime)
          },
          defaults: {
            mainCategory: 'soccer',
            subCategory: 'ARGENTINA_PRIMERA',
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            commenceTime: new Date(gameData.commenceTime),
            score: `${gameData.homeScore || 0}-${gameData.awayScore || 0}`,
            status: gameData.status || 'pending',
            result: gameData.result || null,
            sportKey: 'soccer_argentina_primera_division',
            sportTitle: '아르헨티나 프리메라 디비시온',
            eventId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        });

        // 기존 경기인 경우 업데이트
        if (!created) {
          await gameResult.update({
            score: `${gameData.homeScore || 0}-${gameData.awayScore || 0}`,
            status: gameData.status || 'pending',
            result: gameData.result || null,
            updatedAt: new Date()
          });
          console.log(`🔄 기존 경기 업데이트: ${gameData.homeTeam} vs ${gameData.awayTeam}`);
        } else {
          console.log(`✅ 새 경기 생성: ${gameData.homeTeam} vs ${gameData.awayTeam}`);
        }

        savedGames.push({
          gameId: gameData.gameId,
          homeTeam: gameData.homeTeam,
          awayTeam: gameData.awayTeam,
          score: `${gameData.homeScore || 0}-${gameData.awayScore || 0}`,
          status: gameData.status || 'pending',
          result: gameData.result || null,
          created: created
        });

      } catch (error) {
        console.error(`❌ 경기 처리 실패: ${gameData.homeTeam} vs ${gameData.awayTeam}`, error.message);
        errors.push({
          gameId: gameData.gameId,
          homeTeam: gameData.homeTeam,
          awayTeam: gameData.awayTeam,
          error: error.message
        });
      }
    }

    // 주문 상태 업데이트 (모든 경기가 완료된 경우)
    let orderStatus = 'pending';
    if (savedGames.length > 0 && errors.length === 0) {
      try {
        const order = await ExchangeOrder.findByPk(orderId);
        if (order) {
          // 모든 경기가 완료된 경우 정산 가능 상태로 변경
          const allGamesFinished = savedGames.every(game => game.status === 'finished');
          if (allGamesFinished) {
            await order.update({
              status: 'settled',
              updatedAt: new Date()
            });
            orderStatus = 'settled';
            console.log(`✅ 주문 ${orderId} 상태를 'settled'로 업데이트`);
          }
        }
      } catch (error) {
        console.error(`❌ 주문 상태 업데이트 실패:`, error.message);
      }
    }

    // 응답 반환
    res.json({
      success: true,
      message: `경기 결과가 성공적으로 저장되었습니다 (성공: ${savedGames.length}개, 실패: ${errors.length}개)`,
      data: {
        orderId: orderId,
        savedGames: savedGames,
        errors: errors,
        orderStatus: orderStatus,
        totalProcessed: gameResults.length
      }
    });

  } catch (error) {
    console.error('❌ 수동 경기 결과 입력 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * 주문별 경기 결과 조회 API
 * GET /api/admin/order-game-results/:orderId
 */
router.get('/order-game-results/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 주문 정보 조회
    const order = await ExchangeOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다'
      });
    }

    // 주문의 선택된 경기들 조회
    const selectionDetails = order.selectionDetails || [];
    const gameResults = [];

    for (const selection of selectionDetails) {
      if (selection.homeTeam && selection.awayTeam && selection.commenceTime) {
        // GameResult 테이블에서 해당 경기 결과 조회
        const gameResult = await GameResult.findOne({
          where: {
            homeTeam: selection.homeTeam,
            awayTeam: selection.awayTeam,
            commenceTime: new Date(selection.commenceTime)
          }
        });

        gameResults.push({
          gameId: selection.gameId || null,
          homeTeam: selection.homeTeam,
          awayTeam: selection.awayTeam,
          commenceTime: selection.commenceTime,
          selection: selection.selection,
          odds: selection.odds,
          gameResult: gameResult ? {
            score: gameResult.score,
            status: gameResult.status,
            result: gameResult.result,
            updatedAt: gameResult.updatedAt
          } : null
        });
      }
    }

    res.json({
      success: true,
      data: {
        orderId: orderId,
        orderStatus: order.status,
        gameResults: gameResults
      }
    });

  } catch (error) {
    console.error('❌ 주문 경기 결과 조회 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

export default router;
