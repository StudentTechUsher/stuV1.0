// components/dashboard/calendar-panel-client.tsx
"use client";

import dynamic from "next/dynamic";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Card, CardContent, Box, Typography } from "@mui/material";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

export type CalendarEvent = {
  id?: string;
  title: string;
  start: string | Date;
  end: string | Date;
  status?: "registered" | "waitlisted" | "blocked";
};

type Props = {
  events: CalendarEvent[];
  slotMinTime?: string; // "07:00:00"
  slotMaxTime?: string; // "20:00:00"
  firstDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 1 = Monday
  hiddenDays?: number[]; // [0] to hide Sunday
  semester?: string;     // e.g. "Winter 2025 Schedule"
};

const MINT = "#12F987";

export default function CalendarPanelClient({
  events,
  slotMinTime = "08:00:00",
  slotMaxTime = "18:00:00",
  firstDay = 1,
  hiddenDays = [0],
  semester = "Ex: Winter 2026",
}: Readonly<Props>) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, overflowY: "auto", height: "50%" }}>
      <CardContent
        sx={{
          p: 2,
          bgcolor: MINT,
          border: "1px solid rgba(0,0,0,0.15)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Title / Semester block */}
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#003228" }}>
          {semester}
        </Typography>

        {/* Calendar with “mock” look */}
        <Box
          sx={{
            // Outer frame like the mock
            p: 0,
            border: "2px solid #000",
            borderRadius: 2,
            overflow: "hidden",

            // FullCalendar theme overrides
            "--fc-border-color": "rgba(0,0,0,0.55)",
            "& .fc": { background: MINT },

            // Make grid lines thicker / clearer
            "& .fc-theme-standard td, & .fc-theme-standard th": {
              borderColor: "rgba(0,0,0,0.55)",
              borderWidth: "1px",
            },
            // Hide all-day row and divider spacing artifacts
            "& .fc-timegrid-divider": { display: "none" },

            // Day headers (MON TUE …)
            "& .fc-col-header-cell-cushion": {
              textTransform: "uppercase",
              fontWeight: 800,
              color: "#003228",
            },

            // Hour labels (8 AM, 9 AM …)
            "& .fc-timegrid-axis-cushion": {
              fontWeight: 700,
              color: "#003228",
            },

            // Row height (taller slots, like the mock)
            "& .fc-timegrid-slot": { height: "48px" },

            // Event “pills”
            "& .fc-event": {
              border: "none",
              borderRadius: 12,
              boxShadow: "0 2px 0 rgba(0,0,0,0.25)",
              overflow: "hidden",
            },
            "& .evt-registered .fc-event-main": {
              background: "#000",
              color: "#fff",
            },
            "& .evt-waitlisted .fc-event-main": {
              background: "#e6e6e6",
              color: "#000",
            },

            // Tweak today background (optional)
            "& .fc-timegrid .fc-timegrid-col.fc-day-today": {
              background: "rgba(0,0,0,0.06)",
            },
          }}
        >
          <FullCalendar
            plugins={[timeGridPlugin]}
            initialView="timeGridWeek"
            allDaySlot={false}
            firstDay={firstDay}
            hiddenDays={hiddenDays}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
            slotDuration="00:30:00"
            slotLabelInterval="01:00"
            slotLabelFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
              hour12: true,
            }}
            dayHeaderFormat={{ weekday: "short" }} // Mon Tue Wed...
            headerToolbar={false}
            expandRows
            nowIndicator
            height="auto"
            events={events}
            eventClassNames={(arg) => {
              const s = arg.event.extendedProps.status as Props["events"][number]["status"];
              return s ? [`evt-${s}`] : [];
            }}
            // Make event content look like the mock (title on top, time below)
            eventContent={(arg) => (
              <div style={{ padding: "4px 8px", lineHeight: 1.1 }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>{arg.event.title}</div>
                <div style={{ fontSize: 12, opacity: 0.95 }}>{arg.timeText}</div>
              </div>
            )}
          />
        </Box>

        {/* Legend & CTA (optional, matches mock) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5 }}>
          <LegendDot sx={{ bgcolor: "#000" }} /> Registered
          <LegendDot sx={{ bgcolor: "#e6e6e6", border: "1px solid #cfcfcf" }} /> Waitlisted
        </Box>
      </CardContent>
    </Card>
  );
}

import type { SxProps, Theme } from "@mui/material/styles";

function LegendDot({ sx }: Readonly<{ sx?: SxProps<Theme> }>) {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        display: "inline-block",
        mr: 1,
        ...sx,
      }}
    />
  );
}
