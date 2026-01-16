'use client';

import { useEffect, useState, useCallback } from 'react';
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

import { UnifiedAcademicCardSkeleton } from "./UnifiedAcademicCardSkeleton";
import { UserHeaderBar } from "./UserHeaderBar";
import { SummaryStatsRow } from "./SummaryStatsRow";
import { OverallProgressSection } from "./OverallProgressSection";
import { DASHBOARD_MOCK_CATEGORIES, DEFAULT_CATEGORY, DUMMY_CREDITS } from "./dashboardMockData";

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
};

/**
 * Unified Academic Card - combines AcademicSummary and AcademicProgressCard
 * Uses REAL data for: Name, Photo, GPA, Estimated Graduation
 * Uses DUMMY data for: Progress metrics, credit breakdowns
 */
export function UnifiedAcademicCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData>(DEFAULT_USER_DATA);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [gradDialogOpen, setGradDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<GradMonth>("December");
  const [selectedYear, setSelectedYear] = useState(2028);

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
          .select("fname, lname")
          .eq("id", user.id)
          .single(),
        supabase
          .from("student")
          .select("est_grad_date")
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

      setUserData({
        name: displayName,
        avatarUrl,
        standing,
        earnedCredits,
        requiredCredits: DUMMY_CREDITS.required, // Using dummy for now
        gpa,
        estimatedGraduation,
        hasTranscript,
      });

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
  const currentCategory = DASHBOARD_MOCK_CATEGORIES.find(
    cat => cat.name === selectedCategory
  ) || DASHBOARD_MOCK_CATEGORIES[0];

  if (isLoading) {
    return <UnifiedAcademicCardSkeleton />;
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
        {/* Header Bar - REAL data */}
        <UserHeaderBar
          name={userData.name}
          avatarUrl={userData.avatarUrl}
          standing={userData.standing}
          earnedCredits={userData.earnedCredits}
          hasTranscript={userData.hasTranscript}
        />

        {/* Content Area */}
        <div className="p-5 space-y-5">
          {/* Overall Progress Bar - Large & Prominent - DUMMY data */}
          <OverallProgressSection />

          {/* Summary Stats Row - REAL data */}
          <SummaryStatsRow
            gpa={userData.gpa}
            estimatedGraduation={userData.estimatedGraduation}
            onEditGraduation={() => setGradDialogOpen(true)}
            hasTranscript={userData.hasTranscript}
          />

          {/* Category Tabs - DUMMY data */}
          <CategoryTabs
            categories={DASHBOARD_MOCK_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Progress Overview Card - DUMMY data, compact mode */}
          <ProgressOverviewCard
            category={currentCategory}
            compact={true}
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
