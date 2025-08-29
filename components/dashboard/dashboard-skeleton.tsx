import { Card, CardContent, Stack, Skeleton, Box } from "@mui/material";


export default function DashboardSkeleton() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-evenly",   // even horizontal spacing
                gap: { xs: 2, md: 4 },
                px: 2,
                flexWrap: "wrap",                 // stack on small screens
            }}
            >
            <Box sx={{ width: { xs: "100%", md: "46%" }, maxWidth: 720 }}>
                <PanelSkeleton />
            </Box>

            <Box sx={{ width: { xs: "100%", md: "46%" }, maxWidth: 720 }}>
                <CalendarSkeleton />
            </Box>
        </Box>
  );
}

/* ---------- Left panel skeleton ---------- */
function PanelSkeleton() {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #eee" }}>
      <CardContent sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" width="40%" height={28} />
          <Skeleton variant="rounded" width="100%" height={180} />
          <Stack spacing={1.2}>
            <Skeleton variant="rounded" width="90%" height={12} />
            <Skeleton variant="rounded" width="70%" height={12} />
            <Skeleton variant="rounded" width="60%" height={12} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ---------- Right panel: calendar skeleton ---------- */
function CalendarSkeleton() {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #eee" }}>
      <CardContent sx={{ p: 2 }}>
        {/* Header: nav arrows + month title */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 40px",
            alignItems: "center",
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="rounded" height={24} />
          <Skeleton variant="circular" width={32} height={32} />
        </Box>

        {/* Weekday labels */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 1,
            mb: 1,
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={14} />
          ))}
        </Box>

        {/* 6 weeks x 7 days grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: "repeat(6, 72px)", // adjust row height to taste
            gap: 1,
          }}
        >
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height="100%" />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}