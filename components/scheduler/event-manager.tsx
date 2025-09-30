"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import { X, Clock, MapPin, User } from "lucide-react";
import type { SchedulerEvent } from "./scheduler-calendar";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<SchedulerEvent, "id"> | SchedulerEvent) => void;
  onDelete?: (eventId: string) => void;
  event?: SchedulerEvent;
  selectedSlot?: { dayOfWeek: number; startTime: string; endTime: string };
  isEdit?: boolean;
};

const eventCategories = ["Work", "Club", "Sports", "Study", "Family", "Other"] as const;

export default function EventManager({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  selectedSlot,
  isEdit = false,
}: Props) {
  const [formData, setFormData] = useState(() => {
    if (event) {
      return {
        title: event.title,
        category: (event.category as typeof eventCategories[number]) || "Other",
        dayOfWeek: event.dayOfWeek,
        startTime: event.startTime,
        endTime: event.endTime,
      };
    } else if (selectedSlot) {
      return {
        title: "",
        category: "Other" as typeof eventCategories[number],
        dayOfWeek: selectedSlot.dayOfWeek,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };
    } else {
      return {
        title: "",
        category: "Other" as typeof eventCategories[number],
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "10:00",
      };
    }
  });

  // Update form data when event prop changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        category: (event.category as typeof eventCategories[number]) || "Other",
        dayOfWeek: event.dayOfWeek,
        startTime: event.startTime,
        endTime: event.endTime,
      });
    } else if (selectedSlot) {
      setFormData({
        title: "",
        category: "Other" as typeof eventCategories[number],
        dayOfWeek: selectedSlot.dayOfWeek,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
    } else {
      setFormData({
        title: "",
        category: "Other" as typeof eventCategories[number],
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "10:00",
      });
    }
  }, [event, selectedSlot]);

  const handleSave = () => {
    const eventData: Omit<SchedulerEvent, "id"> = {
      title: formData.title,
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      type: "personal",
      status: "blocked",
      category: formData.category,
    };

    if (isEdit && event) {
      onSave({ ...eventData, id: event.id });
    } else {
      onSave(eventData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (event?.id && onDelete) {
      onDelete(event.id);
      onClose();
    }
  };

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
            {isEdit ? "Edit Event" : "Add Personal Event"}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Event Title"
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter event title"
            className="font-body"
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as typeof eventCategories[number],
                })
              }
              className="font-body"
            >
              {eventCategories.map((category) => (
                <MenuItem key={category} value={category} className="font-body">
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Day of Week</InputLabel>
            <Select
              value={formData.dayOfWeek}
              label="Day of Week"
              onChange={(e) =>
                setFormData({ ...formData, dayOfWeek: e.target.value as number })
              }
              className="font-body"
            >
              {dayNames.map((day, index) => (
                <MenuItem key={index + 1} value={index + 1} className="font-body">
                  {day}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="Start Time"
              type="time"
              fullWidth
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
              className="font-body"
            />

            <TextField
              label="End Time"
              type="time"
              fullWidth
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
              className="font-body"
            />
          </Box>

          {event?.type === "class" && (
            <Box
              sx={{
                p: 2,
                bgcolor: "var(--muted)",
                borderRadius: 2,
                border: "1px solid var(--border)",
              }}
            >
              <Typography variant="subtitle2" className="font-body-semi" sx={{ mb: 1 }}>
                Course Information
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {event.professor && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <User size={16} />
                    <Typography variant="body2" className="font-body">
                      {event.professor}
                    </Typography>
                  </Box>
                )}
                {event.location && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <MapPin size={16} />
                    <Typography variant="body2" className="font-body">
                      {event.location}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <Box>
            {isEdit && event?.type === "personal" && onDelete && (
              <Button
                onClick={handleDelete}
                color="error"
                className="font-body-semi"
                sx={{
                  color: "var(--action-cancel)",
                  "&:hover": { bgcolor: "var(--action-cancel)", color: "white" },
                }}
              >
                Delete
              </Button>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} className="font-body-semi">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!formData.title.trim()}
              className="font-body-semi"
              sx={{
                bgcolor: "var(--primary)",
                "&:hover": { bgcolor: "var(--hover-green)" },
              }}
            >
              {isEdit ? "Update" : "Add"} Event
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
}