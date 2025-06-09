import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const apiKey = process.env.ODDS_API_KEY;
  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us&markets=h2h`;

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