'use client';

import type { CourseFulfillment } from '@/lib/services/userCoursesService';

const COLOR_MAP: Record<string, string> = {
  science: 'bg-blue-100 text-blue-800 border-blue-200',
  math: 'bg-purple-100 text-purple-800 border-purple-200',
  writing: 'bg-rose-100 text-rose-800 border-rose-200',
  humanities: 'bg-amber-100 text-amber-900 border-amber-200',
  social: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function getColorClasses(requirementType?: string) {
  if (!requirementType) {
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }
  const key = requirementType.toLowerCase();
  return COLOR_MAP[key] ?? 'bg-gray-100 text-gray-700 border-gray-200';
}

interface RequirementTagProps {
  fulfillment: CourseFulfillment;
  onClick?: () => void;
}

export function RequirementTag({ fulfillment, onClick }: Readonly<RequirementTagProps>) {
  const colorClasses = getColorClasses(fulfillment.requirementType);
  const label = fulfillment.matchType === 'auto' ? 'Auto' : 'Manual';
  const displayText = `${fulfillment.programName} - ${fulfillment.requirementId}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
        onClick ? 'hover:opacity-80' : 'cursor-default'
      } ${colorClasses}`}
    >
      <span>{displayText}</span>
      <span className="text-[10px] uppercase tracking-wide">[{label}]</span>
    </button>
  );
}
