"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelectedLayoutSegment } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import { useUniversityTheme } from "@/contexts/university-theme-context";
import { signOut } from "@/lib/utils/auth-client";

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
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WorkRounded from "@mui/icons-material/WorkRounded";
import TimelineRounded from "@mui/icons-material/TimelineRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { MdHistory } from "react-icons/md";
import type { NavItem } from "@/app/(dashboard)/layout";
import { JSX } from "react";
import { Inbox } from "@mui/icons-material";

type Props = {
  items: NavItem[];
  compactWidth?: number;
  expandedWidth?: number;
  showSettings?: boolean;
  onWidthChange?: (width: number) => void;
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
  forecast: <TrendingUpIcon />,
  careers: <WorkRounded />,
  programFlow: <TimelineRounded />,
  sandbox: <GridViewRounded />,
};

export default function NavRail({
  items,
  compactWidth = 70,
  expandedWidth = 260,
  showSettings = true,
  onWidthChange,
}: Readonly<Props>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const seg = useSelectedLayoutSegment();
  const { university } = useUniversityTheme();
  const currentWidth = isExpanded ? expandedWidth : compactWidth;

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        // Use window.location for a hard redirect that clears all client state
        window.location.href = "/login";
      } else {
        console.error("Sign out failed:", result.error);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    onWidthChange?.(isExpanded ? compactWidth : expandedWidth);
  };

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{
        position: "fixed",
        inset: 0,
        right: "auto",
        width: currentWidth,
        height: "100vh",
        bgcolor: "var(--hover-gray)",
        color: "var(--nav-foreground, #fff)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: isExpanded ? "space-between" : "center",
          px: isExpanded ? 1.5 : 0,
          py: 2.5,
          flexShrink: 0,
          gap: 1,
        }}
      >
        <Link
          href="/home"
          aria-label="Home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
          }}
        >
          {isExpanded && university?.logo_url && (
            <Image
              src={university.logo_url}
              alt={`${university.name} Logo`}
              width={28}
              height={28}
              style={{ borderRadius: "4px" }}
            />
          )}
          <Image
            src="/stu_icon_black.png"
            alt="STU Logo"
            width={isExpanded ? 32 : 40}
            height={isExpanded ? 32 : 40}
            style={{ filter: "invert(1)" }}
          />
        </Link>

        {isExpanded && (
          <Box
            component="button"
            onClick={handleToggleExpand}
            sx={{
              ml: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.5,
              borderRadius: "8px",
              transition: "all 0.2s ease",
              "&:hover": {
                color: "rgba(255,255,255,0.8)",
                bgcolor: "rgba(255,255,255,0.05)",
              },
            }}
          >
            <ChevronLeftRounded fontSize="small" />
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", my: 1.5, mx: isExpanded ? 0 : 1.5 }} />

      {/* Main Navigation Items */}
      <Stack
        component="div"
        spacing={0.5}
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: isExpanded ? 1 : 0.5,
          py: 1,
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.15)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(255,255,255,0.25)",
            },
          },
        }}
      >
        {items.map((item) => {
          const active = item.segment === seg;
          const hasBadge = !!(item.badgeCount && item.badgeCount > 0);

          if (isExpanded) {
            return (
              <NavItemExpanded
                key={item.href}
                item={item}
                active={active}
                hasBadge={hasBadge}
              />
            );
          } else {
            return (
              <NavItemCompact
                key={item.href}
                item={item}
                active={active}
                hasBadge={hasBadge}
              />
            );
          }
        })}
      </Stack>

      {showSettings && (
        <>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", my: 1.5, mx: isExpanded ? 0 : 1.5 }} />

          {/* Settings Section */}
          <Stack
            spacing={0.5}
            sx={{
              px: isExpanded ? 1 : 0.5,
              py: 1.5,
              flexShrink: 0,
            }}
          >
            {isExpanded && (
              <>
                <SettingsItemExpanded href="/settings" label="Settings" />
                <SignOutItemExpanded onSignOut={handleSignOut} />
              </>
            )}

            {!isExpanded && (
              <>
                <SettingsItemCompact href="/settings" />
                <SignOutItemCompact onSignOut={handleSignOut} />
                <ExpandButtonCompact onToggle={handleToggleExpand} />
              </>
            )}

            {isExpanded && (
              <Box
                component="button"
                onClick={handleToggleExpand}
                sx={{
                  width: "100%",
                  p: 0,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  py: 1,
                  px: 1.5,
                  transition: "all 0.2s ease",
                  borderRadius: "8px",
                  "&:hover": {
                    color: "rgba(255,255,255,0.8)",
                    bgcolor: "rgba(255,255,255,0.05)",
                  },
                }}
              >
                Collapse
              </Box>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
}

// Expanded view nav item
function NavItemExpanded({ item, active }: { item: NavItem; active: boolean; hasBadge: boolean }) {
  return (
    <Box
      component={Link}
      href={item.href}
      aria-current={active ? "page" : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: "10px",
        textDecoration: "none",
        color: "inherit",
        transition: "all 0.2s ease",
        position: "relative",
        bgcolor: active ? "rgba(var(--primary-rgb, 59, 130, 246), 0.12)" : "transparent",
        "&:hover": {
          bgcolor: active ? "rgba(var(--primary-rgb, 59, 130, 246), 0.18)" : "rgba(255,255,255,0.08)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "10px",
          bgcolor: active ? "rgba(var(--primary-rgb, 59, 130, 246), 0.2)" : "transparent",
          color: active ? "var(--primary)" : "rgba(255,255,255,0.7)",
          flexShrink: 0,
          fontSize: "1.3rem",
          transition: "all 0.2s ease",
        }}
      >
        {iconMap[item.icon]}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            fontSize: "0.9rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: active ? "var(--primary)" : "rgba(255,255,255,0.85)",
          }}
        >
          {item.label}
        </Box>
      </Box>

      {item.badgeCount && item.badgeCount > 0 && (
        <Box
          sx={{
            background: "var(--pending-badge-bg, #dc2626)",
            color: "var(--pending-badge-fg, #fff)",
            borderRadius: "6px",
            minWidth: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {item.badgeCount > 99 ? "99+" : item.badgeCount}
        </Box>
      )}
    </Box>
  );
}

// Compact view nav item
function NavItemCompact({ item, active, hasBadge }: { item: NavItem; active: boolean; hasBadge: boolean }) {
  return (
    <Tooltip
      title={item.label}
      placement="right"
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 10],
              },
            },
          ],
        },
      }}
    >
      <Box
        component={Link}
        href={item.href}
        aria-current={active ? "page" : undefined}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: "12px",
          margin: "0 auto",
          textDecoration: "none",
          transition: "all 0.2s ease",
          position: "relative",
          bgcolor: active ? "rgba(var(--primary-rgb, 59, 130, 246), 0.15)" : "transparent",
          color: active ? "var(--primary)" : "rgba(255,255,255,0.6)",
          fontSize: "1.4rem",
          "&:hover": {
            bgcolor: active ? "rgba(var(--primary-rgb, 59, 130, 246), 0.22)" : "rgba(255,255,255,0.1)",
            color: active ? "var(--primary)" : "rgba(255,255,255,0.85)",
          },
        }}
      >
        {iconMap[item.icon]}
        {hasBadge && item.badgeCount && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "var(--pending-badge-bg, #dc2626)",
              color: "var(--pending-badge-fg, #fff)",
              borderRadius: "50%",
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: 700,
              border: "2px solid var(--hover-gray)",
            }}
          >
            {item.badgeCount > 99 ? "99+" : item.badgeCount}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

