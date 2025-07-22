import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  balance: number | null;
  isAdmin: boolean;
  adminLevel: number;
  token: string | null;
  userId: string | null;
  login: (username: string, balance: number, token: string, isAdmin?: boolean, adminLevel?: number, userId?: string) => void;
  logout: () => void;
  setBalance: (balance: number) => void;
  refreshBalance: () => Promise<void>;
  forceRefreshBalance: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLevel, setAdminLevel] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 탭별 고유 식별자 생성
  const [tabId, setTabId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // tabId 생성 함수
  const generateTabId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // AuthContext에서 tabId 초기화 로직
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabId = sessionStorage.getItem('tabId') || generateTabId();
      sessionStorage.setItem('tabId', tabId);
      setTabId(tabId);
      
      // tabId 설정 후 인증 정보 복원
      const initializeAuth = () => {
        try {
          console.log('[AuthContext] tabId 설정됨:', tabId);
          const storedToken = sessionStorage.getItem(`token_${tabId}`);
          const storedUsername = sessionStorage.getItem(`username_${tabId}`);
          const storedBalance = sessionStorage.getItem(`balance_${tabId}`);
          const storedIsAdmin = sessionStorage.getItem(`isAdmin_${tabId}`);
          const storedAdminLevel = sessionStorage.getItem(`adminLevel_${tabId}`);
          const storedUserId = sessionStorage.getItem(`userId_${tabId}`);

          if (storedToken && storedUsername) {
            console.log('[AuthContext] 저장된 인증 정보 복원:', {
              tabId,
              username: storedUsername,
              hasToken: !!storedToken,
              balance: storedBalance
            });
            
            setIsLoggedIn(true);
            setUsername(storedUsername);
            setBalance(storedBalance ? Number(storedBalance) : null);
            setToken(storedToken);
            setIsAdmin(storedIsAdmin === 'true');
            setAdminLevel(storedAdminLevel ? Number(storedAdminLevel) : 0);
            if (storedUserId) setUserId(storedUserId);
            else setUserId(null);
          } else {
            console.log('[AuthContext] 저장된 인증 정보 없음 (tabId:', tabId, ')');
          }
        } catch (error) {
          console.error('[AuthContext] 인증 정보 복원 중 오류:', error);
          // 오류 발생 시 모든 인증 정보 초기화
          setIsLoggedIn(false);
          setUsername(null);
          setBalance(null);
          setToken(null);
          setIsAdmin(false);
          setAdminLevel(0);
          setUserId(null);
        } finally {
          setIsInitialized(true);
        }
      };

      initializeAuth();
    } else {
      // SSR 환경에서는 초기화만 완료
      setIsInitialized(true);
    }
  }, []);

  const login = async (username: string, balance: number, token: string, isAdmin = false, adminLevel = 0, userId?: string) => {
    console.log('[AuthContext] 로그인:', { tabId, username, balance, hasToken: !!token, isAdmin, adminLevel, userId });
    
    if (!tabId) {
      console.error('[AuthContext] tabId가 없습니다.');
      return;
    }

    // sessionStorage에 저장 (탭별 독립)
    sessionStorage.setItem(`token_${tabId}`, token);
    sessionStorage.setItem(`username_${tabId}`, username);
    sessionStorage.setItem(`balance_${tabId}`, balance.toString());
    sessionStorage.setItem(`isAdmin_${tabId}`, isAdmin.toString());
    sessionStorage.setItem(`adminLevel_${tabId}`, adminLevel.toString());
    
    // userId 처리: 직접 받은 userId가 있으면 사용, 없으면 JWT에서 추출
    let finalUserId: string | null = null;
    if (userId) {
      finalUserId = userId;
      console.log('[AuthContext] 서버에서 받은 userId 사용:', userId);
    } else {
      // JWT에서 userId 추출 (fallback)
      try {
        console.log('[AuthContext] JWT 토큰 파싱 시작:', token.substring(0, 50) + '...');
        const payload = JSON.parse(atob(token.split('.')[1]));
        finalUserId = payload.userId || null; // userId로만 추출
        console.log('[AuthContext] JWT payload:', payload);
        console.log('[AuthContext] JWT에서 추출된 userId:', finalUserId);
        console.log('[AuthContext] payload.userId 타입:', typeof payload.userId);
      } catch (e) {
        console.error('[AuthContext] JWT 파싱 오류:', e);
        finalUserId = username; // fallback
      }
    }
    
    setUserId(finalUserId);
    sessionStorage.setItem(`userId_${tabId}`, finalUserId || '');

    // 상태 업데이트
    setIsLoggedIn(true);
    setUsername(username);
    setBalance(balance);
    setToken(token);
    setIsAdmin(isAdmin);
    setAdminLevel(adminLevel);

    // 로그인 후 잔액 새로고침 (서버에서 최신 잔액 가져오기)
    setTimeout(async () => {
      try {
        console.log('[AuthContext] 로그인 후 잔액 새로고침 시작');
        await refreshBalance();
      } catch (error) {
        console.error('[AuthContext] 로그인 후 잔액 새로고침 실패:', error);
        // 실패 시에도 기본 잔액은 유지
        console.log('[AuthContext] 기본 잔액 유지:', balance);
      }
    }, 2000); // 2초 후 실행 (서버 준비 시간 고려)
  };

  const logout = () => {
    console.log('[AuthContext] 로그아웃 (tabId:', tabId, ')');
    
    if (!tabId) {
      console.error('[AuthContext] tabId가 없습니다.');
      return;
    }

    // sessionStorage에서 제거
    sessionStorage.removeItem(`token_${tabId}`);
    sessionStorage.removeItem(`username_${tabId}`);
    sessionStorage.removeItem(`balance_${tabId}`);
    sessionStorage.removeItem(`isAdmin_${tabId}`);
    sessionStorage.removeItem(`adminLevel_${tabId}`);
    sessionStorage.removeItem(`userId_${tabId}`);
    
    // 상태 초기화
    setIsLoggedIn(false);
    setUsername(null);
    setBalance(null);
    setToken(null);
    setIsAdmin(false);
    setAdminLevel(0);
    setUserId(null);
  };

  const refreshBalance = async (): Promise<void> => {
    if (!token || !tabId) {
      console.log('[AuthContext] 토큰 또는 tabId가 없어서 잔액 새로고침 건너뜀');
      return;
    }

    try {
      console.log('[AuthContext] 잔액 새로고침 시작');
      
      // API URL 결정 (apiConfig 사용)
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                     ? 'http://localhost:5050' 
                     : window.location.origin;
      
      console.log('[AuthContext] API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/auth/balance`, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      console.log('[AuthContext] 잔액 조회 응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] 잔액 새로고침 성공:', data.balance);
        const newBalance = Number(data.balance);
        setBalance(newBalance);
        sessionStorage.setItem(`balance_${tabId}`, newBalance.toString());
      } else {
        const errorText = await response.text();
        console.error('[AuthContext] 잔액 새로고침 실패:', response.status, errorText);
        
        // 실패 시 기존 잔액 유지
        console.log('[AuthContext] 기존 잔액 유지');
      }
    } catch (error) {
      console.error('[AuthContext] 잔액 새로고침 오류:', error);
      // 오류 시 기존 잔액 유지
      console.log('[AuthContext] 오류로 인해 기존 잔액 유지');
    }
  };

  // 강제 잔액 동기화 (캐시 무시)
  const forceRefreshBalance = async (): Promise<void> => {
    if (!token || !tabId) {
      console.log('[AuthContext] 토큰 또는 tabId가 없어서 강제 잔액 새로고침 건너뜀');
      return;
    }

    try {
      console.log('[AuthContext] 강제 잔액 새로고침 시작');
      
      // API URL 결정
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                     ? 'http://localhost:5050' 
                     : window.location.origin;
      
      // 캐시 방지를 위한 타임스탬프 추가
      const response = await fetch(`${apiUrl}/api/auth/balance?t=${Date.now()}`, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log('[AuthContext] 강제 잔액 조회 응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] 강제 잔액 새로고침 성공:', data.balance);
        const newBalance = Number(data.balance);
        setBalance(newBalance);
        sessionStorage.setItem(`balance_${tabId}`, newBalance.toString());
      } else {
        const errorText = await response.text();
        console.error('[AuthContext] 강제 잔액 새로고침 실패:', response.status, errorText);
      }
    } catch (error) {
      console.error('[AuthContext] 강제 잔액 새로고침 오류:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!isAdmin) return false;
    
    const ADMIN_PERMISSIONS: Record<number, string[]> = {
      0: [],
      1: ['view_own_referrals'],
      2: ['view_own_referrals', 'view_user_bets', 'manage_commissions'],
      3: ['view_own_referrals', 'view_user_bets', 'manage_commissions', 'create_referral_codes'],
      4: ['view_all_data', 'manage_users', 'system_settings'],
      5: ['*'] // 모든 권한
    };
    
    const permissions = ADMIN_PERMISSIONS[adminLevel] || [];
    return permissions.includes('*') || permissions.includes(permission);
  };

  // 초기화가 완료될 때까지 로딩 표시
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
        <AuthContext.Provider value={{
      isLoggedIn,
      username,
      balance,
      isAdmin,
      adminLevel,
      token,
      userId,
      login,
      logout,
      setBalance,
      refreshBalance,
      forceRefreshBalance,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 