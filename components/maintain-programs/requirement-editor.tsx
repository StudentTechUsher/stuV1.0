'use client';

import * as React from 'react';
import type { ProgramRequirement } from '@/types/programRequirements';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography
} from '@mui/material';

export interface RequirementEditorProps {
  requirement: ProgramRequirement;
  onSave: (requirement: ProgramRequirement) => void;
  onClose: () => void;
}

export default function RequirementEditor({
  requirement,
  onSave,
  onClose
}: Readonly<RequirementEditorProps>) {
  const [jsonText, setJsonText] = React.useState(JSON.stringify(requirement, null, 2));
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onSave(parsed);
    } catch (err) {
      setError('Invalid JSON format');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Edit Requirement {requirement.requirementId}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}
          <TextField
            multiline
            rows={20}
            fullWidth
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            backgroundColor: '#12F987',
            color: '#0A0A0A',
            '&:hover': {
              backgroundColor: '#0ed676'
            }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
