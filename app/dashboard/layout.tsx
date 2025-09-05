// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import NavRail from "@/components/dashboard/nav-rail";
import DashboardChatFab from "@/components/dashboard/dashboard-chat-fab";

// 👇 NEW: read Supabase session in a server component
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const RAIL_WIDTH = 88;

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
  | "semester"
  | "meet"
  | "profile"
  | "advisees"
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
};

// --- helper: decode JWT payload on the server ---
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

  // 1) Get session/user
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;

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

  const items = getNavItems(role);

  // (keep your decoded JWT debug banner if you like)
  const decoded = decodeJwtPayload(session?.access_token);
  const decodedString = decoded ? JSON.stringify(decoded) : "No JWT/session found";

  return (
    <Box sx={{ display: "flex" }}>
      <NavRail items={items} railWidth={RAIL_WIDTH} />
      <Box component="main" sx={{ ml: `${RAIL_WIDTH}px`, flex: 1, position: "relative" }}>
        <Box sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, color: "text.secondary", borderBottom: "1px dashed", borderColor: "divider", px: 1, py: 0.5 }}>
          Decoded JWT: {decodedString}
        </Box>

        {children}
        <DashboardChatFab role={role} />
      </Box>
    </Box>
  );
}

function getNavItems(role: Role): NavItem[] {
  switch (role) {
    case "student":
      return [
        { href: "/dashboard",                    segment: null,                 label: "Overview",             icon: "dashboard" },
        { href: "/dashboard/grad-plan",          segment: "grad-plan",          label: "Graduation Planner",   icon: "planner" },
        { href: "/dashboard/semester-scheduler", segment: "semester-scheduler", label: "Schedule Semester",    icon: "semester" },
        { href: "/dashboard/meet-with-advisor",  segment: "calendar",           label: "Meet with Advisor",    icon: "meet" },
        { href: "/dashboard/profile",            segment: "profile",            label: "Profile",              icon: "profile" },
      ];

    case "advisor":
      return [
        { href: "/dashboard",               segment: null,            label: "Overview",       icon: "dashboard" },
        { href: "/dashboard/advisees",      segment: "advisees",      label: "My Advisees",    icon: "advisees" },
        { href: "/dashboard/appointments",  segment: "appointments",  label: "Appointments",   icon: "appointments" },
        { href: "/dashboard/reports",       segment: "reports",       label: "Reports",        icon: "reports" },
        { href: "/dashboard/profile",       segment: "profile",       label: "Profile",        icon: "profile" },
      ];

    case "admin":
      return [
        { href: "/dashboard",              segment: null,           label: "Overview",      icon: "dashboard" },
        { href: "/dashboard/users",        segment: "users",        label: "Users",         icon: "users" },
        { href: "/dashboard/programs",     segment: "programs",     label: "Programs",      icon: "programs" },
        { href: "/dashboard/system",       segment: "system",       label: "System",        icon: "system" },
        { href: "/dashboard/profile",      segment: "profile",      label: "Profile",       icon: "profile" },
      ];
  }
}
