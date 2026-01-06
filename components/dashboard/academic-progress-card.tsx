"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { GetActiveGradPlan } from "@/lib/services/gradPlanService";

type RequirementProgress = {
  label: string;
  percentage: number;
  color: string;
};

interface Course {
  code?: string;
  title?: string;
  credits?: number;
  fulfills?: string[];
  completed?: boolean;
}

interface Term {
  term: string;
  courses?: Course[];
}

// Helper to calculate requirement progress from grad plan courses
function calculateRequirementProgressFromPlan(
  terms: Term[],
  requirementKeyword: string
): number {
  let totalCourses = 0;
  let completedCourses = 0;

  terms.forEach((term) => {
    term.courses?.forEach((course) => {
      // Check if course fulfills this requirement
      const fulfillsRequirement = course.fulfills?.some((req) =>
        req.toLowerCase().includes(requirementKeyword.toLowerCase())
      );

      if (fulfillsRequirement) {
        totalCourses++;
        if (course.completed) {
          completedCourses++;
        }
      }
    });
  });

  // Calculate percentage: (completed / total) * 100, capped at 100%
  // Return 0 if no courses in category
  return totalCourses > 0
    ? Math.min(Math.round((completedCourses / totalCourses) * 100), 100)
    : 0;
}

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
    // Compact progress bar
    <div className="space-y-1">
      {/* Label and percentage row */}
      <div className="flex items-center justify-between">
        <span className="font-body-semi text-xs font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="font-body-semi text-xs font-bold" style={{ color }}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar track */}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_60%,transparent)]">
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
  const [hasGradPlan, setHasGradPlan] = useState(true);
  const [requirements, setRequirements] = useState<RequirementProgress[]>([
    { label: "Major", percentage: 0, color: "var(--primary)" },
    { label: "Minor", percentage: 0, color: "#001F54" },
    { label: "General Education", percentage: 0, color: "#2196f3" },
    { label: "Electives", percentage: 0, color: "#9C27B0" },
  ]);

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Get the user's profile ID
          const { data: profileData } = await supabase
            .from('profile')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (!profileData) {
            setHasGradPlan(false);
            return;
          }

          // Fetch the active grad plan
          const gradPlan = await GetActiveGradPlan(profileData.id);

          if (!gradPlan || !gradPlan.plan_details) {
            setHasGradPlan(false);
            return;
          }

          setHasGradPlan(true);

          // Parse plan_details to get terms
          const terms = Array.isArray(gradPlan.plan_details)
            ? gradPlan.plan_details as Term[]
            : [];

          // Calculate requirement progress based on grad plan courses
          const majorProgress = calculateRequirementProgressFromPlan(terms, 'Major');
          const minorProgress = calculateRequirementProgressFromPlan(terms, 'Minor');
          const geProgress = calculateRequirementProgressFromPlan(terms, 'GE');
          const electivesProgress = calculateRequirementProgressFromPlan(terms, 'Elective');

          setRequirements([
            { label: "Major", percentage: majorProgress, color: "var(--primary)" },
            { label: "Minor", percentage: minorProgress, color: "#001F54" },
            { label: "General Education", percentage: geProgress, color: "#2196f3" },
            { label: "Electives", percentage: electivesProgress, color: "#9C27B0" },
          ]);
        }
      } catch (error) {
        console.error('Error fetching progress data:', error);
        setHasGradPlan(false);
      }
    };

    fetchProgressData();
  }, []);

  const handleGpaCalculatorClick = () => {
    router.push('/gpa-calculator');
  };

  // Calculate average progress for status determination
  const averageProgress = requirements.reduce((sum, req) => sum + req.percentage, 0) / requirements.length;

  return (
    // Compact card with modern design
    <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Bold black header - more compact */}
      <div className="border-b-2 px-4 py-2.5" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
        <h3 className="font-header text-xs font-bold uppercase tracking-wider text-white">
          Academic Progress
        </h3>
      </div>

      <div className="p-3">{hasGradPlan ? (
        <>
        {/* Stats Grid - more compact */}
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {/* GPA Card - compact design */}
          <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)] p-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
            <div className="relative z-10 text-center">
              <div className="font-header-bold text-2xl font-extrabold text-white">
                3.98
              </div>
              <div className="font-body mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                GPA
              </div>
            </div>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 bg-white/5" />
          </div>

          {/* Credits Card - compact */}
          <div className="group overflow-hidden rounded-lg border border-[var(--border)] bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md">
            <div className="text-center">
              <div className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">
                44
              </div>
              <div className="font-body mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Credits Left
              </div>
            </div>
          </div>

          {/* GPA Calculator Card - compact */}
          <button
            type="button"
            onClick={handleGpaCalculatorClick}
            className="group overflow-hidden rounded-lg border-2 border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
            disabled={!hasGradPlan}
          >
            <svg className="mx-auto mb-1 h-5 w-5 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="font-body-semi text-[10px] font-semibold text-[var(--foreground)]">
              GPA Calculator
            </div>
          </button>
        </div>

        {/* Status Indicator - more compact */}
        {(() => {
          const status = getStatusMessage(averageProgress);
          return (
            <div
              className="mb-3 rounded-lg px-3 py-2 text-center font-body-semi text-xs font-semibold"
              style={{ backgroundColor: status.bgColor, color: status.color }}
            >
              {status.text}
            </div>
          );
        })()}

        {/* Progress Bars Section - more compact */}
        <div className="space-y-2">
          <h4 className="font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
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
        <Link href="/grad-plan" style={{ textDecoration: 'none' }}>
          <div className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
              <Upload size={20} color="var(--primary)" />
            </div>
            <h4 className="font-body-semi mb-1 text-sm font-bold text-[var(--foreground)]">
              Create a Graduation Plan
            </h4>
            <p className="font-body text-xs text-[var(--muted-foreground)]">
              Create a graduation plan to track your academic progress
            </p>
          </div>
        </Link>
      )}
      </div>
    </div>
  );
}