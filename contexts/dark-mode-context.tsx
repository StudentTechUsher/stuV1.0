'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface DarkModeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const STORAGE_KEY = 'stu-theme-mode';

export function DarkModeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);
  const [systemDark, setSystemDark] = useState(false);

  // Initialize from localStorage and detect system preference
  useEffect(() => {
    setMounted(true);

    // Load saved preference
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setModeState(saved);
    } else {
      setModeState('light');
    }

    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setSystemDark(prefersDark);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const htmlElement = document.documentElement;

    // Don't apply dark mode if landing page has forced light mode
    if (htmlElement.dataset.forceLightLanding === 'true') {
      return;
    }

    const isDark = mode === 'dark' || (mode === 'system' && systemDark);

    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [mode, systemDark, mounted]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  const value = useMemo<DarkModeContextType>(() => ({
    mode,
    isDark,
    setMode,
  }), [mode, isDark]);

  return <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>;
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}
