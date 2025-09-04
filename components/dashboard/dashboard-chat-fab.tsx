// components/ai-chat/dashboard-chat-fab.tsx
"use client"

import * as React from "react"
import Fab from "@mui/material/Fab"
import Tooltip from "@mui/material/Tooltip"
import SmartToyIcon from "@mui/icons-material/SmartToy"
import ChatbotDrawer from "@/components/ai-chat/chatbot-drawer"

type Role = "student" | "advisor" | "admin"

type QuickAction = { label: string; prompt: string }

const ROLE_PRESETS: Record<Role, QuickAction[]> = {
  student: [
    { label: "Plan my semester", prompt: "Help me plan my semester based on my degree requirements and current credits." },
    { label: "Find advising times", prompt: "When is my next available advising slot and how do I book it?" },
    { label: "Graduation check", prompt: "Am I on track to graduate on time? What classes am I missing?" },
  ],
  advisor: [
    { label: "Daily advisee digest", prompt: "Summarize today’s advisee alerts and top follow-ups." },
    { label: "Prep for meeting", prompt: "Given this student ID, summarize their academic standing and risks: <STUDENT_ID>." },
    { label: "Outreach draft", prompt: "Draft an outreach email to students who missed last advising window." },
  ],
  admin: [
    { label: "Health overview", prompt: "Summarize key system metrics and any anomalies in the last 24h." },
    { label: "User audit", prompt: "List newly created users this week and any with incomplete profiles." },
    { label: "Program report", prompt: "Generate a report of enrollments by program and term." },
  ],
}

export default function DashboardChatFab({ role }: { role: Role }) {
  const [chatOpen, setChatOpen] = React.useState(false)
  const presetPrompts = ROLE_PRESETS[role] ?? []

  return (
    <>
      <Tooltip title="Chatbot" placement="left">
        <Fab
          color="success"
          aria-label="Open chatbot"
          onClick={() => setChatOpen(true)}
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

      {/* If your ChatbotDrawer doesn’t support these props yet, add them as optional */}
      <ChatbotDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        role={role}                      // optional: for internal behavior/styling
        presetPrompts={presetPrompts}    // optional: to render role-specific quick actions
      />
    </>
  )
}

type Props = {
  open: boolean
  onClose: () => void
  presetPrompts?: QuickAction[]
  role: Role
}
