'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { University, UniversityTheme, DEFAULT_THEME } from '@/lib/types/university';

interface UniversityThemeContextType {
  university: University | null;
  theme: UniversityTheme;
  updateUniversityTheme: (universityId: number, theme: Partial<UniversityTheme>) => Promise<void>;
  resetToDefault: (universityId: number) => Promise<void>;
  loading: boolean;
}

const UniversityThemeContext = createContext<UniversityThemeContextType | undefined>(undefined);

interface UniversityThemeProviderProps {
  children: ReactNode;
  initialUniversity?: University | null;
}

const DEFAULT_SUBDOMAIN = process.env.NEXT_PUBLIC_DEFAULT_UNIVERSITY_SUBDOMAIN || 'stu';

export function UniversityThemeProvider({ children, initialUniversity }: UniversityThemeProviderProps) {
  const [university, setUniversity] = useState<University | null>(initialUniversity || null);
  const [theme, setTheme] = useState<UniversityTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  // Load university data from middleware headers or fetch by subdomain
  useEffect(() => {
    const loadUniversityData = async () => {
      setLoading(true);

      try {
        // Try to get university from middleware headers first
        const universityHeader = document?.querySelector('meta[name="x-university"]')?.getAttribute('content');

        if (universityHeader) {
          const universityData = JSON.parse(universityHeader);
          setUniversity(universityData);
          applyUniversityTheme(universityData);
        } else {
          // Fallback: parse subdomain and fetch university data
          const host = window.location.host;
          const subdomain = parseSubdomain(host);

          const { data: universityData, error } = await supabase
            .from('university')
            .select('*')
            .eq('subdomain', subdomain)
            .maybeSingle();

          if (error) {
            console.error('Error loading university:', error?.message || error);
            // Use default STU theme
            applyTheme(DEFAULT_THEME);
          } else if (universityData) {
            setUniversity(universityData);
            applyUniversityTheme(universityData);
          } else {
            // No university found, use default
            setUniversity(null);
            applyTheme(DEFAULT_THEME);
          }
        }
      } catch (error) {
        console.error('Error parsing university data:', error);
        applyTheme(DEFAULT_THEME);
      } finally {
        setLoading(false);
      }
    };

    loadUniversityData();
  }, [supabase]);

  const parseSubdomain = (host: string): string => {
    const sanitizedHost = host?.split(':')[0] ?? '';
    const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(sanitizedHost);
    if (isIpAddress) {
      return DEFAULT_SUBDOMAIN;
    }

    const parts = sanitizedHost.split('.').filter(Boolean);

    if (parts.length <= 1) {
      return DEFAULT_SUBDOMAIN;
    }

    if (parts.length === 2) {
      return DEFAULT_SUBDOMAIN;
    }

    const firstPart = parts[0];
    if (firstPart === 'www') {
      return DEFAULT_SUBDOMAIN;
    }

    return firstPart || DEFAULT_SUBDOMAIN;
  };

  const applyUniversityTheme = (universityData: University) => {
    const universityTheme: UniversityTheme = {
      primary_color: universityData.primary_color,
      secondary_color: universityData.secondary_color,
      accent_color: universityData.accent_color,
      dark_color: universityData.dark_color,
      light_color: universityData.light_color,
      text_color: universityData.text_color,
      secondary_text_color: universityData.secondary_text_color,
      logo_url: universityData.logo_url,
    };

    setTheme(universityTheme);
    applyTheme(universityTheme);
  };

  const applyTheme = (themeData: UniversityTheme) => {
    const root = document.documentElement;

    // Map university colors to global CSS variables
    root.style.setProperty('--primary', themeData.primary_color);
    root.style.setProperty('--secondary', themeData.secondary_color);
    root.style.setProperty('--ring', themeData.primary_color);

    // Map university colors to semantic meanings
    root.style.setProperty('--accent', themeData.accent_color);
    root.style.setProperty('--foreground', themeData.text_color);
    root.style.setProperty('--muted-foreground', themeData.secondary_text_color);

    // Use university light/dark colors for cards and backgrounds
    root.style.setProperty('--card', themeData.light_color);
    root.style.setProperty('--card-foreground', themeData.text_color);
    root.style.setProperty('--popover', themeData.light_color);
    root.style.setProperty('--popover-foreground', themeData.text_color);

    // Update muted colors based on university theme
    root.style.setProperty('--muted', themeData.light_color);
    root.style.setProperty('--accent-foreground', themeData.text_color);

    // Calculate border colors based on university theme
    const primaryRgb = hexToRgb(themeData.primary_color);
    const lightRgb = hexToRgb(themeData.light_color);

    if (primaryRgb && lightRgb) {
      // Create border colors that blend with the university theme
      const borderColor = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`;
      root.style.setProperty('--border', borderColor);
      root.style.setProperty('--input', borderColor);

      // Create hover variant (slightly darker)
      const hoverColor = rgbToHex(
        Math.max(0, primaryRgb.r - 20),
        Math.max(0, primaryRgb.g - 20),
        Math.max(0, primaryRgb.b - 20)
      );
      root.style.setProperty('--hover-green', hoverColor);

      // Create transparent variants using university primary color
      root.style.setProperty('--primary-15', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15)`);
      root.style.setProperty('--primary-22', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.22)`);
      root.style.setProperty('--primary-light', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`);
      root.style.setProperty('--primary-border', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`);
    }

    // Keep destructive colors consistent but harmonize with theme
    const destructiveRgb = hexToRgb('#ef4444');
    if (destructiveRgb) {
      root.style.setProperty('--destructive', '#ef4444');
      root.style.setProperty('--destructive-foreground', themeData.light_color);
    }
  };

  const updateUniversityTheme = async (universityId: number, themeUpdates: Partial<UniversityTheme>) => {
    try {
      if (!universityId) {
        throw new Error('University ID is required');
      }

      console.log('Updating university', universityId, 'with colors:', themeUpdates);

      const { error, data } = await supabase
        .from('university')
        .update(themeUpdates)
        .eq('id', universityId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update response:', data);

      // Update local state
      if (university) {
        const updatedUniversity = { ...university, ...themeUpdates };
        setUniversity(updatedUniversity);
        applyUniversityTheme(updatedUniversity);
      }
    } catch (error) {
      console.error('Error updating university theme:', error);
      throw error;
    }
  };

  const resetToDefault = async (universityId: number) => {
    try {
      const resetData = {
        ...DEFAULT_THEME,
        logo_url: undefined
      };

      const { error } = await supabase
        .from('university')
        .update(resetData)
        .eq('id', universityId);

      if (error) throw error;

      // Update local state
      if (university) {
        const updatedUniversity = { ...university, ...resetData, logo_url: undefined };
        setUniversity(updatedUniversity);
        applyUniversityTheme(updatedUniversity);
      }
    } catch (error) {
      console.error('Error resetting university theme:', error);
      throw error;
    }
  };

  const value: UniversityThemeContextType = {
    university,
    theme,
    updateUniversityTheme,
    resetToDefault,
    loading,
  };

  return (
    <UniversityThemeContext.Provider value={value}>
      {children}
    </UniversityThemeContext.Provider>
  );
}

export function useUniversityTheme() {
  const context = useContext(UniversityThemeContext);
  if (context === undefined) {
    throw new Error('useUniversityTheme must be used within a UniversityThemeProvider');
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
