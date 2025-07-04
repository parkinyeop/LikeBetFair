import { createContext, useContext, useState, ReactNode } from 'react';

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

  const login = (username: string, balance: number, token: string, isAdmin = false, adminLevel = 0) => {
    setIsLoggedIn(true);
    setUsername(username);
    setBalance(balance);
    setToken(token);
    setIsAdmin(isAdmin);
    setAdminLevel(adminLevel);
  };

  const logout = () => {
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