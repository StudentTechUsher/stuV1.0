"use client";

import { useState } from "react";
import { Card, CardContent, Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, Alert, LinearProgress } from "@mui/material";
import { RefreshCw, Save, Calendar, Plus } from "lucide-react";
import type { SchedulerEvent } from "./scheduler-calendar";

export type Course = {
  course_code: string;
  course_name: string;
  section: string;
  professor: string;
  schedule: string; // e.g., "MWF 10:00-10:50"
  location: string;
  credits: number;
  requirement: string; // MAJOR, MINOR, GE, ELECTIVE, REL
};

export type GradPlan = {
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
  gradPlans: GradPlan[];
  courses: Course[];
  blockedEvents: SchedulerEvent[];
  onScheduleGenerated: (events: SchedulerEvent[]) => void;
  onScheduleSaved: (schedule: SchedulerEvent[]) => void;
  isGenerating?: boolean;
};

export default function ScheduleGenerator({
  gradPlans,
  courses,
  blockedEvents,
  onScheduleGenerated,
  onScheduleSaved,
  isGenerating = false,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState(
    gradPlans.find(p => p.isActive)?.id || gradPlans[0]?.id || ""
  );
  const [currentSchedule, setCurrentSchedule] = useState<SchedulerEvent[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedGradPlan = gradPlans.find(p => p.id === selectedPlan);

  const parseSchedule = (schedule: string): { days: string[]; startTime: string; endTime: string } => {
    const parts = schedule.split(" ");
    if (parts.length !== 2) {
      throw new Error(`Invalid schedule format: ${schedule}`);
    }

    const [daysPart, timePart] = parts;
    const [startTime, endTime] = timePart.split("-");

    // Parse days (e.g., "MWF" -> ["M", "W", "F"])
    const dayMap: Record<string, number> = {
      "M": 1, "T": 2, "W": 3, "Th": 4, "F": 5, "S": 6
    };

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

  const generateScheduleEvents = (course: Course): SchedulerEvent[] => {
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

  const hasTimeConflict = (newEvents: SchedulerEvent[], existingEvents: SchedulerEvent[]): boolean => {
    for (const newEvent of newEvents) {
      for (const existing of existingEvents) {
        // Same day?
        if (newEvent.dayOfWeek !== existing.dayOfWeek) continue;

        // Convert times to minutes for easier comparison
        const newStartMin = timeToMinutes(newEvent.startTime);
        const newEndMin = timeToMinutes(newEvent.endTime);
        const existingStartMin = timeToMinutes(existing.startTime);
        const existingEndMin = timeToMinutes(existing.endTime);

        // Check if times overlap
        if (newStartMin < existingEndMin && newEndMin > existingStartMin) {
          return true;
        }
      }
    }
    return false;
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const generateSchedule = async () => {
    if (!selectedGradPlan) return;

    setGenerating(true);
    setShowSuccess(false);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const requirements = selectedGradPlan.requiredCourses;
      const allEvents: SchedulerEvent[] = [...blockedEvents];
      const MAX_CREDITS = 18; // Maximum credits per semester

      // Group courses by requirement type
      const coursesByType = {
        MAJOR: courses.filter(c => c.requirement === "MAJOR"),
        MINOR: courses.filter(c => c.requirement === "MINOR"),
        GE: courses.filter(c => c.requirement === "GE"),
        ELECTIVE: courses.filter(c => c.requirement === "ELECTIVE"),
        REL: courses.filter(c => c.requirement === "REL"),
      };

      // Try to select courses for each requirement
      const selectedCourses: Course[] = [];
      let totalCredits = 0;

      // Helper function to try adding courses
      const tryAddCourses = (availableCourses: Course[], count: number) => {
        const shuffled = [...availableCourses].sort(() => Math.random() - 0.5);

        for (const course of shuffled) {
          // Check credit limit
          if (totalCredits + course.credits > MAX_CREDITS) {
            continue; // Skip this course, it would exceed credit limit
          }

          if (selectedCourses.length >= Object.values(requirements).reduce((a, b) => a + b, 0)) break;

          try {
            const courseEvents = generateScheduleEvents(course);

            // Check for conflicts with existing events
            if (!hasTimeConflict(courseEvents, allEvents)) {
              allEvents.push(...courseEvents);
              selectedCourses.push(course);
              totalCredits += course.credits;

              if (selectedCourses.filter(c => c.requirement === course.requirement).length >= count) {
                break;
              }
            }
          } catch (error) {
            console.warn(`Could not parse schedule for ${course.course_code}: ${course.schedule}`);
          }
        }
      };

      // Add courses by priority
      tryAddCourses(coursesByType.MAJOR, requirements.major);
      tryAddCourses(coursesByType.MINOR, requirements.minor);
      tryAddCourses(coursesByType.GE, requirements.ge);
      tryAddCourses(coursesByType.ELECTIVE, requirements.elective);
      tryAddCourses(coursesByType.REL, requirements.rel);

      // Filter to only class events for the generated schedule
      const classEvents = allEvents.filter(e => e.type === "class");
      setCurrentSchedule(classEvents);
      onScheduleGenerated(classEvents);

    } catch (error) {
      console.error("Error generating schedule:", error);
    } finally {
      setGenerating(false);
    }
  };

  const saveSchedule = () => {
    onScheduleSaved(currentSchedule);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Card elevation={0} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" className="font-header" sx={{ mb: 2 }}>
            Schedule Generator
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Graduation Plan</InputLabel>
            <Select
              value={selectedPlan}
              label="Graduation Plan"
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="font-body"
              disabled={gradPlans.length === 0}
            >
              {gradPlans.length === 0 ? (
                <MenuItem value="" disabled className="font-body">
                  No graduation plans found. Create one in the Grad Plan tab.
                </MenuItem>
              ) : (
                gradPlans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id} className="font-body">
                    {plan.name} {plan.isActive && "(Active)"}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {selectedGradPlan && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "var(--muted)", borderRadius: 2 }}>
              <Typography variant="subtitle2" className="font-body-semi" sx={{ mb: 1 }}>
                Course Requirements:
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <RequirementChip label="Major" count={selectedGradPlan.requiredCourses.major} />
                <RequirementChip label="Minor" count={selectedGradPlan.requiredCourses.minor} />
                <RequirementChip label="GE" count={selectedGradPlan.requiredCourses.ge} />
                <RequirementChip label="Elective" count={selectedGradPlan.requiredCourses.elective} />
                <RequirementChip label="Religion" count={selectedGradPlan.requiredCourses.rel} />
              </Box>
            </Box>
          )}

          {generating && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography variant="body2" className="font-body" color="text.secondary">
                Generating feasible schedule...
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<RefreshCw size={16} />}
              onClick={generateSchedule}
              disabled={generating || !selectedGradPlan || gradPlans.length === 0}
              className="font-body-semi"
              sx={{
                bgcolor: "var(--primary)",
                color: "var(--muted-foreground)",
                "&:hover": { bgcolor: "var(--hover-green)", color: "var(--primary-foreground)" },
              }}
            >
              Generate New Schedule
            </Button>

            <Button
              variant="outlined"
              startIcon={<Save size={16} />}
              onClick={saveSchedule}
              disabled={currentSchedule.length === 0}
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
                "&:disabled": {
                  borderColor: "var(--border)",
                  color: "var(--border)",
                },
              }}
            >
              Save Schedule
            </Button>
          </Box>

          {showSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Schedule saved successfully!
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function RequirementChip({ label, count }: { label: string; count: number }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        bgcolor: "var(--primary-15)",
        borderRadius: 2,
        border: "1px solid var(--primary-22)",
      }}
    >
      <Typography variant="caption" className="font-body-semi">
        {label}: {count}
      </Typography>
    </Box>
  );
}