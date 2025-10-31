import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  initializeTokenRefresh,
  logout as logoutService,
  getTokens,
  clearRefreshTimer,
  TokenData,
  isTokenValid,
} from '../services/tokenManager';
import { isAuthenticated } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  login: () => void;
  tokenData: TokenData | null;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

useEffect(() => {
  const checkAuth = () => {
    const authenticated = isAuthenticated();
    setIsAuth(authenticated);
    
    if (authenticated) {
      const tokens = getTokens();
      setTokenData(tokens);
      
      // DON'T check isTokenValid() - always try to refresh
      // Only logout if refresh mutation fails (via the failure callback)
      initializeTokenRefresh(
        (newTokens) => {
          setTokenData(newTokens);
          console.log('✅ Tokens refreshed successfully');
        },
        () => {
          // ONLY logout when refresh mutation actually fails
          console.error('❌ Token refresh failed - logging out');
          handleLogout();
        }
      );
    }
  };

  checkAuth();

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isAuthenticated()) {
      // DON'T check isTokenValid() here either
      // Just let the refresh system handle it
      console.log('User came back online - refresh system will handle tokens');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    clearRefreshTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);

  const handleLogin = () => {
    setIsAuth(true);
    const tokens = getTokens();
    setTokenData(tokens);

    initializeTokenRefresh(
      (newTokens) => {
        setTokenData(newTokens);
        console.log('✅ Tokens refreshed successfully');
      },
      () => {
        console.error('❌ Token refresh failed - logging out');
        handleLogout();
      }
    );
  };

  const handleLogout = async () => {
    await logoutService();
    setIsAuth(false);
    setTokenData(null);
    clearRefreshTimer();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isAuth,
        logout: handleLogout,
        login: handleLogin,
        tokenData,
        userId: tokenData?.user_id || null,
      }}
    >
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
