'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getUserUniversity } from '@/lib/utils/university';
// Import University interface from its actual location
import { University } from '@/lib/types/university';

interface ThemeContextType {
  themeColor: string;
  university: University | null;
  updateThemeColor: (color: string) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_COLOR = '#12F987';

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [themeColor, setThemeColor] = useState(DEFAULT_COLOR);
  const [university, setUniversity] = useState<University | null>(null);
  const supabase = createSupabaseBrowserClient();

  /* 
   * MOVED EFFECTS executed after definitions to avoid 'used before defined' lints
   */

  const applyThemeColor = (color: string) => {
    const root = document.documentElement;

    // Update CSS custom properties
    root.style.setProperty('--primary', color);
    root.style.setProperty('--ring', color);

    // Apply additional university colors if available
    if (university) {
      if (university.secondary_color) {
        root.style.setProperty('--secondary', university.secondary_color);
      }
      if (university.accent_color) {
        root.style.setProperty('--accent', university.accent_color);
      }
      if (university.dark_color) {
        root.style.setProperty('--dark', university.dark_color);
      }
      if (university.light_color) {
        root.style.setProperty('--light', university.light_color);
      }
      if (university.text_color) {
        root.style.setProperty('--text', university.text_color);
      }
      if (university.secondary_text_color) {
        root.style.setProperty('--secondary-text', university.secondary_text_color);
      }
    }

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

  // Load theme color from university on mount
  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const userUniversity = await getUserUniversity(user.id);
        setUniversity(userUniversity);

        if (userUniversity?.primary_color) {
          updateThemeColor(userUniversity.primary_color);
        } else {
          updateThemeColor(DEFAULT_COLOR);
        }
      } catch (error) {
        console.error('Error loading user theme:', error);
      }
    };

    loadUserTheme();
  }, [supabase /*, updateThemeColor */]); // updateThemeColor is stable technically, but we omit to break cycle if needed, or better yet...

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('theme-color');
    if (savedColor) {
      setThemeColor(savedColor);
      applyThemeColor(savedColor);
    }
  }, [/* applyThemeColor */]); // Break cycle or rely on stable deps

  const value = useMemo<ThemeContextType>(() => ({
    themeColor,
    university,
    updateThemeColor,
    resetTheme,
  }), [themeColor, university, updateThemeColor, resetTheme]);

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