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
  status: 'open' | 'matched' | 'partially_matched' | 'cancelled';
}

export default function ExchangeOrdersTab() {
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateRange]);

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

      const res = await fetch(buildApiUrl(`/api/mypage/exchange-orders?status=${statusFilter}&range=${dateRange}`), {
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
      open: { text: '대기중', className: 'bg-yellow-100 text-yellow-800' },
      partially_matched: { text: '부분매칭', className: 'bg-blue-100 text-blue-800' },
      cancelled: { text: '취소', className: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.cancelled;

    return (
      <span className={`px-2 py-1 rounded text-xs ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const columns = [
    {
      key: 'createdAt',
      label: '주문 시간',
      render: (value: string) => new Date(value).toLocaleString('ko-KR'),
      className: 'w-40'
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
      render: (value: number) => value.toFixed(3),
      className: 'w-24'
    },
    {
      key: 'amount',
      label: '금액',
      render: (value: number) => `${value.toLocaleString()}원`,
      className: 'w-32'
    },
    {
      key: 'filledAmount',
      label: '매칭액',
      render: (value: number) => `${value.toLocaleString()}원`,
      className: 'w-32'
    },
    {
      key: 'status',
      label: '상태',
      render: (value: string) => getStatusBadge(value),
      className: 'w-28'
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
