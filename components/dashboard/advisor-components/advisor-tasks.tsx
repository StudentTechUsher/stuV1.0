// components/dashboard/advisor/advisor-tasks-today.tsx
import * as React from "react";
import Link from "next/link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { AdvisorTask, getAdvisorTasksToday } from "@/lib/dashboard/get-advisor-tasks";

type Props = { advisorId: string };

export default async function AdvisorTasksToday({ advisorId }: Readonly<Props>) {
  const tasks = await getAdvisorTasksToday(advisorId);
  return <TasksView tasks={tasks} />;
}

function TasksView({ tasks }: { tasks: AdvisorTask[] }) {
  const ROW_BG = "#39f38b"; // vibrant green similar to your screenshot
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        borderWidth: 2,
        borderColor: "grey.900",
        boxShadow: 1,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Tasks for Today
      </Typography>

      <List disablePadding>
        {tasks.map((t, idx) => (
          <ListItem
            key={t.id}
            disablePadding
            sx={{ mb: idx === tasks.length - 1 ? 0 : 1.5 }} // gap between rows
          >
            <ListItemButton
              component={t.href ? Link : "div"}
              href={t.href as string | undefined}
              sx={{
                bgcolor: ROW_BG,
                borderRadius: 1.5,
                border: "1px solid rgba(0,0,0,0.4)",
                px: 2,
                py: 1.25,
                alignItems: "center",
                boxShadow: "0 2px 0 rgba(0,0,0,0.15)",
                "&:hover": { bgcolor: "#2fe77f" },
              }}
            >
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography
                  component="div"
                  sx={{ fontWeight: 700, fontSize: 22, lineHeight: 1.25, color: "black" }}
                >
                  {t.chunks.map((chunk, i) =>
                    chunk.underline ? (
                      <Box
                        key={i}
                        component={chunk.href ? Link : "span"}
                        href={chunk.href as string | undefined}
                        sx={{
                          textDecoration: "underline",
                          color: "inherit",
                          "&:hover": { opacity: 0.9 },
                        }}
                      >
                        {chunk.text}
                      </Box>
                    ) : (
                      <span key={i}>{chunk.text}</span>
                    )
                  )}
                </Typography>
              </Box>

              <ChevronRightRounded sx={{ fontSize: 34, color: "black", opacity: 0.8 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
