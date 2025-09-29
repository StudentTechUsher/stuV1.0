"use client";

import { useState, useEffect } from "react";
import { Box, Button, Typography, Alert, Paper } from "@mui/material";
import { Plus, Trash2, BookOpen, Clock } from "lucide-react";
import SchedulerCalendar, { type SchedulerEvent } from "./scheduler-calendar";
import ScheduleGenerator, { type Course } from "./schedule-generator";
import EventManager from "./event-manager";
import ClassInfoDialog from "./class-info-dialog";
import { loadMockCourses } from "@/lib/course-parser";

type GradPlan = {
  id: string;
  name: string;
  isActive: boolean;
  requiredCourses: {
    major: number;
    minor: number;
    ge: number;
    elective: number;
    rel: number;
  };
};

type Props = {
  gradPlans?: GradPlan[];
};

export default function SemesterScheduler({ gradPlans = [] }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<SchedulerEvent[]>([]);
  const [personalEvents, setPersonalEvents] = useState<SchedulerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating] = useState(false);

  const getEventColor = (event: SchedulerEvent) => {
    if (event.type === "personal") {
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
          return "var(--muted)";
      }
    }
    return "var(--primary)";
  };

  const getEventBackgroundColor = (event: SchedulerEvent) => {
    if (event.type === "personal") {
      switch (event.category) {
        case "Work":
          return "rgba(244, 67, 54, 0.1)"; // red with 10% opacity
        case "Club":
          return "rgba(25, 118, 210, 0.1)"; // blue with 10% opacity
        case "Sports":
          return "rgba(253, 204, 74, 0.1)"; // yellow with 10% opacity
        case "Study":
          return "var(--primary-15)"; // green with 15% opacity
        case "Family":
          return "rgba(63, 63, 70, 0.1)"; // gray with 10% opacity
        default:
          return "var(--muted)";
      }
    }
    return "var(--primary-15)";
  };
  const [eventDialog, setEventDialog] = useState<{
    isOpen: boolean;
    event?: SchedulerEvent;
    selectedSlot?: { dayOfWeek: number; startTime: string; endTime: string };
    isEdit: boolean;
  }>({ isOpen: false, isEdit: false });
  const [classInfoDialog, setClassInfoDialog] = useState<{
    isOpen: boolean;
    event?: SchedulerEvent;
  }>({ isOpen: false });
  const [showAllPersonalEvents, setShowAllPersonalEvents] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const loadedCourses = await loadMockCourses();
        setCourses(loadedCourses);

        // Load saved personal events from localStorage (mock storage)
        const savedPersonalEvents = localStorage.getItem('scheduler-personal-events');
        if (savedPersonalEvents) {
          try {
            const parsed = JSON.parse(savedPersonalEvents);
            // Validate that events have the new format
            const validEvents = parsed.filter((event: any) =>
              event.dayOfWeek && event.startTime && event.endTime
            );
            setPersonalEvents(validEvents);
          } catch (e) {
            console.warn('Invalid personal events in localStorage, clearing...');
            localStorage.removeItem('scheduler-personal-events');
          }
        }
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Failed to load course data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Combine all events for display
  const allEvents = [...events, ...personalEvents];

  const handleScheduleGenerated = (generatedEvents: SchedulerEvent[]) => {
    setEvents(generatedEvents);
  };

  const handleScheduleSaved = (schedule: SchedulerEvent[]) => {
    // Mock save to localStorage
    localStorage.setItem('scheduler-generated-schedule', JSON.stringify(schedule));
    console.log('Schedule saved to localStorage');
  };

  const handleAddPersonalEvent = () => {
    setEventDialog({
      isOpen: true,
      isEdit: false,
    });
  };


  const handleEventSave = (eventData: Omit<SchedulerEvent, "id"> | SchedulerEvent) => {
    if ('id' in eventData) {
      // Edit existing event
      const updatedEvents = personalEvents.map(event =>
        event.id === eventData.id ? eventData : event
      );
      setPersonalEvents(updatedEvents);
      localStorage.setItem('scheduler-personal-events', JSON.stringify(updatedEvents));
    } else {
      // Add new event
      const newEvent: SchedulerEvent = {
        ...eventData,
        id: `personal-${Date.now()}-${Math.random()}`,
      };
      const updatedEvents = [...personalEvents, newEvent];
      setPersonalEvents(updatedEvents);
      localStorage.setItem('scheduler-personal-events', JSON.stringify(updatedEvents));
    }
  };

  const handlePersonalEventClick = (event: SchedulerEvent) => {
    setEventDialog({
      isOpen: true,
      event,
      isEdit: true,
    });
  };

  const handleClassEventClick = (event: SchedulerEvent) => {
    setClassInfoDialog({
      isOpen: true,
      event,
    });
  };

  const handleEventDrop = (eventId: string, newDayOfWeek: number, newStartTime: string, newEndTime: string) => {
    const updatedEvents = personalEvents.map(event =>
      event.id === eventId
        ? { ...event, dayOfWeek: newDayOfWeek, startTime: newStartTime, endTime: newEndTime }
        : event
    );
    setPersonalEvents(updatedEvents);
    localStorage.setItem('scheduler-personal-events', JSON.stringify(updatedEvents));
  };

  const handleSlotSelect = (dayOfWeek: number, startTime: string, endTime: string) => {
    setEventDialog({
      isOpen: true,
      selectedSlot: { dayOfWeek, startTime, endTime },
      isEdit: false,
    });
  };

  const handleEventDelete = (eventId: string) => {
    const updatedEvents = personalEvents.filter(event => event.id !== eventId);
    setPersonalEvents(updatedEvents);
    localStorage.setItem('scheduler-personal-events', JSON.stringify(updatedEvents));
  };

  const handleClearAllEvents = () => {
    setPersonalEvents([]);
    localStorage.removeItem('scheduler-personal-events');
    setShowAllPersonalEvents(false);
  };

  const handleReplaceClass = (oldEvent: SchedulerEvent, newCourse: Course) => {
    // Remove all events for the old course
    const updatedEvents = events.filter(event =>
      !(event.course_code === oldEvent.course_code && event.section === oldEvent.section)
    );

    // Generate new events for the replacement course
    const newEvents = generateScheduleEventsFromCourse(newCourse);

    // Update the events state
    setEvents([...updatedEvents, ...newEvents]);
  };

  const generateScheduleEventsFromCourse = (course: Course): SchedulerEvent[] => {
    const { days, startTime, endTime } = parseSchedule(course.schedule);
    const events: SchedulerEvent[] = [];

    const dayMap: Record<string, number> = {
      "M": 1, "T": 2, "W": 3, "Th": 4, "F": 5, "S": 6
    };

    days.forEach(day => {
      const dayOfWeek = dayMap[day];
      if (dayOfWeek !== undefined) {
        events.push({
          id: `${course.course_code}-${course.section}-${day}`,
          title: course.course_code,
          dayOfWeek,
          startTime,
          endTime,
          type: "class",
          status: "registered",
          course_code: course.course_code,
          professor: course.professor,
          location: course.location,
          credits: course.credits,
          section: course.section,
          requirement: course.requirement,
        });
      }
    });

    return events;
  };

  const parseSchedule = (schedule: string): { days: string[]; startTime: string; endTime: string } => {
    const parts = schedule.split(" ");
    if (parts.length !== 2) {
      throw new Error(`Invalid schedule format: ${schedule}`);
    }

    const [daysPart, timePart] = parts;
    const [startTime, endTime] = timePart.split("-");

    const days: string[] = [];
    let i = 0;
    while (i < daysPart.length) {
      if (i < daysPart.length - 1 && daysPart.substring(i, i + 2) === "Th") {
        days.push("Th");
        i += 2;
      } else {
        days.push(daysPart[i]);
        i += 1;
      }
    }

    return { days, startTime, endTime };
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" className="font-header-bold" sx={{ mb: 3 }}>
          Semester Scheduler
        </Typography>
        <Typography className="font-body">Loading course data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" className="font-header" sx={{ mb: 3 }}>
          Semester Scheduler
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Red Hat Display", sans-serif',
            fontWeight: 800,
            color: 'black',
            mb: 1,
            fontSize: '2rem'
          }}
        >
          Semester Scheduler
        </Typography>
        <Typography variant="body1" className="font-body" color="text.secondary" sx={{ mb: 3 }}>
          Plan your optimal class schedule based on your graduation plan and personal commitments.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <BookOpen size={16} style={{ color: "var(--muted-foreground)" }} />
            <Typography variant="body2" className="font-body" color="text.secondary">
              Auto-generate from course catalog
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Clock size={16} style={{ color: "var(--muted-foreground)" }} />
            <Typography variant="body2" className="font-body" color="text.secondary">
              Avoid time conflicts
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" }, gap: 2 }}>
        {/* Left Panel - Controls */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <ScheduleGenerator
            gradPlans={gradPlans}
            courses={courses}
            blockedEvents={personalEvents}
            onScheduleGenerated={handleScheduleGenerated}
            onScheduleSaved={handleScheduleSaved}
            isGenerating={isGenerating}
          />

          <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" className="font-header" sx={{ mb: 2 }}>
              Personal Events
            </Typography>
            <Typography variant="body2" className="font-body" color="text.secondary" sx={{ mb: 2 }}>
              Block out time for work, clubs, sports, and other commitments
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Plus size={16} />}
              onClick={handleAddPersonalEvent}
              fullWidth
              sx={{
                borderColor: "var(--muted-foreground)",
                color: "var(--muted-foreground)",
                fontWeight: 500,
                px: 3,
                py: 1.25,
                fontSize: "1rem",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: "var(--hover-gray)",
                  color: "white",
                  borderColor: "var(--hover-gray)",
                },
              }}
            >
              Add Personal Event
            </Button>

            {personalEvents.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<Trash2 size={16} />}
                onClick={handleClearAllEvents}
                fullWidth
                sx={{
                  borderColor: "var(--action-cancel)",
                  color: "var(--action-cancel)",
                  fontWeight: 500,
                  px: 3,
                  py: 1.25,
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  mt: 1,
                  "&:hover": {
                    backgroundColor: "var(--action-cancel)",
                    color: "white",
                    borderColor: "var(--action-cancel)",
                  },
                }}
              >
                Clear All Events
              </Button>
            )}

            {personalEvents.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" className="font-body-semi" sx={{ mb: 1 }}>
                  Current Blocked Times: {personalEvents.length}
                </Typography>
                {(showAllPersonalEvents ? personalEvents : personalEvents.slice(0, 3)).map((event) => (
                  <Box
                    key={event.id}
                    sx={{
                      p: 1,
                      mb: 1,
                      bgcolor: getEventBackgroundColor(event),
                      borderRadius: 1,
                      borderLeft: `3px solid ${getEventColor(event)}`,
                    }}
                  >
                    <Typography variant="caption" className="font-body-semi">
                      {event.title}
                    </Typography>
                    <Typography variant="caption" className="font-body" display="block" color="text.secondary">
                      {event.category}
                    </Typography>
                  </Box>
                ))}
                {personalEvents.length > 3 && !showAllPersonalEvents && (
                  <Typography
                    variant="caption"
                    className="font-body"
                    color="text.secondary"
                    sx={{
                      cursor: "pointer",
                      textDecoration: "underline",
                      "&:hover": { color: "var(--primary)" }
                    }}
                    onClick={() => setShowAllPersonalEvents(true)}
                  >
                    +{personalEvents.length - 3} more events
                  </Typography>
                )}
                {showAllPersonalEvents && personalEvents.length > 3 && (
                  <Typography
                    variant="caption"
                    className="font-body"
                    color="text.secondary"
                    sx={{
                      cursor: "pointer",
                      textDecoration: "underline",
                      "&:hover": { color: "var(--primary)" }
                    }}
                    onClick={() => setShowAllPersonalEvents(false)}
                  >
                    Show less
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Right Panel - Calendar */}
        <Box>
          <SchedulerCalendar
            events={allEvents}
            onPersonalEventClick={handlePersonalEventClick}
            onClassEventClick={handleClassEventClick}
            onEventDrop={handleEventDrop}
            onSlotSelect={handleSlotSelect}
            isGenerating={isGenerating}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
          />
        </Box>
      </Box>

      <EventManager
        open={eventDialog.isOpen}
        onClose={() => setEventDialog({ isOpen: false, isEdit: false })}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
        event={eventDialog.event}
        selectedSlot={eventDialog.selectedSlot}
        isEdit={eventDialog.isEdit}
      />

      <ClassInfoDialog
        open={classInfoDialog.isOpen}
        onClose={() => setClassInfoDialog({ isOpen: false })}
        event={classInfoDialog.event || null}
        courses={courses}
        allEvents={allEvents}
        onReplaceClass={handleReplaceClass}
      />
    </Box>
  );
}