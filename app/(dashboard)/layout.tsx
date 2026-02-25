// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/dashboard/dashboard-layout-client";
import { getPendingGradPlansCount, getUnreadNotificationsCount } from '@/lib/services/notifService';
import { needsOnboarding } from '@/lib/utils/onboardingUtils';
import type { Role } from '@/lib/mock-role';

// 👇 NEW: read Supabase session in a server component
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Force dynamic rendering for this layout because it uses cookies
export const dynamic = 'force-dynamic';

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
  4: "super_admin",
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
  | "programFlow"
  | "sandbox";

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

  // 2) Query profiles for role_id, onboarded status, university_id, fname, and lname (RLS lets users read only their own row)
  let roleId: string | null = null;
  let universityId: number | null = null;
  let profile: {
    role_id?: number | null;
    onboarded?: boolean | null;
    university_id?: number | null;
    fname?: string | null;
    lname?: string | null;
  } | null = null;

  if (userId) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role_id, onboarded, university_id, fname, lname")
      .eq("id", userId)
      .maybeSingle();

    profile = profileData;

    // Convert role_id to string for consistent lookup in ROLE_MAP
    roleId = profile?.role_id ? String(profile.role_id) : null;
    universityId = profile?.university_id ?? null;
  }

  // 3) Check if user needs onboarding
  if (profile && needsOnboarding(profile)) {
    redirect('/onboarding');
  }

  // 4) Pick a Role string (you can also fetch role name via FK join)
  const role: Role =
    ROLE_MAP[roleId ?? "3"]; // sensible default to "student" if roleId is null or undefined

  // If advisor hasn't been approved yet, show pending approval message
  const requiresApproval = role === 'advisor';
  const hasSelectedUniversity = universityId !== null;

  if (hasSelectedUniversity && requiresApproval && user) {
    // This is separate from onboarding - advisor has completed profile setup but may still be pending approval.
    const { data: advisorData } = await supabase
      .from('advisors')
      .select('approved')
      .eq('profile_id', userId)
      .maybeSingle();

    const needsApproval = advisorData?.approved !== true;

    if (needsApproval) {
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
  }

  // If advisor or super_admin, fetch pending approvals count (for badge)
  const pendingCount = (role === 'advisor' || role === 'super_admin') ? await getPendingGradPlansCount() : 0;

  // Unread inbox notifications badge for all authenticated roles
  const unreadInboxCount = userId ? await getUnreadNotificationsCount(userId) : 0;

  const items = getNavItems(role, pendingCount, unreadInboxCount);

  return (
    <DashboardLayoutClient
      items={items}
      role={role}
      userId={userId ?? undefined}
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
        { href: "/dashboard",                    segment: null,                 label: "Dashboard",            icon: "dashboard" },
        { href: "/inbox",               segment: "inbox",              label: "Inbox",                icon: "inbox", badgeCount: inboxBadge },
        { href: "/grad-plan",           segment: "grad-plan",          label: "Graduation Planner",   icon: "planner" },
        { href: "/sandbox",             segment: "sandbox",            label: "Plan Sandbox",         icon: "sandbox" },
        { href: "/academic-history",    segment: "academic-history",   label: "Academic History",     icon: "history" },
        { href: "/course-scheduler",  segment: "course-scheduler", label: "Schedule Courses",    icon: "semester" },
        { href: "/pathfinder",          segment: "pathfinder",         label: "Pathfinder",           icon: "map" },
        { href: "/profile",             segment: "profile",            label: "Profile",              icon: "profile" },
      ];

    case "advisor":
      return [
        { href: "/dashboard",                    segment: null,                 label: "Dashboard",      icon: "dashboard" },
        { href: "/inbox",               segment: "inbox",              label: "Inbox",          icon: "inbox", badgeCount: inboxBadge },
        { href: "/approve-grad-plans",  segment: "approve-grad-plans", label: "Approve Plans",  icon: "map", badgeCount: pendingCount },
        { href: "/approve-students",    segment: "approve-students",   label: "Approve Students", icon: "users" },
        { href: "/advisees",            segment: "advisees",           label: "My Case Load",    icon: "advisees" },
        { href: "/maintain-programs",   segment: "maintain-programs",  label: "Maintain Programs",      icon: "programs" },
        { href: "/program-flow",        segment: "program-flow",       label: "Program Flow",   icon: "programFlow" },
        { href: "/appointments",        segment: "appointments",       label: "Appointments",   icon: "appointments" },
        { href: "/reports",             segment: "reports",            label: "Reports",        icon: "reports", badgeCount: 3 },
        { href: "/careers/manage",      segment: "careers",            label: "Manage Careers", icon: "careers" },
        { href: "/profile",             segment: "profile",            label: "Profile",        icon: "profile" },
      ];

    case "admin":
      return [
        { href: "/dashboard",                    segment: null,                    label: "Dashboard",              icon: "dashboard" },
        { href: "/admin/forecast",      segment: "admin",                 label: "Forecasting",            icon: "forecast" },
        { href: "/inbox",               segment: "inbox",                 label: "Inbox",                  icon: "inbox", badgeCount: inboxBadge },
        { href: "/approve-students",    segment: "approve-students",      label: "Approve Students",       icon: "users" },
        { href: "/users",               segment: "users",                 label: "Maintain Users",         icon: "users" },
        { href: "/maintain-programs",   segment: "maintain-programs",     label: "Maintain Programs",      icon: "programs" },
        { href: "/manage-advisors",     segment: "manage-advisors",       label: "Manage Advisors",        icon: "advisors" },
        { href: "/careers/manage",      segment: "careers",               label: "Manage Careers",         icon: "careers" },
        { href: "/system",              segment: "system",                label: "System",                 icon: "system" },
        { href: "/profile",             segment: "profile",               label: "Profile",                icon: "profile" },
      ];

    case "super_admin":
      return [
        { href: "/dashboard",                    segment: null,                    label: "Dashboard",              icon: "dashboard" },
        { href: "/admin/forecast",      segment: "admin",                 label: "Forecasting",            icon: "forecast" },
        { href: "/inbox",               segment: "inbox",                 label: "Inbox",                  icon: "inbox", badgeCount: inboxBadge },
        { href: "/users",               segment: "users",                 label: "Maintain Users",         icon: "users" },
        { href: "/maintain-programs",   segment: "maintain-programs",     label: "Maintain Programs",      icon: "programs" },
        { href: "/manage-advisors",     segment: "manage-advisors",       label: "Manage Advisors",        icon: "advisors" },
        { href: "/advisees",            segment: "advisees",              label: "My Case Load",          icon: "advisees" },
        { href: "/approve-grad-plans",  segment: "approve-grad-plans",    label: "Approve Plans",          icon: "map", badgeCount: pendingCount },
        { href: "/appointments",        segment: "appointments",          label: "Appointments",           icon: "appointments" },
        { href: "/reports",             segment: "reports",               label: "Reports",                icon: "reports" },
        { href: "/careers/manage",      segment: "careers",               label: "Manage Careers",         icon: "careers" },
        { href: "/grad-plan",           segment: "grad-plan",             label: "Graduation Planner",     icon: "planner" },
        { href: "/sandbox",             segment: "sandbox",               label: "Plan Sandbox",           icon: "sandbox" },
        { href: "/academic-history",    segment: "academic-history",      label: "Academic History",       icon: "history" },
        { href: "/course-scheduler",  segment: "course-scheduler",    label: "Schedule Courses",      icon: "semester" },
        { href: "/pathfinder",          segment: "pathfinder",            label: "Pathfinder",             icon: "map" },
        { href: "/program-flow",        segment: "program-flow",          label: "Program Flow",           icon: "programFlow" },
        { href: "/system",              segment: "system",                label: "System",                 icon: "system" },
        { href: "/profile",             segment: "profile",               label: "Profile",                icon: "profile" },
      ];
  }
}
