'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Box,
} from "@mui/material";
import { Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserCoursesArray, type ParsedCourse } from "@/lib/services/userCoursesService";
import { fetchStudentGpa } from "@/lib/services/studentService";
import { classifyCredits } from "@/lib/classifyCredits";
import { CategoryTabs } from "@/components/progress-overview/CategoryTabs";
import { buildPlanProgress } from "@/components/progress-overview/planProgressAdapter";
import type { ProgressCategory, OverallProgress } from "@/components/progress-overview/types";

import { UnifiedAcademicCardSkeleton } from "./UnifiedAcademicCardSkeleton";
import { UserHeaderBar } from "./UserHeaderBar";
import { SummaryStatsRow } from "./SummaryStatsRow";
import { OverallProgressSection } from "./OverallProgressSection";
import { SuggestedActionsSection } from "./SuggestedActionsSection";
import { PersonalInfoPanel } from "./PersonalInfoPanel";
import type { ProgramRow } from "@/types/program";
import { usePlanParser } from "@/components/grad-planner/usePlanParser";

type GradMonth = "April" | "June" | "August" | "December";

interface UserData {
  name: string;
  avatarUrl: string | null;
  standing: string;
  earnedCredits: number;
  gpa: number | null;
  estimatedGraduation: string;
  hasTranscript: boolean;
  email?: string;
  university?: string;
  universityId?: number;
}

const DEFAULT_USER_DATA: UserData = {
  name: "Loading...",
  avatarUrl: null,
  standing: "Student",
  earnedCredits: 0,
  gpa: null,
  estimatedGraduation: "December 2028",
  hasTranscript: false,
  email: undefined,
  university: undefined,
};

/**
 * Unified Academic Card - combines AcademicSummary and AcademicProgressCard
 * Uses REAL data for: Name, Photo, GPA, Estimated Graduation
 * Encourages plan creation when no grad plan exists (no mocked progress values)
 */
