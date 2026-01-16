// components/dashboard/calendar-panel-client.tsx
"use client";

import dynamic from "next/dynamic";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Box, Button } from "@mui/material";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { PriorityRegistrationBadge } from "./PriorityRegistrationBadge";
import { CalendarExportButtons } from "./CalendarExportButtons";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

// Determine current/upcoming semester based on BYU schedule
function getCurrentSemester(): string {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // BYU Semester start months
  // Fall: September (9), Winter: January (1), Spring: May (5), Summer: July (7)

  if (currentMonth >= 9 && currentMonth <= 12) {
    // September-December: Fall semester
    return `Your Fall ${currentYear} Schedule`;
  } else if (currentMonth >= 1 && currentMonth <= 4) {
    // January-April: Winter semester
    return `Your Winter ${currentYear} Schedule`;
  } else if (currentMonth >= 5 && currentMonth <= 6) {
    // May-June: Spring semester
    return `Your Spring ${currentYear} Schedule`;
  } else {
    // July-August: Summer semester
    return `Your Summer ${currentYear} Schedule`;
  }
}

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
  slotMinTime?: string; // "08:00:00"
  slotMaxTime?: string; // "19:00:00"
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
  slotMaxTime = "19:00:00",
  firstDay = 1,
  hiddenDays = [0, 6], // Hide Sunday and Saturday
  semester = getCurrentSemester(),
  showSchedulerButton = false,
}: Readonly<Props>) {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(initialEvents);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const slotHeightPx = 7;

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
    <div className="flex h-full max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 px-6 py-4 bg-zinc-900 dark:bg-zinc-100" style={{ borderColor: "var(--primary)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-header-bold text-xl font-extrabold text-zinc-100 dark:text-zinc-900">
            {semester}
          </h2>
          <div className="flex items-center gap-2">
            {/* Export buttons (edit, download PNG, download PDF) */}
            <CalendarExportButtons
              calendarRef={calendarContainerRef}
              semester={semester}
            />
            {showSchedulerButton && (
              <Link href="/semester-scheduler" passHref>
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
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
        {/* Priority Registration Reminder - shows X days before registration */}
        <PriorityRegistrationBadge />

        <div
          ref={calendarContainerRef}
          id="stu-calendar-export-root"
          data-calendar-export="true"
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Calendar */}
          <Box
            data-calendar-export-grid="true"
            sx={{
              p: 0,
              border: "1px solid var(--border)",
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: "var(--background)",
              flex: 1,
              minHeight: 0,

              // FullCalendar theme overrides
              "--fc-border-color": "var(--border)",
              "--fc-timegrid-slot-min-height": `${slotHeightPx}px`,
            "& .fc": {
              backgroundColor: "var(--background)",
              fontSize: "14px",
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
            "& .fc-timegrid-slot": { height: `${slotHeightPx}px !important` },
            "& .fc-timegrid-body": { height: "auto !important" },
            "& .fc-scroller": { overflow: "visible !important" },

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
            slotLaneDidMount={(info) => {
              info.el.style.height = `${slotHeightPx}px`;
              info.el.style.minHeight = `${slotHeightPx}px`;
              info.el.style.maxHeight = `${slotHeightPx}px`;
              const row = info.el.closest('tr');
              if (row instanceof HTMLElement) {
                row.style.height = `${slotHeightPx}px`;
                row.style.minHeight = `${slotHeightPx}px`;
                row.style.maxHeight = `${slotHeightPx}px`;
              }
            }}
            slotLabelDidMount={(info) => {
              info.el.style.height = `${slotHeightPx}px`;
              info.el.style.minHeight = `${slotHeightPx}px`;
              info.el.style.maxHeight = `${slotHeightPx}px`;
              info.el.style.lineHeight = `${slotHeightPx}px`;
              const row = info.el.closest('tr');
              if (row instanceof HTMLElement) {
                row.style.height = `${slotHeightPx}px`;
                row.style.minHeight = `${slotHeightPx}px`;
                row.style.maxHeight = `${slotHeightPx}px`;
              }
            }}
              dayHeaderFormat={{ weekday: "short" }} // Mon Tue Wed...
              headerToolbar={false}
            expandRows={false}
            nowIndicator
            height="auto"
            contentHeight="auto"
              events={allEvents}
              eventClassNames={(arg) => {
                const s = arg.event.extendedProps.status as Props["events"][number]["status"];
                return s ? [`evt-${s}`] : [];
              }}
              // Make event content look like the mock (title on top, time below)
              eventContent={(arg) => (
                <div style={{ padding: "2px 6px", lineHeight: 1.05 }}>
                  <div style={{ fontWeight: 800, fontSize: 9 }}>{arg.event.title}</div>
                  <div style={{ fontSize: 9, opacity: 0.95 }}>{arg.timeText}</div>
                </div>
              )}
            />
          </Box>

          {/* Legend - visual key for event status colors */}
          <div
            className="mt-4 flex flex-shrink-0 items-center gap-4 text-sm"
            data-calendar-export-legend="true"
          >
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
    </div>
  );
}
