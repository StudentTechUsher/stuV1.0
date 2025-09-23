'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface ThemeContextType {
  themeColor: string;
  updateThemeColor: (color: string) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_COLOR = '#12F987';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState(DEFAULT_COLOR);
  const supabase = createSupabaseBrowserClient();

  // Load theme color from user profile on mount
  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('theme_color')
          .eq('id', user.id)
          .single();

        if (profile?.theme_color) {
          updateThemeColor(profile.theme_color);
        }
      } catch (error) {
        console.error('Error loading user theme:', error);
      }
    };

    loadUserTheme();
  }, [supabase]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('theme-color');
    if (savedColor) {
      setThemeColor(savedColor);
      applyThemeColor(savedColor);
    }
  }, []);

  const applyThemeColor = (color: string) => {
    const root = document.documentElement;

    // Update CSS custom properties
    root.style.setProperty('--primary', color);
    root.style.setProperty('--ring', color);

    // Calculate lighter and darker variants
    const rgb = hexToRgb(color);
    if (rgb) {
      // Create hover variant (slightly darker)
      const hoverColor = rgbToHex(
        Math.max(0, rgb.r - 20),
        Math.max(0, rgb.g - 20),
        Math.max(0, rgb.b - 20)
      );
      root.style.setProperty('--primary-hover', hoverColor);

      // Create light variant (with opacity)
      root.style.setProperty('--primary-light', `${color}33`);

      // Update border colors
      root.style.setProperty('--primary-border', `${color}4D`);
    }
  };

  const updateThemeColor = (color: string) => {
    setThemeColor(color);
    applyThemeColor(color);
    localStorage.setItem('theme-color', color);
  };

  const resetTheme = () => {
    updateThemeColor(DEFAULT_COLOR);
    localStorage.removeItem('theme-color');
  };

  const value: ThemeContextType = {
    themeColor,
    updateThemeColor,
    resetTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper functions for color manipulation
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}