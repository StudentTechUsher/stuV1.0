// components/ai-chat/ChatbotDrawer.tsx
"use client";

import * as React from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import { getEnvRole } from "@/lib/mock-role";

type Role = "student" | "advisor" | "admin";
type QuickAction = { label: string; prompt: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  /** Optional: pass the current user role so we can tailor quick actions */
  role?: Role;
  /** Optional: override or extend the quick actions */
  presetPrompts?: QuickAction[];
  /** Optional: handle sending the prompt (otherwise we console.log it) */
  onSend?: (text: string, meta?: { role?: Role }) => void | Promise<void>;
};

// sensible defaults if caller doesn’t pass presetPrompts
const DEFAULT_PRESETS: Record<Role, QuickAction[]> = {
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
};

export default function ChatbotDrawer({
  open,
  onClose,
  onOpen,
  role,
  presetPrompts,
  onSend,
}: Readonly<Props>) {
  const actions = presetPrompts ?? DEFAULT_PRESETS[getEnvRole()];
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    try {
      if (onSend) {
        await onSend(text, { role });
      } else {
        // Replace with your actual chat send logic
        // (e.g., call your API route or Supabase function)
        // Keeping this as a no-op for now.
        console.log(`[CHAT:${role}]`, text);
      }
      setInput("");
      inputRef.current?.focus();
    } catch (e) {
      console.error("Failed to send chat message:", e);
    }
  };

  const handleQuickAction = (qa: QuickAction, autoSend = false) => {
    setInput(qa.prompt);
    if (autoSend) {
      // small delay so TextField updates before send
      setTimeout(handleSend, 0);
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* Toggle Button - Always visible, attached to drawer edge */}
      <IconButton
        onClick={open ? onClose : onOpen}
        sx={{
          position: "fixed",
          right: open ? "30vw" : 0, // Positioned at drawer edge
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: (theme) => theme.zIndex.drawer + 2,
          backgroundColor: "success.main",
          color: "white",
          width: 48,
          height: 48,
          borderRadius: open ? "50% 0 0 50%" : "50% 0 0 50%", // Rounded on left side
          transition: "right 0.3s ease-in-out",
          "&:hover": {
            backgroundColor: "success.dark",
          },
          boxShadow: 2,
        }}
      >
        {open ? <CloseIcon /> : <SmartToyIcon />}
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        variant="persistent" // This makes it push content instead of overlaying
        ModalProps={{ keepMounted: true }} // smoother on mobile
        sx={{ 
          "& .MuiDrawer-paper": { 
            width: "30vw", 
            minWidth: 320, // minimum width for mobile
            maxWidth: 480, // maximum width for very large screens
            boxSizing: "border-box" 
          } 
        }}
      >
      <Box role="presentation" sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Role: {(role || getEnvRole()).charAt(0).toUpperCase() + (role || getEnvRole()).slice(1)}
          </Typography>
        </Box>

        {/* Quick actions */}
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Quick actions
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            {actions.map((qa) => (
              <Chip
                key={qa.label}
                label={qa.label}
                onClick={() => handleQuickAction(qa, false)}
                onDoubleClick={() => handleQuickAction(qa, true)} // double-click to auto-send
                variant="outlined"
                size="small"
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Drawer actions list (kept from your original) */}
        <List dense>
          {["New chat", "Recent", "Settings"].map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton onClick={() => {
                if (text === "New chat") setInput("");
                // wire up "Recent" & "Settings" to your internal routes or handlers as needed
              }}>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ flex: 1 }} />

        {/* Composer */}
        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
          <TextField
            inputRef={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            multiline
            maxRows={4}
            fullWidth
            size="small"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button variant="contained" color="success" onClick={handleSend} sx={{ alignSelf: "flex-end" }}>
            Send
          </Button>
        </Stack>
      </Box>
    </Drawer>
    </>
  );
}
