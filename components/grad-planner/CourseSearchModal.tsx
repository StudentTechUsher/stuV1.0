'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CourseSearch from '@/components/grad-plan/CourseSearch';
import type { CourseOffering } from '@/lib/services/courseOfferingService';

interface CourseSearchModalProps {
  open: boolean;
  onClose: () => void;
  onAddCourse: (course: { code: string; title: string; credits: number }) => void;
  universityId: number;
}

export function CourseSearchModal({
  open,
  onClose,
  onAddCourse,
  universityId,
}: Readonly<CourseSearchModalProps>) {
  const handleCourseSelect = (courseOffering: CourseOffering) => {
    // Convert CourseOffering to the format expected by handleAddCourse
    const course = {
      code: courseOffering.course_code,
      title: courseOffering.title,
      credits: courseOffering.credits_decimal || 3.0,
    };

    onAddCourse(course);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          border: '1px solid var(--border)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Add Course</span>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'var(--muted-foreground)',
              '&:hover': {
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
              },
            }}
          >
            <X size={20} />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <p className="text-sm text-muted-foreground mb-4">
          Search for a course by code (e.g., TMA 101, CS 235) or name (e.g., Intro to Film)
        </p>
        <CourseSearch
          universityId={universityId}
          onSelect={handleCourseSelect}
          placeholder="Search by course code or name..."
          label="Course Search"
          size="medium"
          fullWidth
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="secondary"
          onClick={onClose}
          className="text-sm"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
