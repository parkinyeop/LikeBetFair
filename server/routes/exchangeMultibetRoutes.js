import express from 'express';
import { ExchangeMultibetController } from '../controllers/exchangeMultibetController.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(verifyToken);

/**
 * @route POST /api/exchange/multibet
 * @desc 멀티배팅 주문 생성
 * @access Private
 */
router.post('/', ExchangeMultibetController.createMultibet);

/**
 * @route GET /api/exchange/multibet/:multibetId
 * @desc 특정 멀티배팅 조회
 * @access Private
 */
router.get('/:multibetId', ExchangeMultibetController.getMultibet);

/**
 * @route GET /api/exchange/multibet
 * @desc 사용자의 멀티배팅 목록 조회
 * @access Private
 */
router.get('/', ExchangeMultibetController.getUserMultibets);

/**
 * @route PUT /api/exchange/multibet/:multibetId/cancel
 * @desc 멀티배팅 취소
 * @access Private
 */
router.put('/:multibetId/cancel', ExchangeMultibetController.cancelMultibet);

export default router;
