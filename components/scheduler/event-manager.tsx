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
  ThemeProvider,
  createTheme,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import { X, MapPin, User } from "lucide-react";
import type { SchedulerEvent } from "./scheduler-calendar";

// Create a theme with green time picker
const greenTheme = createTheme({
  palette: {
    primary: {
      main: '#12F987',
      light: '#12F987',
      dark: '#06C96C',
      contrastText: '#000000',
    },
  },
});

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<SchedulerEvent, "id"> | SchedulerEvent | Array<Omit<SchedulerEvent, "id">>) => void;
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
        daysOfWeek: [event.dayOfWeek], // Convert single day to array
        startTime: event.startTime,
        endTime: event.endTime,
      };
    } else if (selectedSlot) {
      return {
        title: "",
        category: "Other" as typeof eventCategories[number],
        daysOfWeek: [selectedSlot.dayOfWeek],
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };
    } else {
      return {
        title: "",
        category: "Other" as typeof eventCategories[number],
        daysOfWeek: [] as number[], // Empty array for multiple selection
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
        daysOfWeek: [event.dayOfWeek],
        startTime: event.startTime,
        endTime: event.endTime,
      });
    } else if (selectedSlot) {
      setFormData({
        title: "",
        category: "Other" as typeof eventCategories[number],
        daysOfWeek: [selectedSlot.dayOfWeek],
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
    } else {
      setFormData({
        title: "",
        category: "Other" as typeof eventCategories[number],
        daysOfWeek: [],
        startTime: "09:00",
        endTime: "10:00",
      });
    }
  }, [event, selectedSlot]);

  const handleSave = () => {
    console.log('Saving events for days:', formData.daysOfWeek);

    // Create an event for each selected day
    if (formData.daysOfWeek.length === 0) {
      console.warn('No days selected');
      return;
    }

    // For editing, only update the single event
    if (isEdit && event) {
      const eventData: Omit<SchedulerEvent, "id"> & { id: string } = {
        id: event.id,
        title: formData.title,
        dayOfWeek: formData.daysOfWeek[0], // Use first selected day for edit
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: "personal",
        status: "blocked",
        category: formData.category,
      };
      onSave(eventData);
    } else {
      // For new events, create an array of events for all selected days
      const events: Array<Omit<SchedulerEvent, "id">> = formData.daysOfWeek.map(dayOfWeek => ({
        title: formData.title,
        dayOfWeek: dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: "personal",
        status: "blocked",
        category: formData.category,
      }));

      console.log('Creating events for multiple days:', events);
      // Pass all events at once as an array
      onSave(events);
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
    <ThemeProvider theme={greenTheme}>
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
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--primary)' },
                '&:hover fieldset': { borderColor: 'var(--hover-green)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
              },
              '& .MuiInputLabel-root': { color: 'var(--primary)', '&.Mui-focused': { color: 'var(--primary)' } },
            }}
          />

          <FormControl fullWidth>
            <InputLabel sx={{ color: 'var(--primary)', '&.Mui-focused': { color: 'var(--primary)' } }}>Category</InputLabel>
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
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--hover-green)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' }
              }}
            >
              {eventCategories.map((category) => (
                <MenuItem key={category} value={category} className="font-body">
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <Typography variant="subtitle2" className="font-body-semi" sx={{ mb: 1, fontWeight: 600 }}>
              Days of Week
            </Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
              {dayNames.map((day, index) => (
                <FormControlLabel
                  key={index + 1}
                  control={
                    <Checkbox
                      checked={formData.daysOfWeek.includes(index + 1)}
                      onChange={(e) => {
                        const dayValue = index + 1;
                        setFormData({
                          ...formData,
                          daysOfWeek: e.target.checked
                            ? [...formData.daysOfWeek, dayValue].sort()
                            : formData.daysOfWeek.filter(d => d !== dayValue)
                        });
                      }}
                      sx={{
                        color: 'var(--primary)',
                        '&.Mui-checked': {
                          color: 'var(--primary)',
                        },
                      }}
                    />
                  }
                  label={<Typography className="font-body" sx={{ fontSize: 14 }}>{day}</Typography>}
                />
              ))}
            </FormGroup>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--primary)' },
                  '&:hover fieldset': { borderColor: 'var(--hover-green)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--primary)', '&.Mui-focused': { color: 'var(--primary)' } },
              }}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--primary)' },
                  '&:hover fieldset': { borderColor: 'var(--hover-green)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--primary)', '&.Mui-focused': { color: 'var(--primary)' } },
              }}
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
              disabled={!formData.title.trim() || formData.daysOfWeek.length === 0}
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
    </ThemeProvider>
  );
}
