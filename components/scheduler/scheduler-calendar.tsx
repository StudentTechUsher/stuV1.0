"use client";

import dynamic from "next/dynamic";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card, CardContent, Box, Typography, Chip } from "@mui/material";
import type { EventClickArg, EventChangeArg, DateSelectArg } from "@fullcalendar/core";
import CreditsPopover from "./CreditsPopover";
import type { ReactNode, RefObject } from "react";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

export type SchedulerEvent = {
  id: string;
  title: string;
  dayOfWeek: number; // 1=Monday, 2=Tuesday, ..., 6=Saturday
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  type: "class" | "personal";
  status?: "registered" | "waitlisted" | "blocked" | "planned" | "dropped";
  course_code?: string;
  professor?: string;
  location?: string;
  credits?: number;
  section?: string;
  requirement?: string;
  category?: "Work" | "Club" | "Sports" | "Study" | "Family" | "Other";
};

type Props = {
  events: SchedulerEvent[];
  onPersonalEventClick?: (event: SchedulerEvent) => void;
  onClassEventClick?: (event: SchedulerEvent) => void;
  onEventDrop?: (eventId: string, newDayOfWeek: number, newStartTime: string, newEndTime: string) => void;
  onSlotSelect?: (dayOfWeek: number, startTime: string, endTime: string) => void;
  slotMinTime?: string;
  slotMaxTime?: string;
  isGenerating?: boolean;
  gradPlanEditUrl?: string;
  exportRef?: RefObject<HTMLDivElement | null>;
  headerActions?: ReactNode;
  termName?: string | null;
};


