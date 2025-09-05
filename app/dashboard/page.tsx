import { Suspense } from "react";
import Box from "@mui/material/Box";
import AcademicSummarySkeleton from "@/components/dashboard/skeletons/academic-summary-skeleton";
import CalendarSkeleton from "@/components/dashboard/skeletons/calendar-skeleton";
import CalendarPanel from "@/components/dashboard/calendar/calendar-panel";
import AcademicSummary from "@/components/dashboard/academic-summary";
import AdvisorDailyInsightsSkeleton from "@/components/dashboard/skeletons/advisor-daily-insights-skeleton";
import AdvisorDailyInsights from "./advisor-daily-insights";
import AdvisorTasksToday from "@/components/dashboard/advisor-components/advisor-tasks";
import AdvisorTasksSkeleton from "@/components/dashboard/skeletons/advisor-tasks-skeleton";
import { getCurrentUser } from "@/lib/auth/current-user";

// For now, hard-code a role. Later, replace with a real fetch.
type Role = "student" | "advisor" | "admin";

const RAIL_WIDTH = 88;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  console.log(user);
  const role: Role = user?.role ?? "student";

  const advisorId =
    role === "advisor" ? user?.id ?? "advisor-unknown" : "";

  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
      <RoleView role={role} advisorId={advisorId} />
    </Box>
  );
}

function RoleView({ role, advisorId }: { role: Role; advisorId?: string }) {
  switch (role) {
    case "student":
      return <StudentDashboard />;
    case "advisor":
      return <AdvisorDashboard advisorId={advisorId} />;
    case "admin":
      return <AdminDashboard />;
    default:
      return null;
  }
}

/** STUDENT VIEW (your current UI) */
function StudentDashboard() {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
      <Suspense fallback={<AcademicSummarySkeleton />}>
        <AcademicSummary />
      </Suspense>

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarPanel userId="" />
      </Suspense>
    </Box>
  );
}

/** ADVISOR VIEW (example stub—swap in real components) */
function AdvisorDashboard({ advisorId }: { advisorId?: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "2fr 1fr" }, gap: 2 }}>
      <Suspense fallback={<AdvisorDailyInsightsSkeleton />}>
        <AdvisorDailyInsights advisorId={advisorId ?? ""} />
      </Suspense>

      <Suspense fallback={<AdvisorTasksSkeleton />}>
        <AdvisorTasksToday advisorId={advisorId ?? ""} />
      </Suspense>
    </Box>
  );
}

/** ADMIN VIEW (example stub—swap in real components) */
function AdminDashboard() {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr 1fr" }, gap: 2 }}>
      <div>Admin: Metrics (stub)</div>
      <div>Admin: User Management (stub)</div>
      <div>Admin: System Notices (stub)</div>
    </Box>
  );
}
