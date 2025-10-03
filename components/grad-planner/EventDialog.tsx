'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface Event {
  id: string;
  type: 'Major/Minor Application' | 'Internship';
  title: string;
  afterTerm: number;
}

interface EventDialogProps {
  open: boolean;
  editingEvent: Event | null;
  eventType: 'Major/Minor Application' | 'Internship';
  eventTitle: string;
  eventAfterTerm: number;
  planData: Term[];
  onClose: () => void;
  onSave: () => void;
  onTypeChange: (type: 'Major/Minor Application' | 'Internship') => void;
  onTitleChange: (title: string) => void;
  onAfterTermChange: (afterTerm: number) => void;
}

export function EventDialog({
  open,
  editingEvent,
  eventType,
  eventTitle,
  eventAfterTerm,
  planData,
  onClose,
  onSave,
  onTypeChange,
  onTitleChange,
  onAfterTermChange,
}: EventDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-header-bold">
        {editingEvent ? 'Edit Event' : 'Add Event'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel
              className="font-body"
              sx={{
                '&.Mui-focused': {
                  color: 'var(--primary-dark)',
                },
              }}
            >
              Event Type
            </InputLabel>
            <Select
              value={eventType}
              label="Event Type"
              onChange={(e) => onTypeChange(e.target.value as 'Major/Minor Application' | 'Internship')}
              className="font-body"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--border)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--primary)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--primary)',
                },
              }}
            >
              <MenuItem value="Major/Minor Application" className="font-body">
                Major/Minor Application
              </MenuItem>
              <MenuItem value="Internship" className="font-body">
                Internship
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Event Title (Optional)"
            value={eventTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={eventType}
            className="font-body"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'var(--border)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--primary)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--primary)',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'var(--primary-dark)',
              },
            }}
          />

          <FormControl fullWidth>
            <InputLabel
              className="font-body"
              sx={{
                '&.Mui-focused': {
                  color: 'var(--primary-dark)',
                },
              }}
            >
              After Term
            </InputLabel>
            <Select
              value={eventAfterTerm}
              label="After Term"
              onChange={(e) => onAfterTermChange(e.target.value as number)}
              className="font-body"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--border)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--primary)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--primary)',
                },
              }}
            >
              {planData.map((_, index) => (
                <MenuItem key={index + 1} value={index + 1} className="font-body">
                  After Term {index + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} className="font-body-semi">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          className="font-body-semi"
          sx={{
            backgroundColor: 'var(--primary)',
            '&:hover': { backgroundColor: 'var(--hover-green)' }
          }}
        >
          {editingEvent ? 'Save Changes' : 'Add Event'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
