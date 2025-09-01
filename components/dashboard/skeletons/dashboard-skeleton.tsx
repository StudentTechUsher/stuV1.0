import { Box } from "@mui/material";
import AcademicSummarySkeleton from "./academic-summary-skeleton";
import CalendarSkeleton from "./calendar-skeleton";


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
                <AcademicSummarySkeleton />
            </Box>

            <Box sx={{ width: { xs: "100%", md: "46%" }, maxWidth: 720 }}>
                <CalendarSkeleton />
            </Box>
        </Box>
  );
}