export function UnifiedAcademicCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData>(DEFAULT_USER_DATA);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [gradDialogOpen, setGradDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<GradMonth>("December");
  const [selectedYear, setSelectedYear] = useState(2028);
  const [headerExpanded, setHeaderExpanded] = useState(false);
  const [planDetails, setPlanDetails] = useState<Record<string, unknown> | null>(null);
  const [hasGradPlan, setHasGradPlan] = useState(false);
  const [programsData, setProgramsData] = useState<ProgramRow[]>([]);
  const [genEdProgram, setGenEdProgram] = useState<ProgramRow | null>(null);
  const [transcriptCourses, setTranscriptCourses] = useState<ParsedCourse[]>([]);

  const { planData } = usePlanParser(planDetails ?? undefined);
  const progressData = useMemo(() => {
    return buildPlanProgress({
      terms: planData,
      programs: programsData,
      genEdProgram,
      transcriptCourses,
    });
  }, [planData, programsData, genEdProgram, transcriptCourses]);

  const hasProgressData = progressData.categories.length > 0;
  const resolvedCategories: ProgressCategory[] = progressData.categories;
  const resolvedOverallProgress: OverallProgress = progressData.overallProgress;

  // Consolidated data fetching
  const loadUserData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Parallel fetch for independent data
      const [profileResult, studentResult, coursesResult, gpaResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("fname, lname, university_id, university:university_id(name)")
          .eq("id", user.id)
          .single(),
        supabase
          .from("student")
          .select("id, est_grad_date")
          .eq("profile_id", user.id)
          .maybeSingle(),
        fetchUserCoursesArray(supabase, user.id).catch(() => []),
        fetchStudentGpa(supabase, user.id).catch(() => null),
      ]);

      // Calculate name
      const displayName = profileResult.data?.fname && profileResult.data?.lname
        ? `${profileResult.data.fname} ${profileResult.data.lname}`
        : user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          "Student";

      // Get avatar URL
      const avatarUrl = user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.photo_url ||
        user.user_metadata?.image_url ||
        null;

      // Check transcript data
      const hasTranscript = coursesResult.length > 0;
      setTranscriptCourses(coursesResult);

      // Calculate earned credits from courses
      let earnedCredits = 0;
      if (hasTranscript) {
        earnedCredits = coursesResult.reduce((total, course) => {
          const credits = typeof course.credits === 'number' ? course.credits : 0;
          return total + credits;
        }, 0);
      }

      // Get GPA
      const gpa = gpaResult?.gpa ?? null;

      // Format graduation date
      let estimatedGraduation = DEFAULT_USER_DATA.estimatedGraduation;
      if (studentResult.data?.est_grad_date) {
        const date = new Date(studentResult.data.est_grad_date);
        estimatedGraduation = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }

      // Calculate standing from credits
      const standing = classifyCredits(earnedCredits);

      // Get email from user
      const userEmail = user.email || undefined;

      // Get university name from joined query
      const universityData = profileResult.data?.university as { name?: string } | null;
      const universityName = universityData?.name || undefined;
      const universityId = typeof profileResult.data?.university_id === 'number'
        ? profileResult.data.university_id
        : profileResult.data?.university_id
          ? Number(profileResult.data.university_id)
          : undefined;

      setUserData({
        name: displayName,
        avatarUrl,
        standing,
        earnedCredits,
        gpa,
        estimatedGraduation,
        hasTranscript,
        email: userEmail,
        university: universityName,
        universityId,
      });

      {
        const { data: activePlan } = await supabase
          .from('grad_plan')
          .select('plan_details, programs_in_plan, is_active, created_at')
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        let planRecord = activePlan;
        if (!planRecord) {
          const { data: latestPlan } = await supabase
            .from('grad_plan')
            .select('plan_details, programs_in_plan, is_active, created_at')
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          planRecord = latestPlan;
        }
        setHasGradPlan(Boolean(planRecord));

        if (planRecord?.plan_details && typeof planRecord.plan_details === 'object') {
          setPlanDetails(planRecord.plan_details as Record<string, unknown>);
        } else if (Array.isArray(planRecord?.plan_details)) {
          setPlanDetails({ plan: planRecord.plan_details });
        } else if (typeof planRecord?.plan_details === 'string') {
          try {
            const parsed = JSON.parse(planRecord.plan_details);
            if (parsed && typeof parsed === 'object') {
              setPlanDetails(parsed as Record<string, unknown>);
            }
          } catch {
            setPlanDetails(null);
          }
        } else {
          setPlanDetails(null);
        }

        const programIds = Array.isArray(planRecord?.programs_in_plan)
          ? planRecord.programs_in_plan.map((id) => String(id))
          : [];

        if (programIds.length > 0 && universityId) {
          const programsRes = await fetch(
            `/api/programs/batch?ids=${programIds.join(',')}&universityId=${universityId}`
          );
          if (programsRes.ok) {
            const programsJson = await programsRes.json();
            setProgramsData(Array.isArray(programsJson) ? programsJson : []);
          }
        } else {
          setProgramsData([]);
        }
      }

      if (universityId) {
        const genEdRes = await fetch(`/api/programs?type=gen_ed&universityId=${universityId}`);
        if (genEdRes.ok) {
          const genEdJson = await genEdRes.json();
          if (Array.isArray(genEdJson) && genEdJson.length > 0) {
            setGenEdProgram(genEdJson[0] as ProgramRow);
          }
        } else {
          setGenEdProgram(null);
        }
      } else {
        setGenEdProgram(null);
      }

      // Initialize dialog values from graduation date
      if (studentResult.data?.est_grad_date) {
        const date = new Date(studentResult.data.est_grad_date);
        const month = date.toLocaleString('en-US', { month: 'long' });
        if (['April', 'June', 'August', 'December'].includes(month)) {
          setSelectedMonth(month as GradMonth);
        }
        setSelectedYear(date.getFullYear());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    if (!hasProgressData) return;
    if (!selectedCategory || !resolvedCategories.some((cat) => cat.name === selectedCategory)) {
      setSelectedCategory(resolvedCategories[0].name);
    }
  }, [hasProgressData, resolvedCategories, selectedCategory]);

  // Handle graduation date save
  const handleSaveGradDate = useCallback(() => {
    const semesterMapping: Record<GradMonth, { day: number; semester: string }> = {
      "April": { day: 21, semester: "Winter" },
      "June": { day: 21, semester: "Spring" },
      "August": { day: 21, semester: "Summer" },
      "December": { day: 21, semester: "Fall" },
    };

    const { day } = semesterMapping[selectedMonth];
    const newEstGradDate = `${selectedMonth} ${day}, ${selectedYear}`;

    setUserData(prev => ({
      ...prev,
      estimatedGraduation: newEstGradDate,
    }));

    setGradDialogOpen(false);
  }, [selectedMonth, selectedYear]);

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear + i);

  if (isLoading) {
    return <UnifiedAcademicCardSkeleton />;
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
        {/* Header Bar - REAL data, clickable to expand personal info */}
        <UserHeaderBar
          name={userData.name}
          avatarUrl={userData.avatarUrl}
          standing={userData.standing}
          earnedCredits={userData.earnedCredits}
          hasTranscript={userData.hasTranscript}
          onToggleExpand={() => setHeaderExpanded(!headerExpanded)}
          isExpanded={headerExpanded}
        />

        {/* Personal Info Dropdown Panel - expands from header */}
        <PersonalInfoPanel
          isVisible={headerExpanded}
          standing={userData.standing}
          email={userData.email}
          university={userData.university}
        />

        {/* Content Area */}
        <div className="p-4 space-y-4">
          {hasGradPlan && hasProgressData ? (
            <>
              {/* Overall Progress Bar - Large & Prominent */}
              <OverallProgressSection overallProgress={resolvedOverallProgress} />

              {/* Program progress bars (condensed) */}
              <CategoryTabs
                categories={resolvedCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </>
          ) : hasGradPlan ? (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_16%,transparent)] bg-[color-mix(in_srgb,var(--muted)_28%,transparent)] p-4">
              <p className="font-body-semi text-sm text-[var(--foreground)]">Plan progress is not ready yet</p>
              <p className="mt-1 font-body text-xs text-[var(--muted-foreground)]">
                Open your grad plan and add courses to start tracking Overall Degree Progress.
              </p>
              <Link
                href="/grad-plan"
                className="mt-3 inline-flex items-center gap-1 rounded-md border border-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
              >
                Open grad plan
              </Link>
            </div>
          ) : (
            <Link href="/grad-plan" className="block">
              <div className="rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_24%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] p-4 transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
                      <Plus size={18} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="font-body-semi text-sm text-[var(--foreground)]">Start your grad plan</p>
                      <p className="mt-0.5 font-body text-xs text-[var(--muted-foreground)]">
                        Create a grad plan to unlock Overall Degree Progress.
                      </p>
                    </div>
                  </div>
                  <span className="font-body-semi text-xs text-[var(--primary)]">Create</span>
                </div>
              </div>
            </Link>
          )}

          {/* Suggested actions for student next steps */}
          <SuggestedActionsSection />

          {/* Summary Stats Row - REAL data */}
          <SummaryStatsRow
            gpa={userData.gpa}
            estimatedGraduation={userData.estimatedGraduation}
            onEditGraduation={() => setGradDialogOpen(true)}
            hasTranscript={userData.hasTranscript}
          />
        </div>
      </div>

      {/* Edit Graduation Date Dialog */}
      <Dialog
        open={gradDialogOpen}
        onClose={() => setGradDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              bgcolor: "var(--card)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              maxWidth: '500px',
              width: '100%',
              m: 2
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 4, pb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-header-bold text-xl font-bold text-[var(--foreground)]">
              Edit Graduation Date
            </span>
            <IconButton
              onClick={() => setGradDialogOpen(false)}
              size="small"
              sx={{
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "var(--muted)",
                  transform: "rotate(90deg)"
                }
              }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 4, pt: 2, pb: 0, overflow: 'visible' }}>
          <div className="space-y-4">
            <FormControl fullWidth>
              <InputLabel
                className="font-body-semi"
                sx={{
                  color: 'var(--muted-foreground)',
                  '&.Mui-focused': { color: 'var(--primary)' },
                  fontSize: "0.875rem"
                }}
              >
                Graduation Month
              </InputLabel>
              <Select
                value={selectedMonth}
                label="Graduation Month"
                onChange={(e) => setSelectedMonth(e.target.value as GradMonth)}
                className="font-body"
                sx={{
                  borderRadius: '10px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--border)',
                    transition: 'all 0.2s'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                    borderWidth: '2px'
                  }
                }}
              >
                <MenuItem value="April" className="font-body">April (Winter Semester)</MenuItem>
                <MenuItem value="June" className="font-body">June (Spring Semester)</MenuItem>
                <MenuItem value="August" className="font-body">August (Summer Semester)</MenuItem>
                <MenuItem value="December" className="font-body">December (Fall Semester)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel
                className="font-body-semi"
                sx={{
                  color: 'var(--muted-foreground)',
                  '&.Mui-focused': { color: 'var(--primary)' },
                  fontSize: "0.875rem"
                }}
              >
                Graduation Year
              </InputLabel>
              <Select
                value={selectedYear}
                label="Graduation Year"
                onChange={(e) => setSelectedYear(e.target.value as number)}
                className="font-body"
                sx={{
                  borderRadius: '10px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--border)',
                    transition: 'all 0.2s'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                    borderWidth: '2px'
                  }
                }}
              >
                {yearOptions.map((year) => (
                  <MenuItem key={year} value={year} className="font-body">
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 4, pt: 3, pb: 4, gap: 1.5 }}>
          <Button
            onClick={() => setGradDialogOpen(false)}
            className="font-body-semi"
            sx={{
              px: 3,
              py: 1,
              borderRadius: '10px',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              textTransform: 'none',
              transition: 'all 0.2s',
              "&:hover": {
                bgcolor: "var(--muted)",
                borderColor: 'var(--muted-foreground)'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveGradDate}
            variant="contained"
            className="font-body-semi"
            sx={{
              px: 3,
              py: 1,
              borderRadius: '10px',
              bgcolor: "var(--primary)",
              color: "white",
              textTransform: 'none',
              boxShadow: 'none',
              transition: 'all 0.2s',
              "&:hover": {
                bgcolor: "var(--hover-green)",
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
