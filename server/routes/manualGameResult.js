import express from 'express';
import { GameResult, ExchangeOrder, Bet } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * 수동 경기 결과 입력 API
 * POST /api/admin/manual-game-result
 */
router.post('/manual-game-result', async (req, res) => {
  try {
    const { orderId, betId, gameResults } = req.body;

    if ((!orderId && !betId) || !gameResults || !Array.isArray(gameResults)) {
      return res.status(400).json({
        success: false,
        message: '주문/베팅 ID와 경기 결과 데이터가 필요합니다'
      });
    }

    const targetId = orderId || betId;
    const targetType = orderId ? 'exchange' : 'sportsbook';

    console.log(`🔧 수동 경기 결과 입력 시작 - ${targetType === 'exchange' ? 'Exchange 주문' : '스포츠북 베팅'} ID: ${targetId}`);
    console.log(`📊 입력할 경기 수: ${gameResults.length}개`);

    // ID 유효성 검증
    try {
      if (targetType === 'exchange') {
        const order = await ExchangeOrder.findByPk(targetId);
        if (!order) {
          return res.status(404).json({
            success: false,
            message: '제공된 orderId에 해당하는 Exchange 주문을 찾을 수 없습니다.'
          });
        }
      } else {
        const bet = await Bet.findByPk(targetId);
        if (!bet) {
          return res.status(404).json({
            success: false,
            message: '제공된 betId에 해당하는 스포츠북 베팅을 찾을 수 없습니다.'
          });
        }
      }
    } catch (validationError) {
      return res.status(500).json({
        success: false,
        message: `ID 검증 중 오류 발생: ${validationError.message}`
      });
    }

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
            mainCategory: gameData.mainCategory || 'soccer',
            subCategory: gameData.subCategory || 'MANUAL_INPUT',
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            commenceTime: new Date(gameData.commenceTime),
            score: JSON.stringify([
              { name: gameData.homeTeam, score: String(gameData.homeScore || 0) },
              { name: gameData.awayTeam, score: String(gameData.awayScore || 0) }
            ]),
            status: gameData.status || 'finished',
            result: gameData.result || calculateGameResult(gameData.homeScore, gameData.awayScore),
            sportKey: gameData.sportKey || 'soccer_manual',
            sportTitle: gameData.sportTitle || '수동 입력',
            eventId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        });

        // 기존 경기인 경우 업데이트
        if (!created) {
          await gameResult.update({
            score: JSON.stringify([
              { name: gameData.homeTeam, score: String(gameData.homeScore || 0) },
              { name: gameData.awayTeam, score: String(gameData.awayScore || 0) }
            ]),
            status: gameData.status || 'finished',
            result: gameData.result || calculateGameResult(gameData.homeScore, gameData.awayScore),
            mainCategory: gameData.mainCategory || gameResult.mainCategory,
            subCategory: gameData.subCategory || gameResult.subCategory,
            sportKey: gameData.sportKey || gameResult.sportKey,
            sportTitle: gameData.sportTitle || gameResult.sportTitle,
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

    console.log(`✅ GameResult 저장 완료. 정산 스케줄러가 자동으로 처리합니다.`);

    // 응답 반환
    res.json({
      success: true,
      message: `경기 결과가 성공적으로 저장되었습니다. 정산은 자동으로 처리됩니다. (성공: ${savedGames.length}개, 실패: ${errors.length}개)`,
      data: {
        targetId: targetId,
        targetType: targetType,
        savedGames: savedGames,
        errors: errors,
        totalProcessed: gameResults.length,
        note: '정산 스케줄러가 자동으로 처리합니다'
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
            result: gameResult.status, // 호환성을 위해 status를 result로 복사
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

/**
 * 경기 결과 계산 함수
 * @param {number} homeScore - 홈팀 스코어
 * @param {number} awayScore - 어웨이팀 스코어
 * @returns {string} 경기 결과 ('home_win', 'away_win', 'draw')
 */
function calculateGameResult(homeScore, awayScore) {
  const home = parseInt(homeScore) || 0;
  const away = parseInt(awayScore) || 0;

  if (home > away) return 'home_win';
  if (away > home) return 'away_win';
  return 'draw';
}

export default router;
