import jwt from 'jsonwebtoken';

function verifyToken(req, res, next) {
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
    req.user = decoded;
    next();
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