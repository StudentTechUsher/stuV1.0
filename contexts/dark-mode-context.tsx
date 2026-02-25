'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { DARK_MODE_STORAGE_KEY } from '@/lib/theme/dark-mode-contract';

type ThemeMode = 'light' | 'dark' | 'system';

interface DarkModeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const pathname = usePathname();

  // Initialize from localStorage and detect system preference
  useEffect(() => {
    setMounted(true);

    // Load saved preference
    const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY) as ThemeMode | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setModeState(saved);
    } else {
      setModeState('system');
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

    const forceLightLanding = htmlElement.dataset.forceLightLanding === 'true';
    if (forceLightLanding) {
      htmlElement.classList.remove('dark');
      return;
    }

    const isDark = mode === 'dark' || (mode === 'system' && systemDark);

    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [mode, systemDark, mounted, pathname]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, newMode);
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
