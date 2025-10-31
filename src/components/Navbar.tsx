import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { LogIn, LogOut, Moon, Sun, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useDarkMode';
import { LoginModal } from './LoginModal';

export interface NavbarRef {
  openLoginModal: () => void;
}

export const Navbar = forwardRef<NavbarRef>((props, ref) => {
  const { isAuthenticated, login, logout } = useAuth();
  const { theme, isDark, cycleTheme } = useTheme();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);

  useEffect(() => {
    if (isAuthenticated && showLoginModal) {
      setShowLoginModal(false);
    }
  }, [isAuthenticated, showLoginModal]);

  const handleLoginSuccess = () => {
    login();
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    logout();
    // Show logout success toast
    setShowLogoutToast(true);
    setTimeout(() => setShowLogoutToast(false), 3000);
  };

  useImperativeHandle(ref, () => ({
    openLoginModal: () => setShowLoginModal(true)
  }));

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={`Current: ${theme} theme`}
        >
          {theme === 'system' ? (
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-blue-600" />
          ) : isDark ? (
            <Sun className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          ) : (
            <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          )}
        </button>

        {/* Login/Logout Button */}
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Logout</span>
          </button>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium transition-colors shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40"
          >
            <LogIn className="w-4 h-4" />
            Login
          </button>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Logout Success Toast */}
      {showLogoutToast && (
        <div className="fixed bottom-6 right-6 z-[10000] animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border bg-green-50 dark:bg-green-950/90 border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="font-medium text-green-900 dark:text-green-100">
              Successfully logged out!
            </p>
            <button
              onClick={() => setShowLogoutToast(false)}
              className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <X className="w-4 h-4 text-green-600 dark:text-green-400" />
            </button>
          </div>
        </div>
      )}
    </>
  );
});

Navbar.displayName = 'Navbar';