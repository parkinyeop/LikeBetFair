import { NextApiRequest, NextApiResponse } from 'next';
import { API_CONFIG, buildApiUrl } from '../../../config/apiConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 내부 표준 프록시 경유 (직접 외부 호출 대신 서버 API 사용)
  const url = buildApiUrl(`${API_CONFIG.ENDPOINTS.ODDS}/basketball_nba`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.status !== 200) {
      return res.status(response.status).json({ error: data });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "API fetch failed" });
  }
} 