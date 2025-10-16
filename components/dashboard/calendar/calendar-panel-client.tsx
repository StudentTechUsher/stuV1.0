// components/dashboard/calendar-panel-client.tsx
"use client";

import dynamic from "next/dynamic";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Box, Button } from "@mui/material";
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
    // Modern card layout with rounded corners and bold header
    <div className="flex flex-col overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
      {/* Bold black header like semester-results-table */}
      <div className="border-b-2 px-6 py-4" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-header-bold text-xl font-extrabold text-white">
            {semester}
          </h2>
          {showSchedulerButton && (
            <Link href="/dashboard/semester-scheduler" passHref>
              <Button
                variant="contained"
                size="small"
                startIcon={<Calendar size={16} />}
                className="font-body-semi"
                sx={{
                  backgroundColor: "var(--primary)",
                  color: "#0A0A0A",
                  fontWeight: 700,
                  borderRadius: "7px",
                  textTransform: "none",
                  boxShadow: "0 2px 8px rgba(18, 249, 135, 0.3)",
                  "&:hover": {
                    backgroundColor: "var(--hover-green)",
                  },
                }}
              >
                Open Scheduler
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">

        {/* Calendar */}
        <Box
          sx={{
            p: 0,
            border: "1px solid var(--border)",
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: "var(--background)",

            // FullCalendar theme overrides
            "--fc-border-color": "var(--border)",
            "& .fc": {
              backgroundColor: "var(--background)",
            },

            // Make grid lines thicker / clearer
            "& .fc-theme-standard td, & .fc-theme-standard th": {
              borderColor: "var(--border)",
              borderWidth: "1px",
            },
            // Hide all-day row and divider spacing artifacts
            "& .fc-timegrid-divider": { display: "none" },

            // Day headers (MON TUE …)
            "& .fc-col-header-cell-cushion": {
              textTransform: "uppercase",
              fontWeight: 800,
              color: "var(--dark)",
            },

            // Hour labels (8 AM, 9 AM …)
            "& .fc-timegrid-axis-cushion": {
              fontWeight: 700,
              color: "var(--dark)",
            },

            // Row height (taller slots)
            "& .fc-timegrid-slot": { height: "48px" },

            // Event "pills"
            "& .fc-event": {
              border: "none",
              borderRadius: 1.5,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              overflow: "hidden",
            },
            "& .evt-registered .fc-event-main": {
              backgroundColor: "var(--primary)",
              color: "#fff",
            },
            "& .evt-waitlisted .fc-event-main": {
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
            },

            // Today background
            "& .fc-timegrid .fc-timegrid-col.fc-day-today": {
              backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--background))",
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

        {/* Legend - visual key for event status colors */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[var(--primary)]" />
            <span className="font-body text-[var(--foreground)]">Registered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border border-[var(--border)] bg-[var(--muted)]" />
            <span className="font-body text-[var(--foreground)]">Waitlisted</span>
          </div>
        </div>
      </div>
    </div>
  );
}

