"use client";

import Link from "next/link";
import Image from "next/image";
import { useSelectedLayoutSegment } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import ProfileIcon from "@mui/icons-material/PersonRounded";
import ChecklistIcon from "@mui/icons-material/ChecklistRounded";
import DashboardIcon from '@mui/icons-material/Dashboard';

const MINT = "#38E3C2";
const RAIL_WIDTH = 88;

const NAV_ITEMS = [
  { href: "/dashboard",                segment: null,              label: "Overview",               icon: <DashboardIcon /> },
  { href: "/dashboard/four-year-plan", segment: "four-year-plan",  label: "Four Year Planner",      icon: <SchoolRounded /> },
  { href: "/dashboard/scheduler",      segment: "scheduler",       label: "Schedule Your Semester", icon: <ChecklistIcon /> },
  { href: "/dashboard/profile",        segment: "profile",         label: "Profile",                icon: <ProfileIcon /> },
];

export default function NavRail() {
  const seg = useSelectedLayoutSegment();

  return (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{
        position: "fixed",
        inset: 0,
        right: "auto",
        width: RAIL_WIDTH,
        bgcolor: "#404040",
        color: "#fff",
        borderRight: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 2,
        zIndex: 1000,
      }}
    >
      {/* Logo */}
      <Link href="/" aria-label="Home">
        <Image 
          src="/stu_icon_black.png" 
          alt="Logo" 
          width={44} 
          height={44} 
          style={{ filter: 'invert(1)' }}
        />
      </Link>

      <Divider sx={{ width: 40, borderColor: "rgba(255,255,255,0.12)", mb: 2, mt: 2 }} />

      {/* Items */}
      <Stack spacing={1} alignItems="center" sx={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => {
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
                    height: 28, width: 3, borderRadius: 2,
                    bgcolor: active ? MINT : "transparent",
                  },
                }}
              >
                <IconButton
                  size="large"
                  sx={{
                    color: active ? MINT : "#fff",
                    bgcolor: active ? "rgba(56,227,194,0.15)" : "transparent",
                    "&:hover": {
                      bgcolor: active
                        ? "rgba(56,227,194,0.22)"
                        : "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  {item.icon}
                </IconButton>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      <Divider sx={{ width: 40, borderColor: "rgba(255,255,255,0.12)", mb: 1 }} />

      <Tooltip title="Settings" placement="right">
        <Box component={Link} href="/dashboard/settings">
          <IconButton size="large" sx={{ color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.08)" } }}>
            <SettingsRounded />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  );
}
