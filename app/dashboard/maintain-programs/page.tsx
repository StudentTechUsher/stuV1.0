'use client';

import * as React from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getSessionUser } from '@/lib/services/auth';
import { getUserUniversityId } from '@/lib/services/profileService';
import type { ProgramRow } from '@/types/program';
import EditRequirementsDialog from '@/components/maintain-programs/edit-requirements-dialog';
import ProgramsTable from '@/components/maintain-programs/programs-table';
import { fetchProgramsByUniversity, deleteProgram } from '@/lib/services/server-actions';

export default function MaintainProgramsPage() {
  const [rows, setRows] = React.useState<ProgramRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [universityId, setUniversityId] = React.useState<number>(0);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<ProgramRow | null>(null);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const user = await getSessionUser();
        const universityId = await getUserUniversityId(user.id);
        const programs = await fetchProgramsByUniversity(universityId);

        if (!active) return;
        setUniversityId(universityId);
        setRows(programs);
      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('Failed to load programs');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleOpenEdit = (row: ProgramRow) => {
    setEditingRow(row);
    setEditOpen(true);
  };

  const handleAdd = () => {
    setEditingRow(null); // null indicates creating a new program
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditingRow(null);
  };

  // matches EditRequirementsDialog onSave signature (updatedProgram)
  const handleSaveEdit = async (savedProgram: ProgramRow) => {
    try {
      if (editingRow) {
        // Updating existing program
        setRows(prevRows => 
          prevRows.map(row => 
            row.id === savedProgram.id ? savedProgram : row
          )
        );
      } else {
        // Adding new program
        setRows(prevRows => [savedProgram, ...prevRows]);
      }
      
      // Clear any existing error
      setError(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to save program');
      }
    }
  };

  const handleDeleteProgram = async (program: ProgramRow) => {
    try {
      setError(null);
      
      // Call the delete API
      await deleteProgram(program.id);
      
      // Remove the program from local state
      setRows(prevRows => prevRows.filter(row => row.id !== program.id));
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to delete program');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Add Program button */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%'
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Maintain Programs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{
            backgroundColor: '#12F987',
            color: '#0A0A0A',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              backgroundColor: '#0ed676'
            }
          }}
        >
          Add Program
        </Button>
      </Box>

      {(() => {
        if (loading) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} /> Loading…
            </Box>
          );
        } else if (error) {
          return <Alert severity="error">{error}</Alert>;
        } else {
          return (
            <ProgramsTable rows={rows} onEdit={handleOpenEdit} onDelete={handleDeleteProgram} />
          );
        }
      })()}

      <EditRequirementsDialog
        open={editOpen}
        row={editingRow}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        university_id={universityId}
      />
    </Box>
  );
}
