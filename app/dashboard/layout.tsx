// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import DashboardLayoutClient from "@/components/dashboard/dashboard-layout-client";
import { getPendingGradPlansCount } from '@/lib/services/notifService';

// 👇 NEW: read Supabase session in a server component
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Force dynamic rendering for this layout because it uses cookies
export const dynamic = 'force-dynamic';

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

// A serializable icon key the client can turn into an actual icon element
type IconKey =
  | "dashboard"
  | "planner"
  | "map"
  | "semester"
  | "history"
  | "meet"
  | "profile"
  | "advisees"
  | "advisors"
  | "appointments"
  | "reports"
  | "users"
  | "programs"
  | "system";

export type NavItem = {
  href: string;
  segment: string | null;
  label: string;
  icon: IconKey;
  badgeCount?: number; // optional numeric badge (e.g., pending approvals)
};

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  // ---- Supabase server client (reads cookies; no writes in RSC) ----
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

  // 1) Get user securely
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const userId = userError || !user ? null : user.id;

  // 2) Query profiles for role_id (RLS lets users read only their own row)
  let roleId: string | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", userId)
      .maybeSingle();

    roleId = profile?.role_id ?? null;
  }

  // 3) Pick a Role string (you can also fetch role name via FK join)
  const role: Role =
    ROLE_MAP[roleId ?? "3"]; // sensible default to "student" if roleId is null or undefined

  // If advisor, fetch pending approvals count (for badge)
  const pendingCount = role === 'advisor' ? await getPendingGradPlansCount() : 0;

  const items = getNavItems(role, pendingCount);

  return (
    <DashboardLayoutClient
      items={items}
      role={role}
    >
      {children}
    </DashboardLayoutClient>
  );
}

function getNavItems(role: Role, pendingCount = 0): NavItem[] {
  switch (role) {
    case "student":
      return [
        { href: "/dashboard",                    segment: null,                 label: "Overview",             icon: "dashboard" },
        { href: "/dashboard/grad-plan",          segment: "grad-plan",          label: "Graduation Planner",   icon: "planner" },
        { href: "/dashboard/academic-history",   segment: "academic-history",    label: "Academic History",     icon: "history" },
        { href: "/dashboard/semester-scheduler", segment: "semester-scheduler", label: "Schedule Semester",    icon: "semester" },
        { href: "/dashboard/pathfinder",         segment: "pathfinder",         label: "Pathfinder",           icon: "map" },
        { href: "/dashboard/meet-with-advisor",  segment: "calendar",           label: "Meet with Advisor",    icon: "meet" },
        { href: "/dashboard/profile",            segment: "profile",            label: "Profile",              icon: "profile" },
      ];

    case "advisor":
      return [
        { href: "/dashboard",                    segment: null,                 label: "Overview",       icon: "dashboard" },
        { href: "/dashboard/approve-grad-plans", segment: "approve-grad-plans", label: "Approve Plans",  icon: "map", badgeCount: pendingCount },
        { href: "/dashboard/advisees",           segment: "advisees",           label: "My Advisees",    icon: "advisees" },
        { href: "/dashboard/appointments",       segment: "appointments",       label: "Appointments",   icon: "appointments" },
        { href: "/dashboard/reports",            segment: "reports",            label: "Reports",        icon: "reports" },
        { href: "/dashboard/profile",            segment: "profile",            label: "Profile",        icon: "profile" },
      ];

    case "admin":
      return [
        { href: "/dashboard",                       segment: null,                    label: "Overview",               icon: "dashboard" },
        { href: "/dashboard/users",                 segment: "users",                 label: "Maintain Users",         icon: "users" },
        { href: "/dashboard/maintain-programs",     segment: "maintain programs",     label: "Maintain Programs",      icon: "programs" },
        { href: "/dashboard/manage-advisors",       segment: "manage-advisors",       label: "Manage Advisors",        icon: "advisors" },
        { href: "/dashboard/system",                segment: "system",                label: "System",                 icon: "system" },
        { href: "/dashboard/profile",               segment: "profile",               label: "Profile",                icon: "profile" },
      ];
  }
}
