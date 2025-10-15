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
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

/** A white track with a green-filled pill and label inside the fill */
function ProgressPill({
  value,              // 0..1
  label,
  height = 44,
}: Readonly<{
  value: number;
  label: string;
  height?: number;
}>) {
  const pct = Math.round(value * 100);
  return (
    <Box
      sx={{
        position: "relative",
        height,
        borderRadius: 999,
        bgcolor: "var(--card)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.25)",
      }}
      aria-label={`${pct}%`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          bgcolor: "var(--primary)",
          display: "flex",
          alignItems: "center",
          px: 2,
        }}
      >
        <Typography variant="body2" className="font-body-bold" sx={{ color: "var(--foreground)" }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

/** A filled chip-like box */
function FilledChip({
  children,
  bg = "color-mix(in srgb, var(--primary) 30%, white)",
  color = "var(--dark)",
  height = 40,
}: Readonly<{
  children: React.ReactNode;
  bg?: string;
  color?: string;
  height?: number;
}>) {
  return (
    <Box
      sx={{
        borderRadius: 999,
        bgcolor: bg,
        color,
        height,
        display: "inline-flex",
        alignItems: "center",
        px: 2,
        fontWeight: 600,
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {children}
    </Box>
  );
}

/** Clickable "Optimization" badge */
function OptimizationBadge({ level }: Readonly<{ level: string }>) {
  return (
    <ButtonBase
      focusRipple
      sx={{
        borderRadius: 999,
        px: 2,
        py: 1,
        height: 40,
        bgcolor: "color-mix(in srgb, var(--accent) 25%, white)",
        color: "var(--dark)",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "none",
        textAlign: "left",
      }}
      onClick={() => {/* hook up later */}}
    >
      <Stack lineHeight={1}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          Optimization: {level}
        </Typography>
        <Typography sx={{ fontSize: 11, opacity: 0.75 }}>
          Click here to view optimization suggestions
        </Typography>
      </Stack>
    </ButtonBase>
  );
}

export default function AcademicSummary({
  yearInSchool
}: Readonly<{
  yearInSchool?: string;
}>) {
  const [userData, setUserData] = useState(DEFAULT_DATA);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gradDialogOpen, setGradDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<"April" | "December">("December");
  const [selectedYear, setSelectedYear] = useState(2028);

  useEffect(() => {
    const getUserData = async () => {
      try {
        // Get the current user session
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch profile data for graduation timeline
          const { data: profileData } = await supabase
            .from("profiles")
            .select("fname, lname, est_grad_sem, est_grad_date")
            .eq("id", user.id)
            .single();

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
          if (profileData?.est_grad_date) {
            const date = new Date(profileData.est_grad_date);
            formattedGradDate = date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          }

          setUserData(prev => ({
            ...prev,
            name: displayName,
            standing: yearInSchool || prev.standing,
            estSemester: profileData?.est_grad_sem || prev.estSemester,
            estGradDate: formattedGradDate,
          }));

          setAvatarUrl(profilePicture);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Keep default data if there's an error
      }
    };

    getUserData();
  }, [yearInSchool]);

  // Initialize selected month and year from current estGradDate
  useEffect(() => {
    if (userData.estGradDate) {
      const dateMatch = userData.estGradDate.match(/(April|December) \d+, (\d{4})/);
      if (dateMatch) {
        setSelectedMonth(dateMatch[1] as "April" | "December");
        setSelectedYear(parseInt(dateMatch[2]));
      }
    }
  }, [userData.estGradDate]);

  const handleSaveGradDate = () => {
    const day = selectedMonth === "April" ? 21 : 21; // Both semesters end around the 21st
    const newEstGradDate = `${selectedMonth} ${day}, ${selectedYear}`;
    const newEstSemester = selectedMonth === "April" ? `Spring ${selectedYear}` : `Winter ${selectedYear}`;

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
      elevation={10}
      sx={{
        borderRadius: 3,
        bgcolor: "var(--foreground)",
        color: "var(--background)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.08)",
        height: "fit-content",
        maxHeight: "200vh",
        overflow: "auto"
      }}
    >
      <CardContent sx={{ p: 2, pb: 2 }}>
        {/* Header row */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
          <Avatar 
            src={avatarUrl || undefined}
            sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: avatarUrl ? "transparent" : "rgba(255,255,255,0.12)" 
            }} 
          >
            {!avatarUrl && d.name.charAt(0).toUpperCase()}
          </Avatar>
          <Stack sx={{ flex: 1 }} spacing={0.2}>
            <Stack direction="row" spacing={1.5} alignItems="baseline">
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: "var(--background)" }}
              >
                {d.name}
              </Typography>
              <Typography sx={{ opacity: 0.8 }}>{d.standing}</Typography>
            </Stack>
          </Stack>
          <Typography sx={{ opacity: 0.9, fontWeight: 600 }}>
            {d.requiredCredits} required credit hours
          </Typography>
        </Stack>

        {/* Graduation Progress */}
        <Typography sx={{ mb: 1, fontWeight: 700 }}>
          Graduation Progress
        </Typography>
        <ProgressPill
          value={d.gradProgress}
          label={`${Math.round(d.gradProgress * 100)} % progress toward graduation`}
        />

        {/* Graduation Plan Progress */}
        <Typography sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
          Graduation Plan Progress
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FilledChip>
            Grad plan {Math.round(d.planProgress * 100)} % complete
          </FilledChip>
          <OptimizationBadge level={d.optimization} />
        </Stack>

        {/* Grad Plan Follow Through */}
        <Box sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            Grad Plan Follow Through
          </Typography>
          <Box sx={{ position: 'relative', display: 'inline-block', '&:hover .info-popup': { opacity: 1 } }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'help',
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </Box>
            <Box
              className="info-popup"
              sx={{
                position: 'absolute',
                left: 0,
                top: 28,
                width: 280,
                p: 1.5,
                bgcolor: 'var(--card)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 1.5,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                fontSize: 13,
                color: 'var(--foreground)',
                opacity: 0,
                transition: 'opacity 0.2s',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              See how closely your current and completed classes align with your graduation plan. This section highlights progress, gaps, and any deviations, helping you stay on track toward graduation.
            </Box>
          </Box>
        </Box>
        <Box sx={{ position: 'relative', '&:hover .info-popup': { opacity: 1 } }}>
          <ProgressPill
            value={d.followThrough}
            label={`Grad plan ${Math.round(d.followThrough * 100)}% similar to actual course completion`}
          />
          <Box
            className="info-popup"
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: -100,
              width: 280,
              p: 1.5,
              bgcolor: 'var(--card)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 1.5,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: 13,
              color: 'var(--foreground)',
              opacity: 0,
              transition: 'opacity 0.2s',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            See how closely your current and completed classes align with your graduation plan. This section highlights progress, gaps, and any deviations, helping you stay on track toward graduation.
          </Box>
        </Box>

        {/* Footer stats */}
        <Stack sx={{ mt: 1.5 }} spacing={0.5}>
          <Typography sx={{ fontWeight: 700 }}>
            {d.earnedCredits} credit hours complete
          </Typography>
          <Typography>
            Estimated graduation semester:&nbsp;
            <Box component="span" sx={{ fontWeight: 700 }}>
              {d.estSemester}
            </Box>
          </Typography>
          <Typography>
            Estimated Graduation Date:&nbsp;
            <ButtonBase
              onClick={() => setGradDialogOpen(true)}
              sx={{
                fontWeight: 700,
                textDecoration: "underline",
                cursor: "pointer",
                "&:hover": { opacity: 0.8 },
              }}
            >
              {d.estGradDate}
            </ButtonBase>
          </Typography>
        </Stack>
      </CardContent>

      {/* Edit Graduation Date Dialog */}
      <Dialog
        open={gradDialogOpen}
        onClose={() => setGradDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            bgcolor: "var(--background)",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" className="font-header">
              Edit Estimated Graduation Date
            </Typography>
            <IconButton onClick={() => setGradDialogOpen(false)} size="small">
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'var(--primary)', '&.Mui-focused': { color: 'var(--primary)' } }}>
                Graduation Month
              </InputLabel>
              <Select
                value={selectedMonth}
                label="Graduation Month"
                onChange={(e) => setSelectedMonth(e.target.value as "April" | "December")}
                className="font-body"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--hover-green)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' }
                }}
              >
                <MenuItem value="April" className="font-body">April (Spring Semester)</MenuItem>
                <MenuItem value="December" className="font-body">December (Winter Semester)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel sx={{ color: 'var(--primary)', '&.Mui-focused': { color: 'var(--primary)' } }}>
                Graduation Year
              </InputLabel>
              <Select
                value={selectedYear}
                label="Graduation Year"
                onChange={(e) => setSelectedYear(e.target.value as number)}
                className="font-body"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--hover-green)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' }
                }}
              >
                {yearOptions.map((year) => (
                  <MenuItem key={year} value={year} className="font-body">
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", gap: 1 }}>
            <Button onClick={() => setGradDialogOpen(false)} className="font-body-semi">
              Cancel
            </Button>
            <Button
              onClick={handleSaveGradDate}
              variant="contained"
              className="font-body-semi"
              sx={{
                bgcolor: "var(--primary)",
                color: "var(--muted-foreground)",
                "&:hover": { bgcolor: "var(--hover-green)" },
              }}
            >
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
