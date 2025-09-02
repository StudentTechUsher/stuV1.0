// components/ai-chat/ChatbotDrawer.tsx
import * as React from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChatbotDrawer({ open, onClose }: Readonly<Props>) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }} // smoother on mobile
      sx={{ "& .MuiDrawer-paper": { width: 320, boxSizing: "border-box" } }}
    >
      <Box role="presentation" sx={{ p: 2 }}>
        <List>
          {["New chat", "Recent", "Settings"].map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
