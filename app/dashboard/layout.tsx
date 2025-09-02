"use client";

import * as React from "react";
import NavRail from "@/components/dashboard/nav-rail";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ChatbotDrawer from "@/components/ai-chat/chatbot-drawer";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [chatOpen, setChatOpen] = React.useState(false);

  return (
    <>
      <NavRail />
      {children}

      {/* Floating chatbot button — bottom-right, stays on scroll */}
      <Tooltip title="Chatbot" placement="left">
        <Fab
          color="success"
          aria-label="Open chatbot"
          onClick={() => setChatOpen(true)}
          sx={{
            position: "fixed",
            right: { xs: 16, sm: 24 },
            bottom: {
              xs: "calc(16px + env(safe-area-inset-bottom))",
              sm: 24,
            },
            zIndex: (theme) => theme.zIndex.drawer + 1, // above content
            boxShadow: 6,
          }}
        >
          <SmartToyIcon />
        </Fab>
      </Tooltip>

      <ChatbotDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
