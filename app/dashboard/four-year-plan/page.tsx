import FourYearPlanner from "@/components/four-year-planner/four-year-planner";
import { Box } from "@mui/material";

const RAIL_WIDTH = 80;

export default function FourYearPlanPage() {
  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
      <FourYearPlanner />
    </Box>
  );
}
