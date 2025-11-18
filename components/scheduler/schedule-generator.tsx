"use client";

import { useState } from "react";
import { Card, CardContent, Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, Alert, LinearProgress } from "@mui/material";
import { RefreshCw, Save, Plus } from "lucide-react";
import Link from "next/link";
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
};

export default function ScheduleGenerator({
  gradPlans,
  courses,
  blockedEvents,
  onScheduleGenerated,
  onScheduleSaved,
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
            console.warn(`Could not parse schedule for ${course.course_code}: ${course.schedule}`, error);
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
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid var(--border)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" className="font-header" sx={{ mb: 2.5, fontWeight: 700, color: "var(--foreground)" }}>
            Schedule Generator
          </Typography>

          {gradPlans.length === 0 ? (
            <Box sx={{ mb: 2 }}>
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: "color-mix(in srgb, var(--action-info) 8%, white)",
                  border: "1px solid color-mix(in srgb, var(--action-info) 20%, white)",
                }}
              >
                <Typography variant="body2" className="font-body" sx={{ mb: 1, fontWeight: 500 }}>
                  No graduation plans found. Create one to start scheduling your classes.
                </Typography>
              </Alert>
              <Link href="/grad-plan" passHref>
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  fullWidth
                  className="font-body-semi"
                  sx={{
                    bgcolor: "var(--primary)",
                    color: "#0A0A0A",
                    fontWeight: 600,
                    py: 1.25,
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    "&:hover": {
                      bgcolor: "var(--hover-green)",
                      color: "white",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
                    },
                  }}
                >
                  Create Grad Plan
                </Button>
              </Link>
            </Box>
          ) : (
            <FormControl
              fullWidth
              sx={{
                mb: 2.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontWeight: 600,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "var(--primary)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "var(--primary)",
                    borderWidth: "2px",
                  },
                },
              }}
            >
              <InputLabel sx={{ fontWeight: 600 }}>Graduation Plan</InputLabel>
              <Select
                value={selectedPlan}
                label="Graduation Plan"
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="font-body"
              >
                {gradPlans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id} className="font-body" sx={{ fontWeight: 600, py: 1.5 }}>
                    {plan.name} {plan.isActive && "(Active)"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedGradPlan && (
            <Box
              sx={{
                mb: 2.5,
                p: 2.5,
                backgroundColor: "color-mix(in srgb, var(--muted) 4%, white)",
                borderRadius: 2,
                border: "1px solid var(--border)",
              }}
            >
              <Typography variant="subtitle2" className="font-body-semi" sx={{ mb: 1.5, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                Course Requirements
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <RequirementChip label="Major" count={selectedGradPlan.requiredCourses.major} />
                <RequirementChip label="Minor" count={selectedGradPlan.requiredCourses.minor} />
                <RequirementChip label="GE" count={selectedGradPlan.requiredCourses.ge} />
                <RequirementChip label="Elective" count={selectedGradPlan.requiredCourses.elective} />
                <RequirementChip label="Religion" count={selectedGradPlan.requiredCourses.rel} />
              </Box>
            </Box>
          )}

          {generating && (
            <Box sx={{ mb: 2.5 }}>
              <LinearProgress
                sx={{
                  mb: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "color-mix(in srgb, var(--primary) 15%, white)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "var(--primary)",
                  },
                }}
              />
              <Typography variant="body2" className="font-body" sx={{ color: "var(--muted-foreground)", fontWeight: 500 }}>
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
                color: "#0A0A0A",
                fontWeight: 600,
                px: 2.5,
                py: 1.25,
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                "&:hover": {
                  bgcolor: "var(--hover-green)",
                  color: "white",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
                },
                "&:disabled": {
                  bgcolor: "var(--muted)",
                  color: "var(--muted-foreground)",
                },
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
                "&:disabled": {
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                },
              }}
            >
              Save Schedule
            </Button>
          </Box>

          {showSuccess && (
            <Alert
              severity="success"
              sx={{
                mt: 2,
                borderRadius: 2,
                backgroundColor: "color-mix(in srgb, var(--primary) 8%, white)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, white)",
                color: "var(--dark)",
                fontWeight: 600,
              }}
            >
              Schedule saved successfully!
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function RequirementChip({ label, count }: { label: string; count: number }) {
  // Map requirement types to colors matching the dashboard (academic-progress-card.tsx)
  const getChipStyles = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('major')) {
      return {
        bgcolor: 'color-mix(in srgb, var(--primary) 18%, white)',
        borderColor: 'color-mix(in srgb, var(--primary) 35%, white)',
        color: 'var(--dark)',
      };
    }
    if (lowerLabel.includes('minor')) {
      // Dashboard uses #001F54 (dark blue)
      return {
        bgcolor: 'color-mix(in srgb, #001F54 18%, white)',
        borderColor: 'color-mix(in srgb, #001F54 35%, white)',
        color: '#001F54',
      };
    }
    if (lowerLabel.includes('ge') || lowerLabel.includes('general')) {
      // Dashboard uses #2196f3 (blue)
      return {
        bgcolor: 'color-mix(in srgb, #2196f3 18%, white)',
        borderColor: 'color-mix(in srgb, #2196f3 35%, white)',
        color: '#1565c0',
      };
    }
    if (lowerLabel.includes('religion') || lowerLabel.includes('rel')) {
      // Dashboard uses #5E35B1 (purple)
      return {
        bgcolor: 'color-mix(in srgb, #5E35B1 18%, white)',
        borderColor: 'color-mix(in srgb, #5E35B1 35%, white)',
        color: '#5E35B1',
      };
    }
    // Elective - Dashboard uses #9C27B0 (magenta)
    return {
      bgcolor: 'color-mix(in srgb, #9C27B0 18%, white)',
      borderColor: 'color-mix(in srgb, #9C27B0 35%, white)',
      color: '#9C27B0',
    };
  };

  const styles = getChipStyles(label);

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1,
        bgcolor: styles.bgcolor,
        borderRadius: 2,
        border: `1px solid ${styles.borderColor}`,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Typography variant="caption" className="font-body-semi" sx={{ fontWeight: 600, color: styles.color }}>
        {label}: {count}
      </Typography>
    </Box>
  );
}
