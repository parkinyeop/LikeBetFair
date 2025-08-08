import { NextApiRequest, NextApiResponse } from 'next';
import { API_CONFIG, buildApiUrl } from '../../../config/apiConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { sport } = req.query;

  if (!sport || typeof sport !== 'string') {
    return res.status(400).json({ error: 'Invalid sport parameter' });
  }

  const url = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/${sport}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.status !== 200) {
      return res.status(response.status).json({ error: data });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching odds from server:', error);
    res.status(500).json({ error: "Failed to fetch odds from server" });
  }
} 