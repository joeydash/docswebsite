import { useState, useEffect, useCallback } from 'react';

type Theme = 'system' | 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('theme') as Theme;
        return stored || 'system';
      } catch {
        return 'system';
      }
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      const currentTheme = stored || 'system';
      if (stored) {
        if (currentTheme === 'dark') return true;
        if (currentTheme === 'light') return false;
      }
      // System or no preference - check OS
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const updateTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }

    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
      setIsDark(true);
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      // System theme
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setIsDark(systemDark);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const nextTheme: Theme = 
      theme === 'system' ? 'dark' :
      theme === 'dark' ? 'light' : 'system';
    updateTheme(nextTheme);
  }, [theme, updateTheme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        setIsDark(true);
      } else {
        root.classList.remove('dark');
        setIsDark(false);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  // Initialize theme on mount
  useEffect(() => {
    updateTheme(theme);
  }, []); // Only run once on mount

  return {
    theme,
    isDark,
    setTheme: updateTheme,
    cycleTheme
  } as const;
}