'use client';

import Box from '@mui/material/Box';
import NavRail from '@/components/dashboard/nav-rail';
import DashboardChatFab from '@/components/dashboard/dashboard-chat-fab';
import GradPlanRealtimeListener from '@/components/dashboard/grad-plan-realtime-listener';
import type { NavItem } from '@/app/dashboard/layout';

export const RAIL_WIDTH = 88;

type Role = "student" | "advisor" | "admin";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  items: NavItem[];
  role: Role;
  userId?: string;
}

export default function DashboardLayoutClient({
  children,
  items,
  role,
  userId,
}: Readonly<DashboardLayoutClientProps>) {

  return (
    <Box sx={{ display: "flex" }}>
      <NavRail items={items} railWidth={RAIL_WIDTH} />
      <Box
        component="main"
        sx={{
          ml: `${RAIL_WIDTH}px`,
          flex: 1,
          position: "relative",
        }}
      >

        {children}
        <DashboardChatFab
          role={role}
        />
      </Box>
      {userId && <GradPlanRealtimeListener userId={userId} />}
    </Box>
  );
}
