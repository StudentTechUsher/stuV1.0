'use client';
import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import type { AdvisorStudentRow } from '@/lib/services/profileService';

interface AdvisorStudentsTableProps {
  rows: AdvisorStudentRow[];
}

export default function AdvisorStudentsTable({ rows }: Readonly<AdvisorStudentsTableProps>) {
  const columns = React.useMemo<GridColDef[]>(() => [
    { field: 'fname', headerName: 'First Name', flex: 1, minWidth: 140 },
    { field: 'lname', headerName: 'Last Name', flex: 1, minWidth: 140 },
    { field: 'programs', headerName: 'Programs', flex: 2, minWidth: 240, sortable: false },
  ], []);

  return (
    <div style={{ width: '100%', height: 600 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        disableRowSelectionOnClick
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        pageSizeOptions={[25, 50, 100]}
        sx={{
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
          }
        }}
      />
    </div>
  );
}
