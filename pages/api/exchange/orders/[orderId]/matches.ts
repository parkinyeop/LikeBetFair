import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/apiConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { orderId } = req.query;
  const token = req.headers['x-auth-token'] as string;

  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  try {
    const apiUrl = API_CONFIG.BASE_URL;
    const response = await axios.get(
      `${apiUrl}/api/exchange/orders/${orderId}/matches`,
      {
        headers: {
          'x-auth-token': token
        }
      }
    );

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('매칭 정보 조회 오류:', error.response?.data || error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: '매칭 정보 조회 중 오류가 발생했습니다.' });
    }
  }
}

