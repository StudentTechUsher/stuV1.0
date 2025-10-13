// components/dashboard/calendar-panel-client.tsx
"use client";

import dynamic from "next/dynamic";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Card, CardContent, Box, Typography, Button } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

export type CalendarEvent = {
  id?: string;
  title: string;
  start: string | Date;
  end: string | Date;
  status?: "registered" | "waitlisted" | "blocked";
};

type SchedulerEvent = {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: "class" | "personal";
  status?: "registered" | "waitlisted";
  course_code?: string;
  category?: string;
};

type Props = {
  events: CalendarEvent[];
  slotMinTime?: string; // "07:00:00"
  slotMaxTime?: string; // "20:00:00"
  firstDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 1 = Monday
  hiddenDays?: number[]; // [0] to hide Sunday
  semester?: string;     // e.g. "Winter 2025 Schedule"
  showSchedulerButton?: boolean;
};

const getPrimaryColor = () => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#12F987';
  }
  return '#12F987'; // fallback for SSR
};

function convertSchedulerEventsToCalendarEvents(schedulerEvents: SchedulerEvent[]): CalendarEvent[] {
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Get Monday of current week

  return schedulerEvents.map(event => {
    const eventDate = new Date(currentWeekStart);
    eventDate.setDate(currentWeekStart.getDate() + (event.dayOfWeek - 1)); // Convert to actual date

    const startDateTime = new Date(eventDate);
    const endDateTime = new Date(eventDate);

    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);

    startDateTime.setHours(startHour, startMinute, 0, 0);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    return {
      id: event.id,
      title: event.course_code || event.title,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      status: event.status || (event.type === "personal" ? "blocked" : "registered"),
    };
  });
}

