'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserCourses } from "@/lib/services/userCoursesService";
import { fetchStudentGpa } from "@/lib/services/studentService";
import { classifyCredits } from "@/lib/classifyCredits";
import { CategoryTabs } from "@/components/progress-overview/CategoryTabs";
import { ProgressOverviewCard } from "@/components/progress-overview/ProgressOverviewCard";
import { buildPlanProgress } from "@/components/progress-overview/planProgressAdapter";
import type { ProgressCategory, OverallProgress } from "@/components/progress-overview/types";

import { UnifiedAcademicCardSkeleton } from "./UnifiedAcademicCardSkeleton";
import { UserHeaderBar } from "./UserHeaderBar";
import { SummaryStatsRow } from "./SummaryStatsRow";
import { OverallProgressSection } from "./OverallProgressSection";
import { PersonalInfoPanel } from "./PersonalInfoPanel";
import { DASHBOARD_MOCK_CATEGORIES, DUMMY_CREDITS } from "./dashboardMockData";
import type { ProgramRow } from "@/types/program";
import { usePlanParser } from "@/components/grad-planner/usePlanParser";

type GradMonth = "April" | "June" | "August" | "December";

interface UserData {
  name: string;
  avatarUrl: string | null;
  standing: string;
  earnedCredits: number;
  requiredCredits: number;
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
  earnedCredits: DUMMY_CREDITS.earned,
  requiredCredits: DUMMY_CREDITS.required,
  gpa: null,
  estimatedGraduation: "December 2028",
  hasTranscript: false,
  email: undefined,
  university: undefined,
};

/**
 * Unified Academic Card - combines AcademicSummary and AcademicProgressCard
 * Uses REAL data for: Name, Photo, GPA, Estimated Graduation
 * Uses DUMMY data for: Progress metrics, credit breakdowns
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
  const [programsData, setProgramsData] = useState<ProgramRow[]>([]);
  const [genEdProgram, setGenEdProgram] = useState<ProgramRow | null>(null);

  const { planData } = usePlanParser(planDetails ?? undefined);
  const progressData = useMemo(() => {
    return buildPlanProgress({
      terms: planData,
      programs: programsData,
      genEdProgram,
    });
  }, [planData, programsData, genEdProgram]);

  const resolvedCategories: ProgressCategory[] = progressData.categories.length > 0
    ? progressData.categories
    : DASHBOARD_MOCK_CATEGORIES;
  const resolvedOverallProgress: OverallProgress | undefined = progressData.categories.length > 0
    ? progressData.overallProgress
    : undefined;

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
        fetchUserCourses(supabase, user.id).catch(() => null),
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
      const hasTranscript = !!coursesResult && coursesResult.courses.length > 0;

      // Calculate earned credits from courses
      let earnedCredits = DUMMY_CREDITS.earned;
      if (hasTranscript && coursesResult) {
        earnedCredits = coursesResult.courses.reduce((total, course) => {
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
        requiredCredits: DUMMY_CREDITS.required, // Using dummy for now
        gpa,
        estimatedGraduation,
        hasTranscript,
        email: userEmail,
        university: universityName,
        universityId,
      });

      if (studentResult.data?.id) {
        const { data: activePlan } = await supabase
          .from('grad_plan')
          .select('plan_details, programs_in_plan, is_active, created_at')
          .eq('student_id', studentResult.data.id)
          .eq('is_active', true)
          .maybeSingle();

        let planRecord = activePlan;
        if (!planRecord) {
          const { data: latestPlan } = await supabase
            .from('grad_plan')
            .select('plan_details, programs_in_plan, is_active, created_at')
            .eq('student_id', studentResult.data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          planRecord = latestPlan;
        }

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

        // Fetch programs in parallel
        const [programsRes, genEdRes] = await Promise.all([
          programIds.length > 0 && universityId
            ? fetch(`/api/programs/batch?ids=${programIds.join(',')}&universityId=${universityId}`)
            : Promise.resolve(null),
          universityId
            ? fetch(`/api/programs?type=gen_ed&universityId=${universityId}`)
            : Promise.resolve(null),
        ]);

        // Handle programs batch response
        if (programsRes && programsRes.ok) {
          const programsJson = await programsRes.json();
          setProgramsData(Array.isArray(programsJson) ? programsJson : []);
        } else {
          setProgramsData([]);
        }

        // Handle gen_ed response
        if (genEdRes && genEdRes.ok) {
          const genEdJson = await genEdRes.json();
          if (Array.isArray(genEdJson) && genEdJson.length > 0) {
            setGenEdProgram(genEdJson[0] as ProgramRow);
          } else {
            setGenEdProgram(null);
          }
        } else {
          setGenEdProgram(null);
        }
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
    if (!resolvedCategories.length) return;
    if (!selectedCategory || !resolvedCategories.some((cat) => cat.name === selectedCategory)) {
      setSelectedCategory(resolvedCategories[0].name);
    }
  }, [resolvedCategories, selectedCategory]);

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

  // Get current category for display
  const currentCategory = resolvedCategories.find(
    (cat) => cat.name === selectedCategory
  ) || resolvedCategories[0];

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
        <div className="p-5 space-y-5">
          {/* Overall Progress Bar - Large & Prominent - DUMMY data */}
          <OverallProgressSection overallProgress={resolvedOverallProgress} />

          {/* Summary Stats Row - REAL data */}
          <SummaryStatsRow
            gpa={userData.gpa}
            estimatedGraduation={userData.estimatedGraduation}
            onEditGraduation={() => setGradDialogOpen(true)}
            hasTranscript={userData.hasTranscript}
          />

          {/* Category Tabs - DUMMY data */}
          <CategoryTabs
            categories={resolvedCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Progress Overview Card - DUMMY data, compact mode */}
          {currentCategory && (
            <ProgressOverviewCard
              category={currentCategory}
              compact={true}
            />
          )}
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
