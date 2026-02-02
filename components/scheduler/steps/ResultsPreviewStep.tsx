'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Check, RefreshCw } from 'lucide-react';
import { fetchCourseOfferingsForTermAction } from '@/lib/services/server-actions';
import { CourseSection } from '@/lib/services/courseOfferingService';

interface ResultsPreviewStepProps {
  termName: string;
  courseCodes: string[];
  universityId: number;
  onSave: (offerings: CourseSection[]) => void;
  onStartOver: () => void;
  onBack: () => void;
}

export default function ResultsPreviewStep({
  termName,
  courseCodes,
  universityId,
  onSave,
  onStartOver,
  onBack,
}: ResultsPreviewStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<CourseSection[]>([]);

  useEffect(() => {
    const fetchOfferings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchCourseOfferingsForTermAction(
          universityId,
          termName,
          courseCodes
        );
        setOfferings(data);
      } catch (err) {
        console.error('Failed to fetch offerings:', err);
        setError('Failed to fetch course offerings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOfferings();
  }, [universityId, termName, courseCodes]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchCourseOfferingsForTermAction(universityId, termName, courseCodes)
      .then(data => setOfferings(data))
      .catch((err) => {
        console.error('Failed to fetch offerings:', err);
        setError('Failed to fetch course offerings. Please try again.');
      })
      .finally(() => setIsLoading(false));
  };

  const parseMeetingTime = (meetings: unknown): string => {
    if (!meetings || typeof meetings !== 'object') return 'TBA';
    const m = meetings as { days?: string; start?: string; end?: string };
    if (m.days && m.start && m.end) {
      return `${m.days} ${m.start}-${m.end}`;
    }
    return 'TBA';
  };

  const getSeatsAvailable = (offering: CourseSection): number => {
    return offering.seats_available || 0;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Preview Course Offerings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Available sections for your selected courses in {termName}
        </Typography>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress sx={{ color: '#06C96C' }} />
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRetry} startIcon={<RefreshCw size={16} />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!isLoading && !error && offerings.length === 0 && (
        <Alert severity="info">
          No course sections found for the selected courses in {termName}.
          This could mean offerings haven&apos;t been published yet or the courses aren&apos;t available this term.
        </Alert>
      )}

      {!isLoading && !error && offerings.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Instructor</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Days/Times</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Seats</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offerings.map((offering) => {
                const seatsAvailable = getSeatsAvailable(offering);
                const hasWaitlist = (offering.waitlist_count || 0) > 0;

                return (
                  <TableRow key={offering.offering_id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {offering.course_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {offering.section_label || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {offering.instructor || 'TBA'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {parseMeetingTime(offering.meetings_json)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={`${seatsAvailable}/${offering.seats_capacity || 0}`}
                          size="small"
                          color={seatsAvailable > 0 ? 'success' : 'error'}
                          sx={{ fontWeight: 600 }}
                        />
                        {hasWaitlist && (
                          <Chip
                            label={`WL: ${offering.waitlist_count}`}
                            size="small"
                            color="warning"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onStartOver}
            sx={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            Start Over
          </Button>
          <Button
            variant="contained"
            onClick={() => onSave(offerings)}
            disabled={offerings.length === 0}
            startIcon={<Check size={16} />}
            sx={{
              bgcolor: '#06C96C',
              color: 'black',
              '&:hover': { bgcolor: '#059669' },
              fontWeight: 600,
            }}
          >
            Complete
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
