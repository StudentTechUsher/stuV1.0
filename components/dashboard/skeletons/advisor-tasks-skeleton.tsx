// components/dashboard/skeletons/advisor-tasks-today-skeleton.tsx
"use client";

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";

export default function AdvisorTasksTodaySkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderWidth: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Tasks for Today
      </Typography>
      <Stack spacing={1.5}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={58} />
        ))}
      </Stack>
    </Paper>
  );
}
