// components/dashboard/calendar-panel.tsx
import CalendarPanelClient, { CalendarEvent } from "./calendar-panel-client";

// Fake fetch for now — replace with your real function later.
async function getUserWeekEventsFake(userId: string): Promise<CalendarEvent[]> {
  await new Promise((r) => setTimeout(r, 3000)); // simulate latency
  return [
    { title: "M COM 320", start: "2025-01-06T09:00:00", end: "2025-01-06T09:45:00", status: "registered" },
    { title: "FIN 401",   start: "2025-01-06T11:00:00", end: "2025-01-06T12:15:00", status: "waitlisted" },
    { title: "IHUM 202",  start: "2025-01-09T13:00:00", end: "2025-01-09T13:45:00", status: "registered" },
  ];
}

export default async function CalendarPanel({
  userId,
  slotMinTime = "07:00:00",
  slotMaxTime = "20:00:00",
}: Readonly<{
  userId: string;
  slotMinTime?: string;
  slotMaxTime?: string;
}>) {
  const events = await getUserWeekEventsFake(userId);
  return (
    <CalendarPanelClient
      events={events}
      slotMinTime={slotMinTime}
      slotMaxTime={slotMaxTime}
      firstDay={0}
      hiddenDays={[0]} // Mon–Sat like your mock
    />
  );
}
