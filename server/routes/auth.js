import express from 'express';
import { authController } from '../controllers/authController.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// 회원가입
router.post('/register', authController.register);

// 로그인
router.post('/login', authController.login);

// 로그아웃
router.post('/logout', authController.logout);

// 사용자 정보 조회
router.get('/me', verifyToken, authController.getMe);

// 잔액 조회 (새로 추가)
router.get('/balance', verifyToken, async (req, res) => {
  try {
    console.log('[Balance] 잔액 조회 요청:', req.user.userId);
    
    const User = (await import('../models/userModel.js')).default;
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      console.log('[Balance] 사용자를 찾을 수 없음:', req.user.userId);
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    
    console.log('[Balance] 잔액 조회 성공:', { userId: user.id, balance: user.balance });
    
    res.json({ 
      balance: Number(user.balance),
      userId: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('[Balance] 잔액 조회 오류:', error);
    res.status(500).json({ error: '잔액 조회 중 오류가 발생했습니다' });
  }
});

export default router; 