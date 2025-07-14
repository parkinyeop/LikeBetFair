import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  balance: number | null;
  isAdmin: boolean;
  adminLevel: number;
  token: string | null;
  login: (username: string, balance: number, token: string, isAdmin?: boolean, adminLevel?: number) => void;
  logout: () => void;
  setBalance: (balance: number) => void;
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

  // 페이지 로드 시 localStorage에서 인증 정보 복원
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');
        const storedBalance = localStorage.getItem('balance');
        const storedIsAdmin = localStorage.getItem('isAdmin');
        const storedAdminLevel = localStorage.getItem('adminLevel');

        if (storedToken && storedUsername) {
          console.log('[AuthContext] 저장된 인증 정보 복원:', {
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
        } else {
          console.log('[AuthContext] 저장된 인증 정보 없음');
        }
      } catch (error) {
        console.error('[AuthContext] 인증 정보 복원 중 오류:', error);
        // 오류 발생 시 모든 인증 정보 초기화
        logout();
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = (username: string, balance: number, token: string, isAdmin = false, adminLevel = 0) => {
    console.log('[AuthContext] 로그인:', { username, balance, hasToken: !!token, isAdmin, adminLevel });
    
    // localStorage에 저장
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('balance', balance.toString());
    localStorage.setItem('isAdmin', isAdmin.toString());
    localStorage.setItem('adminLevel', adminLevel.toString());
    
    // 상태 업데이트
    setIsLoggedIn(true);
    setUsername(username);
    setBalance(balance);
    setToken(token);
    setIsAdmin(isAdmin);
    setAdminLevel(adminLevel);
  };

  const logout = () => {
    console.log('[AuthContext] 로그아웃');
    
    // localStorage에서 제거
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('balance');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminLevel');
    
    // 상태 초기화
    setIsLoggedIn(false);
    setUsername(null);
    setBalance(null);
    setToken(null);
    setIsAdmin(false);
    setAdminLevel(0);
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
      login, 
      logout, 
      setBalance,
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