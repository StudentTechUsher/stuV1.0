"use client";

type RequirementProgress = {
  label: string;
  percentage: number;
  color: string;
};

const requirements: RequirementProgress[] = [
  { label: "Major", percentage: 63, color: "var(--primary)" },
  { label: "Minor", percentage: 45, color: "#001F54" },
  { label: "General Education", percentage: 78, color: "#2196f3" },
  { label: "Religion", percentage: 92, color: "#5E35B1" },
  { label: "Electives", percentage: 34, color: "#9C27B0" },
];

function ProgressBar({
  label,
  percentage,
  color
}: RequirementProgress) {
  return (
    // Modern progress bar with cleaner design and better spacing
    <div className="space-y-2">
      {/* Label and percentage row */}
      <div className="flex items-center justify-between">
        <span className="font-body-semi text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="font-body-semi text-sm font-bold" style={{ color }}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar track */}
      <div className="relative h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_60%,transparent)]">
        {/* Filled portion with smooth gradient and animation */}
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${color} 70%, white) 100%)`
          }}
        />
      </div>
    </div>
  );
}

export default function AcademicProgressCard() {
  return (
    // Modern card with clean hierarchy and better spacing
    <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Bold black header matching semester-results-table */}
      <div className="border-b-2 px-6 py-4" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
        <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
          Academic Progress
        </h3>
      </div>

      <div className="p-6">
        {/* Stats Grid - larger, more prominent cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* GPA Card - standout design with gradient */}
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)] p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1">
            <div className="relative z-10 text-center">
              <div className="font-header-bold text-4xl font-extrabold text-white">
                3.98
              </div>
              <div className="font-body mt-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                GPA
              </div>
            </div>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 bg-white/5" />
          </div>

          {/* Credits Card - clean and minimal */}
          <div className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md">
            <div className="text-center">
              <div className="font-header-bold text-4xl font-extrabold text-[var(--foreground)]">
                76
              </div>
              <div className="font-body mt-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Credits Earned
              </div>
            </div>
          </div>

          {/* GPA Calculator Card - interactive CTA */}
          <button
            type="button"
            className="group overflow-hidden rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
          >
            <svg className="mx-auto mb-2 h-8 w-8 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="font-body-semi text-xs font-semibold text-[var(--foreground)]">
              GPA Calculator
            </div>
            <div className="font-body mt-0.5 text-xs text-[var(--muted-foreground)]">
              Predict your GPA
            </div>
          </button>
        </div>

        {/* Progress Bars Section - requirement completion tracking */}
        <div className="space-y-4">
          <h4 className="font-body text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Requirement Progress
          </h4>
          {requirements.map((requirement) => (
            <ProgressBar
              key={requirement.label}
              label={requirement.label}
              percentage={requirement.percentage}
              color={requirement.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}