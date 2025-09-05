import { Suspense } from "react";
import Box from "@mui/material/Box";
import AcademicSummarySkeleton from "@/components/dashboard/skeletons/academic-summary-skeleton";
import CalendarSkeleton from "@/components/dashboard/skeletons/calendar-skeleton";
import CalendarPanel from "@/components/dashboard/calendar/calendar-panel";
import AcademicSummary from "@/components/dashboard/academic-summary";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

type Role = "student" | "advisor" | "admin";

/** Map your role_id UUIDs (or ints) to one of the three Role strings. */
const ROLE_MAP: Record<string, Role> = {
  1 : "admin",
  2 : "advisor",
  3 : "student",
};

export default async function DashboardPage() {
  // Supabase server client (reads HttpOnly cookies set during auth)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* no-op in Server Components */ },
      },
    }
  );

  // Require auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Fetch the user's role_id from profiles; RLS should allow reading only own row
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // In production you might route to an error page or show a fallback
    console.error("profiles fetch error:", error.message);
  }

  // Decide the Role to render
  const role: Role = (profile?.role_id && ROLE_MAP[profile.role_id]) ?? "student";

  return (
    // NOTE: no left margin here — your layout already sets ml: RAIL_WIDTH
    <Box sx={{ p: 2 }}>
      <RoleView role={role} userId={userId} />
    </Box>
  );
}

function RoleView({ role, userId }: Readonly<{ role: Role; userId: string }>) {
  switch (role) {
    case "student":
      return <StudentDashboard userId={userId} />;
    case "advisor":
      return <AdvisorDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return null;
  }
}

/** STUDENT VIEW */
function StudentDashboard({ userId }: Readonly<{ userId: string }>) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
      <Suspense fallback={<AcademicSummarySkeleton />}>
        <AcademicSummary />
      </Suspense>

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarPanel userId={userId} />
      </Suspense>
    </Box>
  );
}

/** ADVISOR VIEW (stub) */
function AdvisorDashboard() {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "2fr 1fr" }, gap: 2 }}>
      <Suspense fallback={<AcademicSummarySkeleton />}>
        <div>Advisor: Advisee Overview (stub)</div>
      </Suspense>
      <Suspense fallback={<CalendarSkeleton />}>
        <div>Advisor: Appointments (stub)</div>
      </Suspense>
    </Box>
  );
}

/** ADMIN VIEW (stub) */
function AdminDashboard() {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr 1fr" }, gap: 2 }}>
      <div>Admin: Metrics (stub)</div>
      <div>Admin: User Management (stub)</div>
      <div>Admin: System Notices (stub)</div>
    </Box>
  );
}
