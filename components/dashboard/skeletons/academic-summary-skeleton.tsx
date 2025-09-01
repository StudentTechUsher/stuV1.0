import { Card, CardContent, Stack, Skeleton } from "@mui/material";

/* ---------- Left panel skeleton ---------- */
export default function AcademicSummarySkeleton() {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "2px solid #eee", height: "50%" }}>
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