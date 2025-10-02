'use client';

import React, { useState, useEffect } from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface CourseMoveFieldProps {
  currentTerm: number;
  maxTerms: number;
  course: Course;
  termIndex: number;
  courseIndex: number;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
}

export function CourseMoveField({
  currentTerm,
  maxTerms,
  course,
  termIndex,
  courseIndex,
  onMoveCourse
}: CourseMoveFieldProps) {
  const [value, setValue] = useState(currentTerm);

  // Create a unique identifier for this course instance
  const courseUniqueId = `${termIndex}-${courseIndex}-${course.code}`;

  // Update value when currentTerm changes (after course move)
  useEffect(() => {
    setValue(currentTerm);
  }, [currentTerm, courseUniqueId, value]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    const newTermNumber = event.target.value as number;
    setValue(newTermNumber);

    // Immediately move the course when selection changes
    if (newTermNumber !== currentTerm && newTermNumber >= 1 && newTermNumber <= maxTerms) {
      onMoveCourse(termIndex, courseIndex, newTermNumber);
    }
  };

  // Generate term options
  const termOptions = [];
  for (let i = 1; i <= maxTerms; i++) {
    termOptions.push(
      <MenuItem key={i} value={i}>
        Term {i}
      </MenuItem>
    );
  }

  return (
    <FormControl size="small" sx={{ width: '100%', maxWidth: '160px' }}>
      <InputLabel className="font-body" sx={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Select Term</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label="Select Term"
        onClick={(e) => e.stopPropagation()}
        className="font-body-semi"
        sx={{
          fontSize: '0.75rem',
          height: '36px',
          backgroundColor: 'white',
          '& .MuiSelect-select': {
            paddingTop: '8px',
            paddingBottom: '8px',
            fontSize: '0.75rem',
            fontWeight: 600
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--hover-green)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)'
          }
        }}
      >
        {termOptions}
      </Select>
    </FormControl>
  );
}
