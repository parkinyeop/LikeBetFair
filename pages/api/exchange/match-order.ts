import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '3aad092c060aa49ac87be19a33431c81c6fa287c9bcdda983c1b5d5a83380a7fa816ea915bbc9aff816c78db2a39ff673ae60b5ce4bbcce50c060569d99ec1c1';

// 토큰 검증 미들웨어
const verifyToken = (req: NextApiRequest): { id: string } | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 토큰 검증
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: '인증이 필요합니다' });
  }

  try {
    const { gameId, market, line, side, price, amount } = req.body;
    
    console.log(`🎯 매치 주문 요청 (Next.js API): ${side} ${price} (${amount}원) - User: ${user.id}`);

    // 백엔드 서버로 프록시
    const backendResponse = await fetch('http://localhost:5050/api/exchange/match-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization as string
      },
      body: JSON.stringify({ gameId, market, line, side, price, amount })
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return res.status(backendResponse.status).json(errorData);
    }

    const result = await backendResponse.json();
    res.json(result);

  } catch (error) {
    console.error('❌ 매치 주문 프록시 오류:', error);
    res.status(500).json({ error: '매치 주문 처리 중 오류가 발생했습니다.' });
  }
} 