export default function SchedulerCalendar({
  events,
  onPersonalEventClick,
  onClassEventClick,
  onEventDrop,
  onSlotSelect,
  slotMinTime = "08:00:00",
  slotMaxTime = "19:00:00",
  isGenerating = false,
  gradPlanEditUrl,
  exportRef,
  headerActions,
  termName,
}: Props) {

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      if (event.type === "personal" && onPersonalEventClick) {
        onPersonalEventClick(event);
      } else if (event.type === "class" && onClassEventClick) {
        onClassEventClick(event);
      }
    }
  };

  const handleEventChange = (changeInfo: EventChangeArg) => {
    const event = events.find(e => e.id === changeInfo.event.id);
    if (event && event.type === "personal" && onEventDrop) {
      // Convert changed position back to dayOfWeek and time
      const startValue = changeInfo.event.start ?? (changeInfo.event.startStr ? new Date(changeInfo.event.startStr) : null);
      const endValue = changeInfo.event.end ?? (changeInfo.event.endStr ? new Date(changeInfo.event.endStr) : null);
      if (!startValue || !endValue) return;
      const changedDate = startValue instanceof Date ? startValue : new Date(startValue);
      const dayOfWeek = ((changedDate.getDay() + 6) % 7) + 1; // Convert Sunday=0 to Monday=1 format

      const startTime = changedDate.toTimeString().slice(0, 5); // HH:MM format
      const endDate = endValue instanceof Date ? endValue : new Date(endValue);
      const endTime = endDate.toTimeString().slice(0, 5);

      onEventDrop(event.id, dayOfWeek, startTime, endTime);
    }
  };

  const handleSlotSelect = (selectInfo: DateSelectArg) => {
    if (onSlotSelect) {
      const startDate = new Date(selectInfo.start);
      const endDate = new Date(selectInfo.end);

      // Convert to our dayOfWeek format
      const dayOfWeek = ((startDate.getDay() + 6) % 7) + 1;
      const startTime = startDate.toTimeString().slice(0, 5);
      const endTime = endDate.toTimeString().slice(0, 5);

      onSlotSelect(dayOfWeek, startTime, endTime);
    }
  };

  const getEventColor = (event: SchedulerEvent) => {
    if (event.type === "class") {
      switch (event.status) {
        case "registered":
          return "var(--primary)";
        case "waitlisted":
          return "var(--secondary)";
        default:
          return "var(--primary)";
      }
    } else {
      // Personal events
      switch (event.category) {
        case "Work":
          return "var(--action-cancel)";
        case "Club":
          return "var(--action-info)";
        case "Sports":
          return "var(--action-edit)";
        case "Study":
          return "var(--primary)";
        case "Family":
          return "var(--hover-gray)";
        default:
          return "var(--hover-green)"; // Darker green for "Other"
      }
    }
  };

  const totalCredits = events.filter(e => e.type === "class").reduce((acc, event) => {
    // Only count credits once per unique course
    const courseKey = `${event.course_code}-${event.section}`;
    if (!acc.seenCourses.has(courseKey)) {
      acc.seenCourses.add(courseKey);
      acc.total += (event.credits || 0);
    }
    return acc;
  }, { total: 0, seenCourses: new Set() }).total;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      }}
    >
      {/* Black Header Bar */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          backgroundColor: "#0A0A0A",
          borderBottom: "1px solid #0A0A0A",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h5" className="font-header" sx={{ color: "white", fontWeight: 700 }}>
            {termName ? `Weekly Schedule for ${termName}` : 'Weekly Schedule'}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", color: "white" }}>
            {/* Total Credits Counter */}
            <CreditsPopover credits={totalCredits} colorScheme="dark" gradPlanEditUrl={gradPlanEditUrl} />
            {headerActions}
            {isGenerating && (
              <Chip
                label="Generating..."
                size="small"
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.15)",
                  color: "white",
                  fontWeight: 600,
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 3, height: "100%" }}>
        <Box
          ref={exportRef}
          id="stu-calendar-export-root"
          data-calendar-export="true"
          sx={{ display: "flex", flexDirection: "column" }}
        >
          <Box
            data-calendar-export-grid="true"
            sx={{
              height: "900px",
              border: "1px solid var(--border)",
              borderRadius: 2,
              overflow: "hidden",

              "--fc-border-color": "var(--border)",
              "& .fc": { background: "var(--background)" },

              "& .fc-theme-standard td, & .fc-theme-standard th": {
                borderColor: "var(--border)",
              },

              "& .fc-timegrid-divider": { display: "none" },

              "& .fc-col-header-cell-cushion": {
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--foreground)",
                fontFamily: "Work Sans, sans-serif",
              },

              "& .fc-timegrid-axis-cushion": {
                fontWeight: 600,
                color: "var(--muted-foreground)",
                fontFamily: "Inter, sans-serif",
              },

              "& .fc-timegrid-slot": { height: "9px" },

              "& .fc-event": {
                border: "none",
                borderRadius: "6px",
                overflow: "hidden",
                cursor: "pointer",
              },

              "& .fc-event.class-event .fc-event-main": {
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                color: "var(--muted-foreground)",
              },

              "& .fc-event.personal-event .fc-event-main": {
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                opacity: 0.8,
              },

              "& .fc-event.waitlisted .fc-event-main": {
                background: "repeating-linear-gradient(45deg, var(--secondary), var(--secondary) 10px, var(--muted) 10px, var(--muted) 20px)",
                color: "var(--foreground)",
              },

              "& .fc-select-helper": {
                background: "var(--primary-15)",
                border: "2px dashed var(--primary)",
              },
            }}
          >
            <FullCalendar
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              allDaySlot={false}
              firstDay={1}
              hiddenDays={[0]}
              slotMinTime={slotMinTime}
              slotMaxTime={slotMaxTime}
              validRange={{
                start: '2024-01-01',
                end: '2024-01-08'
              }}
              slotDuration="00:30:00"
              slotLabelInterval="01:00"
              slotLabelFormat={{
                hour: "numeric",
                meridiem: "short",
                hour12: true,
              }}
              dayHeaderFormat={{ weekday: "short" }}
              headerToolbar={false}
              expandRows
              nowIndicator={false}
              height="100%"
              selectable
              selectMirror
              editable
              eventResizableFromStart
              eventDurationEditable
              events={events.filter(event => event.startTime && event.endTime).map(event => {
                // Convert to generic weekly format - use a fixed week
                const baseDate = new Date(2024, 0, 1); // January 1, 2024 (Monday)
                const eventDate = new Date(baseDate);
                eventDate.setDate(baseDate.getDate() + (event.dayOfWeek - 1));

                const [startHour, startMin] = event.startTime.split(':').map(Number);
                const [endHour, endMin] = event.endTime.split(':').map(Number);

                const startDateTime = new Date(eventDate);
                startDateTime.setHours(startHour, startMin, 0, 0);

                const endDateTime = new Date(eventDate);
                endDateTime.setHours(endHour, endMin, 0, 0);

                return {
                  id: event.id,
                  title: event.title,
                  start: startDateTime,
                  end: endDateTime,
                  backgroundColor: getEventColor(event),
                  borderColor: getEventColor(event),
                  classNames: [
                    event.type === "class" ? "class-event" : "personal-event",
                    event.status || "",
                  ],
                  editable: event.type === "personal",
                  startEditable: event.type === "personal",
                  durationEditable: event.type === "personal",
                  extendedProps: {
                    type: event.type,
                    status: event.status,
                    category: event.category,
                    course_code: event.course_code,
                    professor: event.professor,
                    location: event.location,
                  },
                };
              })}
              select={handleSlotSelect}
              eventClick={handleEventClick}
              eventChange={handleEventChange}
              eventContent={(arg) => (
                <div style={{ padding: "2px 6px", lineHeight: 1.1 }}>
                  <div style={{ fontWeight: 700, fontSize: "9px" }}>
                    {arg.event.extendedProps.course_code || arg.event.title}
                  </div>
                  {arg.event.extendedProps.location && (
                    <div style={{ fontSize: "8px", opacity: 0.9 }}>
                      {arg.event.extendedProps.location}
                    </div>
                  )}
                </div>
              )}
            />
          </Box>

          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2, flexWrap: "wrap" }}
            data-calendar-export-legend="true"
          >
            <LegendItem color="var(--primary)" label="Registered Classes" />
            <LegendItem color="var(--secondary)" label="Waitlisted" pattern />
            <LegendItem color="var(--muted)" label="Personal Events" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function LegendItem({
  color,
  label,
  pattern = false
}: {
  color: string;
  label: string;
  pattern?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: "4px",
          background: pattern
            ? `repeating-linear-gradient(45deg, ${color}, ${color} 4px, var(--muted) 4px, var(--muted) 8px)`
            : color,
        }}
      />
      <Typography variant="caption" className="font-body">
        {label}
      </Typography>
    </Box>
  );
}
