const axios = require('axios');

// 캐시 설정
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

exports.getOdds = async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    const { sport } = req.params;
    const apiKey = process.env.ODDS_API_KEY;

    // 캐시된 데이터 확인
    const cachedData = cache.get(sport);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return res.json(cachedData.data);
    }

    // API 호출
    const response = await axios.get(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds`,
      {
        params: {
          apiKey,
          regions: 'us',
          markets: 'h2h,totals,spreads'
        }
      }
    );

    // 응답 데이터 캐싱
    cache.set(sport, {
      data: response.data,
      timestamp: Date.now()
    });

    res.json(response.data);
  } catch (err) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    console.error('Error fetching odds:', err);
    if (err.response) {
      // 외부 API의 응답 전체를 출력
      console.error('API response data:', err.response.data);
      console.error('API response status:', err.response.status);
      console.error('API response headers:', err.response.headers);
    }
    res.status(err.response?.status || 500).json({ 
      message: 'Failed to fetch odds',
      error: err.message 
    });
  }
}; 