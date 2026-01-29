"use client";
import * as React from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

interface PivotOption {
  id: string;
  title: string;
  category: 'major-pivot' | 'minor-pivot' | 'minor-audit' | 'compare-majors';
  description: string;
  cta: string;
  icon: 'sparkles' | 'lightbulb' | 'cap' | 'compare';
  comingSoon?: boolean;
}

const ICON_COLORS: Record<PivotOption['icon'], string> = {
  sparkles: 'var(--primary)', // bright green
  lightbulb: '#f59e0b', // amber
  cap: '#003D82', // medium blue (minor color)
  compare: 'var(--primary)', // bright green
};

const ICON_MAP: Record<PivotOption['icon'], React.ReactNode> = {
  sparkles: <AutoAwesomeIcon className="text-[var(--primary)]" fontSize="large" />,
  lightbulb: <LightbulbOutlinedIcon className="text-amber-500" fontSize="large" />,
  cap: <SchoolOutlinedIcon className="text-blue-600" fontSize="large" />,
  compare: <CompareArrowsIcon className="text-[var(--primary)]" fontSize="large" />,
};

interface PivotOptionsPanelProps {
  options: PivotOption[];
  onSelectOption?: (option: PivotOption) => void;
}

export function PivotOptionsPanel({ options, onSelectOption }: Readonly<PivotOptionsPanelProps>) {
  return (
    <div className="w-full grid gap-6 grid-cols-2 auto-rows-max">
      {options.map(opt => {
        const iconColor = ICON_COLORS[opt.icon];
        return (
          <button
            key={opt.id}
            onClick={() => onSelectOption?.(opt)}
            className="relative group text-left rounded-2xl border-2 p-6 shadow-sm hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: `color-mix(in srgb, ${iconColor} 8%, var(--background))`,
              borderColor: `color-mix(in srgb, ${iconColor} 30%, var(--border))`,
              focusColor: iconColor,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="shrink-0 p-3 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${iconColor} 15%, transparent)`,
                }}
              >
                {React.cloneElement(ICON_MAP[opt.icon] as React.ReactElement, {
                  style: { color: iconColor, fontSize: '28px' }
                })}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-[var(--foreground)] flex items-center gap-2 mb-1">
                  {opt.title}
                  {opt.comingSoon && (
                    <span className="rounded bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5">Soon</span>
                  )}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-3 mb-3">{opt.description}</p>
                <span
                  className="inline-flex items-center text-sm font-semibold group-hover:underline transition-colors"
                  style={{ color: iconColor }}
                >
                  {opt.cta} →
                </span>
              </div>
            </div>
          </button>
        );
      })}
      {options.length === 0 && (
        <div className="text-xs text-[var(--muted-foreground)] py-6 text-center border rounded">No options</div>
      )}
    </div>
  );
}

export function useDefaultPivotOptions(): PivotOption[] {
  return React.useMemo(() => ([
    {
      id: 'major-pivot',
      title: 'Major Pivot Exploration',
      category: 'major-pivot',
      description: 'See paths that stretch beyond typical outcomes for your current major—leveraging transferable skills and supplemental learning.',
      cta: 'Explore unconventional paths',
      icon: 'sparkles'
    },
    {
      id: 'minor-pivot',
      title: 'Adjacent Career Exploration',
      category: 'minor-pivot',
      description: 'Discover roles and domains adjacent to your current academic focus that may require minimal additional coursework.',
      cta: 'Find adjacent opportunities',
      icon: 'lightbulb'
    },
    {
      id: 'minor-audit',
      title: 'Near-Completion Minor Audit',
      category: 'minor-audit',
      description: 'Check which minors you might already be close to finishing based on completed coursework and shared requirements.',
      cta: 'Audit potential minors',
      icon: 'cap'
    },
    {
      id: 'compare-majors',
      title: 'Compare Majors',
      category: 'compare-majors',
      description: 'Compare 2-4 majors side-by-side to see completion progress, courses that count, and what\'s still needed.',
      cta: 'Compare majors',
      icon: 'compare'
    }
  ]), []);
}
