import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  balance: number | null;
  login: (username: string, balance: number) => void;
  logout: () => void;
  setBalance: (balance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const login = (username: string, balance: number) => {
    setIsLoggedIn(true);
    setUsername(username);
    setBalance(balance);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUsername(null);
    setBalance(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, balance, login, logout, setBalance }}>
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