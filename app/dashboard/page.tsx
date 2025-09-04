import { Suspense } from "react";
import Box from "@mui/material/Box";
import AcademicSummarySkeleton from "@/components/dashboard/skeletons/academic-summary-skeleton";
import CalendarSkeleton from "@/components/dashboard/skeletons/calendar-skeleton";
import CalendarPanel from "@/components/dashboard/calendar/calendar-panel";
import AcademicSummary from "@/components/dashboard/academic-summary";
import { getEnvRole } from "@/lib/mock-role";

// For now, hard-code a role. Later, replace with a real fetch.
type Role = "student" | "advisor" | "admin";

const RAIL_WIDTH = 88;

export default async function DashboardPage() {
  // TODO: replace with real role lookup
  const user: Role = getEnvRole();

  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
      <RoleView role={user} />
    </Box>
  );
}

function RoleView({ role }: { role: Role }) {
  switch (role) {
    case "student":
      return <StudentDashboard />;
    case "advisor":
      return <AdvisorDashboard />;
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
function AdvisorDashboard() {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "2fr 1fr" }, gap: 2 }}>
      <Suspense fallback={<AcademicSummarySkeleton />}>
        {/* e.g., an advisee list, alerts, etc. */}
        <div>Advisor: Advisee Overview (stub)</div>
      </Suspense>

      <Suspense fallback={<CalendarSkeleton />}>
        <div>Advisor: Appointments (stub)</div>
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
