"use client"

import { InlineWidget } from "react-calendly";

interface SchedulingWidgetProps {
  readonly url?: string;
}

export default function SchedulingWidget({ url }: SchedulingWidgetProps) {
  const calendlyUrl = url ? `https://calendly.com/${url}` : "https://calendly.com/matthew-jones6288/15min";
  
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <InlineWidget url={calendlyUrl} styles={{ height: 700 }} />
    </div>
  )
}