export default function CalendarPanelClient({
  events: initialEvents,
  slotMinTime = "08:00:00",
  slotMaxTime = "18:00:00",
  firstDay = 1,
  hiddenDays = [0],
  semester = "Upcoming Winter 2026",
  showSchedulerButton = false,
}: Readonly<Props>) {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(initialEvents);

  useEffect(() => {
    if (showSchedulerButton && typeof window !== 'undefined') {
      // Load scheduler data from localStorage
      const savedSchedule = localStorage.getItem('scheduler-generated-schedule');
      const savedPersonalEvents = localStorage.getItem('scheduler-personal-events');

      let schedulerEvents: SchedulerEvent[] = [];

      if (savedSchedule) {
        try {
          const parsedSchedule = JSON.parse(savedSchedule);
          schedulerEvents = [...schedulerEvents, ...parsedSchedule];
        } catch (error) {
          console.warn('Invalid scheduler schedule in localStorage', error);
        }
      }

      if (savedPersonalEvents) {
        try {
          const parsedPersonalEvents = JSON.parse(savedPersonalEvents);
          schedulerEvents = [...schedulerEvents, ...parsedPersonalEvents];
        } catch (error) {
          console.warn('Invalid personal events in localStorage', error);
        }
      }

      if (schedulerEvents.length > 0) {
        const convertedEvents = convertSchedulerEventsToCalendarEvents(schedulerEvents);
        setAllEvents(convertedEvents);
      } else {
        setAllEvents(initialEvents);
      }
    } else {
      setAllEvents(initialEvents);
    }
  }, [initialEvents, showSchedulerButton]);
  return (
    <Card 
      elevation={0} 
      sx={{ 
        borderRadius: 3, 
        overflowY: "auto", 
        display: "flex", 
        flexDirection: "column",
        // Glassmorphism effect
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
      <CardContent
        sx={{
          p: 2,
          // Make the content area also transparent with glassmorphism
          background: `linear-gradient(135deg, ${getPrimaryColor()}1a 0%, ${getPrimaryColor()}0d 100%)`,
          backdropFilter: "blur(5px)",
          border: `1px solid ${getPrimaryColor()}33`,
          borderRadius: 2,
          boxShadow: "inset 0 1px 3px rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Title / Semester block with scheduler button */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h5" className="font-header-bold" sx={{ color: "var(--primary-dark, #003228)", fontWeight: 800 }}>
            {semester}
          </Typography>
          {showSchedulerButton && (
            <Link href="/dashboard/semester-scheduler" passHref>
              <Button
                variant="contained"
                size="small"
                startIcon={<Calendar size={16} />}
                className="font-body-semi"
                sx={{
                  background: `linear-gradient(135deg, var(--primary-dark, #003228) 0%, ${getPrimaryColor()}f0 100%)`,
                  backdropFilter: "blur(8px)",
                  border: `2px solid ${getPrimaryColor()}80`,
                  boxShadow: `0 4px 16px ${getPrimaryColor()}66, inset 0 1px 2px rgba(255, 255, 255, 0.2)`,
                  color: "white",
                  fontWeight: 600,
                  "&:hover": { 
                    background: `linear-gradient(135deg, var(--primary-dark, #003228) 0%, ${getPrimaryColor()} 100%)`,
                    boxShadow: `0 6px 20px ${getPrimaryColor()}80, inset 0 1px 3px rgba(255, 255, 255, 0.3)`,
                    transform: "translateY(-1px)",
                  },
                }}
              >
                Open Scheduler
              </Button>
            </Link>
          )}
        </Box>

        {/* Calendar with "mock" look */}
        <Box
          sx={{
            // Outer frame like the mock
            p: 0,
            border: `2px solid ${getPrimaryColor()}4d`,
            borderRadius: 2,
            overflow: "hidden",
            // Glassmorphic container
            background: `linear-gradient(135deg, ${getPrimaryColor()}33 0%, ${getPrimaryColor()}1a 100%)`,
            backdropFilter: "blur(8px)",
            boxShadow: "inset 0 2px 4px rgba(255, 255, 255, 0.1)",

            // FullCalendar theme overrides
            "--fc-border-color": `${getPrimaryColor()}66`,
            "& .fc": { 
              background: `linear-gradient(135deg, ${getPrimaryColor()}26 0%, ${getPrimaryColor()}14 100%)`,
              backdropFilter: "blur(6px)",
            },

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

            // Event "pills"
            "& .fc-event": {
              border: "none",
              borderRadius: 1.5,
              boxShadow: "0 2px 0 rgba(0,0,0,0.25)",
              overflow: "hidden",
            },
            "& .evt-registered .fc-event-main": {
              background: `linear-gradient(135deg, ${getPrimaryColor()}cc 0%, var(--primary-dark, #003228)e6 100%)`,
              backdropFilter: "blur(8px)",
              border: `1px solid ${getPrimaryColor()}66`,
              boxShadow: `0 4px 12px ${getPrimaryColor()}4d, inset 0 1px 2px rgba(255, 255, 255, 0.2)`,
              color: "#fff",
            },
            "& .evt-waitlisted .fc-event-main": {
              background: "linear-gradient(135deg, rgba(230, 230, 230, 0.7) 0%, rgba(200, 200, 200, 0.8) 100%)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(180, 180, 180, 0.5)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.3)",
              color: "#333",
            },

            // Tweak today background with glassmorphism
            "& .fc-timegrid .fc-timegrid-col.fc-day-today": {
              background: `linear-gradient(180deg, ${getPrimaryColor()}1f 0%, ${getPrimaryColor()}0f 100%)`,
              backdropFilter: "blur(4px)",
              boxShadow: `inset 0 1px 2px ${getPrimaryColor()}33`,
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
            events={allEvents}
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

        {/* Legend */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5 }}>
          <LegendDot sx={{ bgcolor: "#000" }} /> Registered
          <LegendDot sx={{ bgcolor: "#e6e6e6", border: "1px solid #cfcfcf" }} /> Waitlisted
        </Box>
      </CardContent>
    </Card>
  );
}

function LegendDot({ sx }: Readonly<{ sx?: SxProps<Theme> }>) {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        display: "inline-block",
        mr: 1,
        ...(typeof sx === "object" && !Array.isArray(sx) ? sx : {}),
      }}
    />
  );
}
