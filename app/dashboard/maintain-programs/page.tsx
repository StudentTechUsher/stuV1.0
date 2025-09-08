'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Box, Typography, CircularProgress, Alert, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

type ProgramRow = {
  id: string;
  university_id: number;              // int8 in DB; supabase-js returns number or string depending on config
  name: string;
  program_type: string;               // 'major' | 'minor' if you want a union
  version: string | number | null;
  created_at: string;
  modified_at: string | null;
  requirements: unknown;
};

export default function MaintainProgramsPage() {
  const [rows, setRows] = React.useState<ProgramRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<ProgramRow | null>(null);
  const [requirementsText, setRequirementsText] = React.useState('');

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Who is logged in?
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        const user = sessionData.session?.user;
        if (!user) throw new Error('Not signed in');

        // 2) Fetch university_id from profiles (id = auth.uid())
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('university_id')
          .eq('id', user.id)
          .single();

        if (profileErr) throw profileErr;
        if (!profile?.university_id && profile?.university_id !== 0) {
          throw new Error('profiles.university_id not set for this user');
        }

        // If your Postgres int8 comes back as a string, coerce once here:
        const universityId = typeof profile.university_id === 'string'
          ? Number(profile.university_id)
          : profile.university_id;

        // 3) Query programs filtered by university_id
        const { data: programs, error: progErr } = await supabase
          .from('program')
          .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
          .eq('university_id', universityId)
          .order('created_at', { ascending: false });

        if (progErr) throw progErr;

        if (!active) return;
        setRows((programs ?? []) as ProgramRow[]);
      } catch (e: unknown) {
        if (!active) return;
        if (typeof e === 'object' && e !== null && 'message' in e) {
          setError((e as { message?: string }).message ?? 'Failed to load programs');
        } else {
          setError('Failed to load programs');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  const handleOpenEdit = (row: ProgramRow) => {
    setEditingRow(row);
    try {
      if (typeof row.requirements === 'string') {
        try { setRequirementsText(JSON.stringify(JSON.parse(row.requirements), null, 2)); }
        catch { setRequirementsText(row.requirements); }
      } else {
        setRequirementsText(JSON.stringify(row.requirements, null, 2));
      }
    } catch {
      setRequirementsText(String(row.requirements ?? ''));
    }
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditingRow(null);
    setRequirementsText('');
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    let value: unknown = requirementsText;
    try { value = JSON.parse(requirementsText); } catch { /* allow plain text */ }

    const { data: updated, error: updErr } = await supabase
      .from('program')
      .update({ requirements: value })
      .eq('id', editingRow.id)
      .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
      .single();

    if (updErr) { setError(updErr.message); return; }

    setRows(prev => prev.map(r => (r.id === editingRow.id ? (updated as ProgramRow) : r)));
    handleCloseEdit();
  };

  const columns = React.useMemo<GridColDef<ProgramRow>[]>(() => ([
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'program_type', headerName: 'Type', width: 120 },
    { field: 'version', headerName: 'Version', width: 120 },
    {
      field: 'created_at', headerName: 'Created', width: 180,
      valueFormatter: (p: { value: string | null | undefined }) => (p.value ? new Date(p.value as string).toLocaleString() : '')
    },
    {
      field: 'modified_at', headerName: 'Modified', width: 180,
      valueFormatter: (p: { value: string | null | undefined }) => (p.value ? new Date(p.value as string).toLocaleString() : '')
    },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false, filterable: false,
      renderCell: (params: GridRenderCellParams<ProgramRow>) => (
        <IconButton aria-label="Edit requirements" onClick={() => handleOpenEdit(params.row)}>
          <EditIcon />
        </IconButton>
      )
    },
  ]), []);

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
        <Box sx={{ height: 560 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
          />
        </Box>
      )}

      <Dialog open={editOpen} onClose={handleCloseEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Requirements</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" gutterBottom>
            {editingRow?.name} ({editingRow?.program_type})
          </Typography>
          <TextField
            label="Requirements (JSON or text)"
            value={requirementsText}
            onChange={(e) => setRequirementsText(e.target.value)}
            fullWidth
            multiline
            minRows={10}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
