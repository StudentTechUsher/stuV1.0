"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Button, Typography, Alert, Paper, Collapse, IconButton, CircularProgress } from "@mui/material";
import { Plus, Trash2, BookOpen, Clock, ChevronDown, ChevronUp, Settings } from "lucide-react";
import SchedulerCalendar, { type SchedulerEvent } from "./scheduler-calendar";
import ScheduleGenerator, { type Course } from "./schedule-generator";
import EventManager from "./event-manager";
import ClassInfoDialog from "./class-info-dialog";
import SemesterResultsTable from "./semester-results-table";
import { encodeAccessIdClient } from "@/lib/utils/access-id";
import { CalendarExportButtons } from "@/components/dashboard/calendar/CalendarExportButtons";
import type { CourseScheduleRow } from "@/components/dashboard/calendar/scheduleTableMockData";

// New Integrated Components
import TermSelector from "./TermSelector";
import SchedulePreferencesDialog from "./SchedulePreferencesDialog";
import CourseSelectionDialog from "./CourseSelectionDialog";

// Services
import {
  getActiveScheduleAction,
  createScheduleAction,
  setActiveScheduleAction,
  addBlockedTimeAction,
  updateBlockedTimeAction,
  deleteBlockedTimeAction,
  updateSchedulePreferencesAction,
  getScheduleWithCourseDetailsAction,
  addCourseSelectionAction,
  updateCourseSelectionAction,
  deleteCourseSelectionAction,
  getCourseSectionsAction
} from "@/lib/services/server-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type { StudentSchedule, SchedulePreferences, BlockedTime, CourseSelection } from "@/lib/services/scheduleService";

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
  plan_details?: unknown;
};

type Props = {
  gradPlans?: GradPlan[];
};

// Helper: Convert BlockedTime (DB) to SchedulerEvent (UI)
function convertBlockedTimeToEvent(bt: BlockedTime): SchedulerEvent {
  return {
    id: bt.id,
    title: bt.title,
    category: bt.category,
    dayOfWeek: bt.day_of_week === 7 ? 0 : bt.day_of_week, // Ensure Mon=1..Sat=6, Sun=0 mapping if needed
    startTime: bt.start_time,
    endTime: bt.end_time,
    type: "personal",
    status: "planned" // Default
  };
}

