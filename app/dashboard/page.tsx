import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import Box from "@mui/material/Box";

export default function DashboardPage() {
    return (
        <Box sx={{ marginLeft: "88px" }}>
            <DashboardSkeleton />
        </Box>
    );
}
