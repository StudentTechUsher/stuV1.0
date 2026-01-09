"use client";

import { useState, useEffect } from "react";
import { Box, Button, Typography, Alert, Paper, Collapse, IconButton } from "@mui/material";
import { Plus, Trash2, BookOpen, Clock, Minus, ChevronDown, ChevronUp } from "lucide-react";
import SchedulerCalendar, { type SchedulerEvent } from "./scheduler-calendar";
import ScheduleGenerator, { type Course } from "./schedule-generator";
import EventManager from "./event-manager";
import ClassInfoDialog from "./class-info-dialog";
import SemesterResultsTable from "./semester-results-table";
import { loadMockCourses } from "@/lib/course-parser";
import { encodeAccessIdClient } from "@/lib/utils/access-id";

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

  // Find active grad plan and construct edit URL
  const activeGradPlan = gradPlans.find(plan => plan.isActive) || gradPlans[0];
  const gradPlanEditUrl = activeGradPlan
    ? `/grad-plan/${encodeAccessIdClient(activeGradPlan.id)}`
    : '/grad-plan';

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
          return "var(--hover-green)"; // Darker green for "Other"
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
          return "rgba(6, 201, 108, 0.1)"; // Darker green with opacity for "Other"
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
  const [showInstructions, setShowInstructions] = useState(true);

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
            const parsed: unknown = JSON.parse(savedPersonalEvents);
            if (Array.isArray(parsed)) {
              const validEvents = parsed.filter((event): event is SchedulerEvent => {
                if (!event || typeof event !== 'object') return false;
                const candidate = event as Partial<SchedulerEvent>;
                return typeof candidate.dayOfWeek === 'number'
                  && typeof candidate.startTime === 'string'
                  && typeof candidate.endTime === 'string';
              });
              setPersonalEvents(validEvents);
            } else {
              setPersonalEvents([]);
            }
          } catch (parseError) {
            console.warn('Invalid personal events in localStorage, clearing...', parseError);
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

  const [showResults, setShowResults] = useState(false);

  const handleScheduleGenerated = (generatedEvents: SchedulerEvent[]) => {
    setEvents(generatedEvents);
    setShowResults(true); // Show results table when schedule is generated
  };

  const handleScheduleSaved = (schedule: SchedulerEvent[]) => {
    // Mock save to localStorage
    localStorage.setItem('scheduler-generated-schedule', JSON.stringify(schedule));
  };

  const handleAddPersonalEvent = () => {
    setEventDialog({
      isOpen: true,
      isEdit: false,
    });
  };


  const handleEventSave = (eventData: Omit<SchedulerEvent, "id"> | SchedulerEvent | Array<Omit<SchedulerEvent, "id"> | SchedulerEvent>) => {
    // Handle array of events (for multi-day selection)
    if (Array.isArray(eventData)) {
      const newEvents: SchedulerEvent[] = eventData.map((evt, index) => ({
        ...evt,
        id: 'id' in evt ? evt.id : `personal-${Date.now()}-${Math.random()}-${index}`,
      })) as SchedulerEvent[];

      const updatedEvents = [...personalEvents, ...newEvents];
      setPersonalEvents(updatedEvents);
      localStorage.setItem('scheduler-personal-events', JSON.stringify(updatedEvents));
    } else if ('id' in eventData) {
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

  const handleSectionClick = (courseCode: string, section: string) => {
    // Find the event for this course
    const courseEvent = events.find(e => e.course_code === courseCode && e.section === section);
    if (courseEvent) {
      setClassInfoDialog({
        isOpen: true,
        event: courseEvent,
      });
    }
  };

  const handleInstructorClick = (courseCode: string, instructor: string) => {
    // Find the event for this course
    const courseEvent = events.find(e => e.course_code === courseCode && e.professor === instructor);
    if (courseEvent) {
      setClassInfoDialog({
        isOpen: true,
        event: courseEvent,
      });
    }
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

  // Convert SchedulerEvents to CourseRow format for SemesterResultsTable
  const convertEventsToRows = (events: SchedulerEvent[]) => {
    // Group events by course code to avoid duplicates
    const courseMap = new Map<string, SchedulerEvent>();

    events.forEach(event => {
      if (event.type === 'class' && event.course_code) {
        const key = `${event.course_code}-${event.section || ''}`;
        if (!courseMap.has(key)) {
          courseMap.set(key, event);
        }
      }
    });

    // Convert to rows
    return Array.from(courseMap.values()).map(event => {
      // Determine requirement chip color based on requirement type
      const getRequirementColor = (req: string): 'green' | 'blue' | 'purple' | 'indigo' | 'magenta' => {
        const reqLower = req.toLowerCase();
        if (reqLower.includes('major')) return 'green';
        if (reqLower.includes('ge') || reqLower.includes('general')) return 'blue';
        if (reqLower.includes('minor')) return 'purple';
        if (reqLower.includes('rel')) return 'indigo';
        return 'magenta'; // elective
      };

      // Format days for display
      const dayOfWeekMap: Record<number, string> = {
        1: 'M', 2: 'T', 3: 'W', 4: 'Th', 5: 'F', 6: 'S'
      };

      const allDaysForCourse = events
        .filter(e => e.course_code === event.course_code && e.section === event.section)
        .map(e => dayOfWeekMap[e.dayOfWeek])
        .filter(Boolean);

      // Combine adjacent days (M,W -> MW, T,Th -> TTh)
      const days = Array.from(new Set(allDaysForCourse)).sort();

      return {
        courseCode: event.course_code || 'Unknown',
        title: event.title || '',
        section: event.section || '000',
        difficulty: '__/5', // Default placeholder
        instructor: event.professor || 'TBA',
        days: days as ('M' | 'T' | 'W' | 'Th' | 'F' | 'MW' | 'TTh' | 'Fri')[],
        time: `${event.startTime}-${event.endTime}`,
        location: event.location || 'TBA',
        hours: event.credits || 3.0,
        requirements: event.requirement ? [{
          label: event.requirement,
          color: getRequirementColor(event.requirement)
        }] : [],
        status: 'active' as const,
      };
    });
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

        {/* Instructional Card */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 3,
            border: "2px solid var(--primary)",
            backgroundColor: "var(--card)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 3,
              backgroundColor: "color-mix(in srgb, var(--primary) 5%, var(--card))",
              borderBottom: showInstructions ? "1px solid var(--border)" : "none",
            }}
          >
            <Typography
              variant="h6"
              className="font-header"
              sx={{
                fontWeight: 800,
                color: "var(--foreground)",
                fontSize: "1.125rem",
              }}
            >
              How to Schedule Your Semester
            </Typography>
            <IconButton
              onClick={() => setShowInstructions(!showInstructions)}
              size="small"
              sx={{
                color: "var(--primary)",
                "&:hover": {
                  backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                },
              }}
              aria-label={showInstructions ? "Collapse instructions" : "Expand instructions"}
            >
              {showInstructions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </IconButton>
          </Box>

          <Collapse in={showInstructions}>
            <Box sx={{ p: 3 }}>
              <Box
                component="ol"
                sx={{
                  m: 0,
                  pl: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                  listStyle: "none",
                  counterReset: "step-counter",
                }}
              >
                {[
                  "Add your time constraints (work schedule, clubs, study time, family commitments, etc.)",
                  "Select your active graduation plan",
                  "Auto-generate your course schedule",
                  "Review and make any adjustments you need"
                ].map((step, index) => (
                  <Box
                    key={index}
                    component="li"
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 2.5,
                      counterIncrement: "step-counter",
                      "&::before": {
                        content: "counter(step-counter)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "var(--primary)",
                        color: "var(--dark)",
                        fontWeight: 800,
                        fontSize: "1rem",
                        fontFamily: '"Red Hat Display", sans-serif',
                      },
                    }}
                  >
                    <Typography
                      variant="body1"
                      className="font-body"
                      sx={{
                        color: "var(--foreground)",
                        fontWeight: 600,
                        fontSize: "1rem",
                        lineHeight: 1.7,
                        pt: 0.75,
                      }}
                    >
                      {step}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Collapse>
        </Paper>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Top Section - Controls + Calendar */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" }, gap: 2 }}>
          {/* Left Panel - Controls */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <ScheduleGenerator
              gradPlans={gradPlans}
              courses={courses}
              blockedEvents={personalEvents}
              onScheduleGenerated={handleScheduleGenerated}
              onScheduleSaved={handleScheduleSaved}
            />

            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid var(--border)",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Typography variant="h6" className="font-header" sx={{ mb: 2, fontWeight: 700, color: "var(--foreground)" }}>
                Personal Events
              </Typography>
              <Typography variant="body2" className="font-body" sx={{ color: "var(--muted-foreground)", mb: 2.5, fontWeight: 500 }}>
                Block out time for work, clubs, sports, and other commitments
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Plus size={16} />}
                onClick={handleAddPersonalEvent}
                fullWidth
                sx={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  fontWeight: 600,
                  px: 2.5,
                  py: 1.25,
                  borderWidth: "1.5px",
                  "&:hover": {
                    backgroundColor: "color-mix(in srgb, var(--muted) 15%, white)",
                    borderColor: "var(--foreground)",
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
                    fontWeight: 600,
                    px: 2.5,
                    py: 1.25,
                    mt: 1.5,
                    borderWidth: "1.5px",
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
                <Box sx={{ mt: 2.5 }}>
                  <Typography variant="subtitle2" className="font-body-semi" sx={{ mb: 1.5, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                    Current Blocked Times: {personalEvents.length}
                  </Typography>
                  {(showAllPersonalEvents ? personalEvents : personalEvents.slice(0, 3)).map((event) => (
                    <Box
                      key={event.id}
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        bgcolor: getEventBackgroundColor(event),
                        borderRadius: 2,
                        borderLeft: `3px solid ${getEventColor(event)}`,
                        border: "1px solid var(--border)",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <Typography variant="caption" className="font-body-semi" sx={{ fontWeight: 600, color: "var(--foreground)" }}>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" className="font-body" display="block" sx={{ color: "var(--muted-foreground)", fontWeight: 500, mt: 0.25 }}>
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
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              gradPlanEditUrl={gradPlanEditUrl}
            />
          </Box>
        </Box>

        {/* Bottom Section - Results Table (Full Width) */}
        {showResults && events.length > 0 && (() => {
          const rows = convertEventsToRows(events);
          const totalCredits = rows.reduce((sum, row) => sum + row.hours, 0);

          return (
            <Box sx={{ width: "100%", mb: 4 }}>
              <SemesterResultsTable
                termLabel="Winter 2025 Classes"
                totalCredits={totalCredits}
                scheduleDifficulty="?/5"
                addDropDeadline="12 Sept"
                rows={rows}
                onWithdraw={(courseCode) => {
                  console.log(`Withdraw requested for ${courseCode}`);
                }}
                onSectionClick={handleSectionClick}
                onInstructorClick={handleInstructorClick}
                gradPlanEditUrl={gradPlanEditUrl}
              />
            </Box>
          );
        })()}
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
