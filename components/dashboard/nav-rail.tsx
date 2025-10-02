"use client";

import Link from "next/link";
import Image from "next/image";
import { useSelectedLayoutSegment, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import { supabase } from "@/lib/supabaseClient";
import { useUniversityTheme } from "@/contexts/university-theme-context";

import SchoolRounded from "@mui/icons-material/SchoolRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import ChecklistRounded from "@mui/icons-material/ChecklistRounded";
import DashboardRounded from "@mui/icons-material/Dashboard";
import GroupsRounded from "@mui/icons-material/Groups";
import EventAvailableRounded from "@mui/icons-material/EventAvailable";
import BarChartRounded from "@mui/icons-material/BarChart";
import PeopleAltRounded from "@mui/icons-material/PeopleAlt";
import AccountTreeRounded from "@mui/icons-material/AccountTree";
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettings";
import MapRounded from "@mui/icons-material/MapRounded";
import { MdHistory } from "react-icons/md";
import type { NavItem } from "@/app/dashboard/layout";
import { JSX } from "react";
import { Inbox } from "@mui/icons-material";

// We can now use CSS variables directly in Material-UI sx props

type Props = {
  items: NavItem[];
  railWidth?: number;
  showSettings?: boolean;
};

const iconMap: Record<NavItem["icon"], JSX.Element> = {
  dashboard: <DashboardRounded />,
  inbox: <Inbox />,
  planner: <SchoolRounded />,
  map: <MapRounded />,
  semester: <ChecklistRounded />,
  history: <MdHistory />,
  meet: <EventAvailableRounded />,
  profile: <PersonRounded />,
  advisees: <GroupsRounded />,
  advisors: <GroupsRounded />,
  appointments: <EventAvailableRounded />,
  reports: <BarChartRounded />,
  users: <PeopleAltRounded />,
  programs: <AccountTreeRounded />,
  system: <AdminPanelSettingsRounded />,
};

export default function NavRail({ items, railWidth = 88, showSettings = true }: Readonly<Props>) {
  const seg = useSelectedLayoutSegment();
  const router = useRouter();
  const { university } = useUniversityTheme();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{
        position: "fixed",
        inset: 0,
        right: "auto",
        width: railWidth,
        bgcolor: "var(--hover-gray)",
        color: "var(--nav-foreground, #fff)",
        borderRight: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 2,
        zIndex: 1000,
      }}
    >
      {/* Logo */}
      <Link href="/home" aria-label="Home" className="flex items-center gap-2">
        {/* University Logo */}
        {university?.logo_url && (
          <>
            <Image
              src={university.logo_url}
              alt={`${university.name} Logo`}
              width={32}
              height={32}
              className="rounded"
            />
            <Box sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', mx: 0.5 }}>×</Box>
          </>
        )}

        {/* STU Logo */}
        <Image
          src="/stu_icon_black.png"
          alt="STU Logo"
          width={44}
          height={44}
          style={{ filter: "invert(1)" }}
        />
      </Link>

      <Divider sx={{ width: 40, borderColor: "rgba(255,255,255,0.12)", mb: 2, mt: 2 }} />

      {/* Items */}
      <Stack spacing={1} alignItems="center" sx={{ flex: 1 }}>
        {items.map((item) => {
          const active = item.segment === seg;
          return (
            <Tooltip key={item.href} title={item.label} placement="right">
              <Box
                component={Link}
                href={item.href}
                aria-current={active ? "page" : undefined}
                sx={{
                  position: "relative",
                  display: "block",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translate(-8px, -50%)",
                    height: 28,
                    width: 3,
                    borderRadius: 2,
                    bgcolor: active ? "var(--primary)" : "transparent",
                  },
                }}
              >
                <IconButton
                  size="large"
                  sx={{
                    color: active ? "var(--primary)" : "#fff",
                    bgcolor: active ? "var(--primary-15)" : "transparent",
                    "&:hover": {
                      bgcolor: active
                        ? "var(--primary-22)"
                        : "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  {iconMap[item.icon]}
                  {item.badgeCount && item.badgeCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        // Use a semantic pending color (accessible contrast with white text)
                        background: 'var(--pending-badge-bg, #c2410c)', // orange-700 fallback
                        color: 'var(--pending-badge-fg, #fff)',
                        borderRadius: '999px',
                        minWidth: 18,
                        height: 18,
                        px: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                        lineHeight: 1,
                        boxShadow: '0 0 0 2px rgba(0,0,0,0.35)'
                      }}
                    >
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </Box>
                  )}
                </IconButton>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      {showSettings && (
        <>
          <Divider sx={{ width: 40, borderColor: "rgba(255,255,255,0.12)", mb: 1 }} />
          
          {/* Sign Out Button */}
          <Tooltip title="Sign Out" placement="right">
            <IconButton
              size="large"
              onClick={handleSignOut}
              sx={{
                color: "var(--nav-foreground, #fff)",
                mb: 1,
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" }
              }}
            >
              <LogoutRounded />
            </IconButton>
          </Tooltip>

          {/* Settings Button */}
          <Tooltip title="Settings" placement="right">
            <Box component={Link} href="/settings">
              <IconButton
                size="large"
                sx={{ color: "var(--nav-foreground, #fff)", "&:hover": { bgcolor: "rgba(255,255,255,0.08)" } }}
              >
                <SettingsRounded />
              </IconButton>
            </Box>
          </Tooltip>
        </>
      )}
    </Box>
  );
}
