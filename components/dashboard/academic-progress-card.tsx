"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserCourses } from "@/lib/services/userCoursesService";
import { fetchStudentGpa } from "@/lib/services/studentService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RequirementProgress = {
  label: string;
  percentage: number;
  color: string;
};

const requirements: RequirementProgress[] = [
  { label: "Major", percentage: 63, color: "var(--primary)" },
  { label: "Minor", percentage: 45, color: "#001F54" },
  { label: "General Education", percentage: 78, color: "#2196f3" },
  { label: "Electives", percentage: 34, color: "#9C27B0" },
];

// Calculate average progress for status determination
const averageProgress = requirements.reduce((sum, req) => sum + req.percentage, 0) / requirements.length;

// Determine status message based on progress
function getStatusMessage(avgProgress: number): { text: string; color: string; bgColor: string } {
  if (avgProgress >= 70) {
    return { text: "On track!", color: "#059669", bgColor: "#ECFDF5" }; // green
  } else if (avgProgress >= 50) {
    return { text: "Review your Progress", color: "#D97706", bgColor: "#FEF3C7" }; // amber
  } else {
    return { text: "Contact your Advisor", color: "#DC2626", bgColor: "#FEE2E2" }; // red
  }
}

function ProgressBar({
  label,
  percentage,
  color
}: RequirementProgress) {
  return (
    // Modern progress bar with cleaner design and better spacing
    <div className="space-y-1.5">
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
      <div className="relative h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_60%,transparent)]">
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
  const router = useRouter();
  const [hasTranscript, setHasTranscript] = useState(true);
  const [gpa, setGpa] = useState<number | null>(null);

  useEffect(() => {
    const checkTranscriptAndGpa = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const userCoursesData = await fetchUserCourses(supabase, user.id);
          const hasTranscriptData = !!userCoursesData && userCoursesData.courses.length > 0;
          setHasTranscript(hasTranscriptData);

          // Fetch GPA if transcript exists
          if (hasTranscriptData) {
            try {
              const studentData = await fetchStudentGpa(supabase, user.id);
              setGpa(studentData?.gpa ?? null);
            } catch (error) {
              console.error('Error fetching student GPA:', error);
              setGpa(null);
            }
          }
        }
      } catch (error) {
        console.error('Error checking transcript data:', error);
      }
    };

    checkTranscriptAndGpa();
  }, []);

  const handleGpaCalculatorClick = () => {
    router.push('/gpa-calculator');
  };

  return (
    // Modern card with clean hierarchy and better spacing
    <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Bold header matching semester-results-table */}
      <div className="border-b-2 px-6 py-4 bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100">
        <h3 className="font-header text-sm font-bold uppercase tracking-wider text-zinc-100 dark:text-zinc-900">
          Academic Progress
        </h3>
      </div>

      <div className="p-5">{hasTranscript ? (
        <>
        {/* Stats Grid - larger, more prominent cards */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* GPA Card - standout design with gradient */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)] p-4 shadow-sm transition-transform duration-200 hover:-translate-y-1">
                  <div className="relative z-10 text-center">
                    <div className="font-header-bold text-3xl font-extrabold text-white">
                      {gpa !== null ? gpa.toFixed(2) : "3.98"}
                    </div>
                    <div className="font-body mt-1 text-xs font-semibold uppercase tracking-wider text-white/90">
                      GPA
                    </div>
                  </div>
                  {/* Subtle pattern overlay */}
                  <div className="absolute inset-0 bg-white/5" />
                </div>
              </TooltipTrigger>
              {gpa === null && (
                <TooltipContent>
                  <p>This is a placeholder. Upload your transcript to see your actual GPA.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Credits Card - clean and minimal */}
          <div className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md">
            <div className="text-center">
              <div className="font-header-bold text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                44
              </div>
              <div className="font-body mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Credits Left
              </div>
            </div>
          </div>

          {/* GPA Calculator Card - interactive CTA */}
          <button
            type="button"
            onClick={handleGpaCalculatorClick}
            className="group overflow-hidden rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
            disabled={!hasTranscript}
          >
            <svg className="mx-auto mb-1.5 h-7 w-7 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

        {/* Status Indicator */}
        {(() => {
          const status = getStatusMessage(averageProgress);
          return (
            <div
              className="mb-5 rounded-lg px-4 py-3 text-center font-body-semi text-sm font-semibold"
              style={{ backgroundColor: status.bgColor, color: status.color }}
            >
              {status.text}
            </div>
          );
        })()}

        {/* Progress Bars Section - requirement completion tracking */}
        <div className="space-y-3">
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
        </>
      ) : (
        <Link href="/academic-history" style={{ textDecoration: 'none' }}>
          <div className="flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
              <Upload size={28} color="var(--primary)" />
            </div>
            <h4 className="font-body-semi mb-2 text-base font-bold text-[var(--foreground)]">
              Upload a Transcript
            </h4>
            <p className="font-body text-sm text-[var(--muted-foreground)]">
              Upload your transcript to view detailed academic progress and requirement completion
            </p>
          </div>
        </Link>
      )}
      </div>
    </div>
  );
}