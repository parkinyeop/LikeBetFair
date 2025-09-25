import { NextApiRequest, NextApiResponse } from 'next';
import { buildServerApiUrl, SERVER_CONFIG } from '../../../config/serverApiConfig';
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 토큰 검증
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: '인증이 필요합니다' });
  }

  try {
    const { gameId, market, line } = req.query;
    
    console.log(`📊 호가 조회 요청 (Next.js API): gameId=${gameId}, market=${market}, line=${line}`);

    // 백엔드 서버로 프록시 (환경변수 기반)
    const backendUrl = buildServerApiUrl('/api/exchange/orderbook', {
      gameId: encodeURIComponent(gameId as string),
      market: encodeURIComponent(market as string),
      line: String(line)
    });
    
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': req.headers.authorization as string
      }
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return res.status(backendResponse.status).json(errorData);
    }

    const result = await backendResponse.json();
    res.json(result);

  } catch (error) {
    console.error('❌ 호가 조회 프록시 오류:', error);
    res.status(500).json({ error: '호가 조회 중 오류가 발생했습니다.' });
  }
} 