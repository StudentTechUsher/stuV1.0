"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  ButtonBase,
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
} from "@mui/material";
import { X, Plus, Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { fetchUserCourses } from "@/lib/services/userCoursesService";
import { GetActiveGradPlan } from "@/lib/services/gradPlanService";
import { classifyCredits } from "@/lib/classifyCredits";

/** ----- Default data for the PoC ----- */
const DEFAULT_DATA = {
  name: "Loading...",
  standing: "Junior",
  requiredCredits: 120,
  earnedCredits: 76,
  gradProgress: 0.63,        // 63%
  planProgress: 0.93,        // 93%
  followThrough: 0.70,       // 70%
  estSemester: "Winter 2028",
  estGradDate: "December 21, 2028",
  optimization: "Moderate",
};

export default function AcademicSummary() {
  const [userData, setUserData] = useState(DEFAULT_DATA);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gradDialogOpen, setGradDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<"April" | "June" | "August" | "December">("December");
  const [selectedYear, setSelectedYear] = useState(2028);
  const [hasTranscript, setHasTranscript] = useState(true);
  const [hasActiveGradPlan, setHasActiveGradPlan] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        // Get the current user session
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Check if user has transcript data
          const userCoursesData = await fetchUserCourses(supabase, user.id);
          const hasUserCourses = !!userCoursesData && userCoursesData.courses.length > 0;
          setHasTranscript(hasUserCourses);

          // Check if user has an active grad plan
          const activeGradPlan = await GetActiveGradPlan(user.id);
          const hasGradPlan = !!activeGradPlan;
          setHasActiveGradPlan(hasGradPlan);

          // Calculate earned credits from user courses
          let earnedCredits = DEFAULT_DATA.earnedCredits;
          if (hasUserCourses && userCoursesData) {
            earnedCredits = userCoursesData.courses.reduce((total, course) => {
              const credits = typeof course.credits === 'number' ? course.credits : 0;
              return total + credits;
            }, 0);
          }

          // Calculate required credits from active grad plan programs
          let requiredCredits = DEFAULT_DATA.requiredCredits;
          if (hasGradPlan && activeGradPlan?.programs_in_plan && Array.isArray(activeGradPlan.programs_in_plan)) {
            const { data: programsData } = await supabase
              .from('program')
              .select('target_total_credits')
              .in('id', activeGradPlan.programs_in_plan);

            if (programsData && programsData.length > 0) {
              requiredCredits = programsData.reduce((total, program) => {
                const credits = typeof program.target_total_credits === 'number' ? program.target_total_credits : 0;
                return total + credits;
              }, 0);
            }
          }

          // Fetch profile data for name
          const { data: profileData } = await supabase
            .from("profiles")
            .select("fname, lname")
            .eq("id", user.id)
            .single();

          // Fetch student data for graduation timeline
          const { data: studentData } = await supabase
            .from("student")
            .select("est_grad_plan, est_grad_date")
            .eq("profile_id", user.id)
            .maybeSingle();

          const displayName = profileData?.fname && profileData?.lname
            ? `${profileData.fname} ${profileData.lname}`
            : user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              "Student";

          // Get avatar URL from various possible sources
          const profilePicture = user.user_metadata?.avatar_url ||
                                user.user_metadata?.picture ||
                                user.user_metadata?.photo_url ||
                                user.user_metadata?.image_url ||
                                null;

          // Format graduation date if available
          let formattedGradDate = DEFAULT_DATA.estGradDate;
          if (studentData?.est_grad_date) {
            const date = new Date(studentData.est_grad_date);
            formattedGradDate = date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          }

          // Calculate class year from earned credits using classifyCredits utility
          const classYear = classifyCredits(earnedCredits);

          setUserData(prev => ({
            ...prev,
            name: displayName,
            standing: classYear,
            estSemester: studentData?.est_grad_plan || prev.estSemester,
            estGradDate: formattedGradDate,
            earnedCredits,
            requiredCredits,
          }));

          setAvatarUrl(profilePicture);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Keep default data if there's an error
      }
    };

    getUserData();
  }, []);

  // Initialize selected month and year from current estGradDate
  useEffect(() => {
    if (userData.estGradDate) {
      const dateMatch = userData.estGradDate.match(/(April|June|August|December) \d+, (\d{4})/);
      if (dateMatch) {
        setSelectedMonth(dateMatch[1] as "April" | "June" | "August" | "December");
        setSelectedYear(parseInt(dateMatch[2]));
      }
    }
  }, [userData.estGradDate]);

  const handleSaveGradDate = () => {
    // Map semester end months to approximate graduation dates and semester names
    const semesterMapping: Record<typeof selectedMonth, { day: number; semester: string }> = {
      "April": { day: 21, semester: "Winter" },      // Winter semester ends in April
      "June": { day: 21, semester: "Spring" },       // Spring semester ends in June
      "August": { day: 21, semester: "Summer" },     // Summer semester ends in August
      "December": { day: 21, semester: "Fall" }      // Fall semester ends in December
    };

    const { day, semester } = semesterMapping[selectedMonth];
    const newEstGradDate = `${selectedMonth} ${day}, ${selectedYear}`;
    const newEstSemester = `${semester} ${selectedYear}`;

    setUserData(prev => ({
      ...prev,
      estGradDate: newEstGradDate,
      estSemester: newEstSemester,
    }));

    setGradDialogOpen(false);
  };

  const d = userData;

  // Generate year options (current year to 10 years in the future)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear + i);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '16px',
        bgcolor: "var(--card)",
        border: "1px solid color-mix(in srgb, var(--muted-foreground) 10%, transparent)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        height: "fit-content",
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }
      }}
    >
      {/* Bold black header like semester-results-table */}
      <Box sx={{
        background: "#0A0A0A",
        borderBottom: "2px solid #0A0A0A",
        p: 3
      }}>
        <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 0 }}>
          {/* Larger, more prominent avatar with white border for contrast */}
          <Avatar
            src={avatarUrl || undefined}
            sx={{
              width: 64,
              height: 64,
              border: "3px solid white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              bgcolor: avatarUrl ? "transparent" : "var(--primary)"
            }}
          >
            {!avatarUrl && <span className="font-header-bold text-2xl text-black">{d.name.charAt(0).toUpperCase()}</span>}
          </Avatar>
          <Stack sx={{ flex: 1 }} spacing={0.5}>
            {/* White text on black background for maximum contrast */}
            <Typography
              className="font-header-bold"
              sx={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}
            >
              {d.name}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Bright green badge to pop */}
              <Box sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.5,
                py: 0.5,
                borderRadius: "6px",
                bgcolor: "var(--primary)",
                boxShadow: "0 2px 8px rgba(18, 249, 135, 0.3)"
              }}>
                <Typography className="font-body-semi" sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#0A0A0A" }}>
                  {d.standing}
                </Typography>
              </Box>
              {(hasTranscript || hasActiveGradPlan) ? (
                <Typography className="font-body" sx={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                  {hasTranscript ? d.earnedCredits : "—"} / {hasActiveGradPlan ? d.requiredCredits : "—"} credits
                </Typography>
              ) : (
                <Typography className="font-body" sx={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", fontWeight: 500, fontStyle: "italic" }}>
                  Upload transcript & create plan
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Box>

      <CardContent sx={{ p: 3, pb: 3 }}>
        {/* Main progress section with bold circular progress */}
        <Box sx={{ mb: 3 }}>
          {hasTranscript ? (
            <Stack direction="row" alignItems="center" spacing={3}>
              {/* Large circular progress indicator with bright green and strong shadow */}
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: `conic-gradient(var(--primary) ${d.gradProgress * 360}deg, #e5e7eb 0deg)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    boxShadow: `0 0 0 4px white, 0 4px 12px rgba(18, 249, 135, 0.3)`
                  }}
                >
                  <Box sx={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    bgcolor: "white",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Typography className="font-header-bold" sx={{ fontSize: "2rem", fontWeight: 800, color: "#0A0A0A" }}>
                      {Math.round(d.gradProgress * 100)}%
                    </Typography>
                    <Typography className="font-body" sx={{ fontSize: "0.625rem", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      Complete
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography className="font-body text-xs uppercase tracking-wider" sx={{ color: "var(--muted-foreground)", fontWeight: 700 }}>
                  Graduation Progress
                </Typography>
                <Typography className="font-body" sx={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.5, fontWeight: 500 }}>
                  You&apos;ve completed <Box component="span" sx={{ fontWeight: 800, color: "#0A0A0A" }}>{Math.round(d.gradProgress * 100)}%</Box> of your degree requirements
                </Typography>
              </Stack>
            </Stack>
          ) : (
            <Link href="/academic-history" passHref style={{ textDecoration: 'none' }}>
              <ButtonBase
                sx={{
                  width: "100%",
                  p: 3,
                  borderRadius: "12px",
                  border: "2px dashed color-mix(in srgb, var(--muted-foreground) 25%, transparent)",
                  bgcolor: "color-mix(in srgb, var(--muted) 20%, transparent)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "var(--primary)",
                    bgcolor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    transform: "translateY(-1px)"
                  }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    bgcolor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Upload size={24} color="var(--primary)" />
                  </Box>
                  <Stack spacing={0.5} sx={{ flex: 1, textAlign: "left" }}>
                    <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--foreground)" }}>
                      Graduation Progress
                    </Typography>
                    <Typography className="font-body" sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                      Upload a transcript to view progress
                    </Typography>
                  </Stack>
                </Stack>
              </ButtonBase>
            </Link>
          )}
        </Box>

        {/* Plan Progress Bars - Modern, clean design */}
        {hasActiveGradPlan ? (
          <>
            <Box sx={{ mb: 3, p: 3, borderRadius: "12px", bgcolor: "color-mix(in srgb, var(--muted) 30%, transparent)", border: "1px solid var(--border)" }}>
              <Typography className="font-body text-xs uppercase tracking-wider" sx={{ mb: 2.5, color: "var(--muted-foreground)", fontWeight: 600 }}>
                Plan Progress
              </Typography>

              {/* Plan completion progress */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", color: "var(--foreground)" }}>
                    Graduation Plan
                  </Typography>
                  <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>
                    {Math.round(d.planProgress * 100)}%
                  </Typography>
                </Stack>
                <Box sx={{ height: 8, borderRadius: "999px", bgcolor: "var(--card)", overflow: "hidden" }}>
                  <Box sx={{
                    width: `${Math.round(d.planProgress * 100)}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, var(--primary) 0%, var(--hover-green) 100%)",
                    transition: "width 0.7s ease-out"
                  }} />
                </Box>
              </Box>

              {/* Follow-through progress with info icon */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", color: "var(--foreground)" }}>
                      Plan Follow Through
                    </Typography>
                    <Box sx={{ position: "relative", display: "inline-block", "&:hover .info-popup": { opacity: 1 } }}>
                      <Box sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        bgcolor: "color-mix(in srgb, var(--muted-foreground) 15%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "help"
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                      </Box>
                      <Box className="info-popup" sx={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        bottom: "calc(100% + 8px)",
                        width: 280,
                        p: 2,
                        bgcolor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: 13,
                        color: "var(--foreground)",
                        opacity: 0,
                        transition: "opacity 0.2s",
                        pointerEvents: "none",
                        zIndex: 10
                      }}>
                        See how closely your current and completed classes align with your graduation plan. This section highlights progress, gaps, and any deviations.
                      </Box>
                    </Box>
                  </Stack>
                  <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>
                    {Math.round(d.followThrough * 100)}%
                  </Typography>
                </Stack>
                <Box sx={{ height: 8, borderRadius: "999px", bgcolor: "var(--card)", overflow: "hidden" }}>
                  <Box sx={{
                    width: `${Math.round(d.followThrough * 100)}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, var(--primary) 0%, var(--hover-green) 100%)",
                    transition: "width 0.7s ease-out"
                  }} />
                </Box>
              </Box>
            </Box>

            {/* Optimization Badge - Interactive CTA */}
            <ButtonBase
              onClick={() => {/* hook up later */}}
              sx={{
                width: "100%",
                p: 2.5,
                borderRadius: "12px",
                border: "2px dashed color-mix(in srgb, var(--muted-foreground) 25%, transparent)",
                bgcolor: "color-mix(in srgb, var(--muted) 20%, transparent)",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "var(--primary)",
                  bgcolor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  transform: "translateY(-1px)"
                }
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
                <Box>
                  <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", textAlign: "left" }}>
                    Optimization: {d.optimization}
                  </Typography>
                  <Typography className="font-body" sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)", textAlign: "left", mt: 0.5 }}>
                    Click to view optimization suggestions
                  </Typography>
                </Box>
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  bgcolor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Box>
              </Stack>
            </ButtonBase>
          </>
        ) : (
          <Link href="/grad-plan" passHref style={{ textDecoration: 'none' }}>
            <ButtonBase
              sx={{
                width: "100%",
                p: 2.5,
                borderRadius: "12px",
                border: "2px dashed color-mix(in srgb, var(--muted-foreground) 25%, transparent)",
                bgcolor: "color-mix(in srgb, var(--muted) 20%, transparent)",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "var(--primary)",
                  bgcolor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  transform: "translateY(-1px)"
                }
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    bgcolor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Plus size={20} color="var(--primary)" />
                  </Box>
                  <Box>
                    <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", textAlign: "left" }}>
                      Plan Progress
                    </Typography>
                    <Typography className="font-body" sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)", textAlign: "left", mt: 0.5 }}>
                      Create a grad plan and submit it for approval
                    </Typography>
                  </Box>
                </Stack>
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  bgcolor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Box>
              </Stack>
            </ButtonBase>
          </Link>
        )}

        {/* Footer stats - Modern info cards */}
        <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid var(--border)" }}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography className="font-body" sx={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                Estimated Graduation
              </Typography>
              <ButtonBase
                onClick={() => setGradDialogOpen(true)}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: "8px",
                  bgcolor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    transform: "translateY(-1px)"
                  }
                }}
              >
                <Typography className="font-body-semi" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>
                  {d.estGradDate}
                </Typography>
              </ButtonBase>
            </Stack>
          </Stack>
        </Box>
      </CardContent>

      {/* Modern Edit Graduation Date Dialog */}
      <Dialog
        open={gradDialogOpen}
        onClose={() => setGradDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: "var(--card)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            maxWidth: '500px',
            width: '100%',
            m: 2
          },
        }}
      >
        <DialogTitle sx={{ p: 4, pb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography className="font-header-bold" sx={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)" }}>
              Edit Graduation Date
            </Typography>
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
          <Stack spacing={4}>
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
                onChange={(e) => setSelectedMonth(e.target.value as "April" | "June" | "August" | "December")}
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
          </Stack>
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
    </Card>
  );
}