export default function SemesterScheduler({ gradPlans = [] }: Props) {
  // State for Schedule Data
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [personalEvents, setPersonalEvents] = useState<SchedulerEvent[]>([]);
  const [courseEvents, setCourseEvents] = useState<SchedulerEvent[]>([]);
  const [preferences, setPreferences] = useState<SchedulePreferences>({});

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calendarExportRef = useRef<HTMLDivElement>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Term Selection State
  const [selectedTermIndex, setSelectedTermIndex] = useState<number | null>(null);
  const [selectedTermName, setSelectedTermName] = useState<string | null>(null);
  const activeGradPlan = gradPlans.find(plan => plan.isActive) || gradPlans[0];

  // Dialog States
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

  const [prefDialog, setPrefDialog] = useState(false);

  const [courseSelectionDialog, setCourseSelectionDialog] = useState<{
    open: boolean;
    courseCode: string;
    courseTitle: string;
    termName: string;
    universityId: number;
  }>({ open: false, courseCode: '', courseTitle: '', termName: '', universityId: 1 }); // Defaulting Univ ID to 1 for now

  // Add state for university ID (could come from context or props)
  const [universityId] = useState(1);

  // --- Initial Data Load ---
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Get student ID (assuming simple look up or part of session - simplified here)
          const { data: student } = await supabase.from('student').select('id').eq('profile_id', user.id).single();

          if (student) {
            const schedule = await getActiveScheduleAction(student.id);
            if (schedule) {
              setActiveScheduleId(schedule.schedule_id);
              setPersonalEvents(schedule.blocked_times.map(convertBlockedTimeToEvent));
              setPreferences(schedule.preferences);
              setSelectedTermName(schedule.term_name);
              setSelectedTermIndex(schedule.term_index ?? null);

              // Load course details
              loadScheduleCourses(schedule.schedule_id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load initial schedule", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- Helper: Load Full Schedule Details (courses) ---
  const loadScheduleCourses = async (scheduleId: string) => {
    setIsScheduleLoading(true);
    try {
      const details = await getScheduleWithCourseDetailsAction(scheduleId);
      if (!details) return;

      // Transform course selections -> SchedulerEvents
      const events: SchedulerEvent[] = [];
      details.courseDetails.forEach(cd => {
        const section = cd.primarySection; // Only showing primary for calendar view
        if (section && section.meetings_json) {
          // Parse meetings_json
          const meetings = section.meetings_json as { days?: string, start?: string, end?: string, location?: string };
          if (meetings.days && meetings.start && meetings.end) {
            // Map days string (e.g. "MWF") to numbers
            const dayMap: Record<string, number> = { "M": 1, "T": 2, "W": 3, "Th": 4, "F": 5, "S": 6 };
            // Simple parser (robust one is needed for edge cases)
            let currentDays: number[] = [];
            if (meetings.days.includes("Th")) {
              currentDays.push(4);
              meetings.days = meetings.days.replace("Th", "");
            }
            meetings.days.split("").forEach(c => { if (dayMap[c]) currentDays.push(dayMap[c]); });

            currentDays.forEach(d => {
              events.push({
                id: cd.selection.selection_id + '-' + d, // unique composite
                title: cd.selection.course_code, // Use code or title
                dayOfWeek: d,
                startTime: meetings.start!,
                endTime: meetings.end!,
                type: "class",
                status: cd.selection.status,
                course_code: cd.selection.course_code,
                section: section.section_label,
                professor: section.instructor || 'TBA',
                location: meetings.location || 'TBA',
                credits: section.credits_decimal || 3,
                requirement: cd.selection.requirement_type || '',
              });
            });
          }
        }
      });

      setCourseEvents(events);
      if (events.length > 0) setShowResults(true);

    } catch (err) {
      console.error("Error loading course details", err);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  // --- Handlers: Term Selection ---
  const handleTermSelect = async (termName: string, index: number) => {
    setSelectedTermIndex(index);
    setSelectedTermName(termName);

    // Check if user has an active schedule for this term? 
    // For MVP, we'll try to create one if it doesn't exist, or switch to it.
    // Logic: Create new or Switch.

    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase.from('student').select('id').eq('profile_id', user.id).single();
      if (!student) return;

      // Try to create (or find)
      const result = await createScheduleAction(student.id, termName, activeGradPlan?.id, index);

      if (result.success && result.scheduleId) {
        setActiveScheduleId(result.scheduleId);
        // Clear current view
        setPersonalEvents([]);
        setCourseEvents([]);
        setPreferences({});
      } else if (result.error && result.error.includes("already exists")) {
        // It exists, we likely need to fetch it specifically or handle the unique constraint better in service
        // For now, let's assume createSchedule sets it active if it inserts, but if it fails we might need to find it.
        // Wait, createSchedule attempts to insert. If unique constraint fails, we should FETCH that schedule and setActive.
        // Simplified: The user likely wants to SWITCH to this term.
        // Impl detail: We need a getScheduleByTerm method or similar, OR createSchedule should handle this.
        // For this UI demo, we'll notify error if strict.
        setError("Schedule for this term already exists. Please active it manually (Feature WIP).");
      } else {
        setError(result.error || "Failed to create/select schedule for term");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred selecting the term.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers: Personal Events (Blocked Time) ---
  const handleEventSave = async (eventData: Omit<SchedulerEvent, "id"> | SchedulerEvent | Array<Omit<SchedulerEvent, "id"> | SchedulerEvent>) => {
    if (!activeScheduleId) {
      setError("Please select a term first.");
      return;
    }

    // Convert UI event to DB BlockedTime format
    const mapToBlocked = (uievt: any): Omit<BlockedTime, 'id'> => ({
      title: uievt.title || 'Personal Event',
      category: uievt.category || 'Other',
      day_of_week: uievt.dayOfWeek === 0 ? 7 : uievt.dayOfWeek, // UI 0-6 (Sun-Sat) or 1-6? Calendar uses 0=Sun. DB uses? 1-6 usually.
      start_time: uievt.startTime,
      end_time: uievt.endTime
    });

    try {
      if (Array.isArray(eventData)) {
        // Add multiple
        for (const evt of eventData) {
          const payload = mapToBlocked(evt);
          const res = await addBlockedTimeAction(activeScheduleId, payload);
          if (res.success && res.blockedTimeId) {
            setPersonalEvents(prev => [...prev, { ...evt as SchedulerEvent, id: res.blockedTimeId! }]);
          }
        }
      } else if ('id' in eventData && eventData.id) {
        // Update existing
        const payload = mapToBlocked(eventData);
        const res = await updateBlockedTimeAction(activeScheduleId, eventData.id, payload);
        if (res.success) {
          setPersonalEvents(prev => prev.map(e => e.id === eventData.id ? (eventData as SchedulerEvent) : e));
        }
      } else {
        // Add single new
        const payload = mapToBlocked(eventData);
        const res = await addBlockedTimeAction(activeScheduleId, payload);
        if (res.success && res.blockedTimeId) {
          setPersonalEvents(prev => [...prev, { ...eventData as SchedulerEvent, id: res.blockedTimeId! }]);
        }
      }
    } catch (e) {
      console.error("Failed to save blocked time", e);
      setError("Failed to save event.");
    }
  };

  const handleEventDelete = async (eventId: string) => {
    if (!activeScheduleId) return;
    try {
      const res = await deleteBlockedTimeAction(activeScheduleId, eventId);
      if (res.success) {
        setPersonalEvents(prev => prev.filter(e => e.id !== eventId));
        setEventDialog({ isOpen: false, isEdit: false }); // Close dialog
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEventDrop = async (eventId: string, newDayOfWeek: number, newStartTime: string, newEndTime: string) => {
    if (!activeScheduleId) return;
    try {
      // Optimistic update
      setPersonalEvents(prev => prev.map(e => e.id === eventId ? { ...e, dayOfWeek: newDayOfWeek, startTime: newStartTime, endTime: newEndTime } : e));

      const res = await updateBlockedTimeAction(activeScheduleId, eventId, {
        day_of_week: newDayOfWeek === 0 ? 7 : newDayOfWeek,
        start_time: newStartTime,
        end_time: newEndTime
      });

      if (!res.success) {
        // Revert if failed (todo)
        console.error("Drop failed", res.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Handlers: Preferences ---
  const handlePreferencesSave = async (newPrefs: Partial<SchedulePreferences>) => {
    if (!activeScheduleId) return;
    try {
      setPreferences(prev => ({ ...prev, ...newPrefs })); // Optimistic
      await updateSchedulePreferencesAction(activeScheduleId, newPrefs);
    } catch (e) {
      console.error("Failed to update preferences", e);
    }
  };

  // --- UI Wrappers ---
  const allEvents = [...courseEvents, ...personalEvents];

  const getEventColor = (event: SchedulerEvent) => {
    if (event.type === "personal") {
      switch (event.category) {
        case "Work": return "var(--action-cancel)";
        case "Club": return "var(--action-info)";
        case "Sports": return "var(--action-edit)";
        case "Study": return "var(--primary)";
        case "Family": return "var(--hover-gray)";
        default: return "var(--hover-green)";
      }
    }
    return "var(--primary)";
  };

  const getEventBackgroundColor = (event: SchedulerEvent) => {
    if (event.type === "personal") {
      switch (event.category) {
        case "Work": return "rgba(244, 67, 54, 0.1)";
        case "Club": return "rgba(25, 118, 210, 0.1)";
        case "Sports": return "rgba(253, 204, 74, 0.1)";
        case "Study": return "var(--primary-15)";
        case "Family": return "rgba(63, 63, 70, 0.1)";
        default: return "rgba(6, 201, 108, 0.1)";
      }
    }
    return "var(--primary-15)";
  };

  // Mock Grad Plan Terms (extract from plan_details or use dumb array for MVP)
  // Real implementation should parse activeGradPlan.plan_details
  const mockTerms = [
    { term: "Fall 2024", title: "Semester 1" },
    { term: "Winter 2025", title: "Semester 2" },
    { term: "Fall 2025", title: "Semester 3" },
    { term: "Winter 2026", title: "Semester 4" },
    { term: "Fall 2026", title: "Semester 5" },
    { term: "Winter 2027", title: "Semester 6" },
    { term: "Fall 2027", title: "Semester 7" },
    { term: "Winter 2028", title: "Semester 8" }
  ];

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: '"Red Hat Display", sans-serif', fontWeight: 800, mb: 1, fontSize: '2rem' }}>
          Semester Scheduler
        </Typography>
        <Typography variant="body1" className="font-body" color="text.secondary" sx={{ mb: 3 }}>
          Plan your optimal class schedule based on your graduation plan and personal commitments.
        </Typography>

        {/* Term Selector */}
        <Box sx={{ mb: 2 }}>
          <TermSelector
            terms={mockTerms}
            selectedTermIndex={selectedTermIndex}
            selectedYear={null}
            onTermSelect={handleTermSelect}
            isLoading={isLoading}
          />
        </Box>

        {/* Action Buttons Row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Settings size={16} />}
              onClick={() => setPrefDialog(true)}
              disabled={!activeScheduleId}
            >
              Preferences
            </Button>

            {/* Auto-generate triggers a logical flow, maybe just a redirect or modal in future */}
            {/* <ScheduleGenerator ... /> can be re-enabled if updated for DB */}
          </Box>

          <Box>
            {/* Export / Print */}
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" }, gap: 2 }}>
          {/* Left Panel - Personal Events & Controls */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid var(--border)" }}>
              <Typography variant="h6" className="font-header" sx={{ mb: 2, fontWeight: 700 }}>
                Personal Events
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Plus size={16} />}
                onClick={() => setEventDialog({ isOpen: true, isEdit: false })}
                fullWidth
                disabled={!activeScheduleId}
                sx={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  fontWeight: 600,
                  py: 1.25,
                  borderWidth: "1.5px",
                }}
              >
                Add Personal Event
              </Button>

              <Box sx={{ mt: 2.5 }}>
                {personalEvents.map((event) => (
                  <Box
                    key={event.id}
                    onClick={() => setEventDialog({ isOpen: true, event, isEdit: true })}
                    sx={{
                      p: 1.5,
                      mb: 1.5,
                      bgcolor: getEventBackgroundColor(event),
                      borderRadius: 2,
                      borderLeft: `3px solid ${getEventColor(event)}`,
                      border: "1px solid var(--border)",
                      cursor: 'pointer'
                    }}
                  >
                    <Typography variant="caption" className="font-body-semi" sx={{ fontWeight: 600 }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" className="font-body" display="block" color="text.secondary">
                      {event.category} ({event.startTime} - {event.endTime})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Right Panel - Calendar */}
          <Box>
            {isScheduleLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
                <CircularProgress />
              </Box>
            ) : (
              <SchedulerCalendar
                events={allEvents}
                onPersonalEventClick={(evt) => setEventDialog({ isOpen: true, event: evt, isEdit: true })}
                onClassEventClick={(evt) => setClassInfoDialog({ isOpen: true, event: evt })}
                onEventDrop={handleEventDrop}
                onSlotSelect={(day, start, end) => setEventDialog({ isOpen: true, selectedSlot: { dayOfWeek: day, startTime: start, endTime: end }, isEdit: false })}
                slotMinTime={preferences.earliest_class_time || "08:00:00"}
                slotMaxTime={preferences.latest_class_time || "19:00:00"}
                gradPlanEditUrl={`/grad-plan`}
                exportRef={calendarExportRef}
                headerActions={<CalendarExportButtons calendarRef={calendarExportRef} semester="Schedule" tableRows={[]} showEditButton={false} />}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
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
        courses={[]} // Pass real courses if needed for reference
        allEvents={allEvents}
        onReplaceClass={() => { }} // TODO: Implement replace logic
      />

      <SchedulePreferencesDialog
        open={prefDialog}
        onClose={() => setPrefDialog(false)}
        onSave={handlePreferencesSave}
        initialPreferences={preferences}
      />

      {/* CourseSelectionDialog would be triggered by an "Add Course" button usually, not exposed yet in UI above but ready */}
      <CourseSelectionDialog
        open={courseSelectionDialog.open}
        onClose={() => setCourseSelectionDialog(prev => ({ ...prev, open: false }))}
        onSave={async (sel) => {
          // Handle save logic
          if (activeScheduleId) {
            await addCourseSelectionAction(activeScheduleId, {
              course_code: courseSelectionDialog.courseCode,
              requirement_type: 'Core', // heuristic
              primary_offering_id: sel.primaryId,
              backup_1_offering_id: sel.backup1Id || null,
              backup_2_offering_id: sel.backup2Id || null,
              status: 'planned',
              notes: ''
            });
            // Reload
            loadScheduleCourses(activeScheduleId);
          }
        }}
        courseCode={courseSelectionDialog.courseCode}
        courseTitle={courseSelectionDialog.courseTitle}
        termName={courseSelectionDialog.termName}
        universityId={universityId}
      />

    </Box>
  );
}
