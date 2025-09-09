'use client';

import * as React from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import type { ProgramRow } from '@/types/program';

export type ProgramsTableProps = {
  rows: ProgramRow[];
  onEdit: (row: ProgramRow) => void;
};

export default function ProgramsTable({ rows, onEdit }: ProgramsTableProps) {
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
      width: 100, 
      sortable: false, 
      filterable: false,
      renderCell: (params: GridRenderCellParams<ProgramRow>) => (
        <IconButton 
          aria-label="Edit requirements" 
          onClick={() => onEdit(params.row)}
        >
          <EditIcon />
        </IconButton>
      )
    },
  ]), [onEdit]);

  return (
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
  );
}