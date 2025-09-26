export interface University {
  id: number;
  created_at: string;
  name: string;
  subdomain: string; // e.g. byu, uvu, utahtech
  domain: string; // e.g. byu.edu
  primary_color: string; // hex color
  secondary_color: string; // hex color
  accent_color: string; // hex color
  dark_color: string; // hex color
  light_color: string; // hex color
  text_color: string; // hex color
  secondary_text_color: string; // hex color
  logo_url?: string; // nullable
}

export interface UniversityTheme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  dark_color: string;
  light_color: string;
  text_color: string;
  secondary_text_color: string;
  logo_url?: string;
}

export const DEFAULT_THEME: UniversityTheme = {
  primary_color: '#12F987',
  secondary_color: '#0D8B56',
  accent_color: '#85E5C2',
  dark_color: '#0A1B12',
  light_color: '#F0FFF9',
  text_color: '#1A1A1A',
  secondary_text_color: '#666666',
  logo_url: undefined,
};