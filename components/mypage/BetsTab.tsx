import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/apiConfig';
import AdminTable from '../admin/AdminTable';

interface Bet {
  id: string;
  createdAt: string;
  stake: number;
  totalOdds: number;
  potentialWinnings: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  selections?: Array<{
    desc: string;
    odds: number;
    result?: string;
    team?: string;
    selection?: string;
    market?: string;
  }>;
}

export default function BetsTab({ viewUserId }: { viewUserId?: string }) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, won, lost, cancelled
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all
  
  const isAdminViewing = !!viewUserId;

  useEffect(() => {
    fetchBets();
  }, [statusFilter, dateRange, viewUserId]);

  const fetchBets = async () => {
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
        ? buildApiUrl(`/api/admin/users/${viewUserId}/bets?status=${statusFilter}&range=${dateRange}`)
        : buildApiUrl(`/api/mypage/bets?status=${statusFilter}&range=${dateRange}`);

      const res = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setBets(data.bets || []);
      } else {
        console.error('베팅 내역 로드 실패:', res.status);
      }
    } catch (error) {
      console.error('베팅 내역 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      won: { text: '승리', className: 'bg-green-100 text-green-800' },
      lost: { text: '패배', className: 'bg-red-100 text-red-800' },
      pending: { text: '진행중', className: 'bg-yellow-100 text-yellow-800' },
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
      label: '베팅 시간',
      render: (value: string) => (
        <span className="text-xs">
          {new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </span>
      ),
      className: 'w-40'
    },
    {
      key: 'selections',
      label: '경기 정보',
      render: (value: any[], row: Bet) => {
        if (!value || value.length === 0) return '-';
        
        return (
          <div className="space-y-1">
            {value.map((sel, idx) => (
              <div key={idx} className="text-xs">
                <div className="font-medium text-gray-900">{sel.desc}</div>
                <div className="text-gray-600">
                  {sel.team || sel.selection} • {sel.market || '-'} • {Number(sel.odds).toFixed(2)}배
                </div>
              </div>
            ))}
          </div>
        );
      },
      className: 'w-64'
    },
    {
      key: 'stake',
      label: '베팅 금액',
      render: (value: number) => `${Math.floor(value).toLocaleString()} KRW`,
      className: 'w-28'
    },
    {
      key: 'totalOdds',
      label: '총 배당률',
      render: (value: number) => `${Number(value).toFixed(2)}`,
      className: 'w-24'
    },
    {
      key: 'potentialWinnings',
      label: '예상 상금',
      render: (value: number) => `${Math.floor(value).toLocaleString()} KRW`,
      className: 'w-28'
    },
    {
      key: 'status',
      label: '상태',
      render: (value: string) => getStatusBadge(value),
      className: 'w-24'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">베팅 내역</h2>

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
            <option value="pending">진행중</option>
            <option value="won">승리</option>
            <option value="lost">패배</option>
            <option value="cancelled">취소</option>
          </select>
        </div>
      </div>

      <AdminTable
        data={bets}
        columns={columns}
        loading={loading}
        emptyMessage="베팅 내역이 없습니다."
      />
    </div>
  );
}
