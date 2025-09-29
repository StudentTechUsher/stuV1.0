"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";

type RequirementProgress = {
  label: string;
  percentage: number;
  color: string;
};

const requirements: RequirementProgress[] = [
  { label: "Major", percentage: 63, color: "var(--primary)" },
  { label: "Minor", percentage: 45, color: "#001F54" },
  { label: "General Education", percentage: 78, color: "#2196f3" },
  { label: "Religion", percentage: 92, color: "#5E35B1" },
  { label: "Electives", percentage: 34, color: "#9C27B0" },
];

function SummaryCard({
  children,
  bgColor = "white",
  className = ""
}: {
  children: React.ReactNode;
  bgColor?: string;
  className?: string;
}) {
  return (
    <Box
      sx={{
        backgroundColor: bgColor,
        borderRadius: 2,
        p: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80px",
        flex: 1,
      }}
      className={className}
    >
      {children}
    </Box>
  );
}

function ProgressBar({
  label,
  percentage,
  color
}: RequirementProgress) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <Typography
        variant="body1"
        className="font-brand"
        sx={{
          fontWeight: 700,
          minWidth: "140px",
          mr: 3,
        }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          position: "relative",
          flex: 1,
          height: "32px",
          borderRadius: "16px",
          backgroundColor: "white",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="body2"
            className="font-body-semi"
            sx={{
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            {percentage}% complete
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function AcademicProgressCard() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        backgroundColor: "var(--muted, #f4f4f5)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Summary Section */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            flexDirection: { xs: "column", md: "row" }
          }}
        >
          {/* GPA Card */}
          <SummaryCard bgColor="var(--primary)">
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="h4"
                className="font-header-bold"
                sx={{
                  color: "black",
                  fontWeight: 800,
                }}
              >
                3.98
              </Typography>
              <Typography
                variant="body2"
                className="font-body"
                sx={{
                  color: "black",
                  fontSize: "12px",
                  opacity: 0.8,
                }}
              >
                GPA
              </Typography>
            </Box>
          </SummaryCard>

          {/* Credits Card */}
          <SummaryCard>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="h4"
                className="font-header-bold"
                sx={{
                  color: "black",
                  fontWeight: 800,
                }}
              >
                76
              </Typography>
              <Typography
                variant="body2"
                className="font-body"
                sx={{
                  color: "black",
                  fontSize: "12px",
                  opacity: 0.7,
                }}
              >
                Credits Completed
              </Typography>
            </Box>
          </SummaryCard>

          {/* GPA Calculator Card */}
          <SummaryCard>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="body1"
                className="font-brand-bold"
                sx={{
                  color: "black",
                  fontWeight: 800,
                  fontSize: "16px",
                  mb: 0.5,
                }}
              >
                GPA Prediction Calculator
              </Typography>
              <Typography
                variant="body2"
                className="font-body"
                sx={{
                  color: "var(--muted-foreground, #71717a)",
                  fontSize: "12px",
                }}
              >
                Click Here to Start
              </Typography>
            </Box>
          </SummaryCard>
        </Box>

        {/* Progress Bars Section */}
        <Box>
          {requirements.map((requirement) => (
            <ProgressBar
              key={requirement.label}
              label={requirement.label}
              percentage={requirement.percentage}
              color={requirement.color}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}