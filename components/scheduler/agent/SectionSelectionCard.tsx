'use client';

import { Card, CardContent, Button, Chip, Stack, Typography, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import type { CourseSectionWithMeetings, RankedSection } from '@/lib/mastra/types';

interface SectionSelectionCardProps {
  section: CourseSectionWithMeetings;
  ranking: RankedSection;
  onSelect: (section: CourseSectionWithMeetings) => void;
  disabled?: boolean;
}

export function SectionSelectionCard({
  section,
  ranking,
  onSelect,
  disabled = false
}: SectionSelectionCardProps) {
  const { matchDetails, score } = ranking;

  // Get status color
  const getStatusColor = () => {
    switch (matchDetails.waitlistStatus) {
      case 'available':
        return 'success';
      case 'waitlisted':
        return 'warning';
      case 'full':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status label
  const getStatusLabel = () => {
    switch (matchDetails.waitlistStatus) {
      case 'available':
        return `Available (${section.seats_available || 0} seats)`;
      case 'waitlisted':
        return `Waitlist #${section.waitlist_count || 0}`;
      case 'full':
        return 'Full';
      default:
        return 'Unknown';
    }
  };

  // Format meeting times
  const formatMeetings = () => {
    if (!section.parsedMeetings || section.parsedMeetings.length === 0) {
      return 'Online/Async';
    }

    return section.parsedMeetings.map((meeting, idx) => (
      <Box key={idx}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {meeting.days} {meeting.startTime}-{meeting.endTime}
        </Typography>
        {meeting.location && (
          <Typography variant="caption" color="text.secondary">
            {meeting.location}
          </Typography>
        )}
      </Box>
    ));
  };

  return (
    <Card
      sx={{
        mb: 2,
        opacity: disabled ? 0.5 : 1,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': disabled ? {} : {
          borderColor: 'primary.main',
          boxShadow: 1,
        },
      }}
    >
      <CardContent>
        {/* Header with section and score */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Section {section.section_label}
          </Typography>
          <Chip
            label={`Score: ${score}`}
            size="small"
            color={score >= 80 ? 'success' : score >= 60 ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Meeting times and instructor */}
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {formatMeetings()}
          {section.instructor && (
            <Typography variant="body2" color="text.secondary">
              Instructor: {section.instructor}
            </Typography>
          )}
          {section.credits_decimal && (
            <Typography variant="caption" color="text.secondary">
              {section.credits_decimal} credits
            </Typography>
          )}
        </Stack>

        {/* Availability status */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
            sx={{ fontWeight: 500 }}
          />
        </Box>

        {/* Pros */}
        {matchDetails.pros.length > 0 && (
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            {matchDetails.pros.map((pro, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="body2" color="success.dark">
                  {pro}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {/* Cons */}
        {matchDetails.cons.length > 0 && (
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {matchDetails.cons.map((con, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="body2" color="warning.dark">
                  {con}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {/* Select button */}
        <Button
          fullWidth
          variant="contained"
          onClick={() => onSelect(section)}
          disabled={disabled || matchDetails.waitlistStatus === 'full'}
          sx={{ mt: 2 }}
        >
          {matchDetails.waitlistStatus === 'full' ? 'Section Full' : 'Select This Section'}
        </Button>
      </CardContent>
    </Card>
  );
}
