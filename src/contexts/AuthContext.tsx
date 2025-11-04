import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  initializeTokenRefresh,
  logout as logoutService,
  getTokens,
  clearRefreshTimer,
  TokenData,
} from '../services/tokenManager';
import { isAuthenticated as checkAuthService } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean; // still boolean (true/false)
  isAuthLoading: boolean;   // NEW - true while restoring
  logout: () => Promise<void>;
  login: () => void;
  tokenData: TokenData | null;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Keep isAuth initial false but expose loading separately
  const [isAuth, setIsAuth] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true); // NEW

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = checkAuthService();
        setIsAuth(authenticated);

        if (authenticated) {
          const tokens = getTokens();
          setTokenData(tokens);

          // initialize refresh (same as before)
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
        } else {
          // Not authenticated: ensure tokenData cleared
          setTokenData(null);
        }
      } catch (err) {
        console.error('Auth check error', err);
        setIsAuth(false);
        setTokenData(null);
      } finally {
        // Mark initialization finished in all cases
        setIsAuthLoading(false);
      }
    };

    checkAuth();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && checkAuthService()) {
        // leave refresh handling to the refresh system
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

    // If login is performed manually, loading finished
    setIsAuthLoading(false);

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
    // after explicit logout we are not loading
    setIsAuthLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isAuth,
        isAuthLoading, // NEW exposed flag
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
