// components/dashboard/calendar-panel.tsx
import CalendarPanelClient, { CalendarEvent } from "./calendar-panel-client";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

type SchedulerEvent = {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: "class" | "personal";
  status?: "registered" | "waitlisted";
  course_code?: string;
  location?: string;
};

const parseDaysString = (days: string): number[] => {
  const dayMap: Record<string, number> = {
    M: 1,
    T: 2,
    W: 3,
    Th: 4,
    R: 4,
    F: 5,
    S: 6,
    U: 7,
  };

  const result: number[] = [];
  if (!days) return result;

  let remaining = days;
  if (remaining.includes("Th")) {
    result.push(dayMap.Th);
    remaining = remaining.replace(/Th/g, "");
  }

  remaining.split("").forEach((char) => {
    const mapped = dayMap[char];
    if (mapped) {
      result.push(mapped);
    }
  });

  return result;
};

const extractMeetings = (meetingsJson: Record<string, unknown> | Record<string, unknown>[] | null) => {
  if (!meetingsJson) return [];
  const meetingsArray = Array.isArray(meetingsJson) ? meetingsJson : [meetingsJson];

  return meetingsArray
    .map((meeting) => ({
      days: meeting.days as string | undefined,
      start: (meeting.start || meeting.start_time) as string | undefined,
      end: (meeting.end || meeting.end_time) as string | undefined,
      location: meeting.location as string | undefined,
    }))
    .filter((meeting) => meeting.days && meeting.start && meeting.end);
};

async function getActiveSchedulerEvents(userId: string): Promise<{
  schedulerEvents: SchedulerEvent[];
  termName?: string | null;
}> {
  const supabase = await createSupabaseServerComponentClient();

  const { data: student, error: studentError } = await supabase
    .from("student")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (studentError || !student) {
    if (studentError) {
      console.error("Failed to fetch student record:", studentError);
    }
    return { schedulerEvents: [] };
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("student_schedules")
    .select("schedule_id, term_name, course_selections")
    .eq("student_id", student.id)
    .eq("is_active", true)
    .maybeSingle();

  if (scheduleError || !schedule) {
    if (scheduleError) {
      console.error("Failed to fetch active schedule:", scheduleError);
    }
    return { schedulerEvents: [] };
  }

  const selections = (schedule.course_selections as Array<{
    primary_offering_id: number | null;
    status?: "planned" | "registered" | "waitlisted" | "dropped";
  }>) || [];

  const offeringIds = selections
    .map((selection) => selection.primary_offering_id)
    .filter((id): id is number => typeof id === "number");

  if (offeringIds.length === 0) {
    return { schedulerEvents: [], termName: schedule.term_name };
  }

  const { data: offerings, error: offeringsError } = await supabase
    .from("course_offerings")
    .select("offering_id, course_code, section_label, meetings_json, instructor, credits_decimal, location_raw")
    .in("offering_id", offeringIds);

  if (offeringsError || !offerings) {
    if (offeringsError) {
      console.error("Failed to fetch course offerings:", offeringsError);
    }
    return { schedulerEvents: [], termName: schedule.term_name };
  }

  const statusByOffering = new Map<number, "registered" | "waitlisted">();
  selections.forEach((selection) => {
    if (!selection.primary_offering_id) return;
    statusByOffering.set(
      selection.primary_offering_id,
      selection.status === "waitlisted" ? "waitlisted" : "registered"
    );
  });

  const schedulerEvents: SchedulerEvent[] = [];

  offerings.forEach((offering) => {
    const meetings = extractMeetings(offering.meetings_json as Record<string, unknown> | Record<string, unknown>[] | null);
    if (meetings.length === 0) return;

    meetings.forEach((meeting) => {
      const days = parseDaysString(meeting.days!);
      days.forEach((dayOfWeek) => {
        schedulerEvents.push({
          id: `${offering.offering_id}-${dayOfWeek}`,
          title: offering.course_code || "Course",
          dayOfWeek,
          startTime: meeting.start!,
          endTime: meeting.end!,
          type: "class",
          status: statusByOffering.get(offering.offering_id) || "registered",
          course_code: offering.course_code || undefined,
          location: meeting.location || offering.location_raw || undefined,
        });
      });
    });
  });

  return { schedulerEvents, termName: schedule.term_name };
}

export default async function CalendarPanel({
  userId,
  slotMinTime = "08:00:00",
  slotMaxTime = "19:00:00",
  showSchedulerButton = false,
}: Readonly<{
  userId: string;
  slotMinTime?: string;
  slotMaxTime?: string;
  showSchedulerButton?: boolean;
}>) {
  const events: CalendarEvent[] = [];
  const { schedulerEvents, termName } = await getActiveSchedulerEvents(userId);
  return (
    <CalendarPanelClient
      events={events}
      slotMinTime={slotMinTime}
      slotMaxTime={slotMaxTime}
      firstDay={0}
      hiddenDays={[0]} // Mon–Sat like your mock
      showSchedulerButton={showSchedulerButton}
      schedulerEvents={schedulerEvents}
      semester={termName ? `Your ${termName} Schedule` : undefined}
    />
  );
}
