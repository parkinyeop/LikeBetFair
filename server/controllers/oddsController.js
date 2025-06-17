const { OddsCache } = require('../models');

exports.getOdds = async (req, res) => {
  try {
    const { sport } = req.params;
    
    // DB에서 캐시된 데이터 조회
    const cachedData = await OddsCache.findAll({
      where: { sport },
      order: [['commence_time', 'ASC']]
    });

    if (!cachedData || cachedData.length === 0) {
      return res.status(404).json({ message: 'No odds data found for this sport' });
    }

    // 데이터 포맷 변환
    const formattedData = cachedData.map(game => ({
      id: game.id,
      sport: game.sport,
      home_team: game.home_team,
      away_team: game.away_team,
      commence_time: game.commence_time,
      odds: game.odds
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching odds from database:', err);
    res.status(500).json({ 
      message: 'Failed to fetch odds from database',
      error: err.message 
    });
  }
}; 