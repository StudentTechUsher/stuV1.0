"use client";

import * as React from "react";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ChatbotDrawer from "./chatbot-drawer";
import { Role } from "@/lib/mock-role";

export default function DashboardChatFab({ role }: { role?: Role }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title="Chatbot" placement="left">
        <Fab
          color="success"
          aria-label="Open chatbot"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            right: { xs: 16, sm: 24 },
            bottom: { xs: "calc(16px + env(safe-area-inset-bottom))", sm: 24 },
            zIndex: (theme) => theme.zIndex.drawer + 1,
            boxShadow: 6,
          }}
        >
          <SmartToyIcon />
        </Fab>
      </Tooltip>

      <ChatbotDrawer open={open} onClose={() => setOpen(false)} role={role} />
    </>
  );
}
