"use client";

import { Card, CardContent } from "@mui/material";
import { StuLoader } from "@/components/ui/StuLoader";

/* ---------- Right panel: calendar skeleton ---------- */
export default function CalendarSkeleton() {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #eee", minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CardContent sx={{ p: 2 }}>
        <StuLoader variant="card" text="Loading upcoming events..." />
      </CardContent>
    </Card>
  );
}