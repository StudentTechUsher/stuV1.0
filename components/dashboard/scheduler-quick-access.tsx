import { Card, CardContent, Box, Typography, Button } from "@mui/material";
import { Calendar, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

export default function SchedulerQuickAccess() {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Calendar size={24} style={{ color: "var(--primary)" }} />
          <Typography variant="h6" className="font-header">
            Semester Scheduler
          </Typography>
        </Box>

        <Typography variant="body2" className="font-body" color="text.secondary" sx={{ mb: 3, flex: 1 }}>
          Plan your optimal class schedule based on your graduation plan and personal commitments.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <BookOpen size={16} style={{ color: "var(--muted-foreground)" }} />
            <Typography variant="body2" className="font-body" color="text.secondary">
              Auto-generate from course catalog
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Clock size={16} style={{ color: "var(--muted-foreground)" }} />
            <Typography variant="body2" className="font-body" color="text.secondary">
              Avoid time conflicts
            </Typography>
          </Box>

          <Link href="/dashboard/semester-scheduler" passHref>
            <Button
              variant="contained"
              fullWidth
              className="font-body-semi"
              sx={{
                mt: 2,
                bgcolor: "var(--primary)",
                color: "white",
                "&:hover": { bgcolor: "var(--hover-green)" },
              }}
            >
              Open Scheduler
            </Button>
          </Link>
        </Box>
      </CardContent>
    </Card>
  );
}