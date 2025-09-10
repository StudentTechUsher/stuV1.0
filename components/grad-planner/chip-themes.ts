import type { ChipTheme } from '@/types/graduation-plan';

// allow "12f987" or "#12F987"
export const asHex = (h: string) => (h?.startsWith('#') ? h : `#${h}`);
export const withAlpha = (hex6: string, aa: string) => `${asHex(hex6)}${aa}`;

export const CHIP_THEMES: Record<'default'|'major'|'minor'|'ge'|'elective', ChipTheme> = {
  default : { base: '#E5E7EB', text: '#0A0A0A' },
  major   : { base: '#12F987', text: '#0A0A0A' }, // Major
  minor   : { base: '#02174C', text: '#FFFFFF' }, // Minor (dark base -> white text)
  ge      : { base: '#FF3508', text: '#0A0A0A' }, // Gen Ed
  elective: { base: '#AC11FA', text: '#0A0A0A' }, // Elective
};

export function chipThemeFor(req: string): ChipTheme {
  const r = (req || '').toLowerCase().trim();
  if (
    r.startsWith('major core') ||
    r.startsWith('major req') ||
    r.startsWith('junior core') ||
    r.startsWith('business core') ||
    r.startsWith('major ')
  ) return CHIP_THEMES.major;

  if (r.startsWith('gen ed') || r.includes('global & cultural') || r.includes('american heritage'))
    return CHIP_THEMES.ge;

  if (r.includes('elective')) return CHIP_THEMES.elective;
  if (r.startsWith('minor')) return CHIP_THEMES.minor;
  return CHIP_THEMES.default;
}
