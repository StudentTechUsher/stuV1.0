// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import DashboardLayoutClient from "@/components/dashboard/dashboard-layout-client";
import { getPendingGradPlansCount, getUnreadNotificationsCount } from '@/lib/services/notifService';
import CreateAccountClient from "@/components/create-account/create-account-client";
import {
  listUniversities,
  listMajors,
  listMinors,
  listStudentInterests,
  listCareerOptions,
  listClassPreferences,
} from "@/components/create-account/server-actions";

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

  // If user hasn't completed onboarding, show the create account form instead
  if (!onboarded && user) {
    // Fetch all required data for the onboarding form
    const [universities, majorsAll, minorsAll, interests, careers, classPrefs] =
      await Promise.all([
        listUniversities(),
        listMajors(),
        listMinors(),
        listStudentInterests(),
        listCareerOptions(),
        listClassPreferences(),
      ]);

    // Get authenticated user to extract JWT token securely
    // Note: We already called getUser() above for authentication, using the same result
    const tokenPayload = decodeJwtPayload(user?.app_metadata?.access_token);
    const fullName = tokenPayload?.name as string || "";
    const nameParts = fullName.split(' ');

    const firstNameFromToken = (
      tokenPayload?.given_name ||
      tokenPayload?.first_name ||
      tokenPayload?.fname ||
      nameParts[0] ||
      ""
    ) as string;

    const lastNameFromToken = (
      tokenPayload?.family_name ||
      tokenPayload?.last_name ||
      tokenPayload?.lname ||
      nameParts.slice(1).join(' ') ||
      ""
    ) as string;

    const initialData = {
      fname: firstNameFromToken,
      lname: lastNameFromToken,
      email: user.email || "",
      university_id: null,
      selected_majors: null,
      selected_minors: null,
      selected_interests: null,
      career_options: null,
      class_preferences: null,
    };

    return (
      <main style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1rem" }}>
        <h1 className="text-3xl mb-3 font-header">Complete your profile</h1>
        <CreateAccountClient
          nextHref="/dashboard"
          preload={{ universities, majorsAll, minorsAll, interests, careers, classPrefs }}
          initial={initialData}
          isEditMode={false}
        />
      </main>
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

// Helper function to decode JWT payload on the server
function decodeJwtPayload(token?: string): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // base64url -> base64 and pad
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
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