// Settings items
function SettingsItemExpanded({ href, label }: { href: string; label: string }) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: "10px",
        textDecoration: "none",
        color: "rgba(255,255,255,0.7)",
        transition: "all 0.2s ease",
        "&:hover": {
          color: "rgba(255,255,255,0.95)",
          bgcolor: "rgba(255,255,255,0.08)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "10px",
          flexShrink: 0,
          fontSize: "1.3rem",
        }}
      >
        <SettingsRounded />
      </Box>
      <Box sx={{ fontSize: "0.9rem", fontWeight: 500 }}>{label}</Box>
    </Box>
  );
}

function SettingsItemCompact({ href }: { href: string }) {
  return (
    <Tooltip
      title="Settings"
      placement="right"
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 10],
              },
            },
          ],
        },
      }}
    >
      <Box
        component={Link}
        href={href}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: "12px",
          margin: "0 auto",
          textDecoration: "none",
          color: "rgba(255,255,255,0.6)",
          transition: "all 0.2s ease",
          fontSize: "1.4rem",
          "&:hover": {
            bgcolor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
          },
        }}
      >
        <SettingsRounded />
      </Box>
    </Tooltip>
  );
}

function SignOutItemExpanded({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Box
      component="button"
      onClick={onSignOut}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: "10px",
        border: "none",
        background: "none",
        cursor: "pointer",
        color: "rgba(255,255,255,0.7)",
        transition: "all 0.2s ease",
        fontSize: "inherit",
        fontFamily: "inherit",
        "&:hover": {
          color: "rgba(255,255,255,0.95)",
          bgcolor: "rgba(255,255,255,0.08)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "10px",
          flexShrink: 0,
          fontSize: "1.3rem",
        }}
      >
        <LogoutRounded />
      </Box>
      <Box sx={{ fontSize: "0.9rem", fontWeight: 500 }}>Sign Out</Box>
    </Box>
  );
}

function SignOutItemCompact({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Tooltip
      title="Sign Out"
      placement="right"
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 10],
              },
            },
          ],
        },
      }}
    >
      <Box
        component="button"
        onClick={onSignOut}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: "12px",
          margin: "0 auto",
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.6)",
          transition: "all 0.2s ease",
          fontSize: "1.4rem",
          "&:hover": {
            bgcolor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
          },
        }}
      >
        <LogoutRounded />
      </Box>
    </Tooltip>
  );
}

function ExpandButtonCompact({ onToggle }: { onToggle: () => void }) {
  return (
    <Tooltip
      title="Expand"
      placement="right"
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 10],
              },
            },
          ],
        },
      }}
    >
      <Box
        component="button"
        onClick={onToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: "12px",
          margin: "0 auto",
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.6)",
          transition: "all 0.2s ease",
          fontSize: "1.4rem",
          "&:hover": {
            bgcolor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
          },
        }}
      >
        <ChevronRightRounded />
      </Box>
    </Tooltip>
  );
}
