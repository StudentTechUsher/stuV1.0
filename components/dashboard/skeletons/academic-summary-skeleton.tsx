"use client";

import { Card, CardContent, Stack, Skeleton, Box } from "@mui/material";

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
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Stack sx={{ flex: 1 }} spacing={0.8}>
            <Skeleton variant="text" width={180} height={28} />
            <Skeleton variant="text" width={80} height={16} />
          </Stack>
          <Skeleton variant="rounded" width={200} height={18} />
        </Stack>

        {/* Graduation Progress label + pill */}
        <Skeleton variant="text" width={180} height={22} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={44} />

        {/* 4-Year Plan Progress */}
        <Skeleton variant="text" width={210} height={22} sx={{ mt: 3, mb: 1 }} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Skeleton variant="rounded" width={240} height={40} />
          <Skeleton variant="rounded" width={260} height={40} />
        </Stack>

        {/* Follow Through */}
        <Skeleton variant="text" width={260} height={22} sx={{ mt: 3, mb: 1 }} />
        <Skeleton variant="rounded" height={44} />

        {/* Footer lines */}
        <Box sx={{ mt: 2.5 }}>
          <Skeleton variant="text" width={200} height={20} />
          <Skeleton variant="text" width={320} height={18} />
          <Skeleton variant="text" width={340} height={18} />
        </Box>
      </CardContent>
    </Card>
  );
}
