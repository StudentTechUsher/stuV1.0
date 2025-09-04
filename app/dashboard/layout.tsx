import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import NavRail from "@/components/dashboard/nav-rail";
import DashboardChatFab from "@/components/dashboard/dashboard-chat-fab";
import { getEnvRole } from "@/lib/mock-role";

export const RAIL_WIDTH = 88;

type Role = "student" | "advisor" | "admin";

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

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // TODO: replace with real server-side role lookup
  const role: Role = getEnvRole();

  const items = getNavItems(role);

  return (
    <Box sx={{ display: "flex" }}>
      <NavRail items={items} railWidth={RAIL_WIDTH} />
      <Box component="main" sx={{ ml: `${RAIL_WIDTH}px`, flex: 1, position: "relative" }}>
        {children}
        {/* Role-aware FAB lives at the layout level so it’s present on all dashboard pages */}
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
        { href: "/dashboard/four-year-plan",     segment: "four-year-plan",     label: "Four Year Planner",    icon: "planner" },
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
