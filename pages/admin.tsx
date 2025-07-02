import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Header from '../components/Header';

interface DashboardData {
  today: {
    bets: number;
    stake: number;
  };
  total: {
    users: number;
    bets: number;
    stake: number;
    activeUsers: number;
  };
  admin: {
    referrals: number;
    commissions: number;
  };
}

export default function AdminDashboard() {
  const { isLoggedIn, isAdmin, adminLevel, username } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    
    if (!isAdmin) {
      alert('관리자 권한이 필요합니다.');
      router.push('/');
      return;
    }

    fetchDashboardData();
  }, [isLoggedIn, isAdmin, router]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('토큰 확인:', token ? '토큰 있음' : '토큰 없음');
      
      if (!token) {
        setError('로그인 토큰이 없습니다. 다시 로그인해주세요.');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5050/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('대시보드 데이터:', data);
        setDashboardData(data);
        setError('');
      } else {
        const errorData = await response.json();
        console.log('에러 응답:', errorData);
        setError(errorData.message || '대시보드 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('네트워크 오류:', err);
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <>
      {/* 전체 페이지 스타일 리셋 */}
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        #__next {
          height: 100vh;
          overflow-x: hidden;
        }
        .admin-page * {
          box-sizing: border-box;
        }
      `}</style>
      
      <div className="admin-page fixed inset-0 bg-gray-100 flex flex-col z-50">
        <Header />
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* 관리자 헤더 */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
                  <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
                  <p className="text-blue-100">
                    안녕하세요, {username}님 (레벨 {adminLevel} 관리자)
                  </p>
                  <div className="mt-2 text-sm text-blue-200">
                    현재 시간: {new Date().toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  ❌ {error}
                  <div className="mt-2 text-sm">
                    <button 
                      onClick={fetchDashboardData} 
                      className="text-red-600 underline hover:text-red-800"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 대시보드 카드들 */}
                  {dashboardData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">오늘 베팅 수</h3>
                        <p className="text-2xl font-bold text-gray-900">{dashboardData.today.bets}</p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">오늘 베팅 금액</h3>
                        <p className="text-2xl font-bold text-gray-900">₩{dashboardData.today.stake.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">전체 사용자</h3>
                        <p className="text-2xl font-bold text-gray-900">{dashboardData.total.users}</p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">활성 사용자</h3>
                        <p className="text-2xl font-bold text-gray-900">{dashboardData.total.activeUsers}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 관리 메뉴 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                
                {/* 사용자 관리 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.121-3.121a4 4 0 010 5.656m-5.656-5.656a4 4 0 015.656 0L12 12l-1.06-1.06a4 4 0 010-5.656m0 0L12 4.354a4 4 0 010 5.292"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">사용자 관리</h3>
                  </div>
                  <p className="text-gray-600 mb-4">사용자 목록 조회, 계정 관리, 잔액 수정</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 사용자 목록 및 검색</div>
                    <div>• 계정 활성화/비활성화</div>
                    <div>• 잔액 수정 및 이력 관리</div>
                    <div>• 사용자 상세 정보 조회</div>
                  </div>
                  <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    사용자 관리하기
                  </button>
                </div>

                {/* 베팅 관리 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">베팅 관리</h3>
                  </div>
                  <p className="text-gray-600 mb-4">베팅 모니터링, 수동 결과 처리, 환불 관리</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 실시간 베팅 모니터링</div>
                    <div>• 수동 베팅 결과 처리</div>
                    <div>• 의심스러운 베팅 감지</div>
                    <div>• 환불 및 취소 처리</div>
                  </div>
                  <button className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors">
                    베팅 관리하기
                  </button>
                </div>

                {/* 추천코드 관리 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">추천코드 관리</h3>
                  </div>
                  <p className="text-gray-600 mb-4">추천코드 생성, 수수료 관리, 실적 조회</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 추천코드 생성 및 관리</div>
                    <div>• 수수료율 설정</div>
                    <div>• 추천 실적 조회</div>
                    <div>• 수수료 지급 관리</div>
                  </div>
                  <button className="mt-4 w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors">
                    추천코드 관리하기
                  </button>
                </div>

                {/* 경기 데이터 관리 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-orange-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">경기 데이터 관리</h3>
                  </div>
                  <p className="text-gray-600 mb-4">경기 입력, 배당율 모니터링, 리그 관리</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 경기 수동 입력/수정</div>
                    <div>• 배당율 모니터링</div>
                    <div>• 리그 활성화 관리</div>
                    <div>• 경기 결과 확인</div>
                  </div>
                  <button className="mt-4 w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 transition-colors">
                    경기 관리하기
                  </button>
                </div>

                {/* 통계 및 리포트 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-red-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">통계 및 리포트</h3>
                  </div>
                  <p className="text-gray-600 mb-4">매출 분석, 사용자 분석, 성과 리포트</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 일/월별 매출 분석</div>
                    <div>• 사용자 행동 분석</div>
                    <div>• 베팅 패턴 분석</div>
                    <div>• 관리자 성과 리포트</div>
                  </div>
                  <button className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors">
                    통계 보기
                  </button>
                </div>

                {/* 시스템 설정 */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">시스템 설정</h3>
                  </div>
                  <p className="text-gray-600 mb-4">전역 설정, 권한 관리, 시스템 모니터링</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>• 전역 설정 관리</div>
                    <div>• 관리자 권한 설정</div>
                    <div>• 시스템 모니터링</div>
                    <div>• 백업 및 복구</div>
                  </div>
                  <button className="mt-4 w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors">
                    시스템 설정
                  </button>
                </div>

              </div>

              {/* 향후 업데이트 예정 기능 */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🚀 향후 업데이트 예정</h2>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 고급 분석 기능</h3>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>• 실시간 대시보드 차트</li>
                        <li>• 수익률 분석 도구</li>
                        <li>• 사용자 세그멘테이션</li>
                        <li>• 예측 분석 모델</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">🤖 자동화 시스템</h3>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>• 자동 베팅 결과 처리</li>
                        <li>• 이상 패턴 감지 알림</li>
                        <li>• 자동 수수료 지급</li>
                        <li>• 스케줄된 리포트 발송</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 UI/UX 개선</h3>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>• 다크 모드 지원</li>
                        <li>• 모바일 최적화</li>
                        <li>• 커스터마이징 가능한 대시보드</li>
                        <li>• 드래그 앤 드롭 인터페이스</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">🔐 보안 강화</h3>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>• 2단계 인증 (2FA)</li>
                        <li>• 감사 로그 시스템</li>
                        <li>• IP 화이트리스트</li>
                        <li>• 세션 관리 개선</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 빠른 작업 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">⚡ 빠른 작업</h3>
                <div className="flex flex-wrap gap-3">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                    새 추천코드 생성
                  </button>
                  <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                    베팅 결과 일괄 처리
                  </button>
                  <button className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors">
                    오늘 리포트 다운로드
                  </button>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
                    시스템 상태 확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 