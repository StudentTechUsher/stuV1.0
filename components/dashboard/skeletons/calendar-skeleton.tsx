import { Card, CardContent, Skeleton, Box } from "@mui/material";

/* ---------- Right panel: calendar skeleton ---------- */
export default function CalendarSkeleton() {
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