'use client';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';
import type { ProgramOption } from '@/lib/chatbot/tools/programSelectionTool';
import ClassicViewStandalone from './ClassicViewStandalone';

interface CourseFlowModalProps {
  open: boolean;
  onClose: () => void;
  program: ProgramOption;
  readOnly?: boolean;
  reviewMode?: boolean;
}

export default function CourseFlowModal({ open, onClose, program, readOnly, reviewMode }: Readonly<CourseFlowModalProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          height: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <div>
          <h2 className="text-xl font-semibold">{program.name}</h2>
          <p className="text-sm text-muted-foreground">Course Flow View</p>
        </div>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'var(--muted-foreground)',
            '&:hover': {
              color: 'var(--foreground)',
            },
          }}
        >
          <X size={24} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-1 overflow-y-auto p-6">
          <ClassicViewStandalone
            program={program}
            readOnly={readOnly}
            reviewMode={reviewMode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
