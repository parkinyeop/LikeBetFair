import express from 'express';
import gameResultService from '../services/gameResultService.js';
import OddsCache from '../models/oddsCacheModel.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * SportsDB에서 특정 리그의 경기 목록 가져오기
 * GET /api/admin/manual-odds/games/:sportKey
 */
router.get('/manual-odds/games/:sportKey', async (req, res) => {
  try {
    const { sportKey } = req.params;
    const { days = 7 } = req.query;

    console.log(`📋 [Manual Odds] 경기 목록 조회: ${sportKey}, ${days}일`);

    // GameResultService를 통해 SportsDB에서 경기 가져오기
    const result = await gameResultService.fetchResultsWithSportsDB(sportKey, parseInt(days), true);

    if (!result || !result.data) {
      return res.status(404).json({
        success: false,
        message: '경기 목록을 가져올 수 없습니다'
      });
    }

    const games = result.data;

    // 이미 배당율이 있는 경기 확인
    const eventIds = games
      .filter(e => e.id)
      .map(e => e.id);

    const existingOdds = await OddsCache.findAll({
      where: {
        oddsApiId: { [Op.in]: eventIds }
      },
      attributes: ['oddsApiId', 'bookmakers']
    });

    const existingOddsMap = {};
    existingOdds.forEach(odds => {
      existingOddsMap[odds.oddsApiId] = odds.bookmakers;
    });

    // 경기 목록에 기존 배당율 정보 추가 및 형식 변환
    const gamesWithOdds = games.map(game => ({
      eventId: game.id,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      commenceTime: game.commence_time,
      status: game.status,
      score: game.scores,
      hasOdds: !!existingOddsMap[game.id],
      existingOdds: existingOddsMap[game.id] || null
    }));

    res.json({
      success: true,
      sportKey: sportKey,
      totalGames: gamesWithOdds.length,
      games: gamesWithOdds
    });

  } catch (error) {
    console.error('❌ [Manual Odds] 경기 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * 수동 배당율 저장
 * POST /api/admin/manual-odds
 */
router.post('/manual-odds', async (req, res) => {
  try {
    const {
      sportKey,
      sportTitle,
      eventId,
      homeTeam,
      awayTeam,
      commenceTime,
      odds // { h2h: { home, away, draw? }, spreads?, totals? }
    } = req.body;

    console.log(`💾 [Manual Odds] 배당율 저장 시작: ${homeTeam} vs ${awayTeam}`);

    // 필수 데이터 검증
    if (!sportKey || !eventId || !homeTeam || !awayTeam || !commenceTime || !odds) {
      return res.status(400).json({
        success: false,
        message: '필수 데이터가 누락되었습니다'
      });
    }

    // 배당율 데이터 구조 생성 (OddsAPI 형식과 호환되도록)
    const bookmakerData = {
      key: 'manual_input',
      title: 'Manual Input',
      last_update: new Date().toISOString(),
      markets: []
    };

    // H2H (승/패) 배당율
    if (odds.h2h) {
      const h2hOutcomes = [
        { name: homeTeam, price: parseFloat(odds.h2h.home) }
      ];

      if (odds.h2h.draw) {
        h2hOutcomes.push({ name: 'Draw', price: parseFloat(odds.h2h.draw) });
      }

      h2hOutcomes.push({ name: awayTeam, price: parseFloat(odds.h2h.away) });

      bookmakerData.markets.push({
        key: 'h2h',
        last_update: new Date().toISOString(),
        outcomes: h2hOutcomes
      });
    }

    // Spreads (핸디캡) 배당율
    if (odds.spreads && odds.spreads.length > 0) {
      bookmakerData.markets.push({
        key: 'spreads',
        last_update: new Date().toISOString(),
        outcomes: odds.spreads.map(spread => ({
          name: spread.team,
          price: parseFloat(spread.price),
          point: parseFloat(spread.point)
        }))
      });
    }

    // Totals (오버/언더) 배당율
    if (odds.totals && odds.totals.length > 0) {
      bookmakerData.markets.push({
        key: 'totals',
        last_update: new Date().toISOString(),
        outcomes: odds.totals.map(total => ({
          name: total.name, // 'Over' or 'Under'
          price: parseFloat(total.price),
          point: parseFloat(total.point)
        }))
      });
    }

    // officialOdds 생성 (oddsController와 호환되는 형식)
    const officialOdds = {};

    // h2h (승/패)
    if (odds.h2h) {
      officialOdds.h2h = {
        home: parseFloat(odds.h2h.home),
        away: parseFloat(odds.h2h.away)
      };
      if (odds.h2h.draw) {
        officialOdds.h2h.draw = parseFloat(odds.h2h.draw);
      }
    }

    // spreads (핸디캡)
    if (odds.spreads && odds.spreads.length > 0) {
      officialOdds.spreads = {};
      odds.spreads.forEach((spread, index) => {
        const key = `spread_${index}`;
        officialOdds.spreads[key] = {
          point: parseFloat(spread.point),
          odds: parseFloat(spread.price),
          team: spread.team
        };
      });
    }

    // totals (오버/언더)
    if (odds.totals && odds.totals.length > 0) {
      officialOdds.totals = {};
      odds.totals.forEach((total, index) => {
        const key = total.name.toLowerCase(); // 'over' or 'under'
        officialOdds.totals[key] = {
          point: parseFloat(total.point),
          odds: parseFloat(total.price)
        };
      });
    }

    // mainCategory와 subCategory 자동 설정
    const categoryMap = {
      'basketball_kbl': { main: 'basketball', sub: 'kbl' },
      'baseball_kbo': { main: 'baseball', sub: 'kbo' },
      'basketball_nba': { main: 'basketball', sub: 'nba' },
      'baseball_mlb': { main: 'baseball', sub: 'mlb' },
    };
    const categories = categoryMap[sportKey] || { main: 'other', sub: 'manual' };

    // OddsCache에 저장 (findOrCreate 사용)
    const [oddsCache, created] = await OddsCache.findOrCreate({
      where: {
        sportKey: sportKey,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        commenceTime: new Date(commenceTime)
      },
      defaults: {
        oddsApiId: eventId,
        sportKey: sportKey,
        sportTitle: sportTitle || 'Manual Input',
        commenceTime: new Date(commenceTime),
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        bookmakers: [bookmakerData],
        officialOdds: officialOdds,  // 추가
        mainCategory: categories.main,
        subCategory: categories.sub,
        lastUpdated: new Date(),
        market: 'h2h'
      }
    });

    // 기존 레코드인 경우 업데이트
    if (!created) {
      await oddsCache.update({
        bookmakers: [bookmakerData],
        officialOdds: officialOdds,  // 추가
        lastUpdated: new Date()
      });
      console.log(`🔄 [Manual Odds] 기존 배당율 업데이트: ${eventId}`);
    } else {
      console.log(`✅ [Manual Odds] 새 배당율 저장: ${eventId}`);
    }

    res.json({
      success: true,
      message: created ? '배당율이 성공적으로 저장되었습니다' : '배당율이 업데이트되었습니다',
      data: {
        eventId: eventId,
        created: created
      }
    });

  } catch (error) {
    console.error('❌ [Manual Odds] 배당율 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * 수동 배당율 삭제
 * DELETE /api/admin/manual-odds/:eventId
 */
router.delete('/manual-odds/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const deleted = await OddsCache.destroy({
      where: {
        oddsApiId: eventId
      }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 배당율을 찾을 수 없습니다'
      });
    }

    console.log(`🗑️ [Manual Odds] 배당율 삭제: ${eventId}`);

    res.json({
      success: true,
      message: '배당율이 삭제되었습니다'
    });

  } catch (error) {
    console.error('❌ [Manual Odds] 배당율 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

export default router;
