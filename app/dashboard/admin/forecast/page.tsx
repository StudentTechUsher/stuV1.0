'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { formatTermCode } from '@/lib/terms';
import type { ForecastResponse, ForecastRow } from '@/app/api/admin/forecast/route';

function DetailRow({ row }: { row: ForecastRow }) {
  if (!row.detail) return null;

  const { time_of_day, modality, professors } = row.detail;
  const total = time_of_day.morning + time_of_day.afternoon + time_of_day.evening;

  return (
    <Box sx={{ p: 2, bgcolor: 'var(--card, #f9fafb)' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
        1-Semester-Ahead Details
      </Typography>

      {/* Time of Day */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Time of Day Preferences
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', mb: 0.5 }}>
              <span>Morning: {time_of_day.morning}</span>
              <span>{total > 0 ? Math.round((time_of_day.morning / total) * 100) : 0}%</span>
            </Box>
            <Box sx={{ height: 8, bgcolor: '#e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ width: `${total > 0 ? (time_of_day.morning / total) * 100 : 0}%`, height: '100%', bgcolor: '#FDCC4A' }} />
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', mb: 0.5 }}>
              <span>Afternoon: {time_of_day.afternoon}</span>
              <span>{total > 0 ? Math.round((time_of_day.afternoon / total) * 100) : 0}%</span>
            </Box>
            <Box sx={{ height: 8, bgcolor: '#e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ width: `${total > 0 ? (time_of_day.afternoon / total) * 100 : 0}%`, height: '100%', bgcolor: '#1976d2' }} />
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', mb: 0.5 }}>
              <span>Evening: {time_of_day.evening}</span>
              <span>{total > 0 ? Math.round((time_of_day.evening / total) * 100) : 0}%</span>
            </Box>
            <Box sx={{ height: 8, bgcolor: '#e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ width: `${total > 0 ? (time_of_day.evening / total) * 100 : 0}%`, height: '100%', bgcolor: '#ef4444' }} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Modality */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Modality Preferences
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`In-Person: ${modality.in_person}`}
            size="small"
            sx={{ borderColor: '#1976d2', color: '#1976d2', bgcolor: 'rgba(25, 118, 210, 0.1)' }}
            variant="outlined"
          />
          <Chip
            label={`Online: ${modality.online}`}
            size="small"
            sx={{ borderColor: '#FDCC4A', color: '#987A2D', bgcolor: 'rgba(253, 204, 74, 0.1)' }}
            variant="outlined"
          />
          <Chip
            label={`Hybrid: ${modality.hybrid}`}
            size="small"
            sx={{ borderColor: '#ef4444', color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' }}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Professors */}
      {professors && professors.length > 0 && (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Top Professor Requests
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {professors.slice(0, 5).map((prof, i) => (
              <Chip key={i} label={prof} size="small" />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function CourseRow({ row, showDetail }: { row: ForecastRow; showDetail: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          {showDetail && (
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.subject} {row.number}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.title}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Chip
            label={row.demand_count}
            size="small"
            sx={{
              bgcolor: 'var(--primary)',
              color: 'var(--primary-dark)',
              fontWeight: 600
            }}
          />
        </TableCell>
        <TableCell align="center">{row.credits}</TableCell>
      </TableRow>
      {showDetail && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <DetailRow row={row} />
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function ForecastPage() {
  const [semestersAhead, setSemestersAhead] = useState<1 | 2 | 3 | 4>(1);
  const [subject, setSubject] = useState('');
  const [minDemand, setMinDemand] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        semesters_ahead: String(semestersAhead),
      });
      if (subject) params.set('subject', subject);
      if (minDemand) params.set('min', minDemand);
      if (search) params.set('q', search);

      const res = await fetch(`/api/admin/forecast?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch forecast');
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [semestersAhead]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        Forecasting (PoC)
      </Typography>
      {data?.is_mock && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No plan data available yet—showing PoC estimates
        </Alert>
      )}

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={semestersAhead}
          exclusive
          onChange={(e, val) => val && setSemestersAhead(val)}
          size="small"
        >
          <ToggleButton value={1}>1 Semester</ToggleButton>
          <ToggleButton value={2}>2 Semesters</ToggleButton>
          <ToggleButton value={3}>3 Semesters</ToggleButton>
          <ToggleButton value={4}>4 Semesters</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label="Subject"
          size="small"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="CS, MATH..."
          sx={{ width: 120 }}
        />

        <TextField
          label="Min Demand"
          size="small"
          type="number"
          value={minDemand}
          onChange={(e) => setMinDemand(e.target.value)}
          sx={{ width: 120 }}
        />

        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Course code or title..."
          sx={{ flex: 1, minWidth: 200 }}
        />

        <Button
          variant="contained"
          onClick={fetchForecast}
          disabled={loading}
          sx={{
            bgcolor: 'var(--primary)',
            color: 'var(--primary-dark)',
            '&:hover': { bgcolor: 'var(--hover-green)' }
          }}
        >
          Apply Filters
        </Button>
      </Box>

      {/* Terms */}
      {data && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Forecasting for: {data.term_codes.map(formatTermCode).join(', ')}
        </Typography>
      )}

      {/* Results Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data && data.rows.length === 0 ? (
        <Alert severity="info">No courses match your filters</Alert>
      ) : data ? (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell>Course</TableCell>
                <TableCell align="center">Expected Students</TableCell>
                <TableCell align="center">Credits</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows.map((row) => (
                <CourseRow
                  key={row.course_id}
                  row={row}
                  showDetail={semestersAhead === 1 && !!row.detail}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}
