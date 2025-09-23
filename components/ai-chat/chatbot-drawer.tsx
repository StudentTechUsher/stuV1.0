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
  const [messages, setMessages] = React.useState<Array<{type: 'user' | 'bot', text: string, id: string}>>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    
    try {
      // Add user message to the chat
      setMessages(prev => [...prev, { type: 'user', text, id: `user-${Date.now()}` }]);
      
      if (onSend) {
        await onSend(text, { role });
      } else {
        // Add the temporary bot response
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: "Hi, I'm still getting set up, but I'll be able to help you navigate the site and give you tips and advice along the way.",
            id: `bot-${Date.now()}`
          }]);
        }, 500); // Small delay to simulate thinking
        
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
      setTimeout(() => {
        // Add user message immediately
        setMessages(prev => [...prev, { type: 'user', text: qa.prompt, id: `user-${Date.now()}` }]);
        
        // Add bot response
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: "Hi, I'm still getting set up, but I'll be able to help you navigate the site and give you tips and advice along the way.",
            id: `bot-${Date.now()}`
          }]);
        }, 500);
        
        setInput("");
      }, 0);
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* Floating FAB - Only visible when drawer is closed */}
      {!open && (
        <IconButton
          onClick={onOpen}
          sx={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: (theme) => theme.zIndex.drawer + 2,
            backgroundColor: "success.main",
            color: "white",
            width: 56,
            height: 56,
            borderRadius: "50%",
            "&:hover": {
              backgroundColor: "success.dark",
            },
            boxShadow: 3,
            transition: "all 0.3s ease-in-out",
          }}
        >
          <SmartToyIcon />
        </IconButton>
      )}

      <Drawer
        ref={drawerRef}
        anchor="right"
        open={open}
        onClose={onClose}
        variant="temporary" // This enables click-outside-to-close functionality
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
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header with close button */}
        <Box sx={{ mb: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Role: {(role || getEnvRole()).charAt(0).toUpperCase() + (role || getEnvRole()).slice(1)}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
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

        {/* Chat Messages Area */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          mb: 2,
          p: 1,
          backgroundColor: 'grey.50',
          borderRadius: 1,
          minHeight: '200px'
        }}>
          {messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              Start a conversation...
            </Typography>
          ) : (
            <Stack spacing={2}>
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '80%',
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: message.type === 'user' ? 'success.main' : 'white',
                      color: message.type === 'user' ? 'white' : 'text.primary',
                      boxShadow: 1
                    }}
                  >
                    <Typography variant="body2">
                      {message.text}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Drawer actions list (kept from your original) */}
        <List dense>
          {["New chat", "Recent", "Settings"].map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton onClick={() => {
                if (text === "New chat") {
                  setInput("");
                  setMessages([]);
                }
                // wire up "Recent" & "Settings" to your internal routes or handlers as needed
              }}>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ flex: 0 }} />

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
