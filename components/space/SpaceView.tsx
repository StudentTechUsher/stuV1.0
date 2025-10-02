import { TermCard, TermBlock } from './TermCard';

export interface PlanSpaceView {
  planName: string;
  degree: string;
  gradSemester: string;
  terms: TermBlock[];
}

interface SpaceViewProps {
  plan: PlanSpaceView;
}

export function SpaceView({ plan }: SpaceViewProps) {
  return (
    <div className="space-y-3">
      {/* Top inputs row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Plan Name
          </label>
          <input
            type="text"
            value={plan.planName}
            readOnly
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Degree
          </label>
          <input
            type="text"
            value={plan.degree}
            readOnly
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Graduation Semester
          </label>
          <input
            type="text"
            value={plan.gradSemester}
            readOnly
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
          />
        </div>
      </div>

      {/* Term cards grid */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plan.terms.map((term) => (
          <TermCard key={term.id} term={term} />
        ))}
      </div>

      {/* Bottom legend */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span
          className="inline-block w-2 h-2 rounded-full bg-[var(--primary)]"
          aria-label="Green dot indicator"
        />
        <span>Fulfills both a Major and GE Requirement</span>
      </div>
    </div>
  );
}
