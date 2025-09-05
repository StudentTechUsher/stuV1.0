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

import { supabase } from "@/lib/supabaseClient";
import { type RoleSlug, isRoleId, toRoleSlug } from "@/lib/auth/roles";
import { getPresetsForRole, type QuickAction } from "@/lib/ai/chat-presets";

type Props = {
  open: boolean;
  onClose: () => void;
  role?: RoleSlug;                    // <- use slug in UI
  presetPrompts?: QuickAction[];
  onSend?: (text: string, meta?: { role?: RoleSlug }) => void | Promise<void>;
};

export default function ChatbotDrawer({
  open,
  onClose,
  role: roleProp,
  presetPrompts,
  onSend,
}: Readonly<Props>) {
  const [resolvedRole, setResolvedRole] = React.useState<RoleSlug | undefined>(roleProp);
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Resolve role client-side if not provided
  React.useEffect(() => {
    if (roleProp) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role_id")
          .eq("id", user.id)
          .single();

        const rid = profile?.role_id as unknown;
        if (!cancelled && isRoleId(rid)) {
          setResolvedRole(toRoleSlug(rid));
        }
      } catch {
        // ignore; fallback below
      }
    })();

    return () => { cancelled = true; };
  }, [roleProp]);

  const effectiveRole = (resolvedRole ?? roleProp ?? "student") as RoleSlug;
  const actions = React.useMemo(
    () => presetPrompts ?? getPresetsForRole(effectiveRole),
    [presetPrompts, effectiveRole]
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    try {
      if (onSend) await onSend(text, { role: effectiveRole });
      else console.log(`[CHAT:${effectiveRole}]`, text);
      setInput(""); inputRef.current?.focus();
    } catch (e) {
      console.error("Failed to send chat message:", e);
    }
  };

  const handleQuickAction = (qa: QuickAction, autoSend = false) => {
    setInput(qa.prompt);
    autoSend ? setTimeout(handleSend, 0) : inputRef.current?.focus();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{ "& .MuiDrawer-paper": { width: 360, boxSizing: "border-box" } }}
    >
      <Box role="presentation" sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Assistant</Typography>
          <Typography variant="body2" color="text.secondary">
            Role: {effectiveRole[0].toUpperCase() + effectiveRole.slice(1)}
          </Typography>
        </Box>

        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography variant="overline" color="text.secondary">Quick actions</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            {actions.map((qa) => (
              <Chip
                key={qa.label}
                label={qa.label}
                onClick={() => handleQuickAction(qa)}
                onDoubleClick={() => handleQuickAction(qa, true)}
                variant="outlined"
                size="small"
              />
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 1 }} />

        <List dense>
          {["New chat", "Recent", "Settings"].map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton onClick={() => { if (text === "New chat") setInput(""); }}>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
          <TextField
            inputRef={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            multiline maxRows={4} fullWidth size="small"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <Button variant="contained" color="success" onClick={handleSend} sx={{ alignSelf: "flex-end" }}>
            Send
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
