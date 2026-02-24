'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { usePlanParser } from '@/components/grad-planner/usePlanParser';
import { ProgressOverviewCard } from '@/components/progress-overview/ProgressOverviewCard';
import { buildPlanProgress } from '@/components/progress-overview/planProgressAdapter';
import { buildProgressReportModel, generateProgressPDF } from '@/lib/services/progressReportService';
import { Button } from '@/components/ui/button';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/user';
import type { GraduationPlanRow } from '@/types/grad-plan';
import type { ProgramRow } from '@/types/program';
import type { ParsedCourse } from '@/lib/services/userCoursesService';

interface ProgressReportClientProps {
  user: User;
  userProfile: UserProfile;
  activePlan: GraduationPlanRow | null;
  transcriptCourses: ParsedCourse[];
}

export function ProgressReportClient({
  user,
  userProfile,
  activePlan,
  transcriptCourses,
}: ProgressReportClientProps) {
  const [programsData, setProgramsData] = useState<ProgramRow[]>([]);
  const [genEdProgram, setGenEdProgram] = useState<ProgramRow | null>(null);
  const [expandSignal, setExpandSignal] = useState<{ action: 'expand' | 'collapse'; version: number } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Parse the plan data
  const { planData } = usePlanParser(activePlan || undefined);

  // Build progress data, now with transcript courses for accurate completion detection
  const progressData = useMemo(() => {
    const result = buildPlanProgress({
      terms: planData,
      programs: programsData,
      genEdProgram,
      transcriptCourses, // FIX: Pass transcript courses for accurate course status
    });

    // Guard debug logs - counts only, no PII
    if (process.env.NODE_ENV === 'development') {
      const totalCourses = planData.reduce((n, t) => n + (t.courses?.length ?? 0), 0);
      console.log('[ProgressReport] Plan courses:', totalCourses);
      console.log('[ProgressReport] Transcript courses:', transcriptCourses.length);
      console.log('[ProgressReport] Overall completion %:', result.overallProgress.percentComplete);
      console.log('[ProgressReport] Categories:', result.categories.length);
    }

    return result;
  }, [planData, programsData, genEdProgram, transcriptCourses]);

  // Fetch programs data on mount or when plan/university changes
  useEffect(() => {
    let isActive = true;

    const loadPrograms = async () => {
      const universityId = userProfile?.university_id;
      if (!universityId || !activePlan) {
        setProgramsData([]);
        setGenEdProgram(null);
        return;
      }

      try {
        const programIdsRaw = Array.isArray(activePlan.programs_in_plan)
          ? activePlan.programs_in_plan
          : Array.isArray((activePlan as any).programs)
            ? (activePlan as any).programs.map((program: any) => program.id)
            : [];

        const programIds = programIdsRaw.map((id: any) => String(id)).filter(Boolean);

        if (programIds.length > 0) {
          const programsRes = await fetch(
            `/api/programs/batch?ids=${programIds.join(',')}&universityId=${universityId}`
          );

          if (programsRes.ok) {
            const data = await programsRes.json();

            // Handle both array and object response formats
            let programs: ProgramRow[] | undefined;
            let genEd: ProgramRow | null = null;

            if (Array.isArray(data)) {
              programs = data;
            } else if (data && typeof data === 'object') {
              programs = data.programs;
              genEd = data.genEd || null;
            }

            if (isActive) {
              setProgramsData(programs || []);
              setGenEdProgram(genEd);
            }
          }
        } else {
          setProgramsData([]);
          setGenEdProgram(null);
        }

        // Also fetch gen_ed program if not already fetched
        if (!genEdProgram) {
          const genEdRes = await fetch(`/api/programs?type=gen_ed&universityId=${universityId}`);
          if (genEdRes.ok) {
            const genEdData = await genEdRes.json();
            if (Array.isArray(genEdData) && genEdData.length > 0 && isActive) {
              setGenEdProgram(genEdData[0] as ProgramRow);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load programs for progress report:', error);
      }
    };

    loadPrograms();

    return () => {
      isActive = false;
    };
  }, [userProfile?.university_id, activePlan, genEdProgram]);

  // Handlers for expand/collapse
  const handleExpandAll = useCallback(() => {
    setExpandSignal((prev) => ({
      action: 'expand',
      version: (prev?.version ?? 0) + 1,
    }));
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandSignal((prev) => ({
      action: 'collapse',
      version: (prev?.version ?? 0) + 1,
    }));
  }, []);

  // PDF export handler
  const handleExportPdf = useCallback(async () => {
    if (!activePlan) return;

    setIsExportingPdf(true);
    try {
      const studentName = `${userProfile?.first_name || 'Student'} ${userProfile?.last_name || ''}`.trim();
      const planName = (activePlan as any).plan_name || 'Graduation Plan';

      const reportModel = buildProgressReportModel({
        categories: progressData.categories,
        overallProgress: progressData.overallProgress,
        studentName,
        planName,
      });

      generateProgressPDF(reportModel);

      setSnackbar({
        open: true,
        message: 'Progress report downloaded successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Progress PDF export failed:', error);
      setSnackbar({
        open: true,
        message: 'Failed to export PDF. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsExportingPdf(false);
    }
  }, [activePlan, userProfile, progressData]);

  const planName = (activePlan as any)?.plan_name || 'Graduation Plan';

  // Render UI
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Progress Report
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              {planName} · {userProfile?.first_name} {userProfile?.last_name}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExpandAll} variant="outline" size="sm">
              Expand All
            </Button>
            <Button onClick={handleCollapseAll} variant="outline" size="sm">
              Collapse All
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={isExportingPdf || !activePlan}
              size="sm"
            >
              {isExportingPdf ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-1 gap-4">
          {progressData.categories.length > 0 ? (
            progressData.categories.map((category) => (
              <ProgressOverviewCard
                key={category.id || category.name}
                category={category}
                expandSignal={expandSignal}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">No graduation plan data available</p>
            </div>
          )}
        </div>

        {/* Snackbar */}
        {snackbar.open && (
          <div
            className={`fixed bottom-4 right-4 rounded-lg p-4 text-white flex items-center gap-2 ${
              snackbar.severity === 'success'
                ? 'bg-green-500'
                : 'bg-red-500'
            }`}
          >
            <span>{snackbar.message}</span>
            <button
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              className="ml-2"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
