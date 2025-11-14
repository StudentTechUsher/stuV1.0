/**
 * GPA Calculator Client Component
 * Handles data fetching and component orchestration
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@mui/material';
import { StuLoader } from '@/components/ui/StuLoader';
import { CurrentStandingCard } from '@/components/gpa-calculator/CurrentStandingCard';
import { TargetCard } from '@/components/gpa-calculator/TargetCard';
import { DistributionCard } from '@/components/gpa-calculator/DistributionCard';
import { ProjectedGpaCard } from '@/components/gpa-calculator/ProjectedGpaCard';
import { PlanScenarioTable } from '@/components/gpa-calculator/PlanScenarioTable';
import type { GPACalculatorContext } from '@/lib/services/gpaService';
import type { GradeKey } from '@/lib/gpa/gradeScale';

interface DistributionResponse {
  feasible: boolean;
  requiredAvg: number;
  qualityPointsNeeded: number;
  distribution: Record<GradeKey, number>;
  message?: string;
}

export function GPACalculatorContent() {
  const router = useRouter();
  const [context, setContext] = useState<GPACalculatorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null);
  const [targetGpa, setTargetGpa] = useState<number | null>(null);

  // Fetch GPA context on mount
  useEffect(() => {
    async function fetchContext() {
      try {
        const response = await fetch('/api/gpa/context');

        if (response.status === 302) {
          // Redirect to transcript sync
          router.push('/dashboard/academic-history');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch GPA context');
        }

        const data = await response.json();
        setContext(data);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        setContext(null);
      } finally {
        setLoading(false);
      }
    }

    fetchContext();
  }, [router]);

  // Handle goal grade changes - recompute distribution
  const handleGoalGradeChange = useCallback(
    (courseCode: string, grade: GradeKey | null) => {
      setContext((prev) => {
        if (!prev) return null;

        // Update remaining courses with new goal grade
        const updatedRemaining = prev.remaining.map((course) => ({
          ...course,
          goalGrade:
            course.courseCode === courseCode ? grade : course.goalGrade,
        }));

        // Trigger distribution recomputation
        return { ...prev, remaining: updatedRemaining };
      });
    },
    []
  );

  // Handle distribution updates from TargetCard
  const handleDistributionChange = useCallback(
    (newDistribution: DistributionResponse | null) => {
      setDistribution(newDistribution);
    },
    []
  );

  // Handle target GPA changes
  const handleTargetGpaChange = useCallback((gpa: number | null) => {
    setTargetGpa(gpa);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <StuLoader variant="card" text="Loading your GPA calculator..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert severity="error" className="mb-6">
        {error}
      </Alert>
    );
  }

  if (!context) {
    return (
      <Alert severity="warning" className="mb-6">
        Unable to load GPA calculator context. Please try again.
      </Alert>
    );
  }

  const remainingCredits = context.remaining.reduce(
    (sum, course) => sum + course.credits,
    0
  );

  return (
    <div className="space-y-6">
      {/* Current Standing Card */}
      <CurrentStandingCard
        currentGpa={context.currentGpa}
        completedCredits={context.completedCredits}
        completedQualityPoints={context.completedQualityPoints}
        hasTranscript={context.completedCredits > 0}
      />

      {context.completedCredits === 0 ? (
        <Alert severity="info" className="mb-6">
          You don&apos;t have any completed courses with grades yet. Please sync your
          transcript to use the GPA calculator.
        </Alert>
      ) : (
        <>
          {/* Target GPA Card */}
          <TargetCard
            completedCredits={context.completedCredits}
            completedQualityPoints={context.completedQualityPoints}
            remainingCredits={remainingCredits}
            remaining={context.remaining}
            onDistributionChange={handleDistributionChange}
            onTargetGpaChange={handleTargetGpaChange}
          />

          {/* Distribution Card */}
          <DistributionCard
            distribution={distribution?.distribution || null}
            feasible={distribution?.feasible || null}
            isLoading={false}
          />

          {/* Projected Graduation GPA Card */}
          <ProjectedGpaCard
            completedCredits={context.completedCredits}
            completedQualityPoints={context.completedQualityPoints}
            remaining={context.remaining}
            targetGpa={targetGpa}
          />

          {/* Plan Scenario Table */}
          {context.remaining.length > 0 && (
            <PlanScenarioTable
              remaining={context.remaining}
              gradPlanId={context.gradPlanId}
              onGoalGradeChange={handleGoalGradeChange}
            />
          )}
        </>
      )}
    </div>
  );
}
