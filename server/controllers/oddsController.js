const { OddsCache } = require('../models');
const { Op } = require('sequelize');

exports.getOdds = async (req, res) => {
  try {
    const { sport } = req.params;
    
    // 오늘~7일 후까지 범위 계산 (UTC 기준)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekLater = new Date(today);
    weekLater.setUTCDate(today.getUTCDate() + 7);

    // DB에서 오늘~7일 후까지 경기만 조회
    const cachedData = await OddsCache.findAll({
      where: {
        sportKey: sport,
        commenceTime: { [Op.gte]: today, [Op.lt]: weekLater }
      },
      order: [['commenceTime', 'DESC']]
    });

    // 동일 경기 중복 제거 (최신 odds만)
    const uniqueGames = [];
    const seen = new Set();
    for (const game of cachedData) {
      // commenceTime을 분 단위까지만 비교
      const date = new Date(game.commenceTime);
      const key = `${game.sportKey}_${game.homeTeam}_${game.awayTeam}_${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}T${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')}`;
      if (!seen.has(key)) {
        uniqueGames.push(game);
        seen.add(key);
      }
    }

    if (!uniqueGames || uniqueGames.length === 0) {
      return res.status(404).json({ message: 'No odds data found for this sport' });
    }

    // 데이터 포맷 변환
    const formattedData = uniqueGames.map(game => ({
      id: game.id,
      sport: game.sportKey,
      home_team: game.homeTeam,
      away_team: game.awayTeam,
      commence_time: game.commenceTime,
      odds: game.odds,
      bookmakers: game.bookmakers
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