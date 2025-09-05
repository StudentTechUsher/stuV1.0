// components/dashboard/advisor/advisor-daily-insights.tsx
"use client"; // remove this line if you convert to an async server component

import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getAdvisorDailyInsights } from "@/lib/dashboard/get-advisor-daily-insights";

type AdvisorDailyInsights = {
  percentPlansUpdated: number;
  studentsOnProbation: number;
  planningRequisitions: number;
  plansAwaitingReview: number;
};

type Props = { advisorId: string };

export default function AdvisorDailyInsights({ advisorId }: Readonly<Props>) {
  const [data, setData] = React.useState<null | AdvisorDailyInsights>(null);

  React.useEffect(() => {
    getAdvisorDailyInsights(advisorId).then(setData);
  }, [advisorId]);

  if (!data) return <Typography>Loading...</Typography>;
  return <InsightsView data={data} />;
}

function InsightsView({ data }: { data: AdvisorDailyInsights }) {
  const tiles = [
    { title: "Students with updated Grad Plans", value: `${Math.round(data.percentPlansUpdated)}%`, color: "#D48A19" },
    { title: "Students on Academic Probation", value: String(data.studentsOnProbation), color: "#2EAD4A" },
    { title: "Academic Planning Requisitions", value: String(data.planningRequisitions), color: "#E1342C" },
    { title: "Four Year Plans awaiting Review", value: String(data.plansAwaitingReview), color: "#D48A19" },
  ] as const;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderWidth: 2, borderColor: "grey.900", boxShadow: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Your Daily Insights
      </Typography>

      <Grid container spacing={2}>
        {tiles.map((t) => (
          <Grid key={t.title} size={{ xs: 12, md: 6 }}>
            <Paper
              component="div"
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                height: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t.title}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <Typography
                  component="span"
                  sx={{ fontSize: 64, lineHeight: 1, fontWeight: 700, color: t.color, textShadow: "0 1px 0 rgba(0,0,0,0.08)" }}
                >
                  {t.value}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
