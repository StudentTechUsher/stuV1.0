'use client';

import * as React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { getSessionUser } from '@/lib/api/auth';
import { getUserUniversityId } from '@/lib/api/profile';
import type { ProgramRow } from '@/types/program';
import EditRequirementsDialog from '@/components/maintain-programs/edit-requirements-dialog';
import ProgramsTable from '@/components/maintain-programs/programs-table';
import { fetchProgramsByUniversity, deleteProgram } from '@/lib/api/server-actions';

export default function MaintainProgramsPage() {
  const [rows, setRows] = React.useState<ProgramRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditingRow(null);
  };

  // matches EditRequirementsDialog onSave signature (updatedProgram)
  const handleSaveEdit = async (updatedProgram: ProgramRow) => {
    try {
      // Update the local state with the updated program
      setRows(prevRows => 
        prevRows.map(row => 
          row.id === updatedProgram.id ? updatedProgram : row
        )
      );
      
      // Clear any existing error
      setError(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to update program');
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
      <Typography variant="h5" gutterBottom>Maintain Programs</Typography>

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} /> Loading…
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <ProgramsTable rows={rows} onEdit={handleOpenEdit} onDelete={handleDeleteProgram} />
      )}

      <EditRequirementsDialog
        open={editOpen}
        row={editingRow}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />
    </Box>
  );
}
