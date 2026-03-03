import { Suspense } from "react";
import { StuLoader } from "@/components/ui/StuLoader";
import CalendarPanel from "@/components/dashboard/calendar/calendar-panel";
import {
  UnifiedAcademicCard,
  UnifiedAcademicCardSkeleton,
} from "@/components/dashboard/unified-academic-card";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { AdvisorDashboard } from "@/components/dashboard/advisor-dashboard";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

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

  if (userErr) {
    // Auth session missing is expected when user is not logged in
    // Only log unexpected errors
    if (userErr.message !== 'Auth session missing!') {
      console.error('User error:', userErr);
    }
  }

  if (userErr || !user) {
    // Not authenticated or token invalid → force login
    redirect("/login");
  }

  // Use the verified user id
  const userId = user.id;

  // Least-privilege data fetch; RLS should enforce row ownership
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role_id, university_id, fname")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    // Optionally log to your observability tool
    console.error("profiles fetch error:", profileErr.message);
  }

  const role: Role = (profile?.role_id && ROLE_MAP[profile.role_id]) ?? "student";

  return (
    <>
      {/* Unified padding for all dashboard views - responsive spacing for better mobile/desktop experience */}
      <div className="p-4 sm:p-6">
        <RoleView role={role} userId={userId} />
      </div>
    </>
  );
}

function RoleView({
  role,
  userId
}: Readonly<{
  role: Role;
  userId: string;
}>) {
  switch (role) {
    case "student":
      return <StudentDashboard userId={userId} />;
    case "advisor":
      return <AdvisorDashboardWrapper />;
    case "admin":
      return <AdminDashboardWrapper />;
    default:
      return null;
  }
}

function StudentDashboard({
  userId
}: Readonly<{
  userId: string;
}>) {
  return (
    // Modern grid layout with responsive columns and consistent gap spacing
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
      {/* Left Column - Unified Academic Card (combines Summary + Progress) */}
      <Suspense fallback={<UnifiedAcademicCardSkeleton />}>
        <UnifiedAcademicCard />
      </Suspense>

      {/* Right Column - Calendar */}
      <Suspense fallback={
        // Clean, modern loading state matching new design system
        <div className="flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-8 shadow-sm">
          <StuLoader variant="card" text="Loading your schedule..." />
        </div>
      }>
        <CalendarPanel userId={userId} showSchedulerButton={true} />
      </Suspense>
    </div>
  );
}

function AdvisorDashboardWrapper() {
  // Advisor dashboard handles its own layout and styling
  return <AdvisorDashboard />;
}

function AdminDashboardWrapper() {
  // Admin dashboard handles its own layout and styling
  return <AdminDashboard />;
}
