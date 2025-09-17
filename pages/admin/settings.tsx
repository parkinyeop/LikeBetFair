import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/Header';

interface SystemSettings {
  site_name: string;
  site_description: string;
  maintenance_mode: boolean;
  commission_rate: number;
  auto_settlement_enabled: boolean;
  odds_update_interval: number;
  email_notifications: boolean;
  sms_notifications: boolean;
}

interface BettingAmountSettings {
  sportsbook_min_bet_amount: number;
  sportsbook_max_bet_amount: number;
  exchange_min_bet_amount: number;
  exchange_max_bet_amount: number;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

interface SystemLog {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  source: string;
}

export default function SystemSettings() {
  const { isLoggedIn, isAdmin, adminLevel } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'monitoring' | 'backup'>('general');
  const [loading, setLoading] = useState(true);

  // 숫자 포맷팅 함수
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  // 포맷된 숫자를 숫자로 변환
  const parseFormattedNumber = (str: string): number => {
    return parseInt(str.replace(/,/g, '')) || 0;
  };
  
  // 설정 상태
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: '',
    site_description: '',
    maintenance_mode: false,
    commission_rate: 0.05,
    auto_settlement_enabled: true,
    odds_update_interval: 30,
    email_notifications: true,
    sms_notifications: false
  });

  // 베팅 금액 설정 상태
  const [bettingSettings, setBettingSettings] = useState<BettingAmountSettings>({
    sportsbook_min_bet_amount: 1000,
    sportsbook_max_bet_amount: 1000000,
    exchange_min_bet_amount: 5000,
    exchange_max_bet_amount: 5000000,
  });

  // 관리자 사용자 목록
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    email: '',
    password: ''
  });

  // 시스템 로그
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [logLevel, setLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  // 백업 상태
  const [backupStatus, setBackupStatus] = useState({
    last_backup: null as string | null,
    backup_size: 0,
    is_backing_up: false
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin || adminLevel < 2) {
      alert('시스템 설정 권한이 필요합니다.');
      router.push('/admin');
      return;
    }

    fetchSystemData();
  }, [isLoggedIn, isAdmin, adminLevel, router]);

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [settingsRes, adminsRes, logsRes, backupRes, bettingRes] = await Promise.all([
        fetch('http://localhost:5050/api/admin/settings', { headers }),
        fetch('http://localhost:5050/api/admin/settings/admins', { headers }),
        fetch('http://localhost:5050/api/admin/settings/logs', { headers }),
        fetch('http://localhost:5050/api/admin/settings/backup', { headers }),
        fetch('http://localhost:5050/api/admin/settings/betting-amounts', { headers })
      ]);

      const [settingsData, adminsData, logsData, backupData, bettingData] = await Promise.all([
        settingsRes.json(),
        adminsRes.json(),
        logsRes.json(),
        backupRes.json(),
        bettingRes.json()
      ]);

      setSettings(settingsData.settings || settings);
      setAdminUsers(adminsData.admins || []);
      setSystemLogs(logsData.logs || []);
      setBackupStatus(backupData.status || backupStatus);
      
      if (bettingData.success && bettingData.data) {
        setBettingSettings(bettingData.data);
      }
    } catch (error) {
      console.error('시스템 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      const response = await fetch('http://localhost:5050/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('설정이 성공적으로 저장되었습니다.');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    }
  };

  const handleSaveBettingSettings = async (platform: 'sportsbook' | 'exchange') => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      
      const payload = {
        minBetAmount: bettingSettings[`${platform}_min_bet_amount` as keyof BettingAmountSettings],
        maxBetAmount: bettingSettings[`${platform}_max_bet_amount` as keyof BettingAmountSettings]
      };

      const response = await fetch(`http://localhost:5050/api/admin/settings/betting-amounts/${platform}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        alert(`${platform === 'sportsbook' ? '스포츠북' : '익스체인지'} 베팅 금액 설정이 저장되었습니다.`);
      } else {
        alert(result.error || '설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('베팅 설정 저장 실패:', error);
      alert('베팅 설정 저장에 실패했습니다.');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      const response = await fetch('http://localhost:5050/api/admin/settings/admins', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(newAdmin)
      });

      if (response.ok) {
        setNewAdmin({ username: '', email: '', password: '' });
        fetchSystemData();
        alert('관리자가 성공적으로 추가되었습니다.');
      }
    } catch (error) {
      console.error('관리자 추가 실패:', error);
      alert('관리자 추가에 실패했습니다.');
    }
  };

  const handleToggleAdmin = async (adminId: number, isActive: boolean) => {
    try {
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      const response = await fetch(`http://localhost:5050/api/admin/settings/admins/${adminId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        fetchSystemData();
      }
    } catch (error) {
      console.error('관리자 상태 변경 실패:', error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupStatus(prev => ({ ...prev, is_backing_up: true }));
      
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      const response = await fetch('http://localhost:5050/api/admin/settings/backup', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });

      if (response.ok) {
        alert('백업이 성공적으로 생성되었습니다.');
        fetchSystemData();
      }
    } catch (error) {
      console.error('백업 생성 실패:', error);
      alert('백업 생성에 실패했습니다.');
    } finally {
      setBackupStatus(prev => ({ ...prev, is_backing_up: false }));
    }
  };

  const filteredLogs = systemLogs.filter(log => 
    logLevel === 'all' || log.level === logLevel
  );

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warn': return 'text-yellow-600 bg-yellow-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page fixed inset-0 bg-gray-100 flex flex-col z-50">
      <Header />
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">시스템 설정</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            관리자홈
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'general', label: '전역 설정' },
                { id: 'permissions', label: '관리자 권한' },
                { id: 'monitoring', label: '시스템 모니터링' },
                { id: 'backup', label: '백업 및 복구' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 전역 설정 탭 */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">기본 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 이름</label>
                  <input
                    type="text"
                    value={settings.site_name}
                    onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 설명</label>
                  <input
                    type="text"
                    value={settings.site_description}
                    onChange={(e) => setSettings({...settings, site_description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수수료율 (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.commission_rate * 100}
                    onChange={(e) => setSettings({...settings, commission_rate: parseFloat(e.target.value) / 100})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배당 업데이트 간격 (초)</label>
                  <input
                    type="number"
                    value={settings.odds_update_interval}
                    onChange={(e) => setSettings({...settings, odds_update_interval: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">시스템 옵션</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="maintenance_mode"
                    checked={settings.maintenance_mode}
                    onChange={(e) => setSettings({...settings, maintenance_mode: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="maintenance_mode" className="ml-2 block text-sm text-gray-900">
                    유지보수 모드
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_settlement"
                    checked={settings.auto_settlement_enabled}
                    onChange={(e) => setSettings({...settings, auto_settlement_enabled: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_settlement" className="ml-2 block text-sm text-gray-900">
                    자동 정산 활성화
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="email_notifications"
                    checked={settings.email_notifications}
                    onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="email_notifications" className="ml-2 block text-sm text-gray-900">
                    이메일 알림
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sms_notifications"
                    checked={settings.sms_notifications}
                    onChange={(e) => setSettings({...settings, sms_notifications: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sms_notifications" className="ml-2 block text-sm text-gray-900">
                    SMS 알림
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">베팅 금액 설정</h3>
              <div className="space-y-6">
                {/* 스포츠북 베팅 금액 설정 */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">스포츠북 베팅 금액</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">최소 베팅 금액</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumber(bettingSettings.sportsbook_min_bet_amount)}
                          onChange={(e) => setBettingSettings({
                            ...bettingSettings, 
                            sportsbook_min_bet_amount: parseFormattedNumber(e.target.value)
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-16"
                          placeholder="1,000"
                        />
                        <span className="absolute right-3 top-2 text-sm text-gray-500">KRW</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">최대 베팅 금액</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumber(bettingSettings.sportsbook_max_bet_amount)}
                          onChange={(e) => setBettingSettings({
                            ...bettingSettings, 
                            sportsbook_max_bet_amount: parseFormattedNumber(e.target.value)
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-16"
                          placeholder="1,000,000"
                        />
                        <span className="absolute right-3 top-2 text-sm text-gray-500">KRW</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => handleSaveBettingSettings('sportsbook')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                    >
                      스포츠북 설정 저장
                    </button>
                  </div>
                </div>

                {/* 익스체인지 베팅 금액 설정 */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">익스체인지 베팅 금액</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">최소 베팅 금액</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumber(bettingSettings.exchange_min_bet_amount)}
                          onChange={(e) => setBettingSettings({
                            ...bettingSettings, 
                            exchange_min_bet_amount: parseFormattedNumber(e.target.value)
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-16"
                          placeholder="5,000"
                        />
                        <span className="absolute right-3 top-2 text-sm text-gray-500">KRW</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">최대 베팅 금액</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumber(bettingSettings.exchange_max_bet_amount)}
                          onChange={(e) => setBettingSettings({
                            ...bettingSettings, 
                            exchange_max_bet_amount: parseFormattedNumber(e.target.value)
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-16"
                          placeholder="5,000,000"
                        />
                        <span className="absolute right-3 top-2 text-sm text-gray-500">KRW</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => handleSaveBettingSettings('exchange')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                    >
                      익스체인지 설정 저장
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                설정 저장
              </button>
            </div>
          </div>
        )}

        {/* 관리자 권한 탭 */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">관리자 추가</h3>
              <form onSubmit={handleAddAdmin}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">사용자명</label>
                    <input
                      type="text"
                      value={newAdmin.username}
                      onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                    <input
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                  >
                    관리자 추가
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">관리자 목록</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자명</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 로그인</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminUsers.map((admin) => (
                      <tr key={admin.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {admin.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {admin.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            admin.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString('ko-KR') : '없음'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleToggleAdmin(admin.id, admin.isActive)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              admin.isActive
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {admin.isActive ? '비활성화' : '활성화'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 시스템 모니터링 탭 */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">시스템 로그</h3>
              <div className="mb-4">
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">전체</option>
                  <option value="info">정보</option>
                  <option value="warn">경고</option>
                  <option value="error">오류</option>
                </select>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">레벨</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소스</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">메시지</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.source}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 백업 및 복구 탭 */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">백업 상태</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">마지막 백업</p>
                  <p className="text-lg text-gray-900">
                    {backupStatus.last_backup 
                      ? new Date(backupStatus.last_backup).toLocaleString('ko-KR')
                      : '없음'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">백업 크기</p>
                  <p className="text-lg text-gray-900">
                    {backupStatus.backup_size > 0 
                      ? `${(backupStatus.backup_size / 1024 / 1024).toFixed(2)} MB`
                      : '0 MB'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">상태</p>
                  <p className="text-lg text-gray-900">
                    {backupStatus.is_backing_up ? '백업 중...' : '대기 중'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">백업 관리</h3>
              <div className="space-y-4">
                <button
                  onClick={handleCreateBackup}
                  disabled={backupStatus.is_backing_up}
                  className={`px-6 py-2 rounded text-white font-medium ${
                    backupStatus.is_backing_up
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {backupStatus.is_backing_up ? '백업 생성 중...' : '새 백업 생성'}
                </button>
                
                <div className="text-sm text-gray-600">
                  <p>• 백업은 매일 자동으로 생성됩니다.</p>
                  <p>• 수동 백업은 즉시 생성됩니다.</p>
                  <p>• 백업 파일은 30일간 보관됩니다.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
