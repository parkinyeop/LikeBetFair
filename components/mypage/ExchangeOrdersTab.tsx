import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/apiConfig';
import AdminTable from '../admin/AdminTable';

interface ExchangeOrder {
  id: string;
  createdAt: string;
  side: 'back' | 'lay';
  price: number;
  amount: number;
  filledAmount: number;
  status: 'open' | 'matched' | 'partially_matched' | 'cancelled' | 'settled' | 'active';
  homeTeam?: string;
  awayTeam?: string;
  selection?: string;
  market?: string;
  isMultibet?: boolean;
  actualProfit?: number;
  stakeAmount?: number;
  selectionDetails?: {
    selections?: Array<{
      desc: string;
      team: string;
      odds: number;
      market: string;
    }>;
  };
}

export default function ExchangeOrdersTab({ viewUserId }: { viewUserId?: string }) {
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all
  
  const isAdminViewing = !!viewUserId;

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateRange, viewUserId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // AuthContext와 동일한 방식으로 토큰 가져오기
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

      if (!token) {
        console.error('토큰이 없습니다.');
        setLoading(false);
        return;
      }

      // 관리자 조회용 API 사용
      const apiUrl = isAdminViewing
        ? buildApiUrl(`/api/admin/users/${viewUserId}/exchange-orders?status=${statusFilter}&range=${dateRange}`)
        : buildApiUrl(`/api/mypage/exchange-orders?status=${statusFilter}&range=${dateRange}`);

      const res = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        console.error('주문 내역 로드 실패:', res.status);
      }
    } catch (error) {
      console.error('주문 내역 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (side: string) => {
    const config = side === 'back' 
      ? { text: 'BACK', className: 'bg-blue-100 text-blue-800' }
      : { text: 'LAY', className: 'bg-pink-100 text-pink-800' };

    return (
      <span className={`px-2 py-1 rounded text-xs ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      matched: { text: '매칭완료', className: 'bg-green-100 text-green-800' },
      settled: { text: '정산완료', className: 'bg-purple-100 text-purple-800' },
      open: { text: '대기중', className: 'bg-yellow-100 text-yellow-800' },
      partially_matched: { text: '부분매칭', className: 'bg-blue-100 text-blue-800' },
      cancelled: { text: '취소', className: 'bg-gray-100 text-gray-800' },
      active: { text: '대기중', className: 'bg-yellow-100 text-yellow-800' } // LAY 주문의 경우 대기중 상태
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.cancelled;

    return (
      <span className={`px-2 py-1 rounded text-xs ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getResultBadge = (order: ExchangeOrder) => {
    // 정산되지 않은 경우 표시하지 않음
    if (order.status !== 'settled' || order.actualProfit === undefined) {
      return <span className="text-xs text-gray-400">-</span>;
    }

    const profit = order.actualProfit || 0;
    const stake = order.stakeAmount || order.amount || 0;

    // 승패 판정
    // 무효 (환불): profit이 stake와 거의 같을 때 (±1원 오차 허용)
    if (Math.abs(profit - stake) < 1) {
      return (
        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
          무효
        </span>
      );
    }
    
    // 승리: profit > 0
    if (profit > 0) {
      return (
        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
          승리
        </span>
      );
    }
    
    // 패배: profit <= 0
    return (
      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
        패배
      </span>
    );
  };

  const columns = [
    {
      key: 'id',
      label: '주문 ID',
      render: (value: string) => (
        <span className="text-xs font-medium text-gray-900">{value}</span>
      ),
      className: 'w-32'
    },
    {
      key: 'createdAt',
      label: '주문 시간',
      render: (value: string) => (
        <span className="text-xs">
          {new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </span>
      ),
      className: 'w-40'
    },
    {
      key: 'homeTeam',
      label: '경기 정보',
      render: (value: string, row: ExchangeOrder) => {
        // 멀티배팅인 경우
        if (row.isMultibet && row.selectionDetails?.selections) {
          const selections = row.selectionDetails.selections;
          return (
            <div className="space-y-1">
              {selections.map((sel, idx) => (
                <div key={idx} className="text-xs">
                  <div className="font-medium text-gray-900">{sel.desc}</div>
                  <div className="text-gray-600">
                    {sel.team} • {sel.market} • {Number(sel.odds).toFixed(2)}배
                  </div>
                </div>
              ))}
            </div>
          );
        }
        
        // 단일 경기인 경우
        if (row.homeTeam && row.awayTeam) {
          return (
            <div className="text-xs">
              <div className="font-medium text-gray-900">{row.homeTeam} vs {row.awayTeam}</div>
              <div className="text-gray-600">
                {row.selection || '-'} • {row.market || '-'}
              </div>
            </div>
          );
        }
        
        return '-';
      },
      className: 'w-64'
    },
    {
      key: 'side',
      label: '유형',
      render: (value: string) => getTypeBadge(value),
      className: 'w-20'
    },
    {
      key: 'price',
      label: '배당률',
      render: (value: number) => Number(value).toFixed(3),
      className: 'w-24'
    },
    {
      key: 'amount',
      label: '금액',
      render: (value: number) => `${Math.floor(value).toLocaleString()} KRW`,
      className: 'w-28'
    },
    {
      key: 'filledAmount',
      label: '매칭액',
      render: (value: number) => `${Math.floor(value).toLocaleString()} KRW`,
      className: 'w-28'
    },
    {
      key: 'status',
      label: '상태',
      render: (value: string) => getStatusBadge(value),
      className: 'w-24'
    },
    {
      key: 'actualProfit',
      label: '결과',
      render: (value: number, row: ExchangeOrder) => getResultBadge(row),
      className: 'w-20'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">익스체인지 주문</h2>

        <div className="flex gap-3">
          {/* 기간 필터 */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
            <option value="90d">최근 90일</option>
            <option value="all">전체 기간</option>
          </select>

          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 상태</option>
            <option value="open">대기중</option>
            <option value="matched">매칭완료</option>
            <option value="partially_matched">부분매칭</option>
            <option value="settled">정산완료</option>
            <option value="cancelled">취소</option>
          </select>
        </div>
      </div>

      <AdminTable
        data={orders}
        columns={columns}
        loading={loading}
        emptyMessage="주문 내역이 없습니다."
      />
    </div>
  );
}
