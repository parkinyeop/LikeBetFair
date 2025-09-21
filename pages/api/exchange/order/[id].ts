import { NextApiRequest, NextApiResponse } from 'next';
import { buildApiUrl } from '../../../config/apiConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'Order ID is required' });
  }

  try {
    // Express 서버로 프록시
    const response = await fetch(`buildApiUrl('/api')/exchange/order/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ message: 'Order not found' });
      }
      throw new Error(`Express server responded with ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}