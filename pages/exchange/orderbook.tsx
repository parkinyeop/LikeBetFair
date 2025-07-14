import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useExchange } from '../../hooks/useExchange';

interface Order {
  id: string;
  gameId: string;
  userId: string;
  type: 'back' | 'lay';
  odds: number;
  amount: number;
  status: 'open' | 'matched' | 'cancelled' | 'settled';
  createdAt: string;
  game?: {
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    sportKey: string;
    subCategory: string;
  };
}

const OrderbookPage: React.FC = () => {
  const router = useRouter();
  const { userId } = useAuth();
  const { fetchAllOpenOrders } = useExchange();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const allOrders = await fetchAllOpenOrders();
        // ExchangeOrder를 Order 타입으로 변환
        const convertedOrders: Order[] = allOrders.map(order => ({
          id: order.id.toString(),
          gameId: order.gameId,
          userId: order.userId.toString(),
          type: order.side,
          odds: order.price,
          amount: order.amount,
          status: order.status,
          createdAt: order.createdAt,
          game: {
            homeTeam: order.homeTeam || '',
            awayTeam: order.awayTeam || '',
            startTime: order.commenceTime || '',
            sportKey: '', // 백엔드에서 sportKey를 별도로 반환하므로 빈 문자열로 설정
            subCategory: ''
          }
        }));
        setOrders(convertedOrders);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [fetchAllOpenOrders]);

  const getSportDisplayName = (sportKey: string) => {
    const sportMap: { [key: string]: string } = {
      'basketball_nba': 'NBA',
      'baseball_mlb': 'MLB',
      'baseball_kbo': 'KBO',
      'americanfootball_nfl': 'NFL',
      'soccer_usa_mls': 'MLS',
      'soccer_korea_kleague1': 'K리그',
      'soccer_japan_j_league': 'J리그',
      'soccer_italy_serie_a': '세리에 A',
      'soccer_brazil_campeonato': '브라질 세리에 A',
      'soccer_argentina_primera_division': '아르헨티나 프리메라',
      'soccer_china_superleague': '중국 슈퍼리그',
      'soccer_spain_primera_division': '라리가',
      'soccer_germany_bundesliga': '분데스리가'
    };
    return sportMap[sportKey] || sportKey;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">호가 데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">전체 호가</h1>
        <button
          onClick={() => router.back()}
          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
        >
          뒤로가기
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-lg text-gray-600">현재 오픈된 호가가 없습니다.</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {getSportDisplayName(order.game?.sportKey || '')}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      {order.type === 'back' ? 'Back' : 'Lay'}
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    {order.game?.homeTeam} vs {order.game?.awayTeam}
                  </div>
                  <div className="text-xs text-gray-600">
                    {order.game?.startTime ? formatDateTime(order.game.startTime) : '시간 미정'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {order.odds}
                  </div>
                  <div className="text-xs text-gray-600">
                    배당률
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-600">
                  호가 금액: <span className="font-semibold">{formatAmount(order.amount)}원</span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDateTime(order.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderbookPage; 