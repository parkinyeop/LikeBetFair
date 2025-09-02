import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

async function verifyToken(req, res, next) {
  console.log('🔑 [VerifyToken] 토큰 검증 시작:', {
    method: req.method,
    path: req.path,
    hasXAuthToken: !!req.header('x-auth-token'),
    hasAuthHeader: !!req.header('Authorization')
  });

  // Get token from header - support both Authorization Bearer and x-auth-token
  let token = req.header('x-auth-token');
  
  // Check for Authorization Bearer header
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  // Check if no token
  if (!token) {
    console.log('❌ [VerifyToken] 토큰 없음');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // 🆕 JWT_SECRET 확인
    console.log('🔑 [VerifyToken] JWT_SECRET 상태:', {
      hasSecret: !!process.env.JWT_SECRET,
      secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    });
    
    // 🆕 토큰 디코딩 시도
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ [VerifyToken] 토큰 검증 성공:', { 
      userId: decoded.userId,
      tokenPreview: token.substring(0, 50) + '...'
    });

    // 🆕 데이터베이스에서 사용자 정보 가져오기
    try {
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'username', 'email', 'isAdmin', 'adminLevel', 'isActive']
      });

      if (!user) {
        console.log('❌ [VerifyToken] 사용자를 찾을 수 없음:', decoded.userId);
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.isActive) {
        console.log('❌ [VerifyToken] 비활성화된 사용자:', user.username);
        return res.status(401).json({ message: 'User account is inactive' });
      }

      console.log('✅ [VerifyToken] 사용자 정보 로드됨:', {
        username: user.username,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel
      });

      req.user = {
        id: user.id,
        userId: user.id, // 호환성을 위해 둘 다 설정
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        isActive: user.isActive
      };

      next();
    } catch (dbError) {
      console.error('❌ [VerifyToken] 데이터베이스 오류:', dbError.message);
      res.status(500).json({ message: 'Database error during token verification' });
    }
  } catch (err) {
    console.error('❌ [VerifyToken] 토큰 검증 실패:', {
      error: err.message,
      errorType: err.name,
      tokenPreview: token.substring(0, 50) + '...',
      hasJWTSecret: !!process.env.JWT_SECRET
    });
    res.status(401).json({ message: 'Token is not valid' });
  }
}

export default verifyToken; 