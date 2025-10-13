import React, { useState, useEffect } from 'react';
import AdminTable from '../admin/AdminTable';

interface Payment {
  id: string;
  paidAt: string;
  amount: number;
  balanceAfter: number;
  memo: string;
}

export default function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all

  // 입출금 내역 로드
  useEffect(() => {
    fetchPayments();
  }, [dateRange]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/mypage/payment-history?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error('입출금 내역 로드 실패:', error);
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
      key: 'amount',
      label: '금액',
      render: (value: number) => (
        <span className={value > 0 ? 'text-blue-600 font-semibold' : 'text-red-600 font-semibold'}>
          {value > 0 ? '+' : ''}{value.toLocaleString()}원
        </span>
      ),
      className: 'w-32'
    },
    {
      key: 'balanceAfter',
      label: '거래 후 잔액',
      render: (value: number) => `${value.toLocaleString()}원`,
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

        {/* 기간 필터 */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
          <option value="90d">최근 90일</option>
          <option value="all">전체</option>
        </select>
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
