// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import DashboardLayoutClient from "@/components/dashboard/dashboard-layout-client";
import { getPendingGradPlansCount, getUnreadNotificationsCount } from '@/lib/services/notifService';

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
  | "inbox"
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
  | "system"
  | "forecast"
  | "careers"
  | "programFlow";

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

  // 2) Query profiles for role_id and onboarded status (RLS lets users read only their own row)
  let roleId: string | null = null;
  let onboarded = true; // Default to true (onboarded) to prevent blocking existing users
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id, onboarded")
      .eq("id", userId)
      .maybeSingle();

    // Convert role_id to string for consistent lookup in ROLE_MAP
    roleId = profile?.role_id ? String(profile.role_id) : null;
    // Only set onboarded to false if explicitly false in the database
    onboarded = profile?.onboarded !== false;
  }

  // 3) Pick a Role string (you can also fetch role name via FK join)
  const role: Role =
    ROLE_MAP[roleId ?? "3"]; // sensible default to "student" if roleId is null or undefined

  // If user hasn't been onboarded yet (waiting for admin approval), show pending message
  if (!onboarded && user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
          <h1 className="text-2xl font-header mb-4">Account Pending Approval</h1>
          <p className="text-muted-foreground font-body mb-4">
            Thank you for registering! Your account is currently pending approval by an administrator.
          </p>
          <p className="text-muted-foreground font-body">
            You will receive access to the dashboard once your account has been approved. Please check back later or contact your institution&apos;s administrator if you have questions.
          </p>
        </div>
      </div>
    );
  }

  // If advisor, fetch pending approvals count (for badge)
  const pendingCount = role === 'advisor' ? await getPendingGradPlansCount() : 0;

  // Unread inbox notifications badge for all authenticated roles
  const unreadInboxCount = userId ? await getUnreadNotificationsCount(userId) : 0;

  const items = getNavItems(role, pendingCount, unreadInboxCount);

  return (
    <DashboardLayoutClient
      items={items}
      role={role}
    >
      {children}
    </DashboardLayoutClient>
  );
}

function getNavItems(role: Role, pendingCount = 0, unreadInboxCount = 0): NavItem[] {
  const inboxBadge = unreadInboxCount > 0 ? unreadInboxCount : undefined;
  switch (role) {
    case "student":
      return [
        { href: "/dashboard",                    segment: null,                 label: "Overview",             icon: "dashboard" },
  { href: "/dashboard/inbox",              segment: "inbox",              label: "Inbox",                icon: "inbox", badgeCount: inboxBadge },
        { href: "/dashboard/grad-plan",          segment: "grad-plan",          label: "Graduation Planner",   icon: "planner" },
        { href: "/dashboard/academic-history",   segment: "academic-history",    label: "Academic History",     icon: "history" },
        { href: "/dashboard/semester-scheduler", segment: "semester-scheduler", label: "Schedule Semester",    icon: "semester" },
        { href: "/dashboard/pathfinder",         segment: "pathfinder",         label: "Pathfinder",           icon: "map" },
        { href: "/dashboard/profile",            segment: "profile",            label: "Profile",              icon: "profile" },
      ];

    case "advisor":
      return [
        { href: "/dashboard",                    segment: null,                 label: "Overview",       icon: "dashboard" },
  { href: "/dashboard/inbox",              segment: "inbox",              label: "Inbox",          icon: "inbox", badgeCount: inboxBadge },
        { href: "/dashboard/approve-grad-plans", segment: "approve-grad-plans", label: "Approve Plans",  icon: "map", badgeCount: pendingCount },
        { href: "/dashboard/advisees",           segment: "advisees",           label: "My Advisees",    icon: "advisees" },
        { href: "/dashboard/maintain-programs",  segment: "maintain programs",  label: "Maintain Programs",      icon: "programs" },
        { href: "/dashboard/program-flow",       segment: "program-flow",       label: "Program Flow",   icon: "programFlow" },
        { href: "/dashboard/appointments",       segment: "appointments",       label: "Appointments",   icon: "appointments" },
        { href: "/dashboard/reports",            segment: "reports",            label: "Reports",        icon: "reports", badgeCount: 3 },
        { href: "/dashboard/careers/manage",     segment: "careers",            label: "Manage Careers", icon: "careers" },
        { href: "/dashboard/profile",            segment: "profile",            label: "Profile",        icon: "profile" },
      ];

    case "admin":
      return [
        { href: "/dashboard",                       segment: null,                    label: "Overview",               icon: "dashboard" },
        { href: "/dashboard/admin/forecast",        segment: "admin",                 label: "Forecasting",            icon: "forecast" },
  { href: "/dashboard/inbox",                 segment: "inbox",                 label: "Inbox",                  icon: "inbox", badgeCount: inboxBadge },
        { href: "/dashboard/users",                 segment: "users",                 label: "Maintain Users",         icon: "users" },
        { href: "/dashboard/maintain-programs",     segment: "maintain programs",     label: "Maintain Programs",      icon: "programs" },
        { href: "/dashboard/manage-advisors",       segment: "manage-advisors",       label: "Manage Advisors",        icon: "advisors" },
        { href: "/dashboard/careers/manage",        segment: "careers",               label: "Manage Careers",         icon: "careers" },
        { href: "/dashboard/system",                segment: "system",                label: "System",                 icon: "system" },
        { href: "/dashboard/profile",               segment: "profile",               label: "Profile",                icon: "profile" },
      ];
  }
}
