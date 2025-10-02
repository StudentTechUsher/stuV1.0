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
  Tooltip,
} from "@mui/material";
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
  bg = "#CFFDE8",
  color = "#0A0A0A",
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

/** Clickable “Optimization” badge */
function OptimizationBadge({ level }: Readonly<{ level: string }>) {
  return (
    <ButtonBase
      focusRipple
      sx={{
        borderRadius: 999,
        px: 2,
        py: 1,
        height: 40,
        bgcolor: "#FFF8B8",
        color: "#0A0A0A",
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

  const d = userData;

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
                sx={{ fontWeight: 800, color: "#FFFFFF" }}
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
        <Tooltip
          title="See how closely your current and completed classes align with your graduation plan. This section highlights progress, gaps, and any deviations, helping you stay on track toward graduation."
          placement="top"
          arrow
        >
          <Typography sx={{ mt: 2, mb: 1, fontWeight: 700, cursor: "help" }}>
            Grad Plan Follow Through
          </Typography>
        </Tooltip>
        <ProgressPill
          value={d.followThrough}
          label={`Grad plan ${Math.round(d.followThrough * 100)}% similar to actual course completion`}
        />

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
            <Box component="span" sx={{ fontWeight: 700 }}>
              {d.estGradDate}
            </Box>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
