'use client';

import * as React from 'react';
import { DataGrid, GridColDef, GridEventListener } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type NotificationContext = {
  movedCourses?: unknown[];
  hasSuggestions?: boolean;
  [key: string]: unknown;
};

export type NotificationRow = {
  id: string;
  message: string;
  url: string | null;
  created_utc: string;
  type: string;
  context_json?: NotificationContext;
};

interface NotificationsGridProps {
  rows: NotificationRow[];
}

export function NotificationsGrid({ rows }: NotificationsGridProps) {
  const router = useRouter();

  const columns: GridColDef[] = [
    { field: 'message', headerName: 'Message', flex: 1, sortable: false },
    {
      field: 'arrow',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: () => <span style={{ fontSize: 18, opacity: 0.6 }}>&rarr;</span>,
    },
  ];

  // (Hover navigation removed; if reintroduced, a ref can prevent duplicate triggers.)

  const markReadAndNavigate = async (row: NotificationRow) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_utc: new Date().toISOString() })
        .eq('id', row.id);
    } catch (error) {
      console.error('Failed to mark notification read', error);
    } finally {
      if (row?.url) {
        // Store notification context in localStorage for grad plan edits
        if (row.type === 'edit grad plan' && row.context_json) {
          const changeData = {
            movedCourses: Array.isArray(row.context_json.movedCourses) ? row.context_json.movedCourses : [],
            hasSuggestions: Boolean(row.context_json.hasSuggestions)
          };
          localStorage.setItem('advisorChanges', JSON.stringify(changeData));
        }
        router.push(row.url);
      }
    }
  };

  const handleRowClick: GridEventListener<'rowClick'> = (params) => {
    const row = params.row as NotificationRow;
    markReadAndNavigate(row);
  };

  return (
    <Box sx={{ height: 500, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        hideFooter
        disableColumnMenu
        getRowId={(r) => r.id}
        onRowClick={handleRowClick}
        sx={{
          '& .MuiDataGrid-row:hover': {
            cursor: 'pointer',
            backgroundColor: 'rgba(25,118,210,0.08)',
          },
        }}
      />
    </Box>
  );
}

export default NotificationsGrid;
