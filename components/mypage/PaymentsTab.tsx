import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/apiConfig';
import AdminTable from '../admin/AdminTable';

interface Payment {
  id: string;
  paidAt: string;
  amount: number;
  balanceAfter: number;
  memo: string;
  betId?: string;
}

export default function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all
  const [typeFilter, setTypeFilter] = useState('all'); // all, deposit, withdrawal

  // 입출금 내역 로드
  useEffect(() => {
    fetchPayments();
  }, [dateRange, typeFilter]);

  const fetchPayments = async () => {
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

      const res = await fetch(buildApiUrl(`/api/mypage/payment-history?range=${dateRange}&type=${typeFilter}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      } else {
        console.error('입출금 내역 로드 실패:', res.status);
      }
    } catch (error) {
      console.error('입출금 내역 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'paidAt',
      label: '일시',
      render: (value: string) => new Date(value).toLocaleString('ko-KR'),
      className: 'w-40'
    },
    {
      key: 'betId',
      label: '주문/배팅번호',
      render: (value: string | undefined, row: Payment) => {
        if (!value) return '-';
        
        // EXCHANGE_123 형식인 경우
        if (value.startsWith('EXCHANGE_')) {
          const orderId = value.replace('EXCHANGE_', '');
          return (
            <span className="text-blue-600 font-mono text-xs">
              익스체인지 #{orderId}
            </span>
          );
        }
        
        // UUID 형식인 경우 (스포츠북 배팅)
        if (value.includes('-')) {
          return (
            <span className="text-green-600 font-mono text-xs" title={value}>
              배팅 #{value.substring(0, 8)}...
            </span>
          );
        }
        
        // 숫자만 있는 경우
        return (
          <span className="font-mono text-xs">
            #{value}
          </span>
        );
      },
      className: 'w-36'
    },
    {
      key: 'amount',
      label: '금액',
      render: (value: number) => (
        <span className={value > 0 ? 'text-blue-600 font-semibold' : 'text-red-600 font-semibold'}>
          {value > 0 ? '+' : ''}{Math.floor(value).toLocaleString()} KRW
        </span>
      ),
      className: 'w-32'
    },
    {
      key: 'balanceAfter',
      label: '거래 후 잔액',
      render: (value: number) => `${Math.floor(value).toLocaleString()} KRW`,
      className: 'w-32'
    },
    {
      key: 'memo',
      label: '내용',
      className: 'flex-1'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">입출금 내역</h2>

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

          {/* 입출금 타입 필터 */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="deposit">입금</option>
            <option value="withdrawal">출금</option>
          </select>
        </div>
      </div>

      <AdminTable
        data={payments}
        columns={columns}
        loading={loading}
        emptyMessage="입출금 내역이 없습니다."
      />
    </div>
  );
}
