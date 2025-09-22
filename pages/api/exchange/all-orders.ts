import { NextApiRequest, NextApiResponse } from 'next';
import { buildApiUrl } from '../../../config/apiConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Express 서버로 프록시
    const response = await fetch(buildApiUrl('/api/exchange/all-orders'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Express server responded with ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
