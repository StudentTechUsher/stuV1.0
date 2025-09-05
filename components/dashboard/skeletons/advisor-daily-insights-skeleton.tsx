// components/dashboard/skeletons/advisor-daily-insights-skeleton.tsx
"use client";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";

export default function AdvisorDailyInsightsSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderWidth: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Your Daily Insights
      </Typography>
      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid key={i} size={{ xs: 10, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 140 }}>
              <Skeleton variant="text" width="75%" />
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Skeleton variant="text" width={90} height={70} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
