// app/dashboard/loading.tsx
"use client";
import DashboardSkeleton from "@/components/dashboard/skeletons/dashboard-skeleton";
import Box from "@mui/material/Box";

const RAIL_WIDTH = 88;

export default function Loading() {
  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px` }}>
      <DashboardSkeleton />
    </Box>
  );
}
