import { NextApiRequest, NextApiResponse } from 'next';
import { buildApiUrl } from '../../../config/apiConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Express 서버로 프록시
    const response = await fetch('buildApiUrl('/api')/exchange/multibet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': req.headers['x-auth-token'] || '',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Multibet API proxy error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
