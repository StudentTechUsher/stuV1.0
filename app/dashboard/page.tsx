// app/dashboard/page.tsx
import { Suspense } from "react";
import Box from "@mui/material/Box";
import AcademicSummarySkeleton from "@/components/dashboard/skeletons/academic-summary-skeleton";
import CalendarSkeleton from "@/components/dashboard/skeletons/calendar-skeleton";
import CalendarPanel from "@/components/dashboard/calendar/calendar-panel";

// Async server components (each does its own data fetch)
const RAIL_WIDTH = 88;

export default async function DashboardPage() {
  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
        <Suspense fallback={<AcademicSummarySkeleton />}>
            <AcademicSummarySkeleton />
        </Suspense>

        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarPanel userId={""} />
        </Suspense>
      </Box>
    </Box>
  );
}
