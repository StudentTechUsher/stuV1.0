import SchedulingWidget from "@/components/meet-with-advisor/scheduling-widget";

const RAIL_WIDTH = 88;

export default function MeetWithAdvisorPage() {
  return (
    <div style={{ marginLeft: `${RAIL_WIDTH}px`, padding: 16 }}>
      <SchedulingWidget />
    </div>
  );
}
