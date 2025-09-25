import type { NextApiRequest, NextApiResponse } from 'next';
import { buildServerApiUrl } from '../../../config/serverApiConfig';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '3aad092c060aa49ac87be19a33431c81c6fa287c9bcdda983c1b5d5a83380a7fa816ea915bbc9aff816c78db2a39ff673ae60b5ce4bbcce50c060569d99ec1c1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    console.log('🔐 Exchange 주문 API 호출:', {
      userId: decoded.userId,
      orderData: req.body
    });

    // 백엔드 서버로 프록시 (환경변수 기반)
    const backendResponse = await fetch(buildServerApiUrl('/api/exchange/order'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(req.body)
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('❌ 백엔드 주문 생성 실패:', data);
      return res.status(backendResponse.status).json(data);
    }

    console.log('✅ Exchange 주문 생성 성공:', data);
    res.status(200).json(data);

  } catch (error) {
    console.error('❌ Exchange 주문 API 오류:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
} 