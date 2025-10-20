"use client";

import { Card, CardContent } from "@mui/material";
import { StuLoader } from "@/components/ui/StuLoader";

/* ---------- Left panel skeleton (dark card) ---------- */
export default function AcademicSummarySkeleton() {
  return (
    <Card
      elevation={10}
      sx={{
        borderRadius: 3,
        bgcolor: "gray-100",
        color: "#FFFFFF",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <StuLoader variant="card" text="Loading academic summary..." />
      </CardContent>
    </Card>
  );
}
