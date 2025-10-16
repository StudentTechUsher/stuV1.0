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
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          border: "1px solid var(--border)",
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          pt: 3,
          px: 3,
          mb: 3,
          backgroundColor: "#0A0A0A",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" className="font-header" sx={{ color: "white", fontWeight: 700 }}>
            Class Information
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)"
              }
            }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 3, px: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Course Title */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="h5" className="font-header" sx={{ fontWeight: 700, color: "var(--foreground)" }}>
                {event.course_code}
              </Typography>
              {event.section && (
                <Chip
                  label={`Section ${event.section}`}
                  size="small"
                  sx={{
                    bgcolor: "color-mix(in srgb, var(--primary) 18%, white)",
                    color: "var(--dark)",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    border: "1px solid color-mix(in srgb, var(--primary) 30%, white)",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                />
              )}
            </Box>
            <Typography variant="body1" className="font-body" sx={{ color: "var(--muted-foreground)", fontWeight: 500 }}>
              {event.title}
            </Typography>
          </Box>

          {/* Course Details Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              p: 2.5,
              backgroundColor: "color-mix(in srgb, var(--muted) 4%, white)",
              borderRadius: 2,
              border: "1px solid var(--border)",
            }}
          >
            {/* Professor */}
            {event.professor && (
              <Box sx={{ display: "flex", alignItems: "start", gap: 1.5 }}>
                <User size={18} style={{ color: "var(--primary)", marginTop: "2px" }} />
                <Box>
                  <Typography variant="caption" className="font-body" sx={{ color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }} display="block">
                    Professor
                  </Typography>
                  <Typography variant="body2" className="font-body-semi" sx={{ color: "var(--foreground)", fontWeight: 600, mt: 0.5 }}>
                    {event.professor}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Location */}
            {event.location && (
              <Box sx={{ display: "flex", alignItems: "start", gap: 1.5 }}>
                <MapPin size={18} style={{ color: "var(--primary)", marginTop: "2px" }} />
                <Box>
                  <Typography variant="caption" className="font-body" sx={{ color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }} display="block">
                    Location
                  </Typography>
                  <Typography variant="body2" className="font-body-semi" sx={{ color: "var(--foreground)", fontWeight: 600, mt: 0.5 }}>
                    {event.location}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Schedule */}
            <Box sx={{ display: "flex", alignItems: "start", gap: 1.5 }}>
              <Clock size={18} style={{ color: "var(--primary)", marginTop: "2px" }} />
              <Box>
                <Typography variant="caption" className="font-body" sx={{ color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }} display="block">
                  Schedule
                </Typography>
                <Typography variant="body2" className="font-body-semi" sx={{ color: "var(--foreground)", fontWeight: 600, mt: 0.5 }}>
                  {dayName} {event.startTime} - {event.endTime}
                </Typography>
              </Box>
            </Box>

            {/* Credits */}
            <Box sx={{ display: "flex", alignItems: "start", gap: 1.5 }}>
              <CreditCard size={18} style={{ color: "var(--primary)", marginTop: "2px" }} />
              <Box>
                <Typography variant="caption" className="font-body" sx={{ color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }} display="block">
                  Credits
                </Typography>
                <Typography variant="body2" className="font-body-semi" sx={{ color: "var(--foreground)", fontWeight: 600, mt: 0.5 }}>
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
                bgcolor: event.status === "registered" ? "color-mix(in srgb, var(--primary) 18%, white)" : "color-mix(in srgb, var(--muted) 15%, white)",
                color: event.status === "registered" ? "var(--dark)" : "var(--foreground)",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                border: event.status === "registered" ? "1px solid color-mix(in srgb, var(--primary) 30%, white)" : "1px solid var(--border)",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            />
          </Box>

          {/* Alternative Sections */}
          {alternativeSections.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{
                  p: 2.5,
                  backgroundColor: "color-mix(in srgb, var(--primary) 3%, white)",
                  borderRadius: 2,
                  border: "1px solid color-mix(in srgb, var(--primary) 15%, white)",
                }}
              >
                <Typography variant="h6" className="font-header" sx={{ mb: 1, fontWeight: 700, color: "var(--foreground)" }}>
                  Find Alternative Section
                </Typography>
                <Typography variant="body2" className="font-body" sx={{ color: "var(--muted-foreground)", mb: 2.5, fontWeight: 500 }}>
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
                      color: "#0A0A0A",
                      fontWeight: 600,
                      px: 2.5,
                      py: 1,
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
                    Auto Pick
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw size={16} />}
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    sx={{
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                      fontWeight: 600,
                      px: 2.5,
                      py: 1,
                      borderWidth: "1.5px",
                      "&:hover": {
                        backgroundColor: "color-mix(in srgb, var(--muted) 15%, white)",
                        borderColor: "var(--foreground)",
                      },
                    }}
                  >
                    {showAlternatives ? "Hide Options" : "Show Options"}
                  </Button>
                </Box>

                {showAlternatives && (
                  <Box sx={{ mt: 2.5 }}>
                    <FormControl
                      fullWidth
                      sx={{
                        mb: 2,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
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
                      <InputLabel sx={{ fontWeight: 600 }}>Select Alternative Section</InputLabel>
                      <Select
                        value={selectedAlternative}
                        label="Select Alternative Section"
                        onChange={(e) => setSelectedAlternative(e.target.value)}
                        sx={{
                          fontWeight: 600,
                        }}
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
                                bgcolor: isConflict ? "color-mix(in srgb, var(--action-cancel) 8%, white)" : "transparent",
                                py: 1.5,
                                "&:hover": {
                                  bgcolor: isConflict ? "color-mix(in srgb, var(--action-cancel) 12%, white)" : "color-mix(in srgb, var(--primary) 8%, white)",
                                },
                              }}
                            >
                              <Box>
                                <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600 }}>
                                  Section {course.section} - {course.professor}
                                  {isConflict && " (Conflicts)"}
                                </Typography>
                                <Typography variant="caption" className="font-body" sx={{ color: "var(--muted-foreground)", fontWeight: 500 }}>
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
                        color: "#0A0A0A",
                        fontWeight: 600,
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
