"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from "@mui/material";
import { X, User, MapPin, Clock, CreditCard, RefreshCw, Zap } from "lucide-react";
import type { SchedulerEvent } from "./scheduler-calendar";
import type { Course } from "./schedule-generator";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  event: SchedulerEvent | null;
  courses: Course[];
  allEvents: SchedulerEvent[];
  onReplaceClass: (oldEvent: SchedulerEvent, newCourse: Course) => void;
};

export default function ClassInfoDialog({ open, onClose, event, courses, allEvents, onReplaceClass }: Props) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState("");

  if (!event || event.type !== "class") return null;

  const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[event.dayOfWeek] || "Unknown";

  // Find all alternative sections for this course
  const alternativeSections = courses.filter(course =>
    course.course_code === event.course_code &&
    course.section !== event.section
  );

  // Helper function to check if a course conflicts with existing events
  const hasConflict = (course: Course) => {
    try {
      const { days, startTime, endTime } = parseSchedule(course.schedule);

      for (const day of days) {
        const dayMap: Record<string, number> = {
          "M": 1, "T": 2, "W": 3, "Th": 4, "F": 5, "S": 6
        };
        const dayOfWeek = dayMap[day];

        for (const existingEvent of allEvents) {
          // Skip the current event we're trying to replace
          if (existingEvent.id === event.id) continue;

          if (existingEvent.dayOfWeek === dayOfWeek) {
            const newStartMin = timeToMinutes(startTime);
            const newEndMin = timeToMinutes(endTime);
            const existingStartMin = timeToMinutes(existingEvent.startTime);
            const existingEndMin = timeToMinutes(existingEvent.endTime);

            if (newStartMin < existingEndMin && newEndMin > existingStartMin) {
              return true;
            }
          }
        }
      }
      return false;
    } catch {
      return true; // If we can't parse the schedule, consider it a conflict
    }
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
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

  const handleAutoReplace = () => {
    const compatibleSections = alternativeSections.filter(course => !hasConflict(course));
    if (compatibleSections.length > 0) {
      const randomSection = compatibleSections[Math.floor(Math.random() * compatibleSections.length)];
      onReplaceClass(event, randomSection);
      onClose();
    }
  };

  const handleManualReplace = () => {
    const selectedCourse = alternativeSections.find(course =>
      `${course.section}-${course.professor}` === selectedAlternative
    );
    if (selectedCourse) {
      onReplaceClass(event, selectedCourse);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" className="font-header">
            Class Information
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Course Title */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="h5" className="font-header">
                {event.course_code}
              </Typography>
              {event.section && (
                <Chip
                  label={`Section ${event.section}`}
                  size="small"
                  sx={{
                    bgcolor: "var(--muted)",
                    color: "var(--foreground)",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 500,
                  }}
                />
              )}
            </Box>
            <Typography variant="body1" className="font-body" color="text.secondary">
              {event.title}
            </Typography>
          </Box>

          {/* Course Details Grid */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {/* Professor */}
            {event.professor && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <User size={18} style={{ color: "var(--muted-foreground)" }} />
                <Box>
                  <Typography variant="caption" className="font-body" color="text.secondary" display="block">
                    Professor
                  </Typography>
                  <Typography variant="body2" className="font-body-semi">
                    {event.professor}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Location */}
            {event.location && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MapPin size={18} style={{ color: "var(--muted-foreground)" }} />
                <Box>
                  <Typography variant="caption" className="font-body" color="text.secondary" display="block">
                    Location
                  </Typography>
                  <Typography variant="body2" className="font-body-semi">
                    {event.location}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Schedule */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Clock size={18} style={{ color: "var(--muted-foreground)" }} />
              <Box>
                <Typography variant="caption" className="font-body" color="text.secondary" display="block">
                  Schedule
                </Typography>
                <Typography variant="body2" className="font-body-semi">
                  {dayName} {event.startTime} - {event.endTime}
                </Typography>
              </Box>
            </Box>

            {/* Credits */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CreditCard size={18} style={{ color: "var(--muted-foreground)" }} />
              <Box>
                <Typography variant="caption" className="font-body" color="text.secondary" display="block">
                  Credits
                </Typography>
                <Typography variant="body2" className="font-body-semi">
                  {event.credits || 3.0}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Status Chip */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip
              label={event.status === "registered" ? "Registered" : "Waitlisted"}
              size="small"
              sx={{
                bgcolor: event.status === "registered" ? "var(--primary-15)" : "var(--secondary)",
                color: event.status === "registered" ? "var(--primary)" : "var(--foreground)",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
              }}
            />
          </Box>

          {/* Alternative Sections */}
          {alternativeSections.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="h6" className="font-header" sx={{ mb: 2 }}>
                  Find Alternative Section
                </Typography>
                <Typography variant="body2" className="font-body" color="text.secondary" sx={{ mb: 2 }}>
                  {alternativeSections.filter(course => !hasConflict(course)).length} compatible alternatives found
                </Typography>

                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Zap size={16} />}
                    onClick={handleAutoReplace}
                    disabled={alternativeSections.filter(course => !hasConflict(course)).length === 0}
                    sx={{
                      bgcolor: "var(--primary)",
                      color: "var(--muted-foreground)",
                      "&:hover": { bgcolor: "var(--hover-green)", color: "var(--muted-foreground)" },
                    }}
                  >
                    Auto Pick
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw size={16} />}
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    sx={{
                      borderColor: "var(--muted-foreground)",
                      color: "var(--muted-foreground)",
                      "&:hover": {
                        backgroundColor: "var(--hover-gray)",
                        color: "white",
                        borderColor: "var(--hover-gray)",
                      },
                    }}
                  >
                    {showAlternatives ? "Hide Options" : "Show Options"}
                  </Button>
                </Box>

                {showAlternatives && (
                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Select Alternative Section</InputLabel>
                      <Select
                        value={selectedAlternative}
                        label="Select Alternative Section"
                        onChange={(e) => setSelectedAlternative(e.target.value)}
                      >
                        {alternativeSections.map((course) => {
                          const isConflict = hasConflict(course);
                          return (
                            <MenuItem
                              key={`${course.section}-${course.professor}`}
                              value={`${course.section}-${course.professor}`}
                              disabled={isConflict}
                              sx={{
                                opacity: isConflict ? 0.5 : 1,
                                bgcolor: isConflict ? "var(--muted)" : "transparent",
                                "&:hover": {
                                  bgcolor: isConflict ? "var(--muted)" : "var(--primary-15)",
                                },
                              }}
                            >
                              <Box>
                                <Typography variant="body2" className="font-body-semi">
                                  Section {course.section} - {course.professor}
                                  {isConflict && " (Conflicts)"}
                                </Typography>
                                <Typography variant="caption" className="font-body" color="text.secondary">
                                  {course.schedule} • {course.location}
                                </Typography>
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      onClick={handleManualReplace}
                      disabled={!selectedAlternative || hasConflict(alternativeSections.find(c => `${c.section}-${c.professor}` === selectedAlternative)!)}
                      fullWidth
                      sx={{
                        bgcolor: "var(--primary)",
                        color: "var(--muted-foreground)",
                        "&:hover": { bgcolor: "var(--hover-green)", color: "var(--muted-foreground)" },
                      }}
                    >
                      Replace with Selected Section
                    </Button>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
