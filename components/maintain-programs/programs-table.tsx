'use client';

import * as React from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ProgramRow } from '@/types/program';

export type ProgramsTableProps = {
  rows: ProgramRow[];
  onEdit: (row: ProgramRow) => void;
  onDelete: (row: ProgramRow) => void;
};

export default function ProgramsTable({ rows, onEdit, onDelete }: ProgramsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [programToDelete, setProgramToDelete] = React.useState<ProgramRow | null>(null);

  const handleDeleteClick = (row: ProgramRow) => {
    setProgramToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (programToDelete) {
      onDelete(programToDelete);
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProgramToDelete(null);
  };

  const columns = React.useMemo<GridColDef<ProgramRow>[]>(() => ([
    { 
      field: 'name', 
      headerName: 'Name', 
      flex: 1, 
      minWidth: 160 
    },
    { 
      field: 'program_type', 
      headerName: 'Type', 
      width: 120 
    },
    { 
      field: 'version', 
      headerName: 'Version', 
      width: 120 
    },
    {
      field: 'created_at', 
      headerName: 'Created', 
      width: 180,
      valueFormatter: (value: string) => 
        value ? new Date(value).toLocaleString() : ''
    },
    {
      field: 'modified_at', 
      headerName: 'Modified', 
      width: 180,
      valueFormatter: (value: string) => 
        value ? new Date(value).toLocaleString() : ''
    },
    {
      field: 'actions', 
      headerName: 'Actions', 
      width: 150, 
      sortable: false, 
      filterable: false,
      renderCell: (params: GridRenderCellParams<ProgramRow>) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            aria-label="Edit requirements" 
            onClick={() => onEdit(params.row)}
            size="small"
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            aria-label="Delete program" 
            onClick={() => handleDeleteClick(params.row)}
            size="small"
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    },
  ]), [onEdit]);

  return (
    <>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{ 
          pagination: { 
            paginationModel: { 
              page: 0, 
              pageSize: 10 
            } 
          } 
        }}
        style={{ height: 560 }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the program <strong>&ldquo;{programToDelete?.name}&rdquo;</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All associated data will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete Program
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}