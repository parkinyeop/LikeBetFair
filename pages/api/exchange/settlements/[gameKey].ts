import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../server/middleware/verifyToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // JWT 토큰 검증
    const authResult = await verifyToken(req);
    if (!authResult.success) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { gameKey } = req.query;
    if (!gameKey || typeof gameKey !== 'string') {
      return res.status(400).json({ message: 'Game key is required' });
    }

    // gameKey 파싱: "homeTeam|awayTeam|commenceTime"
    const [homeTeam, awayTeam, commenceTime] = gameKey.split('|');
    if (!homeTeam || !awayTeam || !commenceTime) {
      return res.status(400).json({ message: 'Invalid game key format' });
    }

    console.log('정산 상세 정보 조회:', {
      homeTeam,
      awayTeam,
      commenceTime
    });

    // 데이터베이스에서 정산된 주문들 조회 (PaymentHistories 테이블)
    const { PaymentHistory } = require('../../../server/models');
    
    const { Op } = require('sequelize');
    
    // PaymentHistories 테이블에서 정산 데이터 조회
    const searchConditions = {
      "description": {
        [Op.like]: `%${homeTeam}%${awayTeam}%`
      }
    };

    console.log('검색 조건:', JSON.stringify(searchConditions, null, 2));

    const settledOrders = await PaymentHistory.findAll({
      where: searchConditions,
      include: [
        {
          model: require('../../../server/models').User,
          as: 'user',
          attributes: ['username', 'email']
        }
      ],
      order: [['settledAt', 'DESC']]
    });

    console.log(`조회된 정산 주문 수: ${settledOrders.length}`);

    if (settledOrders.length === 0) {
      console.log('정산 내역 없음 - 404 반환');
      return res.status(404).json({ 
        message: '해당 경기에 대한 정산 내역을 찾을 수 없습니다.' 
      });
    }

    // 정산 상세 정보 구성
    const settlementDetail = {
      gameInfo: {
        homeTeam,
        awayTeam,
        commenceTime: new Date(commenceTime).toISOString()
      },
      totalSettledOrders: settledOrders.length,
      totalVolume: settledOrders.reduce((sum, order) => sum + (order.amount || 0), 0),
      orders: settledOrders.map(order => ({
        id: order.id,
        orderId: order.orderId,
        username: order.user?.username || 'N/A',
        amount: order.amount || 0,
        balance: order.balance || 0,
        settledAt: order.settledAt,
        description: order.description || 'N/A',
        profit: order.amount > 0 ? order.amount : 0, // 양수면 수익, 음수면 손실
        isProfit: order.amount > 0
      }))
    };

    res.status(200).json(settlementDetail);

  } catch (error) {
    console.error('정산 상세 조회 오류:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
