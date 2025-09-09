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

// Consider replacing with a DB enum/table. Keep for now:
const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* no-op in Server Components */
        },
      },
    }
  );

  // ✅ Trustworthy user (hits Supabase Auth to verify the JWT)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    // Not authenticated or token invalid → force login
    redirect("/login");
  }

  // Use the verified user id
  const userId = user.id;

  // Least-privilege data fetch; RLS should enforce row ownership
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    // Optionally log to your observability tool
    console.error("profiles fetch error:", profileErr.message);
  }

  const role: Role = (profile?.role_id && ROLE_MAP[profile.role_id]) ?? "student";

  return (
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

function AdminDashboard() {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr 1fr" }, gap: 2 }}>
      <div>Admin: Metrics (stub)</div>
      <div>Admin: User Management (stub)</div>
      <div>Admin: System Notices (stub)</div>
    </Box>
  );
}
