'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Block,
  SwapHoriz,
  StickyNote2,
  MoreVert,
} from '@mui/icons-material';
import type { AdvisorAction } from '@/types/program-progress';

interface AdvisorActionsProps {
  requirementId: string;
  currentStatus: 'SATISFIED' | 'PARTIAL' | 'UNSATISFIED' | 'WAIVED' | 'SUBSTITUTED';
  onAction: (action: AdvisorAction) => void;
}

type ActionDialogType = 'waive' | 'substitute' | 'note' | null;

export default function AdvisorActions({
  requirementId,
  currentStatus,
  onAction,
}: AdvisorActionsProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [dialogType, setDialogType] = React.useState<ActionDialogType>(null);
  const [noteText, setNoteText] = React.useState('');
  const [fromCourseId, setFromCourseId] = React.useState('');
  const [toCourseId, setToCourseId] = React.useState('');

  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDialogOpen = (type: ActionDialogType) => {
    setDialogType(type);
    handleMenuClose();
  };

  const handleDialogClose = () => {
    setDialogType(null);
    setNoteText('');
    setFromCourseId('');
    setToCourseId('');
  };

  const handleApprove = () => {
    onAction({
      type: 'APPROVE',
      requirementId,
    });
    handleMenuClose();
  };

  const handleWaive = () => {
    onAction({
      type: 'WAIVE',
      requirementId,
      note: noteText.trim() || undefined,
    });
    handleDialogClose();
  };

  const handleSubstitute = () => {
    onAction({
      type: 'SUBSTITUTE',
      requirementId,
      fromCourseId: fromCourseId.trim(),
      toCourseId: toCourseId.trim(),
      note: noteText.trim() || undefined,
    });
    handleDialogClose();
  };

  const handleNote = () => {
    onAction({
      type: 'NOTE',
      requirementId,
      note: noteText.trim(),
    });
    handleDialogClose();
  };

  return (
    <>
      {/* Actions Button */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {currentStatus === 'SATISFIED' && (
          <Chip
            icon={<CheckCircle sx={{ fontSize: 16 }} />}
            label="Approved"
            size="small"
            sx={{
              backgroundColor: 'var(--primary-15)',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        )}
        {currentStatus === 'WAIVED' && (
          <Chip
            icon={<Block sx={{ fontSize: 16 }} />}
            label="Waived"
            size="small"
            sx={{
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        )}
        {currentStatus === 'SUBSTITUTED' && (
          <Chip
            icon={<SwapHoriz sx={{ fontSize: 16 }} />}
            label="Substituted"
            size="small"
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              color: 'var(--action-info)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        )}
        <Button
          variant="outlined"
          size="small"
          endIcon={<MoreVert />}
          onClick={handleMenuClick}
          sx={{
            textTransform: 'none',
            fontSize: '0.75rem',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
            '&:hover': {
              borderColor: 'var(--primary)',
              backgroundColor: 'var(--primary-15)',
            },
          }}
        >
          Actions
        </Button>
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleApprove} disabled={currentStatus === 'SATISFIED'}>
          <CheckCircle sx={{ mr: 1, fontSize: 20, color: 'var(--primary)' }} />
          Approve Requirement
        </MenuItem>
        <MenuItem onClick={() => handleDialogOpen('waive')} disabled={currentStatus === 'WAIVED'}>
          <Block sx={{ mr: 1, fontSize: 20, color: 'var(--muted-foreground)' }} />
          Waive Requirement
        </MenuItem>
        <MenuItem onClick={() => handleDialogOpen('substitute')}>
          <SwapHoriz sx={{ mr: 1, fontSize: 20, color: 'var(--action-info)' }} />
          Substitute Course
        </MenuItem>
        <MenuItem onClick={() => handleDialogOpen('note')}>
          <StickyNote2 sx={{ mr: 1, fontSize: 20, color: 'var(--action-edit)' }} />
          Add Note
        </MenuItem>
      </Menu>

      {/* Waive Dialog */}
      <Dialog open={dialogType === 'waive'} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle className="font-brand-bold">Waive Requirement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Waiving this requirement will mark it as satisfied without completing the courses.
          </Typography>
          <TextField
            label="Reason (optional)"
            multiline
            rows={3}
            fullWidth
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g., Transfer credit, AP exam, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleWaive} variant="contained" color="primary">
            Waive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Substitute Dialog */}
      <Dialog open={dialogType === 'substitute'} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle className="font-brand-bold">Substitute Course</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Allow a different course to satisfy this requirement.
          </Typography>
          <TextField
            label="Original Course ID"
            fullWidth
            value={fromCourseId}
            onChange={(e) => setFromCourseId(e.target.value)}
            placeholder="e.g., FIN301"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Substitute Course ID"
            fullWidth
            value={toCourseId}
            onChange={(e) => setToCourseId(e.target.value)}
            placeholder="e.g., ECON301"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Reason (optional)"
            multiline
            rows={2}
            fullWidth
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Explain why this substitution is approved"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={handleSubstitute}
            variant="contained"
            color="primary"
            disabled={!fromCourseId.trim() || !toCourseId.trim()}
          >
            Substitute
          </Button>
        </DialogActions>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={dialogType === 'note'} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle className="font-brand-bold">Add Advisor Note</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a note to this requirement for the student to see.
          </Typography>
          <TextField
            label="Note"
            multiline
            rows={4}
            fullWidth
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter your note here..."
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={handleNote}
            variant="contained"
            color="primary"
            disabled={!noteText.trim()}
          >
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
