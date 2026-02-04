"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Typography, Paper, CircularProgress, Alert } from "@mui/material";

import SchedulerCalendar, { type SchedulerEvent } from "./scheduler-calendar";

import EventManager from "./event-manager";
import ClassInfoDialog from "./class-info-dialog";



// New Integrated Components
import TermSelector from "./TermSelector";
import CourseSelectionDialog from "./CourseSelectionDialog";
import ScheduleGenerationPanel from "./ScheduleGenerationPanel";
import { CalendarExportButtons } from "@/components/dashboard/calendar/CalendarExportButtons";

// Services
import {
  getActiveScheduleAction,
  createScheduleAction,
  addBlockedTimeAction,
  updateBlockedTimeAction,
  deleteBlockedTimeAction,
  updateSchedulePreferencesAction,
  getScheduleWithCourseDetailsAction,
  addCourseSelectionAction
} from "@/lib/services/server-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type { SchedulePreferences, BlockedTime } from "@/lib/services/scheduleService";
import type { GradPlanDetails } from "@/lib/utils/gradPlanHelpers";

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

export default function CourseScheduler({ gradPlans = [] }: Props) {
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
            const currentDays: number[] = [];
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
    const mapToBlocked = (
      uievt: Pick<SchedulerEvent, "title" | "category" | "dayOfWeek" | "startTime" | "endTime">
    ): Omit<BlockedTime, 'id'> => ({
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
            const newEvent: SchedulerEvent = {
              id: res.blockedTimeId,
              title: evt.title,
              dayOfWeek: evt.dayOfWeek,
              startTime: evt.startTime,
              endTime: evt.endTime,
              type: evt.type || "personal",
              status: evt.status || "blocked",
              category: evt.category,
            };
            setPersonalEvents(prev => [...prev, newEvent]);
          }
        }
      } else if ('id' in eventData && eventData.id) {
        // Update existing
        const payload = mapToBlocked(eventData);
        const res = await updateBlockedTimeAction(activeScheduleId, eventData.id, payload);
        if (res.success) {
          const updatedEvent: SchedulerEvent = {
            id: eventData.id,
            title: eventData.title,
            dayOfWeek: eventData.dayOfWeek,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            type: eventData.type,
            status: eventData.status,
            category: eventData.category,
          };
          setPersonalEvents(prev => prev.map(e => e.id === eventData.id ? updatedEvent : e));
        }
      } else {
        // Add single new
        const payload = mapToBlocked(eventData);
        const res = await addBlockedTimeAction(activeScheduleId, payload);
        if (res.success && res.blockedTimeId) {
          const newEvent: SchedulerEvent = {
            id: res.blockedTimeId,
            title: eventData.title,
            dayOfWeek: eventData.dayOfWeek,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            type: eventData.type || "personal",
            status: eventData.status || "blocked",
            category: eventData.category,
          };
          setPersonalEvents(prev => [...prev, newEvent]);
        }
      }
    } catch (error) {
      console.error("Failed to save blocked time", error);
      setError("Failed to save event.");
    }
  };

  const handleEventDelete = async (eventId: string) => {
    if (!activeScheduleId) return;
    try {
      const res = await deleteBlockedTimeAction(activeScheduleId, eventId);
      if (res.success) {
        setPersonalEvents(prev => prev.filter(e => e.id !== eventId));
        // Close dialog and clear all state
        setEventDialog({ isOpen: false, isEdit: false, event: undefined, selectedSlot: undefined });
      }
    } catch (error) {
      console.error("Failed to delete event", error);
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
    } catch (error) {
      console.error("Failed to update preferences", error);
    }
  };

  // --- UI Wrappers ---
  const allEvents = [...courseEvents, ...personalEvents];

  // Extract terms from active grad plan
  const gradPlanTerms = (() => {
    if (!activeGradPlan) {
      console.log('No active grad plan found');
      return [];
    }

    if (!activeGradPlan.plan_details) {
      console.log('No plan_details in grad plan');
      return [];
    }

    // Handle both parsed JSON object and string
    let planDetails: Record<string, unknown>;
    if (typeof activeGradPlan.plan_details === 'string') {
      try {
        planDetails = JSON.parse(activeGradPlan.plan_details);
      } catch (error) {
        console.error('Failed to parse plan_details:', error);
        return [];
      }
    } else {
      planDetails = activeGradPlan.plan_details as Record<string, unknown>;
    }

    const planArray = planDetails.plan as unknown[];

    if (!Array.isArray(planArray)) {
      console.log('plan_details.plan is not an array:', typeof planDetails.plan);
      return [];
    }

    console.log('Found plan array with', planArray.length, 'items');

    // Filter out events/milestones - only keep terms
    const terms = planArray.filter((item): item is { term: string; notes?: string; courses?: unknown[]; credits_planned?: number; is_active?: boolean } => {
      if (typeof item !== 'object' || item === null) return false;
      const candidate = item as Record<string, unknown>;
      // A term has a 'term' property but NOT 'type' and 'afterTerm' (which identify events)
      return 'term' in candidate && !('type' in candidate && 'afterTerm' in candidate);
    });

    console.log('Filtered to', terms.length, 'terms');
    return terms;
  })();

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: '"Red Hat Display", sans-serif', fontWeight: 800, mb: 1, fontSize: '2rem' }}>
          Course Scheduler
        </Typography>
        <Typography variant="body1" className="font-body" color="text.secondary" sx={{ mb: 3 }}>
          Plan your optimal class schedule based on your graduation plan and personal commitments.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Active Grad Plan Display */}
        {activeGradPlan && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Using plan:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {activeGradPlan.name || 'Untitled Plan'}
            </Typography>
          </Box>
        )}

        {/* Term Selector */}
        <Box sx={{ mb: 2 }}>
          <TermSelector
            terms={gradPlanTerms}
            selectedTermIndex={selectedTermIndex}
            selectedYear={null}
            onTermSelect={handleTermSelect}
            isLoading={isLoading}
          />
        </Box>


        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "420px 1fr" }, gap: 2 }}>
          {/* Left Panel - Schedule Generation or Instruction */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {activeScheduleId && selectedTermName !== null && selectedTermIndex !== null ? (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid var(--border)" }}>
                <ScheduleGenerationPanel
                  termName={selectedTermName}
                  termIndex={selectedTermIndex}
                  gradPlanDetails={activeGradPlan?.plan_details ? (typeof activeGradPlan.plan_details === 'string' ? JSON.parse(activeGradPlan.plan_details) : activeGradPlan.plan_details) as GradPlanDetails : null}
                  gradPlanId={activeGradPlan?.id}
                  universityId={universityId}
                  existingPersonalEvents={personalEvents.map(e => ({
                    id: e.id,
                    title: e.title,
                    category: e.category as 'Work' | 'Club' | 'Sports' | 'Study' | 'Family' | 'Other',
                    day_of_week: e.dayOfWeek === 0 ? 7 : e.dayOfWeek,
                    start_time: e.startTime,
                    end_time: e.endTime,
                  }))}
                  existingPreferences={preferences}
                  onComplete={() => {
                    if (activeScheduleId) {
                      loadScheduleCourses(activeScheduleId);
                    }
                  }}
                  onEventsChange={(events) => {
                    // Find NEW events that don't exist in personalEvents yet
                    const existingCount = personalEvents.length;
                    const newEventsFromPanel = events.slice(existingCount); // Get only the new events added

                    // Convert BlockedTime format to SchedulerEvent format
                    const schedulerEvents: Array<Omit<SchedulerEvent, 'id'>> = newEventsFromPanel.map(evt => ({
                      title: evt.title,
                      category: evt.category,
                      dayOfWeek: evt.day_of_week === 7 ? 0 : evt.day_of_week,
                      startTime: evt.start_time,
                      endTime: evt.end_time,
                      type: 'personal' as const,
                      status: 'blocked' as const,
                    }));

                    // Save new events (as an array or individually)
                    if (schedulerEvents.length > 0) {
                      if (schedulerEvents.length === 1) {
                        handleEventSave(schedulerEvents[0]);
                      } else {
                        handleEventSave(schedulerEvents);
                      }
                    }
                  }}
                  onPreferencesChange={(prefs) => {
                    handlePreferencesSave(prefs);
                  }}
                />
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ p: 5, borderRadius: 3, border: "1px solid var(--border)", textAlign: "center" }}>
                <Typography variant="h6" className="font-header" sx={{ mb: 1, fontWeight: 700, color: "text.secondary" }}>
                  Get Started
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select a term from your graduation plan above to begin scheduling your classes.
                </Typography>
              </Paper>
            )}
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
                onPersonalEventClick={(evt) => setEventDialog({ isOpen: true, event: evt, selectedSlot: undefined, isEdit: true })}
                onClassEventClick={(evt) => setClassInfoDialog({ isOpen: true, event: evt })}
                onEventDrop={handleEventDrop}
                onSlotSelect={(day, start, end) => setEventDialog({ isOpen: true, event: undefined, selectedSlot: { dayOfWeek: day, startTime: start, endTime: end }, isEdit: false })}
                slotMinTime={preferences.earliest_class_time || "06:00:00"}
                slotMaxTime={preferences.latest_class_time || "24:00:00"}
                gradPlanEditUrl={`/grad-plan`}
                exportRef={calendarExportRef}
                headerActions={<CalendarExportButtons calendarRef={calendarExportRef} semester="Schedule" tableRows={[]} showEditButton={false} />}
                termName={selectedTermName}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <EventManager
        open={eventDialog.isOpen}
        onClose={() => setEventDialog({ isOpen: false, isEdit: false, event: undefined, selectedSlot: undefined })}
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
