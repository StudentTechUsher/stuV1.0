'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import NavRail from '@/components/dashboard/nav-rail';
import DashboardChatFab from '@/components/dashboard/dashboard-chat-fab';
import type { NavItem } from '@/app/dashboard/layout';

export const RAIL_WIDTH = 88;
const DRAWER_WIDTH_VW = 30; // 30% viewport width

type Role = "student" | "advisor" | "admin";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  items: NavItem[];
  role: Role;
}

export default function DashboardLayoutClient({
  children,
  items,
  role,
}: Readonly<DashboardLayoutClientProps>) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box sx={{ display: "flex" }}>
      <NavRail items={items} railWidth={RAIL_WIDTH} />
      <Box 
        component="main" 
        sx={{ 
          ml: `${RAIL_WIDTH}px`, 
          flex: 1, 
          position: "relative",
          // Adjust right margin when drawer is open
          mr: drawerOpen ? `${DRAWER_WIDTH_VW}vw` : 0,
          transition: 'margin-right 0.3s ease-in-out',
        }}
      >
        <Box sx={{ 
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", 
          fontSize: 12, 
          color: "text.secondary", 
          borderBottom: "1px dashed", 
          borderColor: "divider", 
          px: 1, 
          py: 0.5 
        }}>
        </Box>

        {children}
        <DashboardChatFab 
          role={role} 
          onDrawerToggle={setDrawerOpen}
        />
      </Box>
    </Box>
  );
}
