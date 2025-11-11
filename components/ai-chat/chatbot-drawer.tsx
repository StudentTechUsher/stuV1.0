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
import Fab from "@mui/material/Fab";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import { getEnvRole } from "@/lib/mock-role";
import { chatbotSendMessage } from "@/lib/services/server-actions";

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
  /** Optional: handle sending the prompt */
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
  const messagesRef = React.useRef<HTMLDivElement>(null);
  const [showScrollFab, setShowScrollFab] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isTyping, setIsTyping] = React.useState(false);

  const isScrollable = React.useCallback(() => {
    const el = messagesRef.current;
    if (!el) return false;
    return el.scrollHeight > el.clientHeight + 2;
  }, []);

  const isNearBottom = React.useCallback(() => {
    const el = messagesRef.current;
    if (!el) return true;
    const threshold = 24; // px tolerance
    return el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
  }, []);

  const updateScrollFabVisibility = React.useCallback(() => {
    const hasScroll = isScrollable();
    const nearBottom = isNearBottom();
    // Only show when content scrolls, user isn't at bottom, and last message is from bot
    const last = messages[messages.length - 1];
    const isBot = last?.type === 'bot';
    setShowScrollFab(hasScroll && !nearBottom && !!isBot);
  }, [isScrollable, isNearBottom, messages]);

  const handleSend = async () => {
    if (isTyping) return;
    const text = input.trim();
    if (!text) return;

    try {
      // Add user message to the chat
      setMessages(prev => [...prev, { type: 'user', text, id: `user-${Date.now()}` }]);
      setInput("");

      let currentSession = sessionId;
      if (!currentSession) {
        // generate a new session id once per drawer session
        currentSession = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        setSessionId(currentSession);
      }

      // Call server action to get AI reply and persist exchange
      try {
        setIsTyping(true);
        if (onSend) {
          await onSend(text, { role });
        }
        const result = await chatbotSendMessage(text, currentSession || undefined);
        const reply = result?.success && result.reply ? result.reply : "I'm having trouble right now. Please try again in a moment.";
        const confidence = result?.confidence ?? 50; // Default to 50 if not provided

        // Add AI response
        setMessages(prev => [...prev, { type: 'bot', text: reply, id: `bot-${Date.now()}` }]);

        // Check confidence level - if below 65%, suggest talking to an advisor
        if (confidence < 65 && result?.success) {
          // Wait a beat before showing advisor suggestion
          setTimeout(() => {
            const advisorSuggestion = "I may not have all the information you need for this question. Would you like to schedule a meeting with your advisor? They can provide more personalized guidance.";
            setMessages(prev => [...prev, { type: 'bot', text: advisorSuggestion, id: `bot-advisor-${Date.now()}` }]);

            // Auto-redirect after additional delay to give user time to read
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/dashboard/meet-with-advisor';
              }
            }, 6000); // 6 seconds after showing the advisor suggestion
          }, 1000); // 1 second after initial response
        }
      } catch (aiErr) {
        console.error('AI send failed:', aiErr);
        setMessages(prev => [...prev, { type: 'bot', text: "I'm having trouble right now. Please try again in a moment.", id: `bot-${Date.now()}` }]);
      } finally {
        setIsTyping(false);
      }
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
        handleSend();
      }, 0);
    } else {
      inputRef.current?.focus();
    }
  };

  // Toggle the scroll-to-bottom FAB based on scroll position and messages
  React.useEffect(() => {
    updateScrollFabVisibility();
  }, [messages, open, updateScrollFabVisibility]);

  const handleMessagesScroll: React.UIEventHandler<HTMLDivElement> = () => {
    updateScrollFabVisibility();
  };

  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    // Hide the FAB after initiating scroll
    setShowScrollFab(false);
  };

  // Simple three-dot typing indicator component
  function TypingIndicator() {
    const [active, setActive] = React.useState(0);
    React.useEffect(() => {
      const id = setInterval(() => {
        setActive(prev => (prev + 1) % 3);
      }, 450);
      return () => clearInterval(id);
    }, []);
    const Dot = ({ index }: { index: number }) => (
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          mx: 0.5,
          backgroundColor: 'text.primary',
          opacity: active === index ? 0.95 : 0.35,
          transition: 'opacity 150ms ease'
        }}
      />
    );
    return (
      <Box sx={{
        maxWidth: '60%',
        p: 1.25,
        px: 1.5,
        borderRadius: 2,
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: 1,
        display: 'inline-flex',
        alignItems: 'center'
      }}>
        <Dot index={0} />
        <Dot index={1} />
        <Dot index={2} />
      </Box>
    );
  }

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
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%", position: 'relative' }}>
        {/* Header with close button */}
        <Box sx={{ mb: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h6" className="font-header font-semibold">
              AI Assistant
            </Typography>
            <Typography variant="body2" className="font-body" color="text.secondary">
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
        <Box ref={messagesRef} onScroll={handleMessagesScroll} sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          mb: 2,
          p: 1,
          backgroundColor: 'grey.50',
          borderRadius: 1,
          minHeight: '200px',
          position: 'relative'
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
              {/* Typing indicator bubble */}
              {isTyping && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <TypingIndicator />
                </Box>
              )}
            </Stack>
          )}

          {/* Scroll-to-bottom FAB in the corner of the messaging window (sticky) */}
          {showScrollFab && (
            <Box
              sx={{
                position: 'sticky',
                bottom: 8,
                display: 'flex',
                justifyContent: 'flex-end',
                zIndex: 1,
                pointerEvents: 'none', // allow clicks to pass through except on the FAB
              }}
            >
              <Fab
                size="small"
                onClick={scrollToBottom}
                sx={{
                  bgcolor: 'success.main',
                  color: 'white',
                  opacity: 0.9,
                  '&:hover': { bgcolor: 'success.dark', opacity: 1 },
                  boxShadow: 3,
                  pointerEvents: 'auto',
                }}
                aria-label="Scroll to bottom"
              >
                <KeyboardArrowDownIcon />
              </Fab>
            </Box>
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
                  // start a new session
                  setSessionId(null);
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
          <Button
            variant="contained"
            color="success"
            onClick={handleSend}
            sx={{ alignSelf: "flex-end" }}
            disabled={isTyping || !input.trim()}
          >
            Send
          </Button>
        </Stack>
      </Box>
    </Drawer>
    </>
  );
}
