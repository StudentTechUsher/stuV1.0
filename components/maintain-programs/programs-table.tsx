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
  canDelete?: boolean;
};

export default function ProgramsTable({ rows, onEdit, onDelete, canDelete = true }: Readonly<ProgramsTableProps>) {
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
      flex: 0.5,
      minWidth: 140
    },
    {
      field: 'program_type',
      headerName: 'Type',
      flex: 0.35,
      minWidth: 100
    },
    {
      field: 'version',
      headerName: 'Version',
      flex: 0.35,
      minWidth: 100
    },
    {
      field: 'created_at',
      headerName: 'Created',
      flex: 0.6,
      minWidth: 160,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleString() : ''
    },
    {
      field: 'modified_at',
      headerName: 'Modified',
      flex: 0.6,
      minWidth: 160,
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
            disabled={!canDelete}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    },
  ]), [onEdit, canDelete]);

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
        sx={{
          height: 'calc(100vh - 280px)',
          minHeight: 400,
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 'bold'
          }
        }}
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
          <Typography className="font-body">
            Are you sure you want to delete the program <strong>&ldquo;{programToDelete?.name}&rdquo;</strong>?
          </Typography>
          <Typography variant="body2" className="font-body" color="text.secondary" sx={{ mt: 1 }}>
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