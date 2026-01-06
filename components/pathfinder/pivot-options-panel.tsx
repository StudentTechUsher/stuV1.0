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

const ICON_MAP: Record<PivotOption['icon'], React.ReactNode> = {
  sparkles: <AutoAwesomeIcon className="text-emerald-600" fontSize="small" />,
  lightbulb: <LightbulbOutlinedIcon className="text-amber-600" fontSize="small" />,
  cap: <SchoolOutlinedIcon className="text-indigo-600" fontSize="small" />,
  compare: <CompareArrowsIcon className="text-emerald-600" fontSize="small" />,
};

interface PivotOptionsPanelProps {
  options: PivotOption[];
  onSelectOption?: (option: PivotOption) => void;
}

export function PivotOptionsPanel({ options, onSelectOption }: Readonly<PivotOptionsPanelProps>) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
      {options.map(opt => (
        <button
          key={opt.id}
            onClick={() => onSelectOption?.(opt)}
          className="relative group text-left rounded-lg border w-94 border-gray-200 bg-white/70 backdrop-blur p-4 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0">{ICON_MAP[opt.icon]}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 flex items-center gap-2">
                {opt.title}
                {opt.comingSoon && (
                  <span className="rounded bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5">Soon</span>
                )}
              </h3>
              <p className="mt-1 text-xs text-gray-600 line-clamp-3">{opt.description}</p>
              <span className="mt-2 inline-flex items-center text-[11px] font-medium text-emerald-700 group-hover:underline">
                {opt.cta} →
              </span>
            </div>
          </div>
        </button>
      ))}
      {options.length === 0 && (
        <div className="text-xs text-gray-500 py-6 text-center border rounded">No options</div>
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
